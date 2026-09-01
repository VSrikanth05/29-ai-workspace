import {
  GoneException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspaceRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { TargetService } from '../knowledge/target.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import type { CreateShareDto } from './sharing.dto';
@Injectable()
export class SharingService {
  private readonly audit = new Logger('KnowledgeAudit');
  constructor(
    private readonly prisma: PrismaService,
    private readonly targets: TargetService,
    private readonly access: WorkspaceAccessService,
    private readonly config: ConfigService,
  ) {}
  async create(userId: string, dto: CreateShareDto) {
    const target = await this.targets.validate(
      userId,
      dto,
      WorkspaceRole.EDITOR,
    );
    const token = randomBytes(32).toString('base64url');
    const share = await this.prisma.shareLink.create({
      data: {
        tokenHash: this.hash(token),
        workspaceId: dto.workspaceId,
        userId,
        ...target,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
    this.audit.log(
      JSON.stringify({
        action: 'share.create',
        userId,
        workspaceId: dto.workspaceId,
        shareId: share.id,
        expiresAt: share.expiresAt,
      }),
    );
    const base = (
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    return { ...share, tokenHash: undefined, url: `${base}/shared/${token}` };
  }
  async disable(userId: string, id: string) {
    const share = await this.prisma.shareLink.findUnique({ where: { id } });
    if (!share) throw new NotFoundException('Share link not found');
    await this.access.requireRole(
      share.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    await this.prisma.shareLink.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
    this.audit.log(
      JSON.stringify({
        action: 'share.disable',
        userId,
        workspaceId: share.workspaceId,
        shareId: id,
      }),
    );
    return { message: 'Share link disabled' };
  }
  async view(token: string) {
    const share = await this.prisma.shareLink.findUnique({
      where: { tokenHash: this.hash(token) },
      include: {
        source: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            extractedText: true,
            updatedAt: true,
          },
        },
        output: {
          select: {
            id: true,
            title: true,
            type: true,
            content: true,
            provider: true,
            model: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!share) throw new NotFoundException('Share link not found');
    if (share.revokedAt || (share.expiresAt && share.expiresAt <= new Date()))
      throw new GoneException('Share link is no longer available');
    return {
      id: share.id,
      expiresAt: share.expiresAt,
      source: share.source,
      output: share.output,
    };
  }
  private hash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
