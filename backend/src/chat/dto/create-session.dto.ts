import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateSessionDto {
  @ApiPropertyOptional({
    description: 'Scope this chat session to one document',
  })
  @IsOptional()
  @IsString()
  documentId?: string;

  @ApiPropertyOptional({ example: 'Questions about the Q3 report' })
  @IsOptional()
  @IsString()
  title?: string;
}
