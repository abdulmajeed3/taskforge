import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { MEMBERSHIP_ROLES, type MembershipRole } from '@taskforge/shared';

export class UpdateRoleDto {
  @ApiProperty({ enum: MEMBERSHIP_ROLES })
  @IsIn(MEMBERSHIP_ROLES)
  role: MembershipRole = 'MEMBER';
}
