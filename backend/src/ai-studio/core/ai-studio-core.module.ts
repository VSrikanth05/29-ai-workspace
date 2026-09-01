import { Module } from '@nestjs/common';
import { AiModule } from '../../ai/ai.module';
import { WorkspacesModule } from '../../workspaces/workspaces.module';
import { AiStudioService } from '../ai-studio.service';
@Module({
  imports: [AiModule, WorkspacesModule],
  providers: [AiStudioService],
  exports: [AiStudioService],
})
export class AiStudioCoreModule {}
