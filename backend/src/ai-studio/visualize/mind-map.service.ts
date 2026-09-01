import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { ToolRequestDto } from '../dto/tool-request.dto';
@Injectable()
export class MindMapService {
  constructor(private readonly studio: AiStudioService) {}
  generate(userId: string, dto: ToolRequestDto) {
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.MIND_MAP,
      'Mind Map',
      'Create a hierarchical mind map from the supplied material. Return ONLY valid JSON with this recursive shape: {"id":"root","label":"Main topic","children":[{"id":"unique-id","label":"Concept","children":[]}]}. Use short labels, unique IDs, no Markdown fence, and no prose.',
      {},
    );
  }
}
