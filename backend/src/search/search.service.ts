import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { RedisCacheService } from '../infrastructure/redis-cache.service';
import { CreateSavedSearchDto } from '../knowledge/dto/target.dto';
import { RetrievalPipelineService } from '../rag/retrieval/retrieval-pipeline.service';
import type { RetrievalMode } from '../rag/retrieval/retrieval.types';
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    @Optional() private readonly cache?: RedisCacheService,
    @Optional() private readonly retrieval?: RetrievalPipelineService,
  ) {}
  async search(
    userId: string,
    workspaceId: string,
    raw: string,
    tagId?: string,
    mode: 'lexical' | 'semantic' | 'hybrid' = 'lexical',
  ) {
    await this.access.requireRole(workspaceId, userId);
    const query = raw.trim().slice(0, 200);
    if (!query)
      return {
        query,
        total: 0,
        groups: {
          sources: [],
          conversations: [],
          outputs: [],
          collections: [],
          tags: [],
        },
      };
    if (mode !== 'lexical') return this.searchContent(userId, workspaceId, query, tagId, mode);
    const cacheKey = `search:${workspaceId}:${tagId ?? 'all'}:${mode}:${query.toLocaleLowerCase()}`;
    const cached = await this.cache?.get<{
      query: string;
      total: number;
      groups: Record<string, unknown[]>;
    }>(cacheKey);
    if (cached) return cached;
    const taggedSources = tagId
      ? { tagAssignments: { some: { tagId, tag: { deletedAt: null } } } }
      : {};
    const taggedOutputs = tagId
      ? { tagAssignments: { some: { tagId, tag: { deletedAt: null } } } }
      : {};
    const [sources, conversations, outputs, collections, tags] =
      await Promise.all([
        this.prisma.document.findMany({
          where: {
            workspaceId,
            originalName: { contains: query, mode: 'insensitive' },
            ...taggedSources,
          },
          take: 8,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            updatedAt: true,
          },
        }),
        this.prisma.chatSession.findMany({
          where: {
            workspaceId,
            title: { contains: query, mode: 'insensitive' },
          },
          take: 8,
          orderBy: { lastActivityAt: 'desc' },
          select: { id: true, title: true, lastActivityAt: true },
        }),
        this.prisma.aIOutput.findMany({
          where: {
            workspaceId,
            title: { contains: query, mode: 'insensitive' },
            ...taggedOutputs,
          },
          take: 8,
          orderBy: { updatedAt: 'desc' },
          select: { id: true, title: true, type: true, updatedAt: true },
        }),
        this.prisma.collection.findMany({
          where: {
            workspaceId,
            deletedAt: null,
            name: { contains: query, mode: 'insensitive' },
          },
          take: 8,
          select: { id: true, name: true, parentId: true },
        }),
        this.prisma.tag.findMany({
          where: {
            workspaceId,
            deletedAt: null,
            name: { contains: query, mode: 'insensitive' },
          },
          take: 8,
          select: { id: true, name: true, color: true },
        }),
      ]);
    const match = (label: string) => ({
      label,
      highlight: this.highlight(label, query),
    });
    const groups = {
      sources: sources.map((item) => ({
        ...item,
        ...match(item.originalName),
        kind: 'source',
      })),
      conversations: conversations.map((item) => ({
        ...item,
        ...match(item.title),
        kind: 'conversation',
      })),
      outputs: outputs.map((item) => ({
        ...item,
        ...match(item.title),
        kind: 'output',
      })),
      collections: collections.map((item) => ({
        ...item,
        ...match(item.name),
        kind: 'collection',
      })),
      tags: tags.map((item) => ({ ...item, ...match(item.name), kind: 'tag' })),
    };
    const result = {
      query,
      total: Object.values(groups).reduce(
        (sum, items) => sum + items.length,
        0,
      ),
      groups,
    };
    await this.cache?.set(cacheKey, result);
    return result;
  }

  private async searchContent(
    userId: string,
    workspaceId: string,
    query: string,
    tagId: string | undefined,
    mode: 'semantic' | 'hybrid',
  ) {
    if (!this.retrieval) throw new Error('Semantic search is not configured.');
    let documentIds: string[] | undefined;
    if (tagId) {
      const documents = await this.prisma.document.findMany({
        where: { workspaceId, tagAssignments: { some: { tagId, tag: { deletedAt: null } } } },
        select: { id: true },
        take: 50,
      });
      documentIds = documents.map((document) => document.id);
      if (!documentIds.length) return { query, total: 0, groups: { sources: [], conversations: [], outputs: [], collections: [], tags: [] } };
    }
    const candidates = await this.retrieval.retrieve(
      { userId, workspaceId, query, metadataFilter: documentIds ? { documentIds } : undefined },
      { mode: mode as RetrievalMode, topK: 12 },
    );
    const sources = candidates.map((candidate) => ({
      id: candidate.documentId,
      kind: 'source' as const,
      label: candidate.originalName,
      snippet: candidate.content.slice(0, 240),
      score: candidate.score,
      retrievalMethods: candidate.retrievalMethods,
      highlight: this.highlight(candidate.originalName, query),
    }));
    return { query, total: sources.length, groups: { sources, conversations: [], outputs: [], collections: [], tags: [] } };
  }

  async listSaved(userId: string, workspaceId: string) {
    await this.access.requireRole(workspaceId, userId);
    return this.prisma.savedSearch.findMany({
      where: { userId, workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: { tag: { select: { id: true, name: true, color: true } } },
    });
  }

  async createSaved(userId: string, dto: CreateSavedSearchDto) {
    await this.access.requireRole(dto.workspaceId, userId);
    const name = dto.name.trim().slice(0, 120);
    const query = dto.query.trim().slice(0, 200);
    if (!name || !query) throw new BadRequestException('Saved search name and query are required.');
    if (dto.tagId) {
      const tag = await this.prisma.tag.findFirst({ where: { id: dto.tagId, workspaceId: dto.workspaceId, deletedAt: null } });
      if (!tag) throw new BadRequestException('Saved search tag not found.');
    }
    return this.prisma.savedSearch.upsert({
      where: { userId_workspaceId_name: { userId, workspaceId: dto.workspaceId, name } },
      update: { query, tagId: dto.tagId ?? null },
      create: { userId, workspaceId: dto.workspaceId, name, query, tagId: dto.tagId },
    });
  }

  async removeSaved(userId: string, id: string) {
    const saved = await this.prisma.savedSearch.findFirst({ where: { id, userId } });
    if (!saved) return { message: 'Saved search removed' };
    await this.access.requireRole(saved.workspaceId, userId);
    await this.prisma.savedSearch.delete({ where: { id } });
    return { message: 'Saved search removed' };
  }
  private highlight(label: string, query: string) {
    const index = label.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    return index < 0
      ? [{ text: label, match: false }]
      : [
          { text: label.slice(0, index), match: false },
          { text: label.slice(index, index + query.length), match: true },
          { text: label.slice(index + query.length), match: false },
        ].filter((part) => part.text);
  }
}
