import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import type { ApiSuccessResponse } from '@taskforge/shared';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    const requestId = (req as FastifyRequest & { id: string }).id;

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        requestId,
      })),
    );
  }
}
