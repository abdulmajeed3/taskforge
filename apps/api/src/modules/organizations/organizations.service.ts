import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { CreateOrganizationDto } from './dto/create-organization.dto';
import type { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = dto.slug ?? this.slugify(dto.name);

    const existing = await this.prisma.organization.findUnique({ where: { slug } });
    if (existing) throw new ConflictException(`Slug "${slug}" is already taken`);

    const org = await this.prisma.$transaction(async (tx) => {
      const created = await tx.organization.create({
        data: { name: dto.name.trim(), slug, description: dto.description?.trim() },
      });
      await tx.organizationMembership.create({
        data: { organizationId: created.id, userId, role: 'OWNER' },
      });
      return created;
    });

    this.logger.log({ organizationId: org.id, userId }, 'Organization created');
    return org;
  }

  async findById(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  async update(membership: ActiveMembership, dto: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id: membership.organizationId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
      },
    });
  }

  async archive(membership: ActiveMembership) {
    const org = await this.prisma.organization.findUniqueOrThrow({
      where: { id: membership.organizationId },
    });
    if (org.archivedAt) throw new BadRequestException('Organization is already archived');
    return this.prisma.organization.update({
      where: { id: membership.organizationId },
      data: { archivedAt: new Date() },
    });
  }

  async delete(membership: ActiveMembership) {
    // Confirm the caller is the only owner before hard-deleting.
    const ownerCount = await this.prisma.organizationMembership.count({
      where: { organizationId: membership.organizationId, role: 'OWNER' },
    });
    if (ownerCount > 1) {
      throw new BadRequestException(
        'Transfer or remove other owners before deleting the organization',
      );
    }
    await this.prisma.organization.delete({ where: { id: membership.organizationId } });
    this.logger.warn({ organizationId: membership.organizationId }, 'Organization deleted');
  }

  async getStats(organizationId: string) {
    const [projectCount, taskCounts, memberCount] = await Promise.all([
      this.prisma.project.count({
        where: { organizationId, archivedAt: null, status: { not: 'ARCHIVED' } },
      }),
      this.prisma.task.groupBy({
        by: ['status'],
        where: { organizationId, archivedAt: null },
        _count: { status: true },
      }),
      this.prisma.organizationMembership.count({ where: { organizationId } }),
    ]);
    return { projectCount, taskCounts, memberCount };
  }

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60);
  }
}
