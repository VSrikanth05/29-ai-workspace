import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { WorkspaceAccessService } from './workspace-access.service';
import { RedisCacheService } from '../infrastructure/redis-cache.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    @Optional() private readonly cache?: RedisCacheService,
  ) {}

  async ensurePersonalWorkspace(userId: string) {
    const existing = await this.prisma.workspace.findFirst({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
    });
    if (existing) return existing;

    const profile = await this.prisma.profile.findUnique({
      where: { id: userId },
    });
    if (!profile) throw new NotFoundException('Profile not found');
    const created = await this.prisma.workspace.create({
      data: {
        name: `${profile.name || 'Personal'}'s Workspace`,
        ownerId: userId,
        members: { create: { userId, role: WorkspaceRole.OWNER } },
      },
    });
    await this.cache?.del(`workspaces:${userId}`);
    return created;
  }

  async list(userId: string) {
    const key = `workspaces:${userId}`;
    const cached = await this.cache?.get(key);
    if (cached) return cached;
    const result = await this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        members: { where: { userId }, select: { role: true } },
        _count: { select: { documents: true, members: true } },
      },
    });
    await this.cache?.set(key, result);
    return result;
  }

  async create(userId: string, input: CreateWorkspaceDto) {
    const result = await this.prisma.workspace.create({
      data: {
        name: input.name.trim(),
        ownerId: userId,
        members: { create: { userId, role: WorkspaceRole.OWNER } },
      },
    });
    await this.cache?.del(`workspaces:${userId}`);
    return result;
  }

  async get(userId: string, workspaceId: string) {
    await this.access.requireRole(workspaceId, userId);
    const key = `workspace:${workspaceId}:${userId}`;
    const cached = await this.cache?.get(key);
    if (cached) return cached;
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        members: {
          select: {
            role: true,
            joinedAt: true,
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { documents: true } },
      },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.cache?.set(key, workspace);
    return workspace;
  }

  async remove(userId: string, workspaceId: string) {
    await this.access.requireRole(workspaceId, userId, WorkspaceRole.OWNER);
    const owned = await this.prisma.workspace.findFirst({
      where: { id: workspaceId, ownerId: userId },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Workspace not found');
    await this.prisma.workspace.delete({ where: { id: workspaceId } });
    await Promise.all([
      this.cache?.del(`workspaces:${userId}`),
      this.cache?.del(`workspace:${workspaceId}:${userId}`),
    ]);
    return { message: 'Workspace deleted' };
  }
}
