import { Module } from '@nestjs/common';
import { AiStudioCoreModule } from '../core/ai-studio-core.module';
import { LearnController } from './learn.controller';
import { LearnService } from './learn.service';
import { FlashcardService } from './flashcard.service';
import { QuizService } from './quiz.service';
import { StudyGuideService } from './study-guide.service';
@Module({
  imports: [AiStudioCoreModule],
  controllers: [LearnController],
  providers: [LearnService, FlashcardService, QuizService, StudyGuideService],
})
export class LearnModule {}
