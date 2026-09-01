import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { FlashcardsRequestDto } from '../dto/tool-request.dto';

@Injectable()
export class FlashcardService {
  constructor(private readonly studio: AiStudioService) {}

  generate(userId: string, dto: FlashcardsRequestDto) {
    const count = dto.count ?? 10;
    const difficulty = dto.difficulty ?? 'medium';
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.FLASHCARDS,
      'Flashcards',
      `Create exactly ${count} ${difficulty} flashcards. Return only JSON: {"flashcards":[{"question":"...","answer":"...","difficulty":"easy|medium|hard","category":"..."}]}. Questions must test useful recall and answers must be grounded in the supplied material.`,
      { count, difficulty },
    );
  }
}
