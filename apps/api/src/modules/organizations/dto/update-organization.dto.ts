import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '@taskforge/shared';

const L = LIMITS.organization;

export class UpdateOrganizationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(L.nameMin)
  @MaxLength(L.nameMax)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(L.descriptionMax)
  description?: string;
}
