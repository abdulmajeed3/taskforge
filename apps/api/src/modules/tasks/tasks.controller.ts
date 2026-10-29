import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { TaskQueryDto } from './dto/task-query.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('organizations/:orgId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Create a task' })
  create(@ActiveOrganization() m: ActiveMembership, @Body() dto: CreateTaskDto) {
    return this.tasksService.create(m, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks with filters and pagination' })
  findAll(@ActiveOrganization() m: ActiveMembership, @Query() query: TaskQueryDto) {
    return this.tasksService.findAll(m, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task details (with comments and labels)' })
  findOne(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() m: ActiveMembership,
  ) {
    return this.tasksService.findById(m.organizationId, id);
  }

  @Patch(':id')
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Update a task' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() m: ActiveMembership,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.update(m, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Archive a task' })
  archive(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() m: ActiveMembership,
  ) {
    return this.tasksService.archive(m, id);
  }
}

// Kanban endpoint lives under the project route.
@ApiTags('tasks')
@ApiBearerAuth()
@Controller('organizations/:orgId/projects/:projectId/kanban')
export class KanbanController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks for a project, for Kanban display' })
  kanban(
    @Param('projectId', ParseUuidPipe) projectId: string,
    @ActiveOrganization() m: ActiveMembership,
  ) {
    return this.tasksService.kanban(m.organizationId, projectId);
  }
}
