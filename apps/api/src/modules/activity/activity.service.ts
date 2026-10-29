import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ActivityAction } from '@taskforge/shared';
import { PrismaService } from '../../database/prisma.service';
import { paginationArgs, buildPaginationMeta } from '../../common/helpers/pagination.helper';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Record an activity log entry. Silently swallows errors — logging failure must not break business operations. */
  async log(opts: {
    organizationId: string;
    actorId: string | null;
    action: ActivityAction;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          organizationId: opts.organizationId,
          actorId: opts.actorId,
          action: opts.action,
          entityType: opts.entityType,
          entityId: opts.entityId,
          metadata: (opts.metadata ?? {}) as Prisma.InputJsonValue,
        },
      });
    } catch {
      // Activity logging must not break the primary operation.
    }
  }

  async list(organizationId: string, query: PaginationQueryDto) {
    const { page, pageSize } = query;
    const { skip, take } = paginationArgs(page, pageSize);

    const [items, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where: { organizationId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
      }),
      this.prisma.activityLog.count({ where: { organizationId } }),
    ]);

    return { items, meta: buildPaginationMeta(total, page, pageSize) };
  }
}
