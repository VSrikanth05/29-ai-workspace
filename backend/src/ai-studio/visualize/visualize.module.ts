import { Module } from '@nestjs/common';
import { AiStudioCoreModule } from '../core/ai-studio-core.module';
import { MindMapController } from './mind-map.controller';
import { MindMapService } from './mind-map.service';
@Module({
  imports: [AiStudioCoreModule],
  controllers: [MindMapController],
  providers: [MindMapService],
})
export class VisualizeModule {}
