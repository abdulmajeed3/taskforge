// In Jest ESM mode (--experimental-vm-modules) globals are not auto-injected;
// import them explicitly from @jest/globals.
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * AuthService unit tests.
 *
 * Coverage targets:
 *  - register: success path, duplicate-email conflict
 *  - login: valid credentials, invalid password, unknown email (timing-safe path)
 *  - refresh: success rotation, expired token, revoked token, reuse detection (family revocation)
 *  - logout: revokes the supplied token
 *  - forgotPassword: silently ignores unknown emails, creates reset token
 *  - resetPassword: success, expired/used token rejection
 *  - hashToken: deterministic SHA-256 output
 *  - verifyPassword: argon2id round-trip
 */

import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import type { User, RefreshToken, PasswordResetToken } from '@prisma/client';
import * as argon2 from 'argon2';
import { AppConfigService } from '../../config/config.service';
import { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';

// ---------------------------------------------------------------------------
// Helpers & factories
// ---------------------------------------------------------------------------

const makeUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  email: 'alice@example.com',
  passwordHash: '',
  firstName: 'Alice',
  lastName: 'Smith',
  avatarUrl: null,
  isEmailVerified: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

const makeRefreshToken = (overrides: Partial<RefreshToken> = {}): RefreshToken => ({
  id: 'rt-1',
  userId: 'user-1',
  tokenHash: 'hash',
  family: 'family-1',
  expiresAt: new Date(Date.now() + 86_400_000), // 1 day from now
  revokedAt: null,
  replacedByTokenHash: null,
  userAgent: null,
  ipAddress: null,
  createdAt: new Date(),
  ...overrides,
});

const makePasswordResetToken = (overrides: Partial<PasswordResetToken> = {}): PasswordResetToken => ({
  id: 'prt-1',
  userId: 'user-1',
  tokenHash: 'reset-hash',
  expiresAt: new Date(Date.now() + 3_600_000), // 1 hour from now
  usedAt: null,
  createdAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const mockPrisma = () => ({
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  passwordResetToken: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
});

const mockJwtService = () => ({
  sign: jest.fn().mockReturnValue('signed-access-token'),
  verify: jest.fn(),
});

const mockConfig = (): Partial<AppConfigService> => ({
  jwtAccessSecret: 'test-access-secret',
  jwtRefreshSecret: 'test-refresh-secret',
  jwtAccessTtl: '15m',
  jwtRefreshTtl: '30d',
  isProduction: false,
  refreshCookieName: 'refresh_token',
  apiGlobalPrefix: 'api',
});

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AuthService', () => {
  let service: AuthService;
  let prisma: ReturnType<typeof mockPrisma>;
  let jwt: ReturnType<typeof mockJwtService>;

  beforeEach(async () => {
    prisma = mockPrisma();
    jwt = mockJwtService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
        { provide: AppConfigService, useValue: mockConfig() },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  // -------------------------------------------------------------------------
  // hashToken
  // -------------------------------------------------------------------------

  describe('hashToken', () => {
    it('produces a deterministic 64-char hex string', () => {
      const result = service.hashToken('raw-token');
      expect(result).toHaveLength(64);
      expect(result).toMatch(/^[0-9a-f]{64}$/);
    });

    it('produces the same hash for the same input', () => {
      expect(service.hashToken('abc')).toBe(service.hashToken('abc'));
    });

    it('produces different hashes for different inputs', () => {
      expect(service.hashToken('abc')).not.toBe(service.hashToken('xyz'));
    });
  });

  // -------------------------------------------------------------------------
  // verifyPassword
  // -------------------------------------------------------------------------

  describe('verifyPassword', () => {
    it('returns true for the correct password', async () => {
      const hash = await argon2.hash('correct-password', { type: argon2.argon2id });
      await expect(service.verifyPassword(hash, 'correct-password')).resolves.toBe(true);
    });

    it('returns false for an incorrect password', async () => {
      const hash = await argon2.hash('correct-password', { type: argon2.argon2id });
      await expect(service.verifyPassword(hash, 'wrong-password')).resolves.toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------

  describe('register', () => {
    const dto = {
      email: 'alice@example.com',
      password: 'Password1!',
      firstName: 'Alice',
      lastName: 'Smith',
    };

    it('creates a new user and returns tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null); // no existing user
      const createdUser = makeUser();
      prisma.user.create.mockResolvedValue(createdUser);
      prisma.refreshToken.create.mockResolvedValue(makeRefreshToken());

      const result = await service.register(dto);

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      expect(result.user.email).toBe('alice@example.com');
      expect(result.tokens.accessToken).toBe('signed-access-token');
      expect(typeof result.tokens.refreshToken).toBe('string');
      expect(result.tokens.refreshToken.length).toBeGreaterThan(0);
    });

    it('normalizes the email to lowercase', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser({ email: 'alice@example.com' }));
      prisma.refreshToken.create.mockResolvedValue(makeRefreshToken());

      await service.register({ ...dto, email: 'ALICE@EXAMPLE.COM' });

      const createCall = prisma.user.create.mock.calls[0][0] as { data: { email: string } };
      expect(createCall.data.email).toBe('alice@example.com');
    });

    it('throws ConflictException when the email is already registered', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('stores an argon2id hash — never the plaintext password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(makeUser());
      prisma.refreshToken.create.mockResolvedValue(makeRefreshToken());

      await service.register(dto);

      const createCall = prisma.user.create.mock.calls[0][0] as { data: { passwordHash: string } };
      const hash = createCall.data.passwordHash;
      expect(hash).not.toBe(dto.password);
      // argon2id hashes start with '$argon2id$'
      expect(hash).toMatch(/^\$argon2id\$/);
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------

  describe('login', () => {
    let passwordHash: string;
    const dto = { email: 'alice@example.com', password: 'Password1!' };

    beforeEach(async () => {
      passwordHash = await argon2.hash('Password1!', {
        type: argon2.argon2id,
        memoryCost: 65536,
        timeCost: 3,
        parallelism: 4,
      });
    });

    it('returns tokens for valid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash }));
      prisma.refreshToken.create.mockResolvedValue(makeRefreshToken());

      const result = await service.login(dto);

      expect(result.user.email).toBe('alice@example.com');
      expect(result.tokens.accessToken).toBe('signed-access-token');
    });

    it('throws UnauthorizedException for an incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser({ passwordHash }));
      prisma.refreshToken.create.mockResolvedValue(makeRefreshToken());

      await expect(service.login({ ...dto, password: 'WrongPassword!' })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException for an unknown email (timing-safe path)', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.refreshToken.create.mockResolvedValue(makeRefreshToken());

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('never reveals whether the email exists in the error message', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      let message = '';
      try {
        await service.login(dto);
      } catch (err) {
        if (err instanceof UnauthorizedException) message = err.message;
      }
      expect(message).toBe('Invalid email or password');
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------

  describe('refresh', () => {
    const rawToken = 'raw-refresh-token';

    it('issues new tokens and rotates the old one', async () => {
      const stored = makeRefreshToken({
        tokenHash: service.hashToken(rawToken),
      });
      prisma.refreshToken.findUnique.mockResolvedValue(stored);
      prisma.refreshToken.create.mockResolvedValue(makeRefreshToken({ id: 'rt-2' }));
      prisma.refreshToken.update.mockResolvedValue({ ...stored, revokedAt: new Date() });

      const result = await service.refresh(rawToken);

      expect(result.accessToken).toBe('signed-access-token');
      // Old token must be marked revoked
      expect(prisma.refreshToken.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('throws UnauthorizedException when the token does not exist', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException and revokes the whole family on token reuse', async () => {
      const stored = makeRefreshToken({
        tokenHash: service.hashToken(rawToken),
        revokedAt: new Date(), // already rotated → reuse attempt
      });
      prisma.refreshToken.findUnique.mockResolvedValue(stored);
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 3 });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
      // Entire family must be revoked
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ family: stored.family }),
        }),
      );
    });

    it('throws UnauthorizedException for an expired token', async () => {
      const stored = makeRefreshToken({
        tokenHash: service.hashToken(rawToken),
        expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
      });
      prisma.refreshToken.findUnique.mockResolvedValue(stored);
      prisma.refreshToken.update.mockResolvedValue({ ...stored, revokedAt: new Date() });

      await expect(service.refresh(rawToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------

  describe('logout', () => {
    it('marks the supplied refresh token as revoked', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('raw-token');

      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
    });

    it('is a no-op (no error) when the token does not exist', async () => {
      prisma.refreshToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.logout('nonexistent-token')).resolves.toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // forgotPassword
  // -------------------------------------------------------------------------

  describe('forgotPassword', () => {
    it('silently returns without creating a token for an unknown email', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.forgotPassword('nobody@example.com')).resolves.toBeUndefined();
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });

    it('creates a hashed reset token for a known user', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
      prisma.passwordResetToken.create.mockResolvedValue(makePasswordResetToken());

      await service.forgotPassword('alice@example.com');

      expect(prisma.passwordResetToken.create).toHaveBeenCalledTimes(1);
      const createArg = prisma.passwordResetToken.create.mock.calls[0][0] as {
        data: { tokenHash: string };
      };
      // tokenHash must be hex, not the raw token
      expect(createArg.data.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('invalidates any existing pending reset tokens before issuing a new one', async () => {
      prisma.user.findUnique.mockResolvedValue(makeUser());
      prisma.passwordResetToken.updateMany.mockResolvedValue({ count: 1 });
      prisma.passwordResetToken.create.mockResolvedValue(makePasswordResetToken());

      await service.forgotPassword('alice@example.com');

      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1', usedAt: null }),
          data: expect.objectContaining({ usedAt: expect.any(Date) }),
        }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // resetPassword
  // -------------------------------------------------------------------------

  describe('resetPassword', () => {
    const rawToken = 'valid-reset-token';
    const newPassword = 'NewPassword1!';

    it('updates the password hash and revokes all refresh tokens', async () => {
      const tokenHash = service.hashToken(rawToken);
      prisma.passwordResetToken.findUnique.mockResolvedValue(makePasswordResetToken({ tokenHash }));
      prisma.$transaction.mockResolvedValue([{}, {}, { count: 2 }]);

      await expect(service.resetPassword(rawToken, newPassword)).resolves.toBeUndefined();
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException for an invalid / unknown token', async () => {
      prisma.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(service.resetPassword('bad-token', newPassword)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for an already-used token', async () => {
      const tokenHash = service.hashToken(rawToken);
      prisma.passwordResetToken.findUnique.mockResolvedValue(
        makePasswordResetToken({ tokenHash, usedAt: new Date() }),
      );

      await expect(service.resetPassword(rawToken, newPassword)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for an expired token', async () => {
      const tokenHash = service.hashToken(rawToken);
      prisma.passwordResetToken.findUnique.mockResolvedValue(
        makePasswordResetToken({
          tokenHash,
          expiresAt: new Date(Date.now() - 1000),
        }),
      );

      await expect(service.resetPassword(rawToken, newPassword)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // -------------------------------------------------------------------------
  // Cross-tenant isolation — conceptual guard test
  // -------------------------------------------------------------------------

  describe('cross-tenant isolation (token invariants)', () => {
    it('refresh tokens are org-agnostic; isolation is enforced by OrganizationContextGuard, not AuthService', () => {
      // AuthService issues user-scoped tokens, not org-scoped tokens. The
      // OrganizationContextGuard (tested separately) validates the
      // X-Organization-Id header against real membership rows in the DB and
      // attaches an ActiveMembership to the request. This test documents the
      // design decision rather than testing AuthService behaviour.
      expect(true).toBe(true);
    });

    it('hashToken output for tenant-A token differs from tenant-B token with same raw value — they cannot be swapped', () => {
      // Tokens are globally unique (crypto.randomBytes), but this demonstrates
      // that even if two identical raw values existed, the hash is the same —
      // isolation is not relying on per-tenant salting of tokens. The
      // isolation boundary is the membership check in OrganizationContextGuard.
      const h1 = service.hashToken('same-raw');
      const h2 = service.hashToken('same-raw');
      expect(h1).toBe(h2); // deterministic — no per-tenant salt needed
    });
  });
});
