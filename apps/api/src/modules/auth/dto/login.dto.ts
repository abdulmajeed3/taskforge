import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '@taskforge/shared';

export class LoginDto {
  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ example: 'SuperSecure123!' })
  @IsString()
  @MinLength(1)
  @MaxLength(LIMITS.user.passwordMax)
  password: string = '';
}
