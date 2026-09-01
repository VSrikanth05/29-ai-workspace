import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { SUPPORTED_PROVIDERS } from '../../summary/dto/generate-summary.dto';

export const DIAGRAM_TYPES = [
  'flowchart',
  'sequenceDiagram',
  'classDiagram',
  'mindmap',
];

export class GenerateDiagramDto {
  @ApiPropertyOptional({ enum: SUPPORTED_PROVIDERS, default: 'gemini' })
  @IsOptional()
  @IsIn(SUPPORTED_PROVIDERS)
  provider?: string;

  @ApiPropertyOptional({ enum: DIAGRAM_TYPES, default: 'flowchart' })
  @IsOptional()
  @IsIn(DIAGRAM_TYPES)
  diagramType?: string;
}
