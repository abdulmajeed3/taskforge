import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ApiErrorCode, ApiErrorResponse } from '@taskforge/shared';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const req = ctx.getRequest<FastifyRequest & { id: string }>();
    const requestId = req.id ?? 'unknown';

    const { statusCode, code, message, details } = this.classify(exception);

    // Log server errors at error level; client errors at warn
    if (statusCode >= 500) {
      this.logger.error(
        { requestId, exception, path: req.url, method: req.method },
        'Internal server error',
      );
    } else {
      this.logger.warn(
        { requestId, code, path: req.url, method: req.method, statusCode },
        message,
      );
    }

    const body: ApiErrorResponse = {
      success: false,
      error: { code, message, ...(details ? { details } : {}) },
      requestId,
    };

    void reply.status(statusCode).send(body);
  }

  private classify(exception: unknown): {
    statusCode: number;
    code: ApiErrorCode;
    message: string;
    details?: { field?: string; message: string }[];
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      // NestJS validation pipe returns { message: string[], error: string, statusCode: number }
      if (typeof res === 'object' && res !== null && 'message' in res) {
        const payload = res as { message: unknown; error?: string };
        const messages = Array.isArray(payload.message) ? payload.message : [payload.message];
        return {
          statusCode: status,
          code: httpStatusToCode(status),
          message: httpStatusToMessage(status),
          details: messages
            .filter((m): m is string => typeof m === 'string')
            .map((m) => ({ message: m })),
        };
      }

      return {
        statusCode: status,
        code: httpStatusToCode(status),
        message: typeof res === 'string' ? res : httpStatusToMessage(status),
      };
    }

    // Prisma known errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2025') {
        return { statusCode: 404, code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found' };
      }
      if (exception.code === 'P2002') {
        return { statusCode: 409, code: 'CONFLICT', message: 'A resource with those details already exists' };
      }
    }

    // Unknown errors — hide internals in production
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
  }
}

function httpStatusToCode(status: number): ApiErrorCode {
  switch (status) {
    case 400: return 'VALIDATION_ERROR';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'RESOURCE_NOT_FOUND';
    case 409: return 'CONFLICT';
    case 429: return 'RATE_LIMITED';
    default: return status >= 500 ? 'INTERNAL_ERROR' : 'VALIDATION_ERROR';
  }
}

function httpStatusToMessage(status: number): string {
  switch (status) {
    case 400: return 'The request data is invalid';
    case 401: return 'Authentication is required';
    case 403: return 'You do not have permission to perform this action';
    case 404: return 'The requested resource was not found';
    case 409: return 'A resource with those details already exists';
    case 429: return 'Too many requests — please slow down';
    default: return 'An error occurred';
  }
}
