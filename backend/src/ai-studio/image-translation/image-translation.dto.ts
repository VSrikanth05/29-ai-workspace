import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ImageTranslationRequestDto {
  @IsUUID() workspaceId!: string;
  @IsString() @IsNotEmpty() @MaxLength(80) targetLanguage!: string;
  @IsOptional() @IsString() @MaxLength(80) sourceLanguage?: string;
}
