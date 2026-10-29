import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('organizations/:orgId/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Organization dashboard metrics and recent activity' })
  getDashboard(@CurrentUser() user: JwtUser, @ActiveOrganization() m: ActiveMembership) {
    return this.dashboardService.getOrganizationDashboard(m.organizationId, user.sub);
  }
}
