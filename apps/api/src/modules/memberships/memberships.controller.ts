import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { MembershipsService } from './memberships.service';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('organizations/:orgId/members')
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get()
  @ApiOperation({ summary: 'List all members of the organization' })
  list(@ActiveOrganization() membership: ActiveMembership) {
    return this.membershipsService.list(membership.organizationId);
  }

  @Patch(':userId/role')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Change a member role (Admin+)' })
  updateRole(
    @Param('userId', ParseUuidPipe) userId: string,
    @ActiveOrganization() membership: ActiveMembership,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.membershipsService.updateRole(membership, userId, dto.role);
  }

  @Delete(':userId')
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a member from the organization (Admin+)' })
  async remove(
    @Param('userId', ParseUuidPipe) userId: string,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    await this.membershipsService.remove(membership, userId);
    return null;
  }

  @Post('leave')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Leave the organization (any member can call this)' })
  async leave(
    @CurrentUser() user: JwtUser,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    await this.membershipsService.leave(user.sub, membership.organizationId);
    return null;
  }
}
