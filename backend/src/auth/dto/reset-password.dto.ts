import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'Supabase recovery access token' })
  @IsOptional()
  @IsString()
  accessToken?: string;

  @ApiProperty({
    required: false,
    description: 'Supabase recovery refresh token',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;

  @ApiProperty({
    required: false,
    description: 'Supabase PKCE recovery authorization code',
  })
  @IsOptional()
  @IsString()
  code?: string;
}
