import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '@taskforge/shared';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use token from the reset email' })
  @IsString()
  @MinLength(1)
  token: string = '';

  @ApiProperty({ minLength: LIMITS.user.passwordMin })
  @IsString()
  @MinLength(LIMITS.user.passwordMin)
  @MaxLength(LIMITS.user.passwordMax)
  password: string = '';
}
