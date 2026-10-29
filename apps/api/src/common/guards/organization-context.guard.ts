import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtUser } from '../types/jwt-user.type';
import type { ActiveMembership } from '../types/active-membership.type';
import { PrismaService } from '../../database/prisma.service';
import type { MembershipRole } from '@taskforge/shared';

/**
 * Resolves and validates the active organization context for every non-public
 * request. The client sends the desired organization id in the X-Organization-Id
 * header; this guard verifies that the authenticated user is actually a member
 * of that organization and attaches the verified membership to req.membership.
 *
 * See docs/ARCHITECTURE.md §2 and ADR 0004.
 */
@Injectable()
export class OrganizationContextGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: JwtUser; membership?: ActiveMembership }>();

    if (!req.user) return true; // JwtAuthGuard already threw if the token was invalid

    const orgId = req.headers['x-organization-id'];
    if (!orgId || typeof orgId !== 'string') {
      // If the route doesn't need an org context (e.g. /users/me, /auth/*) this
      // guard is a no-op. Routes that require org context call @ActiveOrganization()
      // and throw if it's undefined there.
      return true;
    }

    const membership = await this.prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId: orgId, userId: req.user.sub } },
      include: { organization: { select: { archivedAt: true } } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (membership.organization.archivedAt) {
      throw new ForbiddenException('This organization has been archived');
    }

    req.membership = {
      membershipId: membership.id,
      organizationId: membership.organizationId,
      userId: membership.userId,
      role: membership.role as MembershipRole,
    };

    return true;
  }
}
