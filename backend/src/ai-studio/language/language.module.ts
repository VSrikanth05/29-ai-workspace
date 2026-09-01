import { Module } from '@nestjs/common';
import { AiStudioCoreModule } from '../core/ai-studio-core.module';
import { TranslationController } from './translation.controller';
import { TranslationService } from './translation.service';
@Module({
  imports: [AiStudioCoreModule],
  controllers: [TranslationController],
  providers: [TranslationService],
})
export class LanguageModule {}
