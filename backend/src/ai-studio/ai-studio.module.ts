import { Module } from '@nestjs/common';
import { AiStudioCoreModule } from './core/ai-studio-core.module';
import { UnderstandModule } from './understand/understand.module';
import { LearnModule } from './learn/learn.module';
import { VisualizeModule } from './visualize/visualize.module';
import { LanguageModule } from './language/language.module';
import { CreateModule } from './create/create.module';
import { OutputsController } from './outputs.controller';
import { AnalyticsModule } from './analytics/analytics.module';
import { ImageTranslationModule } from './image-translation/image-translation.module';
@Module({
  imports: [
    AiStudioCoreModule,
    UnderstandModule,
    LearnModule,
    VisualizeModule,
    LanguageModule,
    CreateModule,
    AnalyticsModule,
    ImageTranslationModule,
  ],
  controllers: [OutputsController],
})
export class AiStudioModule {}
