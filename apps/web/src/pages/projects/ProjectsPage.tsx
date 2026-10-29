import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { FolderKanban, Plus, MoreHorizontal, Archive } from 'lucide-react';
import { projectsApi } from '../../api/projects';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Spinner } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../../components/ui/dropdown';
import { formatDate } from '../../lib/utils';
import { ApiError } from '../../api/client';

const schema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

export function ProjectsPage() {
  const { currentOrgId } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['projects', currentOrgId],
    queryFn: () => projectsApi.listForOrg(currentOrgId!),
    enabled: !!currentOrgId,
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const createMutation = useMutation({
    mutationFn: (d: FormData) => projectsApi.create(currentOrgId!, d),
    onSuccess: (project) => {
      qc.invalidateQueries({ queryKey: ['projects', currentOrgId] });
      toast.success('Project created');
      setOpen(false);
      reset();
      navigate(`/projects/${project.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create project');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => projectsApi.archive(currentOrgId!, id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', currentOrgId] });
      toast.success('Project archived');
    },
  });

  const projects = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="h-6 w-6" />}
          title="No projects yet"
          description="Create your first project to start organizing tasks"
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />New project</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="h-2.5 w-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {project.name}
                      </h3>
                    </div>
                    {project.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{project.description}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-opacity">
                        <MoreHorizontal className="h-4 w-4 text-slate-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); archiveMutation.mutate(project.id); }}
                        className="text-amber-600"
                      >
                        <Archive className="h-4 w-4" /> Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <Badge variant={project.archivedAt ? 'secondary' : 'default'} className="text-xs">
                    {project.archivedAt ? 'Archived' : project.status.toLowerCase()}
                  </Badge>
                  <span>Created {formatDate(project.createdAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <Input label="Project name" placeholder="My Project" error={errors.name?.message} autoFocus {...register('name')} />
            <Textarea label="Description (optional)" placeholder="What is this project about?" error={errors.description?.message} {...register('description')} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting || createMutation.isPending}>Create project</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
