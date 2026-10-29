import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
import { notificationsApi } from '../../api/notifications';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Spinner } from '../../components/ui/spinner';
import { EmptyState } from '../../components/ui/empty-state';
import { cn } from '../../lib/cn';
import { formatRelative } from '../../lib/utils';

export function NotificationsPage() {
  const { currentOrgId } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', currentOrgId],
    queryFn: () => notificationsApi.list(currentOrgId!),
    enabled: !!currentOrgId,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(currentOrgId!, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications', currentOrgId] }),
  });

  const markAllMutation = useMutation({
    mutationFn: () => notificationsApi.markAllRead(currentOrgId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications', currentOrgId] });
      toast.success('All notifications marked as read');
    },
  });

  const notifications = data?.items ?? [];
  const unreadCount = data?.meta.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllMutation.mutate()} loading={markAllMutation.isPending}>
            <CheckCheck className="h-4 w-4" /> Mark all read
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications"
          description="You're all caught up!"
        />
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'flex items-start gap-4 px-6 py-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
                  !n.readAt && 'bg-indigo-50/50 dark:bg-indigo-900/10',
                )}
                onClick={() => { if (!n.readAt) markReadMutation.mutate(n.id); }}
              >
                <div className={cn('mt-1 h-2 w-2 rounded-full flex-shrink-0', n.readAt ? 'bg-transparent' : 'bg-indigo-500')} />
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', n.readAt ? 'text-slate-700 dark:text-slate-300' : 'font-medium text-slate-900 dark:text-slate-100')}>
                    {n.title}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-slate-400 mt-1">{formatRelative(n.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
