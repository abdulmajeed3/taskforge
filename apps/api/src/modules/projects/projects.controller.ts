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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectQueryDto } from './dto/project-query.dto';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('organizations/:orgId/projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Create a project' })
  create(
    @ActiveOrganization() membership: ActiveMembership,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(membership, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List projects with optional filters and pagination' })
  findAll(
    @ActiveOrganization() membership: ActiveMembership,
    @Query() query: ProjectQueryDto,
  ) {
    return this.projectsService.findAll(membership, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project details including members and task count' })
  findOne(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    return this.projectsService.findById(membership.organizationId, id);
  }

  @Patch(':id')
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Update project properties' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() membership: ActiveMembership,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.update(membership, id, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Archive a project (Admin+)' })
  archive(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    return this.projectsService.archive(membership, id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Task statistics for a project' })
  stats(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    return this.projectsService.getTaskStats(membership.organizationId, id);
  }
}
