import { createHash, randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceRole, type Document } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Inject } from '@nestjs/common';
import { OBJECT_STORAGE, type ObjectStorage } from '../storage/object-storage';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { DocumentIngestionService } from './document-ingestion.service';
import { IngestionQueueService } from './ingestion-queue.service';
import { RedisCacheService } from '../infrastructure/redis-cache.service';
import { SourceListQueryDto } from './dto/source-list-query.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(OBJECT_STORAGE) private readonly storage: ObjectStorage,
    private readonly ingestion: DocumentIngestionService,
    private readonly ingestionQueue: IngestionQueueService,
    private readonly cache: RedisCacheService,
    private readonly workspaces: WorkspacesService,
    private readonly workspaceAccess: WorkspaceAccessService,
  ) {}

  async createDocument(
    file: Express.Multer.File,
    userId: string,
    requestedWorkspaceId?: string,
  ) {
    const workspace = requestedWorkspaceId
      ? { id: requestedWorkspaceId }
      : await this.workspaces.ensurePersonalWorkspace(userId);
    await this.workspaceAccess.requireRole(
      workspace.id,
      userId,
      WorkspaceRole.EDITOR,
    );
    const storageKey = this.buildStorageKey(
      workspace.id,
      userId,
      file.originalname,
    );
    await this.storage.upload(storageKey, file.buffer, file.mimetype);

    let document: Document;
    try {
      document = await this.prisma.document.create({
        data: {
          originalName: file.originalname,
          fileName: storageKey.split('/').pop() ?? file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          storagePath: storageKey,
          storageBucket: this.storage.bucketName,
          checksum: createHash('sha256').update(file.buffer).digest('hex'),
          userId,
          workspaceId: workspace.id,
        },
      });
    } catch (error) {
      await this.storage.remove(storageKey);
      throw error;
    }
    await this.invalidateLists(userId, workspace.id);

    if (this.ingestionQueue.enabled) {
      await this.ingestionQueue.enqueue(document.id);
      return { ...document, chunks: [] };
    }
    await this.ingestion.process(document.id, file.buffer);
    return this.prisma.document.findUnique({
      where: { id: document.id },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });
  }

  async listDocuments(userId: string) {
    const key = `documents:${userId}`;
    const cached =
      await this.cache.get<Awaited<ReturnType<typeof this.queryDocuments>>>(
        key,
      );
    if (cached) return cached;
    const documents = await this.queryDocuments(userId);
    await this.cache.set(key, documents, 30);
    return documents;
  }

  private queryDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        size: true,
        status: true,
        createdAt: true,
      },
    });
  }

  async listSources(
    userId: string,
    workspaceId: string,
    query: SourceListQueryDto,
  ) {
    await this.workspaceAccess.requireRole(workspaceId, userId);
    const nameFilters: Prisma.StringFilter[] = [];
    if (query.search?.trim())
      nameFilters.push({ contains: query.search.trim(), mode: 'insensitive' });
    if (query.format)
      nameFilters.push({
        endsWith: `.${query.format === 'markdown' ? 'md' : query.format}`,
        mode: 'insensitive',
      });
    const where: Prisma.DocumentWhereInput = {
      workspaceId,
      ...(query.status ? { status: query.status } : {}),
      ...(nameFilters.length
        ? { AND: nameFilters.map((originalName) => ({ originalName })) }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: query.limit + 1,
        ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          status: true,
          metadata: true,
          processingError: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.document.count({ where }),
    ]);
    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return {
      items,
      total,
      nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null,
    };
  }

  async getDocument(userId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, userId },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });
    if (!document) throw new NotFoundException('Document not found');
    return document;
  }

  async getSource(userId: string, workspaceId: string, sourceId: string) {
    await this.workspaceAccess.requireRole(workspaceId, userId);
    const source = await this.prisma.document.findFirst({
      where: { id: sourceId, workspaceId },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });
    if (!source) throw new NotFoundException('Source not found');
    return source;
  }

  async getDownloadUrl(userId: string, documentId: string) {
    const document = await this.getDocument(userId, documentId);
    return this.signDownload(document.id, document.storagePath);
  }

  async getSourceDownloadUrl(
    userId: string,
    workspaceId: string,
    sourceId: string,
  ) {
    const source = await this.getSource(userId, workspaceId, sourceId);
    return this.signDownload(source.id, source.storagePath);
  }

  private async signDownload(id: string, storagePath: string) {
    const key = `download-url:${id}`;
    const cached = await this.cache.get<{ url: string }>(key);
    if (cached) return cached;
    const result = { url: await this.storage.getSignedUrl(storagePath) };
    await this.cache.set(key, result, 300);
    return result;
  }

  async retrySource(userId: string, workspaceId: string, sourceId: string) {
    await this.workspaceAccess.requireRole(
      workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    const source = await this.getSource(userId, workspaceId, sourceId);
    if (source.status !== 'FAILED')
      throw new BadRequestException('Only failed sources can be retried');
    await this.prisma.document.update({
      where: { id: sourceId },
      data: { status: 'UPLOADED', processingError: null },
    });
    if (this.ingestionQueue.enabled)
      await this.ingestionQueue.enqueue(sourceId);
    else await this.ingestion.process(sourceId);
    await this.invalidateLists(userId, workspaceId);
    return { message: 'Source ingestion restarted', sourceId };
  }

  async deleteDocument(userId: string, documentId: string) {
    const document = await this.getDocument(userId, documentId);
    await this.remove(document, userId);
    return { message: 'Document deleted' };
  }

  async deleteSource(userId: string, workspaceId: string, sourceId: string) {
    await this.workspaceAccess.requireRole(
      workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    const source = await this.getSource(userId, workspaceId, sourceId);
    await this.remove(source, userId);
    return { message: 'Source deleted' };
  }

  private async remove(
    document: { id: string; storagePath: string; workspaceId: string },
    userId: string,
  ) {
    await this.storage.remove(document.storagePath);
    await this.prisma.document.delete({ where: { id: document.id } });
    await this.invalidateLists(userId, document.workspaceId, document.id);
  }

  private async invalidateLists(
    userId: string,
    workspaceId: string,
    documentId?: string,
  ) {
    await Promise.all([
      this.cache.del(
        `documents:${userId}`,
        `sources:${workspaceId}`,
        ...(documentId ? [`download-url:${documentId}`] : []),
      ),
      this.cache.delByPrefix(`search:${workspaceId}:`),
    ]);
  }

  private buildStorageKey(
    workspaceId: string,
    userId: string,
    originalName: string,
  ): string {
    const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `${workspaceId}/${userId}/${randomUUID()}-${safeName}`;
  }
}
