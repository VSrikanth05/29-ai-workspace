import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ROLE_WEIGHT: Record<WorkspaceRole, number> = {
  VIEWER: 1,
  EDITOR: 2,
  OWNER: 3,
};

@Injectable()
export class WorkspaceAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireRole(
    workspaceId: string,
    userId: string,
    minimumRole: WorkspaceRole = WorkspaceRole.VIEWER,
  ) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    if (!membership) throw new NotFoundException('Workspace not found');
    if (ROLE_WEIGHT[membership.role] < ROLE_WEIGHT[minimumRole]) {
      throw new ForbiddenException('Insufficient workspace permissions');
    }
    return membership;
  }
}
