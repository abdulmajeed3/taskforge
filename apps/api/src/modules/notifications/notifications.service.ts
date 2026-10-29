import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { NotificationType } from '@taskforge/shared';
import { PrismaService } from '../../database/prisma.service';
import { paginationArgs, buildPaginationMeta } from '../../common/helpers/pagination.helper';
import type { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async send(opts: {
    userId: string;
    organizationId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId: opts.userId,
        organizationId: opts.organizationId,
        type: opts.type,
        title: opts.title,
        body: opts.body,
        ...(opts.data !== undefined && { data: opts.data as Prisma.InputJsonValue }),
      },
    });
  }

  async list(userId: string, organizationId: string, query: PaginationQueryDto) {
    const { page, pageSize } = query;
    const { skip, take } = paginationArgs(page, pageSize);

    const [items, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, organizationId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId, organizationId } }),
      this.prisma.notification.count({ where: { userId, organizationId, readAt: null } }),
    ]);

    return {
      items,
      meta: { ...buildPaginationMeta(total, page, pageSize), unreadCount },
    };
  }

  async markRead(userId: string, organizationId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId, organizationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string, organizationId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, organizationId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
