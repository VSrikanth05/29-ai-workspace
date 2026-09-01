import { AiService } from './ai.service';

describe('AiService conversations', () => {
  it('creates a workspace-associated conversation with model settings', async () => {
    const prisma = {
      document: { count: jest.fn().mockResolvedValue(1) },
      chatSession: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 'c1', ...data })),
      },
    };
    const access = { requireRole: jest.fn().mockResolvedValue({}) };
    const router = {
      resolve: jest.fn().mockResolvedValue({
        publicId: 'openai',
        gatewayKey: 'gpt',
        model: 'gpt-test',
      }),
    };
    const prompts = { version: 'ai-core-v1' };
    const service = new AiService(
      prisma as never,
      {} as never,
      access as never,
      {} as never,
      prompts as never,
      router as never,
      {} as never,
      { conversation: jest.fn() } as never,
      { get: jest.fn() } as never,
    );
    const result = await service.createConversation('u1', {
      workspaceId: 'w1',
      selectedSourceIds: ['d1'],
      provider: 'openai',
      model: 'gpt-test',
      temperature: 0.2,
      maxTokens: 500,
    });
    expect(result).toMatchObject({
      id: 'c1',
      workspaceId: 'w1',
      provider: 'openai',
      model: 'gpt-test',
      temperature: 0.2,
      maxTokens: 500,
    });
    expect(access.requireRole).toHaveBeenCalledWith('w1', 'u1');
  });
});
