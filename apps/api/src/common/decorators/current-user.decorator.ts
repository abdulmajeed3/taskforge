import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { JwtUser } from '../types/jwt-user.type';

/**
 * Parameter decorator that extracts the authenticated user (set by JwtAuthGuard)
 * from the request. Returns undefined on public routes.
 *
 * @example
 * async getProfile(@CurrentUser() user: JwtUser) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser | undefined => {
    const req = ctx.switchToHttp().getRequest<FastifyRequest & { user?: JwtUser }>();
    return req.user;
  },
);
