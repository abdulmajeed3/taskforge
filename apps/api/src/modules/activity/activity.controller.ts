import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import { ActivityService } from './activity.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('activity')
@ApiBearerAuth()
@Controller('organizations/:orgId/activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  @ApiOperation({ summary: 'List organization activity log (newest first)' })
  list(@ActiveOrganization() m: ActiveMembership, @Query() query: PaginationQueryDto) {
    return this.activityService.list(m.organizationId, query);
  }
}
