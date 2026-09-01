import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
export class PreferencesQueryDto {
  @IsUUID() workspaceId!: string;
}
export class UpdatePreferencesDto extends PreferencesQueryDto {
  @IsOptional() @IsString() @Length(1, 50) defaultProvider?: string;
  @IsOptional() @IsString() @Length(1, 120) defaultModel?: string;
  @IsOptional() @IsString() @Length(2, 12) language?: string;
  @IsOptional() @IsIn(['light', 'dark', 'system']) theme?: string;
  @IsOptional() @IsIn(['markdown', 'json', 'csv']) defaultExportFormat?: string;
  @IsOptional() @IsBoolean() streaming?: boolean;
  @IsOptional() @IsBoolean() autosave?: boolean;
}
