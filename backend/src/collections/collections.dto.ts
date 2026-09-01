import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';
import { TargetDto, WorkspaceQueryDto } from '../knowledge/dto/target.dto';
export class CreateCollectionDto extends WorkspaceQueryDto {
  @IsString() @Length(1, 120) name!: string;
  @IsOptional() @IsUUID() parentId?: string;
}
export class UpdateCollectionDto {
  @IsOptional() @IsString() @Length(1, 120) name?: string;
  @IsOptional() @IsUUID() parentId?: string | null;
  @IsOptional() @IsInt() @Min(0) position?: number;
}
export class CollectionItemDto extends TargetDto {}
