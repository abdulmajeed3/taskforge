import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';
import { PROJECT_STATUSES, type ProjectStatus } from '@taskforge/shared';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ProjectQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PROJECT_STATUSES })
  @IsOptional()
  @IsIn(PROJECT_STATUSES)
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Search by name (case-insensitive contains)' })
  @IsOptional()
  @IsString()
  search?: string;
}
