import { IsDateString, IsOptional } from 'class-validator';
import { TargetDto } from '../knowledge/dto/target.dto';
export class CreateShareDto extends TargetDto {
  @IsOptional() @IsDateString() expiresAt?: string;
}
