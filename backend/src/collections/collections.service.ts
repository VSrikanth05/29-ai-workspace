import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TargetService } from '../knowledge/target.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import type {
  CollectionItemDto,
  CreateCollectionDto,
  UpdateCollectionDto,
} from './collections.dto';
import { RedisCacheService } from '../infrastructure/redis-cache.service';

@Injectable()
export class CollectionsService {
  private readonly audit = new Logger('KnowledgeAudit');
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly targets: TargetService,
    @Optional() private readonly cache?: RedisCacheService,
  ) {}
  async list(userId: string, workspaceId: string) {
    await this.access.requireRole(workspaceId, userId);
    const key = `collections:${workspaceId}`;
    const cached =
      await this.cache?.get<Awaited<ReturnType<CollectionsService['query']>>>(
        key,
      );
    if (cached) return cached;
    const result = await this.query(workspaceId);
    await this.cache?.set(key, result);
    return result;
  }
  private query(workspaceId: string) {
    return this.prisma.collection.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { items: true, children: true } },
        items: {
          include: {
            source: {
              select: { id: true, originalName: true, mimeType: true },
            },
            output: { select: { id: true, title: true, type: true } },
          },
        },
      },
    });
  }
  async create(userId: string, dto: CreateCollectionDto) {
    await this.access.requireRole(
      dto.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    if (dto.parentId) await this.inWorkspace(dto.parentId, dto.workspaceId);
    const position = await this.prisma.collection.count({
      where: {
        workspaceId: dto.workspaceId,
        parentId: dto.parentId ?? null,
        deletedAt: null,
      },
    });
    const result = await this.prisma.collection.create({
      data: {
        name: dto.name.trim(),
        workspaceId: dto.workspaceId,
        parentId: dto.parentId,
        position,
      },
    });
    await this.invalidate(dto.workspaceId);
    return result;
  }
  async update(userId: string, id: string, dto: UpdateCollectionDto) {
    const collection = await this.get(id);
    await this.access.requireRole(
      collection.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    if (dto.parentId === id)
      throw new BadRequestException('A collection cannot contain itself');
    if (dto.parentId) {
      await this.inWorkspace(dto.parentId, collection.workspaceId);
      const descendants = await this.descendantIds(id);
      if (descendants.includes(dto.parentId))
        throw new BadRequestException(
          'A collection cannot be moved into its descendant',
        );
    }
    const result = await this.prisma.collection.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
      },
    });
    await this.invalidate(collection.workspaceId);
    return result;
  }
  async remove(userId: string, id: string) {
    const collection = await this.get(id);
    await this.access.requireRole(
      collection.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    const ids = [id, ...(await this.descendantIds(id))];
    await this.prisma.collection.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });
    this.audit.log(
      JSON.stringify({
        action: 'collection.delete',
        userId,
        workspaceId: collection.workspaceId,
        collectionId: id,
        descendants: ids.length - 1,
      }),
    );
    await this.invalidate(collection.workspaceId);
    return { message: 'Collection deleted', count: ids.length };
  }
  async addItem(userId: string, collectionId: string, dto: CollectionItemDto) {
    const collection = await this.get(collectionId);
    if (collection.workspaceId !== dto.workspaceId)
      throw new NotFoundException('Collection not found');
    const target = await this.targets.validate(
      userId,
      dto,
      WorkspaceRole.EDITOR,
    );
    const result = await this.prisma.collectionItem.upsert({
      where: dto.sourceId
        ? { collectionId_sourceId: { collectionId, sourceId: dto.sourceId } }
        : { collectionId_outputId: { collectionId, outputId: dto.outputId! } },
      create: { collectionId, ...target },
      update: {},
    });
    await this.invalidate(collection.workspaceId);
    return result;
  }
  async removeItem(userId: string, collectionId: string, itemId: string) {
    const collection = await this.get(collectionId);
    await this.access.requireRole(
      collection.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    const result = await this.prisma.collectionItem.deleteMany({
      where: { id: itemId, collectionId },
    });
    if (!result.count) throw new NotFoundException('Collection item not found');
    await this.invalidate(collection.workspaceId);
    return { message: 'Item removed from collection' };
  }
  private async get(id: string) {
    const value = await this.prisma.collection.findFirst({
      where: { id, deletedAt: null },
    });
    if (!value) throw new NotFoundException('Collection not found');
    return value;
  }
  private async inWorkspace(id: string, workspaceId: string) {
    const value = await this.prisma.collection.findFirst({
      where: { id, workspaceId, deletedAt: null },
      select: { id: true },
    });
    if (!value) throw new NotFoundException('Parent collection not found');
  }
  private async descendantIds(id: string) {
    const found: string[] = [];
    let parents = [id];
    while (parents.length) {
      const children = await this.prisma.collection.findMany({
        where: { parentId: { in: parents }, deletedAt: null },
        select: { id: true },
      });
      parents = children.map((item) => item.id);
      found.push(...parents);
    }
    return found;
  }
  private async invalidate(workspaceId: string) {
    await Promise.all([
      this.cache?.del(`collections:${workspaceId}`),
      this.cache?.delByPrefix(`search:${workspaceId}:`),
    ]);
  }
}
