import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController, KanbanController } from './tasks.controller';

@Module({
  controllers: [TasksController, KanbanController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
