/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { SearchService } from './search.service';
describe('SearchService', () => {
  it('isolates every search group by workspace and highlights matches', async () => {
    const empty = jest.fn().mockResolvedValue([]);
    const prisma: any = {
      document: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            originalName: 'Quarterly Report',
            mimeType: 'text/plain',
            updatedAt: new Date(),
          },
        ]),
      },
      chatSession: { findMany: empty },
      aIOutput: { findMany: empty },
      collection: { findMany: empty },
      tag: { findMany: empty },
    };
    const access: any = { requireRole: jest.fn() };
    const result = await new SearchService(prisma, access).search(
      'u1',
      'w1',
      'report',
    );
    expect(access.requireRole).toHaveBeenCalledWith('w1', 'u1');
    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ workspaceId: 'w1' }),
      }),
    );
    const source = result.groups.sources[0] as {
      highlight: Array<{ match: boolean; text: string }>;
    };
    expect(
      source.highlight.some((part) => part.match && part.text === 'Report'),
    ).toBe(true);
  });

  it('upserts a workspace-scoped saved search after validating an optional tag', async () => {
    const prisma: any = {
      tag: { findFirst: jest.fn().mockResolvedValue({ id: 't1' }) },
      savedSearch: {
        upsert: jest.fn().mockResolvedValue({ id: 'ss1', name: 'Reports', query: 'report' }),
      },
    };
    const access: any = { requireRole: jest.fn() };
    const result = await new SearchService(prisma, access).createSaved('u1', {
      workspaceId: 'w1',
      name: ' Reports ',
      query: ' report ',
      tagId: 't1',
    });
    expect(result.id).toBe('ss1');
    expect(prisma.savedSearch.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_workspaceId_name: { userId: 'u1', workspaceId: 'w1', name: 'Reports' } },
      create: { userId: 'u1', workspaceId: 'w1', name: 'Reports', query: 'report', tagId: 't1' },
    }));
  });

  it('rejects a saved search whose tag is outside the workspace', async () => {
    const prisma: any = {
      tag: { findFirst: jest.fn().mockResolvedValue(null) },
      savedSearch: { upsert: jest.fn() },
    };
    const access: any = { requireRole: jest.fn() };
    await expect(new SearchService(prisma, access).createSaved('u1', {
      workspaceId: 'w1', name: 'Reports', query: 'report', tagId: 'wrong-tag',
    })).rejects.toThrow('Saved search tag not found.');
    expect(prisma.savedSearch.upsert).not.toHaveBeenCalled();
  });
});
