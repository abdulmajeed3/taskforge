import { type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { JwtUser } from '../types/jwt-user.type';
import { AppConfigService } from '../../config/config.service';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: JwtUser }>();

    const token = this.extractToken(req);
    if (!token) {
      throw new UnauthorizedException('Access token missing');
    }

    try {
      const payload = this.jwtService.verify<JwtUser>(token, {
        secret: this.config.jwtAccessSecret,
      });
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Access token is invalid or expired');
    }
  }

  private extractToken(req: FastifyRequest): string | undefined {
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    return undefined;
  }
}
