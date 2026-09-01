import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class GenerateStudioDiagramDto {
  @IsUUID() workspaceId!: string;
  @IsUUID() sourceId!: string;
  @IsOptional() @IsString() @MaxLength(40) provider?: string;
  @IsOptional() @IsString() @MaxLength(40) diagramType?: string;
}
