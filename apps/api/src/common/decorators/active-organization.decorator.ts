import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { ActiveMembership } from '../types/active-membership.type';

/**
 * Parameter decorator that extracts the active organization membership
 * (set by OrganizationContextGuard) from the request.
 *
 * @example
 * async listProjects(@ActiveOrganization() membership: ActiveMembership) { ... }
 */
export const ActiveOrganization = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ActiveMembership | undefined => {
    const req = ctx
      .switchToHttp()
      .getRequest<FastifyRequest & { membership?: ActiveMembership }>();
    return req.membership;
  },
);
