import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { AI_PROVIDERS } from '../../ai/dto/ai-chat.dto';

export class ToolRequestDto {
  @IsString() workspaceId!: string;
  @IsOptional() @IsString() conversationId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) sourceIds?: string[];
  @IsOptional() @IsString() @MaxLength(20000) text?: string;
  @IsOptional() @IsIn(AI_PROVIDERS) provider?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32768)
  maxTokens?: number;
}

export const SUMMARY_STYLES = [
  'short',
  'medium',
  'detailed',
  'bullet',
] as const;
export class SummaryRequestDto extends ToolRequestDto {
  @IsOptional() @IsIn(SUMMARY_STYLES) style?: (typeof SUMMARY_STYLES)[number];
}

export class TranslationRequestDto extends ToolRequestDto {
  @IsString() @IsNotEmpty() @MaxLength(80) targetLanguage!: string;
  @IsOptional() @IsString() @MaxLength(80) sourceLanguage?: string;
}

export const REPORT_STYLES = ['executive', 'detailed', 'bullet'] as const;
export class ReportRequestDto extends ToolRequestDto {
  @IsOptional() @IsIn(REPORT_STYLES) style?: (typeof REPORT_STYLES)[number];
}

export const LEARNING_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export const LEARNING_COUNTS = [5, 10, 20] as const;

export class FlashcardsRequestDto extends ToolRequestDto {
  @IsOptional()
  @IsIn(LEARNING_DIFFICULTIES)
  difficulty?: (typeof LEARNING_DIFFICULTIES)[number];
  @IsOptional() @Type(() => Number) @IsIn(LEARNING_COUNTS) count?: number;
}

export class QuizRequestDto extends ToolRequestDto {
  @IsOptional()
  @IsIn(LEARNING_DIFFICULTIES)
  difficulty?: (typeof LEARNING_DIFFICULTIES)[number];
  @IsOptional()
  @Type(() => Number)
  @IsIn(LEARNING_COUNTS)
  questionCount?: number;
}

export const CHART_TYPES = [
  'bar',
  'line',
  'pie',
  'scatter',
  'histogram',
  'area',
] as const;

export class AnalyticsRequestDto extends ToolRequestDto {
  @IsString() @IsNotEmpty() sourceId!: string;
}

export class ChartRequestDto extends AnalyticsRequestDto {
  @IsIn(CHART_TYPES) chartType!: (typeof CHART_TYPES)[number];
  @IsOptional() @IsString() @MaxLength(200) xKey?: string;
  @IsOptional() @IsString() @MaxLength(200) yKey?: string;
}

export class ExportOutputQueryDto {
  @IsIn(['markdown', 'json', 'csv']) format!: 'markdown' | 'json' | 'csv';
}

export class OutputListQueryDto {
  @IsString() workspaceId!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}
