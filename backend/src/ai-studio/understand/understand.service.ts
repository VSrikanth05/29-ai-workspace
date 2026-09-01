import { Injectable } from '@nestjs/common';
import { AiStudioService } from '../ai-studio.service';
import type { ToolRequestDto } from '../dto/tool-request.dto';

@Injectable()
export class UnderstandService {
  constructor(private readonly studio: AiStudioService) {}
  explain(userId: string, dto: ToolRequestDto) {
    return this.studio.transient(
      userId,
      dto,
      'Explain the supplied material clearly. Define difficult ideas, use examples where useful, and cite grounded sources.',
    );
  }
  rewrite(userId: string, dto: ToolRequestDto) {
    return this.studio.transient(
      userId,
      dto,
      'Rewrite the supplied material for clarity and flow while preserving meaning, factual details, headings, lists, and citations. Return only the rewritten content.',
    );
  }
  simplify(userId: string, dto: ToolRequestDto) {
    return this.studio.transient(
      userId,
      dto,
      'Simplify the supplied material for a general reader. Use short sentences and plain language without removing essential facts or citations.',
    );
  }
}
