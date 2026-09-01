import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from './workspace-access.service';

describe('WorkspaceAccessService', () => {
  const findUnique = jest.fn();
  const service = new WorkspaceAccessService({
    workspaceMember: { findUnique },
  } as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('hides workspaces from non-members', async () => {
    findUnique.mockResolvedValue(null);
    await expect(
      service.requireRole('workspace-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects mutations from viewers', async () => {
    findUnique.mockResolvedValue({ role: WorkspaceRole.VIEWER });
    await expect(
      service.requireRole('workspace-1', 'user-1', WorkspaceRole.EDITOR),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows owners to perform editor operations', async () => {
    const membership = { role: WorkspaceRole.OWNER };
    findUnique.mockResolvedValue(membership);
    await expect(
      service.requireRole('workspace-1', 'user-1', WorkspaceRole.EDITOR),
    ).resolves.toBe(membership);
  });
});
