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
  Min,
} from 'class-validator';

export const AI_PROVIDERS = [
  'openai',
  'gemini',
  'anthropic',
  'openrouter',
  'ollama',
  'nvidia',
] as const;

export class AiChatDto {
  @IsString() @IsNotEmpty() message!: string;
  @IsOptional() @IsString() conversationId?: string;
  @IsOptional() @IsString() workspaceId?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSourceIds?: string[];
  @IsOptional() @IsIn(AI_PROVIDERS) provider?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) topP?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32768)
  maxTokens?: number;
}

export class CreateConversationDto {
  @IsString() workspaceId!: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedSourceIds?: string[];
  @IsOptional() @IsIn(AI_PROVIDERS) provider?: string;
  @IsOptional() @IsString() model?: string;
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) topP?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32768)
  maxTokens?: number;
}

export class ConversationListQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
  @IsOptional() @IsString() cursor?: string;
}

export class ConversationDetailQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  messageLimit?: number;
}
