import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowLeft, Plus, GripVertical, MoreHorizontal, User } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { tasksApi } from '../../api/tasks';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { Avatar } from '../../components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown';
import { cn } from '../../lib/cn';
import { STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS, PRIORITY_COLORS } from '../../lib/utils';
import { ApiError } from '../../api/client';
import type { Task } from '../../api/types';

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(5000).optional(),
  priority: z.string().default('MEDIUM'),
  assigneeId: z.string().optional(),
});
type TaskFormData = z.infer<typeof taskSchema>;

function KanbanCard({ task, onOpen }: { task: Task; onOpen: (t: Task) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group rounded-lg border border-slate-200 bg-white p-3 shadow-xs hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
      onClick={() => onOpen(task)}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2">{task.title}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-medium', PRIORITY_COLORS[task.priority])}>
              {PRIORITY_LABELS[task.priority]}
            </span>
            {task.assignee && (
              <Avatar
                name={`${task.assignee.firstName} ${task.assignee.lastName}`}
                src={task.assignee.avatarUrl}
                size="sm"
              />
            )}
          </div>
          {task._count.comments > 0 && (
            <p className="mt-1 text-xs text-slate-400">{task._count.comments} comment{task._count.comments !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentOrgId } = useAuth();
  const qc = useQueryClient();
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const { data: project } = useQuery({
    queryKey: ['project', currentOrgId, projectId],
    queryFn: () => projectsApi.get(currentOrgId!, projectId!),
    enabled: !!currentOrgId && !!projectId,
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['kanban', currentOrgId, projectId],
    queryFn: () => tasksApi.kanban(currentOrgId!, projectId!),
    enabled: !!currentOrgId && !!projectId,
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: { priority: 'MEDIUM' },
  });

  const createMutation = useMutation({
    mutationFn: (d: TaskFormData) =>
      tasksApi.create(currentOrgId!, {
        ...d,
        projectId: projectId!,
        status: createStatus ?? 'BACKLOG',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kanban', currentOrgId, projectId] });
      toast.success('Task created');
      setCreateStatus(null);
      reset();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : 'Failed'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      tasksApi.update(currentOrgId!, id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kanban', currentOrgId, projectId] }),
  });

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    // If dropped over a column header (status)
    const newStatus = String(over.id);
    if (STATUSES.includes(newStatus as (typeof STATUSES)[number])) {
      updateStatusMutation.mutate({ id: String(active.id), status: newStatus });
    }
  }

  const tasksByStatus: Record<string, Task[]> = {};
  STATUSES.forEach((s) => { tasksByStatus[s] = []; });
  tasks.forEach((t) => { (tasksByStatus[t.status] ??= []).push(t); });
  const activeTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  if (isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/projects" className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{project?.name ?? '…'}</h1>
          {project?.description && <p className="text-sm text-slate-500 mt-0.5">{project.description}</p>}
        </div>
      </div>

      {/* Kanban board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((status) => {
            const col = tasksByStatus[status] ?? [];
            return (
              <div key={status} className="flex-shrink-0 w-64">
                {/* Column header — also a drop target */}
                <div
                  className="mb-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('text-xs font-semibold px-2 py-1 rounded-full', STATUS_COLORS[status])}>
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs text-slate-400">{col.length}</span>
                  </div>
                  <button
                    onClick={() => setCreateStatus(status)}
                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Cards */}
                <SortableContext items={col.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  <div
                    className="space-y-2 min-h-[48px] rounded-xl bg-slate-100/60 dark:bg-slate-800/40 p-2"
                  >
                    {col.map((task) => (
                      <KanbanCard key={task.id} task={task} onOpen={setSelectedTask} />
                    ))}
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask && (
            <div className="rounded-lg border border-indigo-300 bg-white p-3 shadow-lg">
              <p className="text-sm font-medium text-slate-900">{activeTask.title}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Create task dialog */}
      <Dialog open={!!createStatus} onOpenChange={(o) => { if (!o) { setCreateStatus(null); reset(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task · {STATUS_LABELS[createStatus ?? 'BACKLOG']}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <Input label="Title" placeholder="Task title" error={errors.title?.message} autoFocus {...register('title')} />
            <Textarea label="Description (optional)" placeholder="Optional description…" {...register('description')} />
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Priority</label>
              <Select defaultValue="MEDIUM" onValueChange={(v) => setValue('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => { setCreateStatus(null); reset(); }}>Cancel</Button>
              <Button type="submit" loading={isSubmitting || createMutation.isPending}>Create task</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Task detail dialog */}
      {selectedTask && (
        <TaskDetailDialog
          task={selectedTask}
          orgId={currentOrgId!}
          onClose={() => setSelectedTask(null)}
          onUpdate={() => qc.invalidateQueries({ queryKey: ['kanban', currentOrgId, projectId] })}
        />
      )}
    </div>
  );
}

function TaskDetailDialog({ task, orgId, onClose, onUpdate }: {
  task: Task; orgId: string; onClose: () => void; onUpdate: () => void;
}) {
  const qc = useQueryClient();
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(task.title);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<{ title: string; status: string; priority: string }>) =>
      tasksApi.update(orgId, task.id, data),
    onSuccess: () => { onUpdate(); toast.success('Task updated'); },
    onError: () => toast.error('Failed to update task'),
  });

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-2 pr-6">
            {editTitle ? (
              <input
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onBlur={() => {
                  if (titleVal.trim() && titleVal !== task.title) {
                    updateMutation.mutate({ title: titleVal.trim() });
                  }
                  setEditTitle(false);
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setTitleVal(task.title); setEditTitle(false); } }}
                className="flex-1 text-lg font-semibold text-slate-900 dark:text-slate-100 bg-transparent border-b-2 border-indigo-500 outline-none"
                autoFocus
              />
            ) : (
              <DialogTitle
                className="flex-1 cursor-text hover:bg-slate-100 dark:hover:bg-slate-800 rounded px-1 py-0.5 -ml-1"
                onClick={() => setEditTitle(true)}
              >
                {task.title}
              </DialogTitle>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 space-y-4">
            {task.description && (
              <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{task.description}</p>
            )}
            {!task.description && (
              <p className="text-sm text-slate-400 italic">No description</p>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Status</p>
              <Select value={task.status} onValueChange={(v) => updateMutation.mutate({ status: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">Priority</p>
              <Select value={task.priority} onValueChange={(v) => updateMutation.mutate({ priority: v })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {task.assignee && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Assignee</p>
                <div className="flex items-center gap-2">
                  <Avatar name={`${task.assignee.firstName} ${task.assignee.lastName}`} size="sm" />
                  <span className="text-xs text-slate-700 dark:text-slate-300">
                    {task.assignee.firstName} {task.assignee.lastName}
                  </span>
                </div>
              </div>
            )}

            {task.dueDate && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Due date</p>
                <p className="text-xs text-slate-700 dark:text-slate-300">
                  {new Date(task.dueDate).toLocaleDateString()}
                </p>
              </div>
            )}

            {task.taskLabels.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-1">Labels</p>
                <div className="flex flex-wrap gap-1">
                  {task.taskLabels.map(({ label }) => (
                    <span
                      key={label.id}
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
