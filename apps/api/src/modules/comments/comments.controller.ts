import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActiveOrganization } from '../../common/decorators/active-organization.decorator';
import type { ActiveMembership } from '../../common/types/active-membership.type';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('comments')
@ApiBearerAuth()
@Controller('organizations/:orgId/tasks/:taskId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Add a comment to a task' })
  create(
    @Param('taskId', ParseUuidPipe) taskId: string,
    @ActiveOrganization() m: ActiveMembership,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(m, taskId, dto);
  }

  @Patch(':commentId')
  @ApiOperation({ summary: 'Edit a comment (author only)' })
  update(
    @Param('commentId', ParseUuidPipe) commentId: string,
    @ActiveOrganization() m: ActiveMembership,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.update(m, commentId, dto);
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author or Admin+)' })
  async remove(
    @Param('commentId', ParseUuidPipe) commentId: string,
    @ActiveOrganization() m: ActiveMembership,
  ) {
    await this.commentsService.remove(m, commentId);
    return null;
  }
}
