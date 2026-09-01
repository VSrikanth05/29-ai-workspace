import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

const SOURCE_STATUSES = [
  'UPLOADED',
  'PROCESSING',
  'PROCESSED',
  'FAILED',
] as const;
const SOURCE_FORMATS = [
  'pdf',
  'docx',
  'pptx',
  'xlsx',
  'csv',
  'md',
  'markdown',
  'txt',
] as const;

export class SourceListQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(SOURCE_STATUSES)
  status?: (typeof SOURCE_STATUSES)[number];

  @IsOptional()
  @Transform(({ value }: { value: string }) => value.toLowerCase())
  @IsIn(SOURCE_FORMATS)
  format?: (typeof SOURCE_FORMATS)[number];

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 30;
}
