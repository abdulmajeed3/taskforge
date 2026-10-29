import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '@taskforge/shared';

const L = LIMITS.user;

export class RegisterDto {
  @ApiProperty({ example: 'Ada' })
  @IsString()
  @MinLength(1)
  @MaxLength(L.firstNameMax)
  firstName: string = '';

  @ApiProperty({ example: 'Lovelace' })
  @IsString()
  @MinLength(1)
  @MaxLength(L.lastNameMax)
  lastName: string = '';

  @ApiProperty({ example: 'ada@example.com' })
  @IsEmail()
  email: string = '';

  @ApiProperty({ example: 'SuperSecure123!', minLength: L.passwordMin })
  @IsString()
  @MinLength(L.passwordMin)
  @MaxLength(L.passwordMax)
  password: string = '';
}
