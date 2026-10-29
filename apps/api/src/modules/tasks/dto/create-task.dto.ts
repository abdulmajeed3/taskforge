import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TASK_PRIORITIES, TASK_STATUSES, type TaskPriority, type TaskStatus, LIMITS } from '@taskforge/shared';

const L = LIMITS.task;

export class CreateTaskDto {
  @ApiProperty({ example: 'Implement OAuth login' })
  @IsString()
  @MinLength(L.titleMin)
  @MaxLength(L.titleMax)
  title: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(L.descriptionMax)
  description?: string;

  @ApiProperty()
  @IsUUID()
  projectId: string = '';

  @ApiPropertyOptional({ enum: TASK_STATUSES })
  @IsOptional()
  @IsIn(TASK_STATUSES)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TASK_PRIORITIES })
  @IsOptional()
  @IsIn(TASK_PRIORITIES)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'UUID of the user to assign' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @ApiPropertyOptional({ type: [String], description: 'Array of label UUIDs to attach' })
  @IsOptional()
  @IsUUID('all', { each: true })
  labelIds?: string[];
}
