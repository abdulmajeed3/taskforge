import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

const ACTIVE_PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD'];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrganizationDashboard(organizationId: string, _userId: string) {
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 86_400_000);

    const [
      tasksByStatus,
      tasksByPriority,
      overdueCount,
      thisWeekCount,
      recentActivity,
      projectCounts,
      topAssignees,
    ] = await Promise.all([
      // All task counts grouped by status — use `id` (non-nullable) to count rows
      this.prisma.task.groupBy({
        by: ['status'],
        where: { organizationId, archivedAt: null },
        _count: { id: true },
      }),

      // Open task counts grouped by priority
      this.prisma.task.groupBy({
        by: ['priority'],
        where: { organizationId, archivedAt: null, status: { notIn: ['DONE'] } },
        _count: { id: true },
      }),

      // Overdue count
      this.prisma.task.count({
        where: {
          organizationId,
          archivedAt: null,
          status: { notIn: ['DONE'] },
          dueDate: { lt: now },
        },
      }),

      // Due this week count
      this.prisma.task.count({
        where: {
          organizationId,
          archivedAt: null,
          status: { notIn: ['DONE'] },
          dueDate: { gte: now, lte: weekLater },
        },
      }),

      // Recent activity log
      this.prisma.activityLog.findMany({
        where: { organizationId },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),

      // Project counts by status (non-archived)
      this.prisma.project.groupBy({
        by: ['status'],
        where: { organizationId, archivedAt: null },
        _count: { id: true },
      }),

      // Top 5 contributors by completed tasks
      this.prisma.task.groupBy({
        by: ['assigneeId'],
        where: {
          organizationId,
          archivedAt: null,
          status: 'DONE',
          assigneeId: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    // Derive totals
    const totalTasks = tasksByStatus.reduce((s, r) => s + r._count.id, 0);
    const completedTasks = tasksByStatus.find((r) => r.status === 'DONE')?._count.id ?? 0;

    // Project stats
    const projectActiveCount = projectCounts
      .filter((r) => ACTIVE_PROJECT_STATUSES.includes(r.status))
      .reduce((s, r) => s + r._count.id, 0);
    const projectCompletedCount = projectCounts.find((r) => r.status === 'COMPLETED')?._count.id ?? 0;
    const projectTotal = projectCounts.reduce((s, r) => s + r._count.id, 0);

    // Hydrate assignee names for team activity
    const assigneeIds = topAssignees
      .map((r) => r.assigneeId)
      .filter((id): id is string => id !== null);

    const assigneeUsers = assigneeIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: assigneeIds } },
          select: { id: true, firstName: true, lastName: true },
        })
      : [];

    const userMap = new Map(assigneeUsers.map((u) => [u.id, u]));

    return {
      totalTasks,
      completedTasks,
      overdueTasks: overdueCount,
      thisWeekTasks: thisWeekCount,
      tasksByStatus: tasksByStatus.map((r) => ({ status: r.status, count: r._count.id })),
      tasksByPriority: tasksByPriority.map((r) => ({ priority: r.priority, count: r._count.id })),
      recentActivity,
      projectStats: {
        total: projectTotal,
        active: projectActiveCount,
        completed: projectCompletedCount,
      },
      teamActivity: assigneeIds.map((id) => {
        const user = userMap.get(id);
        const entry = topAssignees.find((r) => r.assigneeId === id);
        return {
          userId: id,
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          count: entry?._count.id ?? 0,
        };
      }),
    };
  }
}
