import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { StorageModule } from '../../storage/storage.module';
import { WorkspacesModule } from '../../workspaces/workspaces.module';
import { ImageTranslationController } from './image-translation.controller';
import { OcrController } from './ocr.controller';
import { ImageTranslationOcrService } from './image-translation-ocr.service';
import { ImageTranslationRendererService } from './image-translation-renderer.service';
import { ImageTranslationService } from './image-translation.service';
import { ImageTranslationTranslationService } from './image-translation-translation.service';

@Module({
  imports: [PrismaModule, StorageModule, WorkspacesModule],
  controllers: [ImageTranslationController, OcrController],
  providers: [
    ImageTranslationService,
    ImageTranslationOcrService,
    ImageTranslationTranslationService,
    ImageTranslationRendererService,
  ],
})
export class ImageTranslationModule {}
