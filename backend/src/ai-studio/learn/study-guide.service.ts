import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { ToolRequestDto } from '../dto/tool-request.dto';

@Injectable()
export class StudyGuideService {
  constructor(private readonly studio: AiStudioService) {}

  generate(userId: string, dto: ToolRequestDto) {
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.STUDY_GUIDE,
      'Study Guide',
      'Create a grounded Markdown study guide with these sections: Overview, Important Concepts, Definitions, Examples, Recommended Reading, and Learning Path. Make the learning path ordered and actionable. Preserve citations.',
    );
  }
}
