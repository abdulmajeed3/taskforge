import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '@taskforge/shared';

export class CreateLabelDto {
  @ApiProperty({ example: 'Bug' })
  @IsString()
  @MinLength(LIMITS.label.nameMin)
  @MaxLength(LIMITS.label.nameMax)
  name: string = '';

  @ApiProperty({ example: '#ef4444', description: 'Hex color string' })
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'color must be a hex color like #ef4444' })
  color: string = '';
}
