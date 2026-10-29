import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from '../contexts/auth-context';
import { FullPageSpinner } from '../components/ui/spinner';
import { AppShell } from '../components/layout/AppShell';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { CreateOrgPage } from '../pages/onboarding/CreateOrgPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { ProjectsPage } from '../pages/projects/ProjectsPage';
import { ProjectDetailPage } from '../pages/projects/ProjectDetailPage';
import { MembersPage } from '../pages/members/MembersPage';
import { NotificationsPage } from '../pages/notifications/NotificationsPage';
import { SettingsPage } from '../pages/settings/SettingsPage';

// ---- auth guards -------------------------------------------------------

function PublicRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function RequireAuth() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RequireOrg() {
  const { currentOrgId, memberships, isLoading } = useAuth();
  if (isLoading) return <FullPageSpinner />;
  if (!currentOrgId && memberships.length === 0) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

// ---- router ------------------------------------------------------------

const router = createBrowserRouter([
  { index: true, element: <Navigate to="/dashboard" replace /> },

  // Public-only routes (redirect to dashboard when already authenticated)
  {
    element: <PublicRoute />,
    children: [
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
    ],
  },

  // Requires authentication
  {
    element: <RequireAuth />,
    children: [
      // Onboarding: authenticated but no org required yet
      { path: 'onboarding', element: <CreateOrgPage /> },

      // Requires a selected org
      {
        element: <RequireOrg />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'projects', element: <ProjectsPage /> },
              { path: 'projects/:projectId', element: <ProjectDetailPage /> },
              { path: 'members', element: <MembersPage /> },
              { path: 'notifications', element: <NotificationsPage /> },
              { path: 'settings', element: <SettingsPage /> },
            ],
          },
        ],
      },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/dashboard" replace /> },
]);

// ---- query client -------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,     // 1 min
      retry: (count, err) => {
        // Don't retry on 4xx errors
        if (err instanceof Error && 'status' in err) {
          const status = (err as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        return count < 2;
      },
    },
    mutations: { retry: false },
  },
});

// ---- root component -----------------------------------------------------

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors closeButton />
      </AuthProvider>
    </QueryClientProvider>
  );
}
