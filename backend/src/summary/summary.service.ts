import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LlmGatewayService } from '../llm/llm-gateway.service';
import { ChatMessageInput } from '../llm/interfaces/llm-provider.interface';

const CHUNK_GROUP_SIZE = 8000; // characters per map-step, keeps prompts small
const SUMMARY_SYSTEM_PROMPT =
  'SUMMARY TASK: You are a document summarizer. Produce a clear, well-structured ' +
  'summary (use short paragraphs and bullet points where helpful) of the text provided. ' +
  'Focus on the key points, decisions, and facts; omit filler.';

@Injectable()
export class SummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmGateway: LlmGatewayService,
    private readonly configService: ConfigService,
  ) {}

  async generateSummary(
    userId: string,
    documentId: string,
    providerKey?: string,
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const text = document.extractedText ?? '';

    if (!text.trim()) {
      throw new NotFoundException(
        'This document has no extracted text yet (still processing or extraction failed)',
      );
    }

    const content = await this.mapReduceSummarize(
      text,
      providerKey ?? this.configService.get<string>('LLM_PROVIDER') ?? 'gemini',
    );

    return this.prisma.documentSummary.create({
      data: {
        documentId,
        content: content.text,
        llmProvider: content.provider,
        llmModel: content.model,
      },
    });
  }

  async listSummaries(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.documentSummary.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Simple map-reduce: for long documents, summarize fixed-size character
   * groups independently ("map"), then summarize the concatenation of those
   * partial summaries into one final summary ("reduce"). Short documents skip
   * straight to a single call.
   */
  private async mapReduceSummarize(
    text: string,
    providerKey: string,
  ): Promise<{ text: string; provider: string; model: string }> {
    if (text.length <= CHUNK_GROUP_SIZE) {
      const result = await this.summarizeOnce(text, providerKey);
      return {
        text: result.content,
        provider: result.provider,
        model: result.model,
      };
    }

    const groups: string[] = [];
    for (let i = 0; i < text.length; i += CHUNK_GROUP_SIZE) {
      groups.push(text.slice(i, i + CHUNK_GROUP_SIZE));
    }

    const partials: string[] = [];
    let model = '';

    for (const group of groups) {
      const result = await this.summarizeOnce(group, providerKey);
      partials.push(result.content);
      model = result.model;
    }

    const combined = partials
      .map((p, i) => `Section ${i + 1} summary:\n${p}`)
      .join('\n\n');

    const final = await this.summarizeOnce(
      `Combine the following section summaries into one cohesive overall summary:\n\n${combined}`,
      providerKey,
    );

    return {
      text: final.content,
      provider: final.provider,
      model: final.model || model,
    };
  }

  private async summarizeOnce(text: string, providerKey: string) {
    const messages: ChatMessageInput[] = [
      { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
      { role: 'user', content: text },
    ];

    return this.llmGateway.chat(providerKey, messages);
  }
}
