/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from './ai-studio.service';

describe('AiStudioService', () => {
  function setup(response: string) {
    const prisma = {
      chatSession: { findFirst: jest.fn().mockResolvedValue({ id: 'c1' }) },
      aIOutput: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 'o1', ...data })),
        findFirst: jest.fn(),
      },
      document: { findMany: jest.fn() },
    };
    const ai = {
      chat: jest.fn().mockResolvedValue({
        message: {
          content: response,
          llmProvider: 'openai',
          llmModel: 'gpt-test',
        },
        sources: [],
      }),
      createConversation: jest.fn(),
    };
    const access = { requireRole: jest.fn().mockResolvedValue({}) };
    return {
      prisma,
      ai,
      access,
      service: new AiStudioService(
        prisma as never,
        ai as never,
        access as never,
      ),
    };
  }

  it('validates hierarchical Mind Map JSON and persists source associations', async () => {
    const { service, prisma } = setup(
      '{"id":"root","label":"Topic","children":[{"id":"a","label":"Idea"}]}',
    );
    const result = await service.persistent(
      'u1',
      {
        workspaceId: 'w1',
        conversationId: 'c1',
        sourceIds: ['d1'],
        text: 'material',
      },
      AIOutputType.MIND_MAP,
      'Mind Map',
      'Create map',
    );
    expect(result).toMatchObject({ id: 'o1', type: AIOutputType.MIND_MAP });
    expect(prisma.aIOutput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: expect.objectContaining({
            format: 'mind-map',
            root: expect.objectContaining({ label: 'Topic' }),
          }),
          sources: { create: [{ sourceId: 'd1' }] },
        }),
      }),
    );
  });

  it('rejects malformed Mind Map output without saving it', async () => {
    const { service, prisma } = setup('not json');
    await expect(
      service.persistent(
        'u1',
        { workspaceId: 'w1', conversationId: 'c1', text: 'material' },
        AIOutputType.MIND_MAP,
        'Mind Map',
        'Create map',
      ),
    ).rejects.toThrow('invalid Mind Map JSON');
    expect(prisma.aIOutput.create).not.toHaveBeenCalled();
  });

  it('validates and persists structured flashcard and quiz outputs', async () => {
    const flashcards = setup(
      '{"flashcards":[{"question":"Q","answer":"A","difficulty":"easy","category":"Basics"}]}',
    );
    await flashcards.service.persistent(
      'u1',
      { workspaceId: 'w1', conversationId: 'c1', text: 'material' },
      AIOutputType.FLASHCARDS,
      'Flashcards',
      'Create cards',
    );
    expect(flashcards.prisma.aIOutput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: expect.objectContaining({ format: 'flashcards' }),
        }),
      }),
    );
    const quiz = setup(
      '{"questions":[{"type":"true-false","prompt":"Correct?","options":["True","False"],"answer":"True"}]}',
    );
    await quiz.service.persistent(
      'u1',
      { workspaceId: 'w1', conversationId: 'c1', text: 'material' },
      AIOutputType.QUIZ,
      'Quiz',
      'Create quiz',
    );
    expect(quiz.prisma.aIOutput.create).toHaveBeenCalled();
  });

  it('loads shared workspace sources for AI Studio material', async () => {
    const { service, prisma, ai } = setup('answer');
    prisma.document.findMany.mockResolvedValue([
      { id: 'd1', originalName: 'shared.pdf', extractedText: 'workspace text' },
    ]);

    await service.transient(
      'member-1',
      {
        workspaceId: 'w1',
        conversationId: 'c1',
        sourceIds: ['d1'],
      },
      'Use the supplied material.',
    );

    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['d1'] }, workspaceId: 'w1' },
      select: { id: true, originalName: true, extractedText: true },
    });
    expect(ai.chat).toHaveBeenCalledWith(
      'member-1',
      expect.objectContaining({
        message: expect.stringContaining('workspace text'),
      }),
    );
  });
});
