import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MediaController } from './media.controller';
import { MediaGenerationService } from './media-generation.service';

@Module({
  imports: [StorageModule, WorkspacesModule],
  controllers: [MediaController],
  providers: [MediaGenerationService],
})
export class MediaModule {}
