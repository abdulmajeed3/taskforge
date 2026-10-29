import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '@taskforge/shared';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  currentPassword: string = '';

  @ApiProperty({ minLength: LIMITS.user.passwordMin })
  @IsString()
  @MinLength(LIMITS.user.passwordMin)
  @MaxLength(LIMITS.user.passwordMax)
  newPassword: string = '';
}
