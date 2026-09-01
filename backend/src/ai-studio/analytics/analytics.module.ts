import { Module } from '@nestjs/common';
import { AiStudioCoreModule } from '../core/ai-studio-core.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsEngineService } from './analytics-engine.service';
import { AnalyticsService } from './analytics.service';
import { ChartService } from './chart.service';

@Module({
  imports: [AiStudioCoreModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsEngineService, AnalyticsService, ChartService],
})
export class AnalyticsModule {}
