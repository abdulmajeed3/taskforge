import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { dashboardApi } from '../../api/dashboard';
import { useAuth } from '../../contexts/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Avatar } from '../../components/ui/avatar';
import { Spinner } from '../../components/ui/spinner';
import { formatRelative, STATUS_LABELS } from '../../lib/utils';

const STATUS_CHART_COLORS: Record<string, string> = {
  BACKLOG: '#94a3b8', TODO: '#60a5fa', IN_PROGRESS: '#818cf8',
  IN_REVIEW: '#a78bfa', DONE: '#34d399', CANCELLED: '#f87171',
};

const PRIORITY_COLORS = ['#f87171', '#fb923c', '#fbbf24', '#60a5fa'];

function StatCard({ title, value, sub, icon: Icon, color }: {
  title: string; value: number; sub?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{title}</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{value}</p>
            {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const { currentOrgId, memberships } = useAuth();
  const org = memberships.find((m) => m.organizationId === currentOrgId)?.organization;

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', currentOrgId],
    queryFn: () => dashboardApi.get(currentOrgId!),
    enabled: !!currentOrgId,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  if (!data) return null;

  const completionRate = data.totalTasks > 0
    ? Math.round((data.completedTasks / data.totalTasks) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">{org?.name} · Overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total tasks"
          value={data.totalTasks}
          icon={Activity}
          color="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          title="Completed"
          value={data.completedTasks}
          sub={`${completionRate}% completion rate`}
          icon={CheckCircle2}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          title="Overdue"
          value={data.overdueTasks}
          icon={AlertTriangle}
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="Due this week"
          value={data.thisWeekTasks}
          icon={Clock}
          color="bg-amber-100 text-amber-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tasks by status */}
        <Card>
          <CardHeader>
            <CardTitle>Tasks by status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.tasksByStatus.map((d) => ({ ...d, name: STATUS_LABELS[d.status] ?? d.status }))}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-800" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '0.5rem', fontSize: '0.75rem', border: '1px solid #e2e8f0' }}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                >
                  {data.tasksByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_CHART_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tasks by priority */}
        <Card>
          <CardHeader>
            <CardTitle>Priority distribution</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={data.tasksByPriority}
                  dataKey="count"
                  nameKey="priority"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {data.tasksByPriority.map((_, i) => (
                    <Cell key={i} fill={PRIORITY_COLORS[i % PRIORITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '0.5rem', fontSize: '0.75rem' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {data.tasksByPriority.map((item, i) => (
                <div key={item.priority} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PRIORITY_COLORS[i % PRIORITY_COLORS.length] }} />
                  <span className="text-slate-600 dark:text-slate-400">{item.priority}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100 ml-auto pl-4">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">No recent activity</p>
            ) : (
              <ul className="space-y-3">
                {data.recentActivity.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-start gap-3">
                    {item.actor ? (
                      <Avatar name={`${item.actor.firstName} ${item.actor.lastName}`} src={item.actor.avatarUrl} size="sm" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-medium">
                          {item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : 'System'}
                        </span>{' '}
                        {item.action.toLowerCase().replace(/_/g, ' ')}{' '}
                        <span className="text-slate-500">{item.entityType.toLowerCase()}</span>
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatRelative(item.createdAt)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Project stats + top contributors */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: 'Total', value: data.projectStats.total, color: 'text-slate-900 dark:text-slate-100' },
                  { label: 'Active', value: data.projectStats.active, color: 'text-indigo-600' },
                  { label: 'Completed', value: data.projectStats.completed, color: 'text-emerald-600' },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top contributors</CardTitle>
            </CardHeader>
            <CardContent>
              {data.teamActivity.length === 0 ? (
                <p className="text-sm text-slate-500 py-2 text-center">No activity yet</p>
              ) : (
                <ul className="space-y-3">
                  {data.teamActivity.slice(0, 5).map((member) => (
                    <li key={member.userId} className="flex items-center gap-3">
                      <Avatar name={`${member.firstName} ${member.lastName}`} size="sm" />
                      <span className="text-sm text-slate-700 dark:text-slate-300 flex-1">
                        {member.firstName} {member.lastName}
                      </span>
                      <span className="text-xs font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {member.count} tasks
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
