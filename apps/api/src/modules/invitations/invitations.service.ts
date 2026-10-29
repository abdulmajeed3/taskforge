import * as crypto from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { CreateInvitationDto } from './dto/create-invitation.dto';

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);
  private static readonly TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(private readonly prisma: PrismaService) {}

  async create(caller: ActiveMembership, dto: CreateInvitationDto) {
    const email = dto.email.toLowerCase().trim();

    // Check if already a member.
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const existingMembership = await this.prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: caller.organizationId,
            userId: existingUser.id,
          },
        },
      });
      if (existingMembership) {
        throw new ConflictException('That user is already a member of this organization');
      }
    }

    // Invalidate any existing pending invitation for this email.
    await this.prisma.invitation.updateMany({
      where: {
        organizationId: caller.organizationId,
        email,
        status: 'PENDING',
      },
      data: { status: 'REVOKED' },
    });

    const raw = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
    const role = dto.role ?? 'MEMBER';
    const expiresAt = new Date(Date.now() + InvitationsService.TTL_MS);

    const invitation = await this.prisma.invitation.create({
      data: {
        organizationId: caller.organizationId,
        email,
        role,
        tokenHash,
        invitedById: caller.userId,
        expiresAt,
        status: 'PENDING',
      },
    });

    this.logger.log(
      { invitationId: invitation.id, organizationId: caller.organizationId },
      'Invitation created',
    );

    // In production, send the invitation email. For dev/test, log the token.
    this.logger.warn({ inviteToken: raw }, 'DEV/TEST: Invitation token (console only)');

    return { ...invitation, token: raw };
  }

  async list(organizationId: string) {
    return this.prisma.invitation.findMany({
      where: { organizationId },
      include: {
        invitedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async accept(rawToken: string, userId: string) {
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const invitation = await this.prisma.invitation.findUnique({ where: { tokenHash } });

    if (!invitation) throw new NotFoundException('Invitation not found');
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException(`Invitation has already been ${invitation.status.toLowerCase()}`);
    }
    if (invitation.expiresAt < new Date()) {
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invitation has expired');
    }

    // Check if already a member (race condition guard).
    const existing = await this.prisma.organizationMembership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId,
        },
      },
    });
    if (existing) {
      // Mark used but don't fail — idempotent.
      await this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      return existing;
    }

    const [_, membership] = await this.prisma.$transaction([
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      }),
      this.prisma.organizationMembership.create({
        data: {
          organizationId: invitation.organizationId,
          userId,
          role: invitation.role,
        },
      }),
    ]);

    return membership;
  }

  async revoke(caller: ActiveMembership, invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
    });
    if (!invitation || invitation.organizationId !== caller.organizationId) {
      throw new NotFoundException('Invitation not found');
    }
    if (invitation.status !== 'PENDING') {
      throw new BadRequestException('Only pending invitations can be revoked');
    }
    return this.prisma.invitation.update({
      where: { id: invitationId },
      data: { status: 'REVOKED' },
    });
  }
}
