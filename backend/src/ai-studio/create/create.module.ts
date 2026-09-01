import { Module } from '@nestjs/common';
import { AiStudioCoreModule } from '../core/ai-studio-core.module';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { PresentationService } from './presentation.service';

@Module({
  imports: [AiStudioCoreModule],
  controllers: [ReportController],
  providers: [ReportService, PresentationService],
})
export class CreateModule {}
