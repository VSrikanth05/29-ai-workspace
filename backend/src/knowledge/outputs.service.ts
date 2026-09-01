import {
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { Prisma, WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import { RedisCacheService } from '../infrastructure/redis-cache.service';

@Injectable()
export class KnowledgeOutputsService {
  private readonly audit = new Logger('KnowledgeAudit');
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    @Optional() private readonly cache?: RedisCacheService,
  ) {}
  async versions(userId: string, outputId: string) {
    const output = await this.output(userId, outputId);
    const count = await this.prisma.outputVersion.count({
      where: { outputId },
    });
    if (!count) await this.snapshot(output, 'CREATED');
    return this.prisma.outputVersion.findMany({
      where: { outputId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        event: true,
        title: true,
        provider: true,
        model: true,
        metadata: true,
        createdAt: true,
      },
    });
  }
  async restore(userId: string, outputId: string, versionId: string) {
    const output = await this.output(userId, outputId, WorkspaceRole.EDITOR);
    const version = await this.prisma.outputVersion.findFirst({
      where: { id: versionId, outputId },
    });
    if (!version) throw new NotFoundException('Output version not found');
    await this.snapshot(output, 'UPDATED');
    const restored = await this.prisma.aIOutput.update({
      where: { id: outputId },
      data: {
        title: version.title,
        content: version.content as Prisma.InputJsonValue,
        metadata: version.metadata as Prisma.InputJsonValue,
        provider: version.provider,
        model: version.model,
      },
    });
    await this.snapshot(restored, 'RESTORED');
    this.audit.log(
      JSON.stringify({
        action: 'output.restore',
        userId,
        workspaceId: output.workspaceId,
        outputId,
        versionId,
      }),
    );
    await this.invalidate(userId, output.workspaceId);
    return restored;
  }
  async duplicate(userId: string, outputId: string) {
    const output = await this.output(userId, outputId, WorkspaceRole.EDITOR);
    const result = await this.prisma.aIOutput.create({
      data: {
        type: output.type,
        title: `${output.title} (copy)`,
        content: output.content as Prisma.InputJsonValue,
        metadata: output.metadata as Prisma.InputJsonValue,
        provider: output.provider,
        model: output.model,
        userId,
        workspaceId: output.workspaceId,
        conversationId: output.conversationId,
        sources: {
          create: output.sources.map(({ sourceId }) => ({ sourceId })),
        },
        versions: {
          create: {
            event: 'CREATED',
            title: `${output.title} (copy)`,
            content: output.content as Prisma.InputJsonValue,
            metadata: output.metadata as Prisma.InputJsonValue,
            provider: output.provider,
            model: output.model,
          },
        },
      },
    });
    await this.invalidate(userId, output.workspaceId);
    return result;
  }
  async remove(userId: string, outputId: string) {
    const output = await this.output(userId, outputId, WorkspaceRole.EDITOR);
    await this.prisma.aIOutput.delete({ where: { id: outputId } });
    this.audit.log(
      JSON.stringify({
        action: 'output.delete',
        userId,
        workspaceId: output.workspaceId,
        outputId,
      }),
    );
    await this.invalidate(userId, output.workspaceId);
    return { message: 'Output deleted' };
  }
  private async output(
    userId: string,
    id: string,
    role: WorkspaceRole = WorkspaceRole.VIEWER,
  ) {
    const output = await this.prisma.aIOutput.findUnique({
      where: { id },
      include: { sources: true },
    });
    if (!output) throw new NotFoundException('AI output not found');
    await this.access.requireRole(output.workspaceId, userId, role);
    return output;
  }
  private snapshot(
    output: {
      id: string;
      title: string;
      content: unknown;
      metadata: unknown;
      provider: string;
      model: string;
    },
    event: string,
  ) {
    return this.prisma.outputVersion.create({
      data: {
        outputId: output.id,
        event,
        title: output.title,
        content: output.content as Prisma.InputJsonValue,
        metadata: output.metadata as Prisma.InputJsonValue,
        provider: output.provider,
        model: output.model,
      },
    });
  }
  private async invalidate(userId: string, workspaceId: string) {
    await Promise.all([
      this.cache?.del(`outputs:${workspaceId}:${userId}`),
      this.cache?.delByPrefix(`search:${workspaceId}:`),
    ]);
  }
}
