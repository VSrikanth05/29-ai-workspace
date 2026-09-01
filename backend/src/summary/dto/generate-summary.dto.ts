import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const SUPPORTED_PROVIDERS = ['gpt', 'gemini', 'claude', 'llama', 'mock'];

export class GenerateSummaryDto {
  @ApiPropertyOptional({ enum: SUPPORTED_PROVIDERS, default: 'gemini' })
  @IsOptional()
  @IsIn(SUPPORTED_PROVIDERS)
  provider?: string;
}
