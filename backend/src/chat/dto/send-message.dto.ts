import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SUPPORTED_PROVIDERS } from '../../summary/dto/generate-summary.dto';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import {
  RetrievalMetadataFilterDto,
  RetrievalSettingsDto,
} from './retrieval-options.dto';

export class SendMessageDto {
  @ApiProperty({ example: 'What are the key takeaways from this document?' })
  @IsString()
  @IsNotEmpty()
  message!: string;

  @ApiPropertyOptional({ enum: SUPPORTED_PROVIDERS, default: 'gemini' })
  @IsOptional()
  @IsIn(SUPPORTED_PROVIDERS)
  provider?: string;

  @ApiPropertyOptional({ type: RetrievalMetadataFilterDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetrievalMetadataFilterDto)
  filters?: RetrievalMetadataFilterDto;

  @ApiPropertyOptional({ type: RetrievalSettingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RetrievalSettingsDto)
  retrieval?: RetrievalSettingsDto;
}
