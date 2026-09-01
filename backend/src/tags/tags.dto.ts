import { IsHexColor, IsOptional, IsString, Length } from 'class-validator';
import { TargetDto, WorkspaceQueryDto } from '../knowledge/dto/target.dto';
export class CreateTagDto extends WorkspaceQueryDto {
  @IsString() @Length(1, 60) name!: string;
  @IsOptional() @IsHexColor() color?: string;
}
export class UpdateTagDto {
  @IsOptional() @IsString() @Length(1, 60) name?: string;
  @IsOptional() @IsHexColor() color?: string;
}
export class AssignTagDto extends TargetDto {}
