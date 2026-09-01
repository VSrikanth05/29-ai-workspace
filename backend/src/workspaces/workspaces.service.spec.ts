import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from './workspace-access.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  const prisma = {
    workspace: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    profile: { findUnique: jest.fn() },
  };
  const access = { requireRole: jest.fn() };
  const service = new WorkspacesService(
    prisma as unknown as PrismaService,
    access as unknown as WorkspaceAccessService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns an existing personal workspace idempotently', async () => {
    prisma.workspace.findFirst.mockResolvedValue({ id: 'workspace-1' });
    await expect(service.ensurePersonalWorkspace('user-1')).resolves.toEqual({
      id: 'workspace-1',
    });
    expect(prisma.workspace.create).not.toHaveBeenCalled();
  });

  it('creates an owner membership for a first-time user', async () => {
    prisma.workspace.findFirst.mockResolvedValue(null);
    prisma.profile.findUnique.mockResolvedValue({ id: 'user-1', name: 'Asha' });
    prisma.workspace.create.mockResolvedValue({ id: 'workspace-1' });
    await service.ensurePersonalWorkspace('user-1');
    expect(prisma.workspace.create).toHaveBeenCalledWith({
      // Jest's asymmetric matcher is intentionally dynamic.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: expect.objectContaining({
        ownerId: 'user-1',
        name: "Asha's Workspace",
        members: { create: { userId: 'user-1', role: 'OWNER' } },
      }),
    });
  });
});
