import { IsIn, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class WorkspaceQueryDto {
  @IsUUID() workspaceId!: string;
}

export class TargetDto extends WorkspaceQueryDto {
  @ValidateIf((value: TargetDto) => !value.outputId)
  @IsUUID()
  @IsOptional()
  sourceId?: string;

  @ValidateIf((value: TargetDto) => !value.sourceId)
  @IsUUID()
  @IsOptional()
  outputId?: string;
}

export class SearchQueryDto extends WorkspaceQueryDto {
  @IsString() query!: string;
  @IsOptional() @IsUUID() tagId?: string;
  @IsOptional() @IsIn(['lexical', 'semantic', 'hybrid']) mode?: 'lexical' | 'semantic' | 'hybrid';
}

export class SavedSearchListQueryDto extends WorkspaceQueryDto {}

export class CreateSavedSearchDto extends WorkspaceQueryDto {
  @IsString() name!: string;
  @IsString() query!: string;
  @IsOptional() @IsUUID() tagId?: string;
}
