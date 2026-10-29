import { Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { NotificationsService } from './notifications.service';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('organizations/:orgId/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for the current user in this organization' })
  list(
    @CurrentUser() user: JwtUser,
    @ActiveOrganization() m: ActiveMembership,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationsService.list(user.sub, m.organizationId, query);
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a notification as read' })
  markRead(
    @Param('id', ParseUuidPipe) id: string,
    @CurrentUser() user: JwtUser,
    @ActiveOrganization() m: ActiveMembership,
  ) {
    return this.notificationsService.markRead(user.sub, m.organizationId, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@CurrentUser() user: JwtUser, @ActiveOrganization() m: ActiveMembership) {
    return this.notificationsService.markAllRead(user.sub, m.organizationId);
  }
}
