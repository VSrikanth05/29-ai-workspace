import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RefreshSessionDto {
  @ApiProperty({ description: 'Supabase refresh token' })
  @IsString()
  refreshToken!: string;
}
