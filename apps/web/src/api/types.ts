/** Shared TypeScript types matching the API response shapes. */

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  meta: PaginationMeta;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface OrgMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: string;
  organization: Organization;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
  organizationId: string;
}

export interface TaskAssignee {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  projectId: string;
  organizationId: string;
  assigneeId: string | null;
  assignee: TaskAssignee | null;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string };
  dueDate: string | null;
  archivedAt: string | null;
  position: number;
  taskLabels: { label: Label }[];
  _count: { comments: number };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  author: TaskAssignee;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  organizationId: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  organizationId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  actor: TaskAssignee | null;
}

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  };
}

export interface DashboardData {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  thisWeekTasks: number;
  tasksByStatus: { status: string; count: number }[];
  tasksByPriority: { priority: string; count: number }[];
  recentActivity: ActivityLog[];
  projectStats: { total: number; active: number; completed: number };
  teamActivity: { userId: string; firstName: string; lastName: string; count: number }[];
}
