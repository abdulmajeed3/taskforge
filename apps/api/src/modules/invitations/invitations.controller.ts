import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ApiProperty } from '@nestjs/swagger';

class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  token: string = '';
}

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('organizations/:orgId/invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post()
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Send an invitation to an email address (Admin+)' })
  create(
    @ActiveOrganization() membership: ActiveMembership,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.create(membership, dto);
  }

  @Get()
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'List all invitations for the organization (Admin+)' })
  list(@ActiveOrganization() membership: ActiveMembership) {
    return this.invitationsService.list(membership.organizationId);
  }

  @Delete(':invitationId')
  @Roles('ADMIN', 'OWNER')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a pending invitation (Admin+)' })
  async revoke(
    @Param('invitationId', ParseUuidPipe) id: string,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    await this.invitationsService.revoke(membership, id);
    return null;
  }
}

// Public accept endpoint — lives outside the organization route.
@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationAcceptController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation using a token (authenticated user)' })
  accept(@CurrentUser() user: JwtUser, @Body() dto: AcceptInvitationDto) {
    return this.invitationsService.accept(dto.token, user.sub);
  }
}
