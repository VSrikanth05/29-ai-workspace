import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { ToolRequestDto } from '../dto/tool-request.dto';

@Injectable()
export class PresentationService {
  constructor(private readonly studio: AiStudioService) {}

  generate(userId: string, dto: ToolRequestDto) {
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.REPORT,
      'Presentation Deck',
      `Create a complete, structured presentation deck based on the provided material.
Format the presentation with clear slide demarcations using Markdown:
- Each slide MUST start with '# Slide N: [Slide Title]'
- Include 3 to 5 concise, impactful bullet points per slide ('* Point')
- Include a takeaway or key statistic ('**Takeaway:** ...')
- Include speaker notes under each slide formatted as a blockquote ('> **Speaker Notes:** ...')
Ensure the presentation has:
1. Title Slide & Agenda
2. Key Problem / Objective
3. Core Insights & Supporting Evidence (multiple body slides)
4. Strategic Recommendations & Next Steps
5. Q&A / Summary Slide

Preserve grounded citations where applicable.`,
      { format: 'presentation', slideDeck: true },
    );
  }
}
