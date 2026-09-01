/* eslint-disable @typescript-eslint/unbound-method */
import { ContextBuilderService } from './context-builder.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkspaceAccessService } from '../../workspaces/workspace-access.service';
import { PromptEngineService } from '../prompts/prompt-engine.service';

describe('ContextBuilderService', () => {
  it('assembles isolated history, selected source filters, and workspace instructions', async () => {
    const prisma = {
      chatSession: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'c1',
          workspaceId: 'w1',
          workspace: { name: 'Research' },
          metadata: { selectedSourceIds: ['d1'] },
          messages: [
            { role: 'user', content: 'Earlier' },
            { role: 'tool', content: 'ignored' },
          ],
        }),
      },
      document: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ id: 'd1', originalName: 'paper.pdf' }]),
      },
    } as unknown as PrismaService;
    const access = {
      requireRole: jest.fn().mockResolvedValue({}),
    } as unknown as WorkspaceAccessService;
    const result = await new ContextBuilderService(
      prisma,
      access,
      new PromptEngineService(),
    ).build('u1', 'c1');
    expect(result.rag.conversationHistory).toEqual([
      { role: 'user', content: 'Earlier' },
    ]);
    expect(result.rag.metadataFilter).toEqual({ documentIds: ['d1'] });
    expect(result.rag.systemInstructions).toContain('Research');
    expect(access.requireRole).toHaveBeenCalledWith('w1', 'u1');
    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['d1'] }, workspaceId: 'w1' },
      select: { id: true, originalName: true },
    });
  });
});
