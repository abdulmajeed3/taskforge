import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import type { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(membership: ActiveMembership, taskId: string, dto: CreateCommentDto) {
    // Confirm task belongs to this org.
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, organizationId: membership.organizationId },
    });
    if (!task) throw new NotFoundException('Task not found');

    return this.prisma.comment.create({
      data: { taskId, authorId: membership.userId, body: dto.body.trim() },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async update(membership: ActiveMembership, commentId: string, dto: CreateCommentDto) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.authorId !== membership.userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }
    return this.prisma.comment.update({
      where: { id: commentId },
      data: { body: dto.body.trim(), editedAt: new Date() },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    });
  }

  async remove(membership: ActiveMembership, commentId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { task: { select: { organizationId: true } } },
    });
    if (!comment || comment.task.organizationId !== membership.organizationId) {
      throw new NotFoundException('Comment not found');
    }
    // Authors can delete own comments; admins/owners can delete any.
    const isAdmin = ['ADMIN', 'OWNER'].includes(membership.role);
    if (!isAdmin && comment.authorId !== membership.userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
  }
}
