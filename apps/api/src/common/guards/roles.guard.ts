import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import type { MembershipRole } from '@taskforge/shared';
import { ROLE_RANK } from '@taskforge/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { ActiveMembership } from '../types/active-membership.type';

/**
 * Checks whether the active membership's role satisfies the @Roles(...) requirement.
 * Must be applied AFTER OrganizationContextGuard (which sets req.membership).
 *
 * The role check is additive: if multiple roles are listed, any one is sufficient.
 * "OWNER or ADMIN" means role >= ADMIN in the rank map.
 * In practice, if you want "at least ADMIN", list ADMIN and OWNER.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<MembershipRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() decorator — no additional role check beyond authenticated membership.
    if (!required || required.length === 0) return true;

    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { membership?: ActiveMembership }>();

    if (!req.membership) {
      throw new ForbiddenException('Organization context is required');
    }

    const memberRank = ROLE_RANK[req.membership.role];
    const minRequired = Math.min(...required.map((r) => ROLE_RANK[r]));

    if (memberRank < minRequired) {
      throw new ForbiddenException(
        `This action requires at least the ${required[required.length - 1]} role`,
      );
    }

    return true;
  }
}
