import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { LIMITS } from '@taskforge/shared';

const L = LIMITS.organization;

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Corp' })
  @IsString()
  @MinLength(L.nameMin)
  @MaxLength(L.nameMax)
  name: string = '';

  @ApiPropertyOptional({
    example: 'acme-corp',
    description:
      'URL-safe slug. If omitted, one is auto-generated from the name.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(L.slugMax)
  @Matches(/^[a-z0-9]+(-[a-z0-9]+)*$/, {
    message: 'Slug may only contain lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(L.descriptionMax)
  description?: string;
}
