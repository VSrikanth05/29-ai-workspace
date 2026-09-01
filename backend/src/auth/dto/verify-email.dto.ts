import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ required: false, example: 'person@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false, description: 'One-time verification code' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiProperty({
    required: false,
    description: 'Supabase token hash from the email link',
  })
  @IsOptional()
  @IsString()
  tokenHash?: string;

  @ApiProperty({
    required: false,
    description: 'Supabase PKCE authorization code',
  })
  @IsOptional()
  @IsString()
  code?: string;
}
