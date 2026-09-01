import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { LlmGatewayService } from '../llm/llm-gateway.service';
import { ChatMessageInput } from '../llm/interfaces/llm-provider.interface';
import type { GenerateStudioDiagramDto } from './dto/generate-studio-diagram.dto';

const MAX_SOURCE_CHARS = 8000;

function buildSystemPrompt(diagramType: string) {
  return (
    `MERMAID TASK: Produce a Mermaid.js "${diagramType}" diagram that visualizes the ` +
    'structure, flow, or key relationships described in the document text below. ' +
    'Respond with ONLY a fenced ```mermaid code block, no other prose before or after it.'
  );
}

@Injectable()
export class DiagramService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmGateway: LlmGatewayService,
    private readonly configService: ConfigService,
  ) {}

  async generateDiagram(
    userId: string,
    documentId: string,
    providerKey?: string,
    diagramType = 'flowchart',
  ) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const text = (document.extractedText ?? '').slice(0, MAX_SOURCE_CHARS);

    if (!text.trim()) {
      throw new NotFoundException(
        'This document has no extracted text yet (still processing or extraction failed)',
      );
    }

    const messages: ChatMessageInput[] = [
      { role: 'system', content: buildSystemPrompt(diagramType) },
      { role: 'user', content: text },
    ];

    const result = await this.llmGateway.chat(
      providerKey ?? this.configService.get<string>('LLM_PROVIDER') ?? 'gemini',
      messages,
    );
    const mermaidCode = this.extractMermaidBlock(result.content);

    return this.prisma.documentDiagram.create({
      data: {
        documentId,
        diagramType,
        mermaidCode,
        llmProvider: result.provider,
        llmModel: result.model,
      },
    });
  }

  async listDiagrams(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.documentDiagram.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  generateStudioDiagram(userId: string, dto: GenerateStudioDiagramDto) {
    const gatewayProvider = dto.provider === 'openai'
      ? 'gpt'
      : dto.provider === 'anthropic'
        ? 'claude'
        : dto.provider;
    return this.generateDiagram(userId, dto.sourceId, gatewayProvider, dto.diagramType ?? 'flowchart');
  }

  /** Strips the ```mermaid fence if the model included one; otherwise returns the raw text. */
  private extractMermaidBlock(content: string): string {
    const match = content.match(/```mermaid\s*([\s\S]*?)```/i);
    return (match ? match[1] : content).trim();
  }
}
