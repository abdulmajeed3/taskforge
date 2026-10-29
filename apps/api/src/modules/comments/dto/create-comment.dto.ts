import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '@taskforge/shared';

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  @MinLength(LIMITS.comment.bodyMin)
  @MaxLength(LIMITS.comment.bodyMax)
  body: string = '';
}
