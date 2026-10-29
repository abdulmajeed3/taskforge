import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { LabelsService } from './labels.service';
import { CreateLabelDto } from './dto/create-label.dto';

@ApiTags('labels')
@ApiBearerAuth()
@Controller('organizations/:orgId/labels')
export class LabelsController {
  constructor(private readonly labelsService: LabelsService) {}

  @Post()
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Create a label for the organization' })
  create(@ActiveOrganization() m: ActiveMembership, @Body() dto: CreateLabelDto) {
    return this.labelsService.create(m, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all labels for the organization' })
  list(@ActiveOrganization() m: ActiveMembership) {
    return this.labelsService.list(m.organizationId);
  }

  @Patch(':id')
  @Roles('MEMBER', 'ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Update a label' })
  update(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() m: ActiveMembership,
    @Body() dto: CreateLabelDto,
  ) {
    return this.labelsService.update(m, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a label (Admin+)' })
  async remove(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() m: ActiveMembership,
  ) {
    await this.labelsService.delete(m, id);
    return null;
  }
}
