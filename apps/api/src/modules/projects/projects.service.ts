import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { paginationArgs, buildPaginationMeta } from '../../common/helpers/pagination.helper';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { CreateProjectDto } from './dto/create-project.dto';
import type { ProjectQueryDto } from './dto/project-query.dto';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(membership: ActiveMembership, dto: CreateProjectDto) {
    const project = await this.prisma.project.create({
      data: {
        organizationId: membership.organizationId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        status: dto.status ?? 'PLANNING',
        startDate: dto.startDate,
        dueDate: dto.dueDate,
        createdById: membership.userId,
      },
    });
    this.logger.log({ projectId: project.id }, 'Project created');
    return project;
  }

  async findAll(membership: ActiveMembership, query: ProjectQueryDto) {
    const { page, pageSize } = query;
    const { skip, take } = paginationArgs(page, pageSize);

    const where: Prisma.ProjectWhereInput = {
      organizationId: membership.organizationId,
      archivedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { tasks: { where: { archivedAt: null } } } },
        },
      }),
      this.prisma.project.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, pageSize) };
  }

  async findById(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, archivedAt: null },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        memberships: {
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true, avatarUrl: true } },
          },
        },
        _count: {
          select: {
            tasks: { where: { archivedAt: null } },
          },
        },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async update(membership: ActiveMembership, projectId: string, dto: Partial<CreateProjectDto>) {
    await this.assertProjectAccess(membership.organizationId, projectId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && { startDate: dto.startDate }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
      },
    });
  }

  async archive(membership: ActiveMembership, projectId: string) {
    const project = await this.assertProjectAccess(membership.organizationId, projectId);
    if (project.archivedAt) throw new BadRequestException('Project is already archived');
    return this.prisma.project.update({
      where: { id: projectId },
      data: { archivedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async getTaskStats(organizationId: string, projectId: string) {
    await this.assertProjectAccess(organizationId, projectId);

    const [byStatus, byPriority, overdueCount] = await Promise.all([
      this.prisma.task.groupBy({
        by: ['status'],
        where: { projectId, archivedAt: null },
        _count: { status: true },
      }),
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { projectId, archivedAt: null },
        _count: { priority: true },
      }),
      this.prisma.task.count({
        where: {
          projectId,
          archivedAt: null,
          status: { notIn: ['DONE'] },
          dueDate: { lt: new Date() },
        },
      }),
    ]);

    return { byStatus, byPriority, overdueCount };
  }

  private async assertProjectAccess(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }
}
