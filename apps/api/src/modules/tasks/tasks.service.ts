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
import type { CreateTaskDto } from './dto/create-task.dto';
import type { TaskQueryDto } from './dto/task-query.dto';

const TASK_INCLUDE = {
  assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
  taskLabels: { include: { label: true } },
  _count: { select: { comments: true } },
} as const;

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(membership: ActiveMembership, dto: CreateTaskDto) {
    // Validate project belongs to this organization.
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId: membership.organizationId },
    });
    if (!project) throw new BadRequestException('Project not found in this organization');
    if (project.archivedAt) throw new BadRequestException('Cannot add tasks to an archived project');

    // Validate assignee is a member of this organization.
    if (dto.assigneeId) {
      const assigneeMembership = await this.prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: membership.organizationId,
            userId: dto.assigneeId,
          },
        },
      });
      if (!assigneeMembership) {
        throw new BadRequestException('Assignee is not a member of this organization');
      }
    }

    // Validate labels belong to this organization.
    if (dto.labelIds?.length) {
      const labelCount = await this.prisma.label.count({
        where: {
          id: { in: dto.labelIds },
          organizationId: membership.organizationId,
        },
      });
      if (labelCount !== dto.labelIds.length) {
        throw new BadRequestException('One or more labels not found in this organization');
      }
    }

    const task = await this.prisma.task.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        projectId: dto.projectId,
        // Denormalized organizationId — kept equal to project.organizationId (validated above).
        organizationId: membership.organizationId,
        status: dto.status ?? 'BACKLOG',
        priority: dto.priority ?? 'MEDIUM',
        assigneeId: dto.assigneeId,
        createdById: membership.userId,
        dueDate: dto.dueDate,
        ...(dto.labelIds?.length && {
          taskLabels: {
            createMany: { data: dto.labelIds.map((labelId) => ({ labelId })) },
          },
        }),
      },
      include: TASK_INCLUDE,
    });

    this.logger.log({ taskId: task.id, projectId: task.projectId }, 'Task created');
    return task;
  }

  async findAll(membership: ActiveMembership, query: TaskQueryDto) {
    const { page, pageSize } = query;
    const { skip, take } = paginationArgs(page, pageSize);

    const where: Prisma.TaskWhereInput = {
      organizationId: membership.organizationId,
      archivedAt: null,
      ...(query.projectId && { projectId: query.projectId }),
      ...(query.status && { status: query.status }),
      ...(query.priority && { priority: query.priority }),
      ...(query.assigneeId && { assigneeId: query.assigneeId }),
      ...(query.labelId && { taskLabels: { some: { labelId: query.labelId } } }),
      ...(query.search && { title: { contains: query.search, mode: 'insensitive' } }),
      ...(query.overdueOnly === true && {
        status: { notIn: ['DONE'] },
        dueDate: { lt: new Date() },
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take,
        orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
        include: TASK_INCLUDE,
      }),
      this.prisma.task.count({ where }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, pageSize) };
  }

  async findById(organizationId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId, archivedAt: null },
      include: {
        ...TASK_INCLUDE,
        comments: {
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  async update(membership: ActiveMembership, taskId: string, dto: Partial<CreateTaskDto>) {
    await this.assertTaskAccess(membership.organizationId, taskId);

    // Validate any new assignee.
    if (dto.assigneeId !== undefined && dto.assigneeId !== null) {
      const m = await this.prisma.organizationMembership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: membership.organizationId,
            userId: dto.assigneeId,
          },
        },
      });
      if (!m) throw new BadRequestException('Assignee is not a member of this organization');
    }

    const updated = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate }),
        // Replace all labels when labelIds is supplied.
        ...(dto.labelIds !== undefined && {
          taskLabels: {
            deleteMany: {},
            createMany: { data: dto.labelIds.map((labelId) => ({ labelId })) },
          },
        }),
      },
      include: TASK_INCLUDE,
    });

    return updated;
  }

  async archive(membership: ActiveMembership, taskId: string) {
    const task = await this.assertTaskAccess(membership.organizationId, taskId);
    if (task.archivedAt) throw new BadRequestException('Task is already archived');
    return this.prisma.task.update({
      where: { id: taskId },
      data: { archivedAt: new Date() },
    });
  }

  /** Returns tasks grouped by status for Kanban view. */
  async kanban(organizationId: string, projectId: string) {
    // Validate project is in org.
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.task.findMany({
      where: { projectId, organizationId, archivedAt: null },
      include: TASK_INCLUDE,
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  private async assertTaskAccess(organizationId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }
}
