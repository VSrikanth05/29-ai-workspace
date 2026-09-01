import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Srikanth' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ example: 'srikanth@gmail.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'correct horse battery staple', minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;
}
