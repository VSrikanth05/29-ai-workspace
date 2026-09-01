import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type { ReportRequestDto } from '../dto/tool-request.dto';

const REPORT_GUIDANCE = {
  executive:
    'Prioritize a decision-ready executive summary with concise supporting sections.',
  detailed:
    'Provide a comprehensive detailed analysis with evidence and clearly labeled sections.',
  bullet: 'Use concise hierarchical bullets throughout the report.',
} as const;

@Injectable()
export class ReportService {
  constructor(private readonly studio: AiStudioService) {}
  generate(userId: string, dto: ReportRequestDto) {
    const style = dto.style ?? 'detailed';
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.REPORT,
      `${style[0].toUpperCase()}${style.slice(1)} Report`,
      `Create a grounded professional report in Markdown. ${REPORT_GUIDANCE[style]} Include Executive Summary, Findings, Action Items, and Conclusions. Preserve citations.`,
      { style, pdfExport: 'hook-only' },
    );
  }
}
