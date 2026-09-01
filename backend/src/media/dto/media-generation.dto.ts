import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const MEDIA_TYPES = ['image', 'video', 'audio'] as const;
export type MediaType = (typeof MEDIA_TYPES)[number];

export class MediaGenerationDto {
  @IsString()
  workspaceId!: string;

  @IsIn(MEDIA_TYPES)
  type!: MediaType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(8_000)
  prompt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @IsOptional()
  @IsIn(['1024x1024', '1536x1024', '1024x1536'])
  size?: '1024x1024' | '1536x1024' | '1024x1536';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  provider?: string;

  @IsOptional()
  sourceIds?: string[];

  @IsOptional()
  @IsIn([
    'alloy',
    'ash',
    'coral',
    'echo',
    'fable',
    'nova',
    'onyx',
    'sage',
    'shimmer',
  ])
  voice?: string;
}
