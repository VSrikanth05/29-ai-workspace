import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import type { TargetDto } from './dto/target.dto';

@Injectable()
export class TargetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
  ) {}

  async validate(
    userId: string,
    target: TargetDto,
    role: WorkspaceRole = WorkspaceRole.VIEWER,
  ) {
    await this.access.requireRole(target.workspaceId, userId, role);
    if (Boolean(target.sourceId) === Boolean(target.outputId))
      throw new BadRequestException(
        'Exactly one sourceId or outputId is required',
      );
    const exists = target.sourceId
      ? await this.prisma.document.findFirst({
          where: { id: target.sourceId, workspaceId: target.workspaceId },
          select: { id: true },
        })
      : await this.prisma.aIOutput.findFirst({
          where: { id: target.outputId, workspaceId: target.workspaceId },
          select: { id: true },
        });
    if (!exists) throw new NotFoundException('Workspace item not found');
    return { sourceId: target.sourceId, outputId: target.outputId };
  }
  requireWorkspace(
    userId: string,
    workspaceId: string,
    role: WorkspaceRole = WorkspaceRole.VIEWER,
  ) {
    return this.access.requireRole(workspaceId, userId, role);
  }
}
