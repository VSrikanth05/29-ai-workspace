import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TargetService } from './target.service';
import type { TargetDto } from './dto/target.dto';

@Injectable()
export class FavoritesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly targets: TargetService,
  ) {}
  async list(userId: string, workspaceId: string) {
    await this.targets.requireWorkspace(userId, workspaceId);
    return this.prisma.favorite.findMany({
      where: { userId, workspaceId },
      orderBy: { createdAt: 'desc' },
      include: {
        source: {
          select: {
            id: true,
            originalName: true,
            mimeType: true,
            updatedAt: true,
          },
        },
        output: {
          select: { id: true, title: true, type: true, updatedAt: true },
        },
      },
    });
  }
  async create(userId: string, dto: TargetDto) {
    const target = await this.targets.validate(userId, dto);
    return this.prisma.favorite.upsert({
      where: dto.sourceId
        ? { userId_sourceId: { userId, sourceId: dto.sourceId } }
        : { userId_outputId: { userId, outputId: dto.outputId! } },
      create: { userId, workspaceId: dto.workspaceId, ...target },
      update: {},
    });
  }
  async remove(userId: string, id: string) {
    const favorite = await this.prisma.favorite.findFirst({
      where: { id, userId },
    });
    if (!favorite) throw new NotFoundException('Favorite not found');
    await this.prisma.favorite.delete({ where: { id } });
    return { message: 'Favorite removed' };
  }
}
