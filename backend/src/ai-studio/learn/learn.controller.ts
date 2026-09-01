import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import {
  SupabaseAuthGuard,
  type RequestUser,
} from '../../auth/guards/supabase-auth.guard';
import {
  FlashcardsRequestDto,
  QuizRequestDto,
  SummaryRequestDto,
  ToolRequestDto,
} from '../dto/tool-request.dto';
import { FlashcardService } from './flashcard.service';
import { QuizService } from './quiz.service';
import { StudyGuideService } from './study-guide.service';
import { LearnService } from './learn.service';
@ApiTags('AI Studio — Learn')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard)
@Controller('ai-studio')
export class LearnController {
  constructor(
    private readonly service: LearnService,
    private readonly flashcards: FlashcardService,
    private readonly quizzes: QuizService,
    private readonly studyGuides: StudyGuideService,
  ) {}
  @Post('summary') summary(
    @Body() dto: SummaryRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.summary(user.userId, dto);
  }
  @Post('key-points') keyPoints(
    @Body() dto: ToolRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.keyPoints(user.userId, dto);
  }
  @Post('glossary') glossary(
    @Body() dto: ToolRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.service.glossary(user.userId, dto);
  }
  @Post('flashcards') flashcardSet(
    @Body() dto: FlashcardsRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.flashcards.generate(user.userId, dto);
  }
  @Post('quiz') quiz(
    @Body() dto: QuizRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.quizzes.generate(user.userId, dto);
  }
  @Post('study-guide') studyGuide(
    @Body() dto: ToolRequestDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.studyGuides.generate(user.userId, dto);
  }
}
