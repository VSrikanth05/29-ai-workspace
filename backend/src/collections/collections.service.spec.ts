/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { BadRequestException } from '@nestjs/common';
import { CollectionsService } from './collections.service';
describe('CollectionsService', () => {
  const prisma: any = {
    collection: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const access: any = { requireRole: jest.fn() };
  const service = new CollectionsService(prisma, access, {} as any);
  beforeEach(() => jest.clearAllMocks());
  it('prevents moving a collection into its descendant', async () => {
    prisma.collection.findFirst
      .mockResolvedValueOnce({ id: 'root', workspaceId: 'w1' })
      .mockResolvedValueOnce({ id: 'child' });
    prisma.collection.findMany
      .mockResolvedValueOnce([{ id: 'child' }])
      .mockResolvedValueOnce([]);
    await expect(
      service.update('u1', 'root', { parentId: 'child' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.collection.update).not.toHaveBeenCalled();
  });
  it('returns only active workspace collections', async () => {
    prisma.collection.findMany.mockResolvedValue([]);
    await service.list('u1', 'w1');
    expect(access.requireRole).toHaveBeenCalledWith('w1', 'u1');
    expect(prisma.collection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { workspaceId: 'w1', deletedAt: null },
      }),
    );
  });
});
