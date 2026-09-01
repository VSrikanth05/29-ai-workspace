import { Injectable } from '@nestjs/common';
import { AIOutputType } from '@prisma/client';
import { AiStudioService } from '../ai-studio.service';
import type {
  SummaryRequestDto,
  ToolRequestDto,
} from '../dto/tool-request.dto';

const SUMMARY_GUIDANCE = {
  short: 'Use at most two concise paragraphs.',
  medium: 'Use clear sections with moderate detail.',
  detailed:
    'Provide a comprehensive structured summary with evidence and nuance.',
  bullet: 'Use a concise hierarchical bullet list.',
} as const;

@Injectable()
export class LearnService {
  constructor(private readonly studio: AiStudioService) {}
  summary(userId: string, dto: SummaryRequestDto) {
    const style = dto.style ?? 'medium';
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.SUMMARY,
      `${style[0].toUpperCase()}${style.slice(1)} Summary`,
      `Create a grounded ${style} summary. ${SUMMARY_GUIDANCE[style]} Preserve citations and use Markdown.`,
      { style },
    );
  }
  keyPoints(userId: string, dto: ToolRequestDto) {
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.KEY_POINTS,
      'Key Points',
      'Extract the most important claims, facts, decisions, and implications as a structured Markdown bullet list. Preserve citations.',
      {},
    );
  }
  glossary(userId: string, dto: ToolRequestDto) {
    return this.studio.persistent(
      userId,
      dto,
      AIOutputType.GLOSSARY,
      'Glossary',
      'Create an alphabetized Markdown glossary of important terms. Format each entry as **Term** — concise definition and preserve citations where applicable.',
      {},
    );
  }
}
