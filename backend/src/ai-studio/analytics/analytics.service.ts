import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { AnalyticsRequestDto } from '../dto/tool-request.dto';
import { AnalyticsEngineService } from './analytics-engine.service';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly studio: AiStudioService,
    private readonly engine: AnalyticsEngineService,
  ) {}
  async generate(userId: string, dto: AnalyticsRequestDto) {
    const source = await this.studio.analyticsSource(
      userId,
      dto.workspaceId,
      dto.sourceId,
    );
    const request = { ...dto, sourceIds: [dto.sourceId] };
    const report = this.engine.analyze(
      source.extractedText!,
      source.originalName,
    );
    return this.studio.persistComputed(
      userId,
      request,
      AIOutputType.ANALYTICS_REPORT,
      `Analytics — ${source.originalName}`,
      report,
      { sourceId: dto.sourceId },
    );
  }
}
