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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import type { JwtUser } from '../../common/types/jwt-user.type';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgsService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new organization (caller becomes OWNER)' })
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateOrganizationDto) {
    return this.orgsService.create(user.sub, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization details' })
  findOne(
    @Param('id', ParseUuidPipe) id: string,
    @ActiveOrganization() _membership: ActiveMembership,
  ) {
    return this.orgsService.findById(id);
  }

  @Patch(':id')
  @Roles('ADMIN', 'OWNER')
  @ApiOperation({ summary: 'Update organization name or description (Admin+)' })
  update(
    @Param('id', ParseUuidPipe) _id: string,
    @ActiveOrganization() membership: ActiveMembership,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.orgsService.update(membership, dto);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Archive the organization (Owner only)' })
  archive(
    @Param('id', ParseUuidPipe) _id: string,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    return this.orgsService.archive(membership);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('OWNER')
  @ApiOperation({ summary: 'Permanently delete the organization (Owner only)' })
  async remove(
    @Param('id', ParseUuidPipe) _id: string,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    await this.orgsService.delete(membership);
    return null;
  }

  @Get(':id/stats')
  @ApiOperation({ summary: 'Get project/task/member counts for the organization' })
  stats(
    @Param('id', ParseUuidPipe) _id: string,
    @ActiveOrganization() membership: ActiveMembership,
  ) {
    return this.orgsService.getStats(membership.organizationId);
  }
}
