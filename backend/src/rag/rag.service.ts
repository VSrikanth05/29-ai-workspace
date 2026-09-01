import { HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LlmGatewayService } from '../llm/llm-gateway.service';
import {
  ChatCompletionResult,
  ChatMessageInput,
  LlmGenerationOptions,
} from '../llm/interfaces/llm-provider.interface';
import {
  AppException,
  databaseUnavailable,
  ErrorCode,
} from '../common/errors/app.exception';
import { RetrievalPipelineService } from './retrieval/retrieval-pipeline.service';
import type {
  RetrievalMetadataFilter,
  RetrievalCandidate,
  RetrievalMethod,
  RetrievalOverrides,
} from './retrieval/retrieval.types';
import { withSpan } from '../infrastructure/trace.util';

export const CONVERSATION_HISTORY_MAX_MESSAGES = 12;
export const CONVERSATION_HISTORY_MAX_CHARACTERS = 12_000;

export interface RagQuestionOptions {
  workspaceId?: string;
  documentId?: string;
  providerKey?: string;
  conversationHistory?: ChatMessageInput[];
  systemInstructions?: string;
  generation?: LlmGenerationOptions;
  metadataFilter?: RetrievalMetadataFilter;
  retrieval?: RetrievalOverrides;
}

export interface RagCitation {
  documentId: string;
  documentName: string;
  chunkId: string;
  chunkIndex: number;
  score: number;
  retrievalMethods: RetrievalMethod[];
  mimeType: string;
  documentCreatedAt: string;
  excerpt: string;
}

export interface RagAnswer {
  answer: string;
  provider: string;
  model: string;
  sources: RagCitation[];
  usage?: ChatCompletionResult['usage'];
}

export interface RagStream {
  chunks: AsyncIterable<string>;
  provider: string;
  model: string;
  sources: RagAnswer['sources'];
}

interface PreparedQuestion {
  messages: ChatMessageInput[];
  sources: RagAnswer['sources'];
}

@Injectable()
export class RagService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly llmGateway: LlmGatewayService,
    private readonly retrievalPipeline: RetrievalPipelineService,
  ) {}

  /**
   * Answers a question grounded in the user's documents.
   * - documentId provided -> retrieval scoped to that one document.
   * - documentId omitted   -> retrieval across every document the user owns.
   */
  async answerQuestion(
    userId: string,
    question: string,
    options: RagQuestionOptions = {},
  ): Promise<RagAnswer> {
    const providerKey = options.providerKey ?? 'gemini';
    const prepared = await this.prepareQuestion(userId, question, options);
    const result = options.generation
      ? await this.llmGateway.chat(
          providerKey,
          prepared.messages,
          options.generation,
        )
      : await this.llmGateway.chat(providerKey, prepared.messages);

    return {
      answer: result.content,
      provider: result.provider,
      model: result.model,
      sources: prepared.sources,
      usage: result.usage,
    };
  }

  async streamQuestion(
    userId: string,
    question: string,
    options: RagQuestionOptions = {},
  ): Promise<RagStream> {
    const providerKey = options.providerKey ?? 'gemini';
    const prepared = await this.prepareQuestion(userId, question, options);
    const result = options.generation
      ? this.llmGateway.streamChat(
          providerKey,
          prepared.messages,
          options.generation,
        )
      : this.llmGateway.streamChat(providerKey, prepared.messages);

    return { ...result, sources: prepared.sources };
  }

  private async prepareQuestion(
    userId: string,
    question: string,
    options: RagQuestionOptions,
  ): Promise<PreparedQuestion> {
    if (options.documentId) {
      let document;
      try {
        document = await this.prisma.document.findFirst({
          where: {
            id: options.documentId,
            ...(options.workspaceId
              ? { workspaceId: options.workspaceId }
              : { userId }),
          },
        });
      } catch (error) {
        throw databaseUnavailable(error);
      }

      if (!document) {
        throw new AppException(
          ErrorCode.DOCUMENT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
          'Document not found.',
        );
      }
    }

    let chunks: RetrievalCandidate[];
    try {
      chunks = await withSpan(
        'rag.retrieve',
        {
          'rag.document_scoped': Boolean(options.documentId),
          'rag.query_length': question.length,
        },
        () =>
          this.retrievalPipeline.retrieve(
            {
              userId,
              workspaceId: options.workspaceId,
              query: question,
              documentId: options.documentId,
              metadataFilter: options.metadataFilter,
            },
            options.retrieval,
          ),
      );
    } catch (error) {
      throw new AppException(
        ErrorCode.RAG_RETRIEVAL_FAILED,
        HttpStatus.SERVICE_UNAVAILABLE,
        'Document retrieval is temporarily unavailable.',
        error,
      );
    }

    const context = chunks
      .map(
        (chunk, i) =>
          `[Source ${i + 1} - ${chunk.originalName}]\n${chunk.content}`,
      )
      .join('\n\n');

    const messages: ChatMessageInput[] = [
      {
        role: 'system',
        content:
          'You are a direct, helpful, and highly intelligent AI assistant (like Gemini). ' +
          'Answer the user question directly, clearly, and comprehensively using the context below extracted from their workspace documents. ' +
          'CRITICAL: Output ONLY your final direct response to the user. DO NOT output any internal thinking process, reasoning scratchpad, meta-commentary, or preamble like "Here\'s a thinking process:". Start directly with the answer. ' +
          'Format your response in clean Markdown with clear headings and bullet points. ' +
          'Cite sources where relevant using their [Source N] label. When asked to explain or analyze a document/PPT, summarize and explain its key topics, questions, and insights thoroughly.\n\nCONTEXT:\n' +
          (context || '(no relevant document context was found)') +
          (options.systemInstructions
            ? `\n\n[Internal Grounding Guidelines - Do not repeat or include these guidelines in your answer]:\n${options.systemInstructions}`
            : ''),
      },
      ...this.boundConversationHistory(options.conversationHistory ?? []),
      { role: 'user', content: question },
    ];

    return {
      sources: chunks.map((c) => ({
        documentId: c.documentId,
        documentName: c.originalName,
        chunkId: c.id,
        chunkIndex: c.chunkIndex,
        score: Number(c.score.toFixed(6)),
        retrievalMethods: c.retrievalMethods,
        mimeType: c.mimeType,
        documentCreatedAt: c.documentCreatedAt.toISOString(),
        excerpt:
          c.content.length > 280 ? `${c.content.slice(0, 277)}...` : c.content,
      })),
      messages,
    };
  }

  private boundConversationHistory(
    history: ChatMessageInput[],
  ): ChatMessageInput[] {
    const recent = history
      .filter(
        (message) =>
          (message.role === 'user' || message.role === 'assistant') &&
          message.content.length > 0,
      )
      .slice(-CONVERSATION_HISTORY_MAX_MESSAGES);
    const bounded: ChatMessageInput[] = [];
    let remaining = CONVERSATION_HISTORY_MAX_CHARACTERS;

    for (let index = recent.length - 1; index >= 0 && remaining > 0; index--) {
      const message = recent[index];
      const content =
        message.content.length > remaining
          ? message.content.slice(message.content.length - remaining)
          : message.content;
      bounded.unshift({ role: message.role, content });
      remaining -= content.length;
    }

    return bounded;
  }
}
