import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PROJECT_STATUSES, type ProjectStatus, LIMITS } from '@taskforge/shared';

const L = LIMITS.project;

export class CreateProjectDto {
  @ApiProperty({ example: 'Platform v2' })
  @IsString()
  @MinLength(L.nameMin)
  @MaxLength(L.nameMax)
  name: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(L.descriptionMax)
  description?: string;

  @ApiPropertyOptional({ enum: PROJECT_STATUSES, default: 'PLANNING' })
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;
}
