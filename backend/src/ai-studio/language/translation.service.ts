import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { TranslationRequestDto } from '../dto/tool-request.dto';
@Injectable()
export class TranslationService {
  constructor(private readonly studio: AiStudioService) {}
  translate(userId: string, dto: TranslationRequestDto) {
    const source =
      dto.sourceLanguage?.trim() || 'automatically detected language';
    const mode = dto.text?.trim() ? 'selected text' : 'document material';
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.TRANSLATION,
      `Translation — ${dto.targetLanguage}`,
      `Translate the ${mode} from ${source} into ${dto.targetLanguage}. Preserve Markdown headings, lists, tables, emphasis, paragraph breaks, citations, names, numbers, and meaning whenever possible. Return only the translated content.`,
      {
        targetLanguage: dto.targetLanguage,
        sourceLanguage: dto.sourceLanguage ?? null,
        mode,
      },
    );
  }
}
