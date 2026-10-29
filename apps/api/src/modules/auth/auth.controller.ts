import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtUser } from '../../common/types/jwt-user.type';
import { AppConfigService } from '../../config/config.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: AppConfigService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) reply: FastifyReply) {
    const { user, tokens } = await this.authService.register(dto);
    this.setRefreshCookie(reply, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { user, tokens } = await this.authService.login(dto, req);
    this.setRefreshCookie(reply, tokens.refreshToken);
    return { user, accessToken: tokens.accessToken };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh token and issue a new access token' })
  async refresh(@Req() req: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const raw = this.extractRefreshToken(req);
    const tokens = await this.authService.refresh(raw);
    this.setRefreshCookie(reply, tokens.refreshToken);
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke the current refresh token and clear the cookie' })
  async logout(
    @CurrentUser() _user: JwtUser,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const raw = this.extractRefreshToken(req);
    if (raw) await this.authService.logout(raw);
    this.clearRefreshCookie(reply);
    return null;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Request a password reset email (always returns 204)' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return null;
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reset password using a single-use token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);
    return null;
  }

  // ---------------------------------------------------------------------------
  // Cookie helpers
  // ---------------------------------------------------------------------------

  private setRefreshCookie(reply: FastifyReply, token: string): void {
    reply.setCookie(this.config.refreshCookieName, token, {
      httpOnly: true,
      secure: this.config.isProduction,
      sameSite: 'lax',
      path: `/${this.config.apiGlobalPrefix}/auth`,
      maxAge: this.parseTtlToSeconds(this.config.jwtRefreshTtl),
    });
  }

  private clearRefreshCookie(reply: FastifyReply): void {
    reply.clearCookie(this.config.refreshCookieName, {
      path: `/${this.config.apiGlobalPrefix}/auth`,
    });
  }

  private extractRefreshToken(req: FastifyRequest): string {
    const fromCookie = (req.cookies as Record<string, string>)?.[this.config.refreshCookieName];
    if (fromCookie) return fromCookie;
    // Fall back to body for API/testing clients that can't use cookies.
    const body = req.body as Record<string, unknown>;
    if (typeof body?.refreshToken === 'string') return body.refreshToken;
    return '';
  }

  private parseTtlToSeconds(ttl: string): number {
    const unit = ttl.slice(-1);
    const value = parseInt(ttl.slice(0, -1), 10);
    const seconds: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
    return value * (seconds[unit] ?? 1);
  }
}
