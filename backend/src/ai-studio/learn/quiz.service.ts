import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { QuizRequestDto } from '../dto/tool-request.dto';

@Injectable()
export class QuizService {
  constructor(private readonly studio: AiStudioService) {}

  generate(userId: string, dto: QuizRequestDto) {
    const count = dto.questionCount ?? 10;
    const difficulty = dto.difficulty ?? 'medium';
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.QUIZ,
      'Quiz',
      `Create exactly ${count} ${difficulty} quiz questions, mixing multiple-choice, true-false, and short-answer. Return only JSON: {"questions":[{"id":"q1","type":"multiple-choice|true-false|short-answer","prompt":"...","options":["..."],"answer":"...","explanation":"...","difficulty":"easy|medium|hard"}]}. Multiple-choice questions need four options; true-false needs options ["True","False"]. Answers and explanations must be grounded.`,
      { questionCount: count, difficulty },
    );
  }
}
