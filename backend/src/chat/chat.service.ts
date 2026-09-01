import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import {
  AppException,
  databaseUnavailable,
  ErrorCode,
} from '../common/errors/app.exception';
import type { ChatMessage } from '@prisma/client';
import type { RagAnswer } from '../rag/rag.service';
import type { ChatMessageInput } from '../llm/interfaces/llm-provider.interface';
import type {
  RetrievalMetadataFilter,
  RetrievalOverrides,
} from '../rag/retrieval/retrieval.types';

export interface ChatRetrievalOptions {
  metadataFilter?: RetrievalMetadataFilter;
  retrieval?: RetrievalOverrides;
}

export type ChatStreamEvent =
  | { type: 'delta'; content: string }
  | {
      type: 'done';
      message: ChatMessage;
      sources: RagAnswer['sources'];
    };

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ragService: RagService,
    private readonly configService: ConfigService,
  ) {}

  async createSession(userId: string, documentId?: string, title?: string) {
    if (documentId) {
      const document = await this.database(() =>
        this.prisma.document.findFirst({ where: { id: documentId, userId } }),
      );

      if (!document) {
        throw new AppException(
          ErrorCode.DOCUMENT_NOT_FOUND,
          HttpStatus.NOT_FOUND,
          'Document not found.',
        );
      }
    }

    return this.database(() =>
      this.prisma.chatSession.create({
        data: {
          userId,
          documentId,
          title: title ?? (documentId ? 'Document chat' : 'New chat'),
        },
      }),
    );
  }

  async listSessions(userId: string) {
    return this.database(() =>
      this.prisma.chatSession.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        include: { document: { select: { id: true, originalName: true } } },
      }),
    );
  }

  async getSession(userId: string, sessionId: string) {
    const session = await this.database(() =>
      this.prisma.chatSession.findFirst({
        where: { id: sessionId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      }),
    );

    if (!session) {
      throw new AppException(
        ErrorCode.CHAT_SESSION_NOT_FOUND,
        HttpStatus.NOT_FOUND,
        'Chat session not found.',
      );
    }

    return session;
  }

  async deleteSession(userId: string, sessionId: string) {
    await this.getSession(userId, sessionId);
    await this.database(() =>
      this.prisma.chatSession.delete({ where: { id: sessionId } }),
    );
    return { message: 'Chat session deleted' };
  }

  /**
   * Persists the user's message, answers it via RAG (scoped to the session's
   * document if it has one, otherwise across all of the user's documents),
   * then persists and returns the assistant's reply.
   */
  async sendMessage(
    userId: string,
    sessionId: string,
    message: string,
    providerKey?: string,
    retrievalOptions: ChatRetrievalOptions = {},
  ) {
    const session = await this.getSession(userId, sessionId);

    await this.database(() =>
      this.prisma.chatMessage.create({
        data: { sessionId, userId, role: 'user', content: message },
      }),
    );

    const result = await this.ragService.answerQuestion(userId, message, {
      documentId: session.documentId ?? undefined,
      providerKey:
        providerKey ??
        this.configService.get<string>('LLM_PROVIDER') ??
        'gemini',
      conversationHistory: this.conversationHistory(session.messages),
      ...retrievalOptions,
    });

    const assistantMessage = await this.database(() =>
      this.prisma.chatMessage.create({
        data: {
          sessionId,
          userId,
          role: 'assistant',
          content: result.answer,
          llmProvider: result.provider,
          llmModel: result.model,
        },
      }),
    );

    await this.database(() =>
      this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() },
      }),
    );

    return { message: assistantMessage, sources: result.sources };
  }

  async streamMessage(
    userId: string,
    sessionId: string,
    message: string,
    providerKey?: string,
    retrievalOptions: ChatRetrievalOptions = {},
  ): Promise<AsyncIterable<ChatStreamEvent>> {
    const session = await this.getSession(userId, sessionId);

    await this.database(() =>
      this.prisma.chatMessage.create({
        data: { sessionId, userId, role: 'user', content: message },
      }),
    );

    const result = await this.ragService.streamQuestion(userId, message, {
      documentId: session.documentId ?? undefined,
      providerKey:
        providerKey ??
        this.configService.get<string>('LLM_PROVIDER') ??
        'gemini',
      conversationHistory: this.conversationHistory(session.messages),
      ...retrievalOptions,
    });

    return this.completeStream(
      result.chunks,
      sessionId,
      userId,
      result.provider,
      result.model,
      result.sources,
    );
  }

  private async *completeStream(
    chunks: AsyncIterable<string>,
    sessionId: string,
    userId: string,
    provider: string,
    model: string,
    sources: RagAnswer['sources'],
  ): AsyncGenerator<ChatStreamEvent> {
    let content = '';
    for await (const chunk of chunks) {
      content += chunk;
      yield { type: 'delta', content: chunk };
    }

    const assistantMessage = await this.database(() =>
      this.prisma.$transaction(async (transaction) => {
        const saved = await transaction.chatMessage.create({
          data: {
            sessionId,
            userId,
            role: 'assistant',
            content,
            llmProvider: provider,
            llmModel: model,
          },
        });
        await transaction.chatSession.update({
          where: { id: sessionId },
          data: { updatedAt: new Date() },
        });
        return saved;
      }),
    );

    yield { type: 'done', message: assistantMessage, sources };
  }

  private conversationHistory(
    messages: { role: string; content: string }[] | undefined,
  ): ChatMessageInput[] {
    return (messages ?? []).flatMap((message) =>
      message.role === 'user' || message.role === 'assistant'
        ? [{ role: message.role, content: message.content }]
        : [],
    );
  }

  private async database<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof AppException) throw error;
      throw databaseUnavailable(error);
    }
  }
}
