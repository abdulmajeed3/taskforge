import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional } from 'class-validator';
import { MEMBERSHIP_ROLES, type MembershipRole } from '@taskforge/shared';

export class CreateInvitationDto {
  @ApiProperty({ example: 'newmember@example.com' })
  @IsEmail()
  email: string = '';

  @ApiPropertyOptional({ enum: MEMBERSHIP_ROLES, default: 'MEMBER' })
  @IsOptional()
  @IsIn(MEMBERSHIP_ROLES)
  role?: MembershipRole = 'MEMBER';
}
