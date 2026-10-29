import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import type { Env } from './env.schema';

/**
 * Thin typed wrapper over NestJS ConfigService.
 * Provides fully-typed getters for every env variable so callers never deal with
 * raw string keys or manual casting.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly inner: NestConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.inner.get('NODE_ENV', { infer: true });
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }

  get apiPort(): number {
    return this.inner.get('API_PORT', { infer: true });
  }

  get apiHost(): string {
    return this.inner.get('API_HOST', { infer: true });
  }

  get apiGlobalPrefix(): string {
    return this.inner.get('API_GLOBAL_PREFIX', { infer: true });
  }

  get corsOrigin(): string[] {
    return this.inner
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  get databaseUrl(): string {
    return this.inner.get('DATABASE_URL', { infer: true });
  }

  get jwtAccessSecret(): string {
    return this.inner.get('JWT_ACCESS_SECRET', { infer: true });
  }

  get jwtAccessTtl(): string {
    return this.inner.get('JWT_ACCESS_TTL', { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.inner.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get jwtRefreshTtl(): string {
    return this.inner.get('JWT_REFRESH_TTL', { infer: true });
  }

  get refreshCookieName(): string {
    return this.inner.get('REFRESH_COOKIE_NAME', { infer: true });
  }

  get authRateLimitMax(): number {
    return this.inner.get('AUTH_RATE_LIMIT_MAX', { infer: true });
  }

  get authRateLimitWindowMs(): number {
    return this.inner.get('AUTH_RATE_LIMIT_WINDOW_MS', { infer: true });
  }

  get emailProvider(): Env['EMAIL_PROVIDER'] {
    return this.inner.get('EMAIL_PROVIDER', { infer: true });
  }

  get smtpHost(): string | undefined {
    return this.inner.get('SMTP_HOST', { infer: true });
  }

  get smtpPort(): number | undefined {
    return this.inner.get('SMTP_PORT', { infer: true });
  }

  get smtpUser(): string | undefined {
    return this.inner.get('SMTP_USER', { infer: true });
  }

  get smtpPassword(): string | undefined {
    return this.inner.get('SMTP_PASSWORD', { infer: true });
  }

  get smtpFrom(): string {
    return this.inner.get('SMTP_FROM', { infer: true }) ?? 'TaskForge <no-reply@example.com>';
  }
}
