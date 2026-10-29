import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Building2 } from 'lucide-react';
import { orgsApi } from '../../api/organizations';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { setOrgId } from '../../api/client';
import { ApiError } from '../../api/client';

const schema = z.object({
  name: z.string().min(2, 'At least 2 characters').max(100),
  description: z.string().max(500).optional(),
});

type FormData = z.infer<typeof schema>;

export function CreateOrgPage() {
  const { refreshMemberships, switchOrg } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    try {
      const org = await orgsApi.create(data);
      switchOrg(org.id);
      await refreshMemberships();
      toast.success(`Welcome to ${org.name}!`);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to create organization. Please try again.');
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mb-4">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create your organization</h1>
          <p className="mt-1 text-sm text-slate-500">
            Organizations are shared workspaces for your team
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xs dark:border-slate-700 dark:bg-slate-900">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Organization name"
              placeholder="Acme Corp"
              error={errors.name?.message}
              autoFocus
              {...register('name')}
            />
            <Textarea
              label="Description (optional)"
              placeholder="What does your organization do?"
              error={errors.description?.message}
              {...register('description')}
            />
            <Button type="submit" className="w-full" loading={isSubmitting} size="lg">
              Create organization
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
