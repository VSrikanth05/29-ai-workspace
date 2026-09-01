import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WorkspaceRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { WorkspaceAccessService } from '../workspaces/workspace-access.service';
import type { UpdatePreferencesDto } from './preferences.dto';
import { RedisCacheService } from '../infrastructure/redis-cache.service';

@Injectable()
export class PreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: WorkspaceAccessService,
    private readonly config: ConfigService,
    @Optional() private readonly cache?: RedisCacheService,
  ) {}
  async get(userId: string, workspaceId: string) {
    await this.access.requireRole(workspaceId, userId);
    const key = `preferences:${workspaceId}`;
    const cached = await this.cache?.get(key);
    if (cached) return cached;
    const defaultProvider = this.config.get<string>('LLM_PROVIDER') || 'nvidia';
    const defaultModel =
      this.config.get<string>('NVIDIA_MODEL') || 'moonshotai/kimi-k3';

    const result = await this.prisma.workspacePreference.upsert({
      where: { workspaceId },
      create: { workspaceId, defaultProvider, defaultModel },
      update: {},
    });
    await this.cache?.set(key, result);
    return result;
  }
  async update(userId: string, dto: UpdatePreferencesDto) {
    await this.access.requireRole(
      dto.workspaceId,
      userId,
      WorkspaceRole.EDITOR,
    );
    const { workspaceId, ...data } = dto;
    const result = await this.prisma.workspacePreference.upsert({
      where: { workspaceId },
      create: { workspaceId, ...data },
      update: data,
    });
    await this.cache?.del(`preferences:${workspaceId}`);
    return result;
  }
}
