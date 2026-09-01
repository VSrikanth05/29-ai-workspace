import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TargetService } from '../knowledge/target.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import type { AssignTagDto, CreateTagDto, UpdateTagDto } from './tags.dto';
import { RedisCacheService } from '../infrastructure/redis-cache.service';
@Injectable()
export class TagsService {
  private readonly audit = new Logger('KnowledgeAudit');
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly targets: TargetService,
    @Optional() private readonly cache?: RedisCacheService,
  ) {}
  async list(userId: string, workspaceId: string) {
    await this.access.requireRole(workspaceId, userId);
    const key = `tags:${workspaceId}`;
    const cached = await this.cache?.get(key);
    if (cached) return cached;
    const result = await this.prisma.tag.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { name: 'asc' },
      include: { _count: { select: { assignments: true } } },
    });
    await this.cache?.set(key, result);
    return result;
  }
  async create(userId: string, dto: CreateTagDto) {
    await this.access.requireRole(
      dto.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    const name = dto.name.trim();
    const existing = await this.prisma.tag.findFirst({
      where: {
        workspaceId: dto.workspaceId,
        name: { equals: name, mode: 'insensitive' },
        deletedAt: null,
      },
    });
    if (existing) throw new ConflictException('Tag name already exists');
    const result = await this.prisma.tag.create({
      data: { workspaceId: dto.workspaceId, name, color: dto.color },
    });
    await this.invalidate(dto.workspaceId);
    return result;
  }
  async update(userId: string, id: string, dto: UpdateTagDto) {
    const tag = await this.get(id);
    await this.access.requireRole(
      tag.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    const result = await this.prisma.tag.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.color !== undefined ? { color: dto.color } : {}),
      },
    });
    await this.invalidate(tag.workspaceId);
    return result;
  }
  async remove(userId: string, id: string) {
    const tag = await this.get(id);
    await this.access.requireRole(
      tag.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    await this.prisma.tag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.audit.log(
      JSON.stringify({
        action: 'tag.delete',
        userId,
        workspaceId: tag.workspaceId,
        tagId: id,
      }),
    );
    await this.invalidate(tag.workspaceId);
    return { message: 'Tag deleted' };
  }
  async assign(userId: string, id: string, dto: AssignTagDto) {
    const tag = await this.get(id);
    if (tag.workspaceId !== dto.workspaceId)
      throw new NotFoundException('Tag not found');
    const target = await this.targets.validate(
      userId,
      dto,
      WorkspaceRole.EDITOR,
    );
    const result = await this.prisma.tagAssignment.upsert({
      where: dto.sourceId
        ? { tagId_sourceId: { tagId: id, sourceId: dto.sourceId } }
        : { tagId_outputId: { tagId: id, outputId: dto.outputId! } },
      create: { tagId: id, ...target },
      update: {},
    });
    await this.invalidate(tag.workspaceId);
    return result;
  }
  async unassign(userId: string, id: string, assignmentId: string) {
    const tag = await this.get(id);
    await this.access.requireRole(
      tag.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    const result = await this.prisma.tagAssignment.deleteMany({
      where: { id: assignmentId, tagId: id },
    });
    if (!result.count) throw new NotFoundException('Tag assignment not found');
    await this.invalidate(tag.workspaceId);
    return { message: 'Tag removed' };
  }
  private async get(id: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id, deletedAt: null },
    });
    if (!tag) throw new NotFoundException('Tag not found');
    return tag;
  }
  private async invalidate(workspaceId: string) {
    await Promise.all([
      this.cache?.del(`tags:${workspaceId}`),
      this.cache?.delByPrefix(`search:${workspaceId}:`),
    ]);
  }
}
