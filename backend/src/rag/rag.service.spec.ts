import { ErrorCode } from '../common/errors/app.exception';
import { LlmGatewayService } from '../llm/llm-gateway.service';
import { PrismaService } from '../prisma/prisma.service';
import { RetrievalPipelineService } from './retrieval/retrieval-pipeline.service';
import {
  CONVERSATION_HISTORY_MAX_CHARACTERS,
  CONVERSATION_HISTORY_MAX_MESSAGES,
  RagQuestionOptions,
  RagService,
} from './rag.service';
import type { ChatMessageInput } from '../llm/interfaces/llm-provider.interface';

describe('RagService error handling', () => {
  function createService(
    prisma: object,
    retrieval: object = {},
    gateway: object = {},
  ) {
    return new RagService(
      prisma as PrismaService,
      gateway as LlmGatewayService,
      retrieval as RetrievalPipelineService,
    );
  }

  const candidate = {
    id: 'chunk-1',
    content: 'Grounded context',
    documentId: 'document-1',
    originalName: 'source.txt',
    chunkIndex: 2,
    mimeType: 'text/plain',
    documentCreatedAt: new Date('2026-07-01T00:00:00.000Z'),
    retrievalMethods: ['vector', 'text'] as const,
    vectorScore: 0.9,
    textScore: 0.8,
    fusionScore: 0.02,
    score: 0.95,
  };

  it('returns DOCUMENT_NOT_FOUND for an inaccessible scoped document', async () => {
    const service = createService({
      document: { findFirst: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      service.answerQuestion('user-1', 'question', {
        documentId: 'document-1',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.DOCUMENT_NOT_FOUND,
      status: 404,
    });
  });

  it('returns RAG_RETRIEVAL_FAILED when the vector query fails', async () => {
    const service = createService(
      {
        document: {
          findFirst: jest.fn().mockResolvedValue({ id: 'document-1' }),
        },
        $queryRaw: jest.fn(),
      },
      { retrieve: jest.fn().mockRejectedValue(new Error('retrieval failed')) },
    );

    await expect(
      service.answerQuestion('user-1', 'question', {
        documentId: 'document-1',
      }),
    ).rejects.toMatchObject({
      code: ErrorCode.RAG_RETRIEVAL_FAILED,
      status: 503,
      message: 'Document retrieval is temporarily unavailable.',
    });
  });

  it('prepares the same grounded prompt for streaming', async () => {
    const chunks = (async function* () {
      await Promise.resolve();
      yield 'answer';
    })();
    const streamChat = jest.fn().mockReturnValue({
      chunks,
      provider: 'gemini',
      model: 'test-model',
    });
    const service = createService(
      {},
      { retrieve: jest.fn().mockResolvedValue([candidate]) },
      { streamChat },
    );

    const result = await service.streamQuestion('user-1', 'question');

    expect(result.sources).toEqual([
      {
        documentId: 'document-1',
        documentName: 'source.txt',
        chunkId: 'chunk-1',
        chunkIndex: 2,
        score: 0.95,
        retrievalMethods: ['vector', 'text'],
        mimeType: 'text/plain',
        documentCreatedAt: '2026-07-01T00:00:00.000Z',
        excerpt: 'Grounded context',
      },
    ]);
    expect(streamChat).toHaveBeenCalledWith(
      'gemini',
      expect.arrayContaining([
        expect.objectContaining({
          role: 'system',
          content: expect.stringContaining('Grounded context') as string,
        }),
      ]),
    );
  });

  it('includes prior turns chronologically and appends the follow-up exactly once', async () => {
    let prompt: ChatMessageInput[] = [];
    const chat = jest.fn((_provider: string, messages: ChatMessageInput[]) => {
      prompt = messages;
      return Promise.resolve({
        content: 'follow-up answer',
        provider: 'gemini',
        model: 'test-model',
      });
    });
    const service = createService(
      {},
      { retrieve: jest.fn().mockResolvedValue([]) },
      { chat },
    );
    const history: ChatMessageInput[] = [
      { role: 'user', content: 'Who owns the project?' },
      { role: 'assistant', content: 'Maya Rao owns it.' },
    ];

    await service.answerQuestion('user-1', 'When is it due?', {
      conversationHistory: history,
    });

    expect(prompt.slice(1)).toEqual([
      ...history,
      { role: 'user', content: 'When is it due?' },
    ]);
    expect(
      prompt.filter((message) => message.content === 'When is it due?'),
    ).toHaveLength(1);
  });

  it('uses an identical memory prompt for streaming and non-streaming', async () => {
    let nonStreamingPrompt: ChatMessageInput[] = [];
    let streamingPrompt: ChatMessageInput[] = [];
    const chunks = (async function* () {
      await Promise.resolve();
      yield 'answer';
    })();
    const gateway = {
      chat: jest.fn((_provider: string, messages: ChatMessageInput[]) => {
        nonStreamingPrompt = messages;
        return Promise.resolve({
          content: 'answer',
          provider: 'gemini',
          model: 'test-model',
        });
      }),
      streamChat: jest.fn((_provider: string, messages: ChatMessageInput[]) => {
        streamingPrompt = messages;
        return { chunks, provider: 'gemini', model: 'test-model' };
      }),
    };
    const retrieve = jest.fn().mockResolvedValue([]);
    const service = createService({}, { retrieve }, gateway);
    const options = {
      conversationHistory: [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
      ] satisfies ChatMessageInput[],
      metadataFilter: { mimeTypes: ['application/pdf'] },
      retrieval: { mode: 'hybrid' as const, topK: 3 },
    } satisfies RagQuestionOptions;

    await service.answerQuestion('user-1', 'Follow-up', options);
    await service.streamQuestion('user-1', 'Follow-up', options);

    expect(streamingPrompt).toEqual(nonStreamingPrompt);
    expect(retrieve).toHaveBeenNthCalledWith(
      1,
      {
        userId: 'user-1',
        workspaceId: undefined,
        query: 'Follow-up',
        documentId: undefined,
        metadataFilter: options.metadataFilter,
      },
      options.retrieval,
    );
    expect(retrieve).toHaveBeenNthCalledWith(
      2,
      {
        userId: 'user-1',
        workspaceId: undefined,
        query: 'Follow-up',
        documentId: undefined,
        metadataFilter: options.metadataFilter,
      },
      options.retrieval,
    );
  });

  it('bounds memory to the most recent messages', async () => {
    let prompt: ChatMessageInput[] = [];
    const service = createService(
      {},
      { retrieve: jest.fn().mockResolvedValue([]) },
      {
        chat: jest.fn((_provider: string, messages: ChatMessageInput[]) => {
          prompt = messages;
          return Promise.resolve({
            content: 'answer',
            provider: 'gemini',
            model: 'test-model',
          });
        }),
      },
    );
    const history: ChatMessageInput[] = Array.from(
      { length: CONVERSATION_HISTORY_MAX_MESSAGES + 3 },
      (_, index) => ({
        role: index % 2 === 0 ? 'user' : 'assistant',
        content: `message-${index}`,
      }),
    );
    await service.answerQuestion('user-1', 'current', {
      conversationHistory: history,
    });

    const includedHistory = prompt.slice(1, -1);
    expect(includedHistory).toHaveLength(CONVERSATION_HISTORY_MAX_MESSAGES);
    expect(includedHistory[0]?.content).toBe('message-3');
  });

  it('bounds memory by total character count', async () => {
    let prompt: ChatMessageInput[] = [];
    const service = createService(
      {},
      { retrieve: jest.fn().mockResolvedValue([]) },
      {
        chat: jest.fn((_provider: string, messages: ChatMessageInput[]) => {
          prompt = messages;
          return Promise.resolve({
            content: 'answer',
            provider: 'gemini',
            model: 'test-model',
          });
        }),
      },
    );

    await service.answerQuestion('user-1', 'current', {
      conversationHistory: [
        {
          role: 'assistant',
          content: `discarded-prefix-${'x'.repeat(CONVERSATION_HISTORY_MAX_CHARACTERS)}`,
        },
      ],
    });

    const includedHistory = prompt.slice(1, -1);
    expect(includedHistory[0]?.content).toHaveLength(
      CONVERSATION_HISTORY_MAX_CHARACTERS,
    );
  });
});
