import { ConfigService } from '@nestjs/config';
import { AppException, ErrorCode } from '../common/errors/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { RagService } from '../rag/rag.service';
import { ChatService } from './chat.service';
import type { ChatStreamEvent } from './chat.service';
import type { RagQuestionOptions } from '../rag/rag.service';

describe('ChatService error handling', () => {
  const config = { get: jest.fn() } as unknown as ConfigService;

  function createService(prisma: object, rag: object = {}) {
    return new ChatService(prisma as PrismaService, rag as RagService, config);
  }

  it('returns a stable code when the chat session does not exist', async () => {
    const service = createService({
      chatSession: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      service.getSession('user-1', 'session-1'),
    ).rejects.toMatchObject({
      code: ErrorCode.CHAT_SESSION_NOT_FOUND,
      status: 404,
    });
  });

  it('translates a Prisma read failure without exposing its message', async () => {
    const service = createService({
      chatSession: {
        findFirst: jest
          .fn()
          .mockRejectedValue(new Error('postgres password=secret')),
      },
    });

    await expect(
      service.getSession('user-1', 'session-1'),
    ).rejects.toMatchObject({
      code: ErrorCode.DATABASE_UNAVAILABLE,
      status: 503,
      message: 'The database is temporarily unavailable.',
    });
  });

  it('preserves a typed provider failure from the RAG pipeline', async () => {
    const providerError = new AppException(
      ErrorCode.AI_PROVIDER_UNAVAILABLE,
      503,
      'The AI provider is temporarily unavailable.',
    );
    const service = createService(
      {
        chatSession: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'session-1', documentId: null }),
        },
        chatMessage: { create: jest.fn().mockResolvedValue({}) },
      },
      { answerQuestion: jest.fn().mockRejectedValue(providerError) },
    );

    await expect(
      service.sendMessage('user-1', 'session-1', 'question', 'gemini'),
    ).rejects.toBe(providerError);
  });

  it('persists the completed assistant message only after streaming finishes', async () => {
    async function* chunks() {
      await Promise.resolve();
      yield 'Hello';
      yield ' world';
    }
    const assistantMessage = {
      id: 'assistant-1',
      sessionId: 'session-1',
      userId: 'user-1',
      role: 'assistant',
      content: 'Hello world',
      llmProvider: 'gemini',
      llmModel: 'test-model',
      createdAt: new Date(),
    };
    let savedContent: string | undefined;
    const transaction = {
      chatMessage: {
        create: jest.fn((args: { data: { content: string } }) => {
          savedContent = args.data.content;
          return Promise.resolve(assistantMessage);
        }),
      },
      chatSession: { update: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      chatSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'session-1',
          documentId: null,
          messages: [
            { role: 'user', content: 'Previous question' },
            { role: 'assistant', content: 'Previous answer' },
          ],
        }),
      },
      chatMessage: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(
        (operation: (client: typeof transaction) => Promise<unknown>) =>
          operation(transaction),
      ),
    };
    let streamOptions: RagQuestionOptions | undefined;
    const service = createService(prisma, {
      streamQuestion: jest.fn(
        (_userId: string, _question: string, options: RagQuestionOptions) => {
          streamOptions = options;
          return Promise.resolve({
            chunks: chunks(),
            provider: 'gemini',
            model: 'test-model',
            sources: [],
          });
        },
      ),
    });

    const stream = await service.streamMessage(
      'user-1',
      'session-1',
      'question',
      'gemini',
    );
    const iterator = stream[Symbol.asyncIterator]();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    const first = await iterator.next();
    const second = await iterator.next();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    const done = await iterator.next();
    const events = [first.value, second.value, done.value].filter(
      (event): event is ChatStreamEvent => event !== undefined,
    );

    expect(events.map((event) => event.type)).toEqual([
      'delta',
      'delta',
      'done',
    ]);
    expect(savedContent).toBe('Hello world');
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(streamOptions?.conversationHistory).toEqual([
      { role: 'user', content: 'Previous question' },
      { role: 'assistant', content: 'Previous answer' },
    ]);
  });

  it('does not persist an assistant message when streaming fails', async () => {
    async function* failingChunks() {
      await Promise.resolve();
      yield 'partial';
      throw new Error('provider disconnected');
    }
    const prisma = {
      chatSession: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'session-1', documentId: null }),
      },
      chatMessage: { create: jest.fn().mockResolvedValue({}) },
      $transaction: jest.fn(),
    };
    const service = createService(prisma, {
      streamQuestion: jest.fn().mockResolvedValue({
        chunks: failingChunks(),
        provider: 'gemini',
        model: 'test-model',
        sources: [],
      }),
    });
    const stream = await service.streamMessage(
      'user-1',
      'session-1',
      'question',
      'gemini',
    );
    const iterator = stream[Symbol.asyncIterator]();
    await expect(iterator.next()).resolves.toMatchObject({ done: false });
    await expect(iterator.next()).rejects.toThrow('provider disconnected');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps conversation memory isolated to the requested session', async () => {
    const sessionA = {
      id: 'session-a',
      documentId: null,
      messages: [
        { role: 'user', content: 'Private question A' },
        { role: 'assistant', content: 'Private answer A' },
      ],
    };
    const sessionB = {
      id: 'session-b',
      documentId: null,
      messages: [
        { role: 'user', content: 'Private question B' },
        { role: 'assistant', content: 'Private answer B' },
      ],
    };
    const prisma = {
      chatSession: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(sessionA)
          .mockResolvedValueOnce(sessionB),
        update: jest.fn().mockResolvedValue({}),
      },
      chatMessage: { create: jest.fn().mockResolvedValue({}) },
    };
    const captured: RagQuestionOptions[] = [];
    const service = createService(prisma, {
      answerQuestion: jest.fn(
        (_userId: string, _question: string, options: RagQuestionOptions) => {
          captured.push(options);
          return Promise.resolve({
            answer: 'answer',
            provider: 'gemini',
            model: 'test-model',
            sources: [],
          });
        },
      ),
    });

    await service.sendMessage('user-1', 'session-a', 'Current A', 'gemini');
    await service.sendMessage('user-1', 'session-b', 'Current B', 'gemini');

    expect(captured[0].conversationHistory).toEqual(sessionA.messages);
    expect(captured[1].conversationHistory).toEqual(sessionB.messages);
    expect(captured[0].conversationHistory).not.toContainEqual(
      expect.objectContaining({ content: 'Current A' }),
    );
    expect(captured[0].conversationHistory).not.toEqual(
      expect.arrayContaining(sessionB.messages),
    );
    expect(prisma.chatSession.findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        where: { id: 'session-a', userId: 'user-1' },
      }),
    );
    expect(prisma.chatSession.findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: 'session-b', userId: 'user-1' },
      }),
    );
  });
});
