import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MembershipRole } from '@taskforge/shared';
import { ROLE_RANK } from '@taskforge/shared';
import { PrismaService } from '../../database/prisma.service';
import type { ActiveMembership } from '../../common/types/active-membership.type';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string) {
    return this.prisma.organizationMembership.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateRole(
    caller: ActiveMembership,
    targetUserId: string,
    newRole: MembershipRole,
  ) {
    const target = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: caller.organizationId,
          userId: targetUserId,
        },
      },
    });
    if (!target) throw new NotFoundException('Membership not found');

    // Cannot change your own role.
    if (target.userId === caller.userId) {
      throw new BadRequestException('You cannot change your own role');
    }

    // Can only manage members with lower rank.
    if (ROLE_RANK[target.role as MembershipRole] >= ROLE_RANK[caller.role]) {
      throw new ForbiddenException('You cannot change the role of a peer or superior');
    }

    // Prevent demoting the last owner.
    if (target.role === 'OWNER' && newRole !== 'OWNER') {
      const ownerCount = await this.prisma.organizationMembership.count({
        where: { organizationId: caller.organizationId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Cannot demote the last owner — promote another member first',
        );
      }
    }

    return this.prisma.organizationMembership.update({
      where: { id: target.id },
      data: { role: newRole },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
  }

  async remove(caller: ActiveMembership, targetUserId: string): Promise<void> {
    const target = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: caller.organizationId,
          userId: targetUserId,
        },
      },
    });
    if (!target) throw new NotFoundException('Membership not found');

    if (target.userId === caller.userId) {
      throw new BadRequestException(
        'Use the leave endpoint to remove yourself from an organization',
      );
    }

    if (ROLE_RANK[target.role as MembershipRole] >= ROLE_RANK[caller.role]) {
      throw new ForbiddenException('You cannot remove a peer or superior');
    }

    await this.prisma.organizationMembership.delete({ where: { id: target.id } });
  }

  async leave(userId: string, organizationId: string): Promise<void> {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership) throw new NotFoundException('You are not a member of this organization');

    if (membership.role === 'OWNER') {
      const ownerCount = await this.prisma.organizationMembership.count({
        where: { organizationId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        throw new BadRequestException(
          'Transfer ownership before leaving — you are the last owner',
        );
      }
    }

    await this.prisma.organizationMembership.delete({ where: { id: membership.id } });
  }
}
