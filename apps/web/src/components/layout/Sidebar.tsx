import { NavLink } from 'react-router';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Bell,
  Settings,
  ChevronDown,
  Plus,
  Building2,
} from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAuth } from '../../contexts/auth-context';
import { Avatar } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function Sidebar() {
  const { user, memberships, currentOrgId, switchOrg, logout } = useAuth();
  const currentOrg = memberships.find((m) => m.organizationId === currentOrgId);
  const fullName = user ? `${user.firstName} ${user.lastName}` : '';

  return (
    <aside className="flex h-full w-60 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      {/* Org switcher */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-700">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg p-2 text-left hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold flex-shrink-0">
                {currentOrg?.organization.name.slice(0, 1).toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {currentOrg?.organization.name ?? 'No organization'}
                </p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            {memberships.map((m) => (
              <DropdownMenuItem
                key={m.organizationId}
                onClick={() => switchOrg(m.organizationId)}
                className={cn(m.organizationId === currentOrgId && 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300')}
              >
                <Building2 className="h-4 w-4" />
                {m.organization.name}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => (window.location.href = '/onboarding')}>
              <Plus className="h-4 w-4" />
              New organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-0.5">
          {navItems.map(({ to, icon: Icon, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
                  )
                }
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* User menu */}
      <div className="p-3 border-t border-slate-200 dark:border-slate-700">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none">
              <Avatar name={fullName} src={user?.avatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{fullName}</p>
                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
            <DropdownMenuItem onClick={() => (window.location.href = '/settings')}>
              <Settings className="h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600" onClick={logout}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
