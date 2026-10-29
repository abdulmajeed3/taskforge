import * as crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import type { FastifyRequest } from 'fastify';
import { AppConfigService } from '../../config/config.service';
import { PrismaService } from '../../database/prisma.service';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserPayload {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isEmailVerified: boolean;
}

const ARGON2_OPTIONS: argon2.HashOptions = {
  type: argon2.argon2id,
  memoryCost: 65536, // 64 MiB
  timeCost: 3,
  parallelism: 4,
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: AppConfigService,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  async register(dto: RegisterDto): Promise<{ user: UserPayload; tokens: AuthTokens }> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new ConflictException('An account with that email address already exists');
    }

    const passwordHash = await this.hashPassword(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
      },
    });

    this.logger.log({ userId: user.id }, 'User registered');
    const tokens = await this.issueTokens(user.id);
    return { user: this.toPayload(user), tokens };
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(
    dto: LoginDto,
    req?: FastifyRequest,
  ): Promise<{ user: UserPayload; tokens: AuthTokens }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });

    // Perform the hash verification even on a missing user (constant-time
    // response) to prevent user enumeration via timing side-channel.
    const hash = user?.passwordHash ?? (await this.dummyHash());
    const valid = await argon2.verify(hash, dto.password, ARGON2_OPTIONS);

    if (!user || !valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    this.logger.log({ userId: user.id }, 'User logged in');
    const tokens = await this.issueTokens(user.id, req);
    return { user: this.toPayload(user), tokens };
  }

  // ---------------------------------------------------------------------------
  // Refresh token rotation
  // ---------------------------------------------------------------------------

  async refresh(rawToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (stored.revokedAt) {
      // Reuse of an already-rotated token — revoke the entire family as a theft signal.
      await this.revokeFamily(stored.family);
      this.logger.warn(
        { userId: stored.userId, family: stored.family },
        'Refresh token reuse detected — entire family revoked',
      );
      throw new UnauthorizedException('Refresh token has already been used');
    }

    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has expired');
    }

    const newTokens = await this.issueTokens(stored.userId);
    const newHash = this.hashToken(newTokens.refreshToken);

    // Rotate: mark old token revoked and link to the replacement.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date(), replacedByTokenHash: newHash },
    });

    return newTokens;
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Password reset
  // ---------------------------------------------------------------------------

  /**
   * Initiates a password reset. Always returns 200/204 regardless of whether
   * the email exists, to prevent user enumeration.
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) return; // Silently ignore unknown emails

    // Invalidate any pending reset tokens for this user.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(raw);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    // In production, send this token via email. In development/test, log it.
    // See EmailService for the real provider interface.
    this.logger.log(
      { userId: user.id },
      `Password reset token issued (email delivery depends on EMAIL_PROVIDER)`,
    );

    // Emit to the console in non-production so the developer can test the flow.
    if (!this.config.isProduction) {
      this.logger.warn({ resetToken: raw }, 'DEV/TEST: Password reset token (console only)');
    }
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Reset token is invalid or has expired');
    }

    const passwordHash = await this.hashPassword(newPassword);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      // Revoke all refresh tokens so existing sessions must re-authenticate.
      this.prisma.refreshToken.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    this.logger.log({ userId: record.userId }, 'Password reset completed');
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async issueTokens(userId: string, req?: FastifyRequest): Promise<AuthTokens> {
    const accessToken = this.jwtService.sign(
      { sub: userId },
      {
        secret: this.config.jwtAccessSecret,
        // expiresIn accepts 'ms' StringValue — cast to satisfy the type; the value
        // is runtime-validated by the config Zod schema (e.g. '15m', '1h').
        expiresIn: this.config.jwtAccessTtl as unknown as number,
      },
    );

    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(raw);
    const family = crypto.randomUUID();
    const expiresAt = this.parseTtl(this.config.jwtRefreshTtl);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        family,
        expiresAt,
        userAgent: (req?.headers['user-agent'] ?? null) as string | null,
        ipAddress: (req?.ip ?? null) as string | null,
      },
    });

    return { accessToken, refreshToken: raw };
  }

  private async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** SHA-256 hash of a raw token value — only this hash is stored. */
  public hashToken(raw: string): string {
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, { ...ARGON2_OPTIONS, raw: false });
  }

  /**
   * Verifies a hash against a password — exposed for tests that verify the
   * hashing behavior without going through a full login flow.
   */
  async verifyPassword(hash: string, password: string): Promise<boolean> {
    return argon2.verify(hash, password, ARGON2_OPTIONS);
  }

  /**
   * Produces a dummy hash for the timing-safe "user not found" path.
   * The result is discarded; only the time cost matters.
   */
  private async dummyHash(): Promise<string> {
    return argon2.hash('dummy-constant-cost-string', { ...ARGON2_OPTIONS, raw: false });
  }

  private parseTtl(ttl: string): Date {
    const unit = ttl.slice(-1);
    const value = parseInt(ttl.slice(0, -1), 10);
    const ms: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return new Date(Date.now() + value * (ms[unit] ?? ms['s'] ?? 1000));
  }

  private toPayload(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isEmailVerified: boolean;
  }): UserPayload {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isEmailVerified: user.isEmailVerified,
    };
  }
}
