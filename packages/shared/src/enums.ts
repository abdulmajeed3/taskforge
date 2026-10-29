/**
 * Enum values shared between the API and the web app.
 *
 * These are intentionally plain string unions rather than imports from the
 * generated Prisma client: the client is a Node-only artifact and must never be
 * bundled into the browser. Each union's values are kept identical to the
 * matching enum in `prisma/schema.prisma` by convention, and that equivalence is
 * exercised by `apps/api/test/schema-enum-parity.spec.ts`.
 */

export const MEMBERSHIP_ROLES = ['OWNER', 'ADMIN', 'MEMBER', 'VIEWER'] as const;
export type MembershipRole = (typeof MEMBERSHIP_ROLES)[number];

export const INVITATION_STATUSES = ['PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const PROJECT_STATUSES = ['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_MEMBER_ROLES = ['LEAD', 'CONTRIBUTOR'] as const;
export type ProjectMemberRole = (typeof PROJECT_MEMBER_ROLES)[number];

export const TASK_STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const NOTIFICATION_TYPES = [
  'TASK_ASSIGNED',
  'TASK_UNASSIGNED',
  'TASK_STATUS_CHANGED',
  'TASK_DUE_SOON',
  'COMMENT_ADDED',
  'MENTIONED',
  'INVITATION_RECEIVED',
  'MEMBERSHIP_ROLE_CHANGED',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ACTIVITY_ACTIONS = [
  'ORGANIZATION_CREATED',
  'ORGANIZATION_UPDATED',
  'ORGANIZATION_ARCHIVED',
  'MEMBER_INVITED',
  'MEMBER_JOINED',
  'MEMBER_REMOVED',
  'MEMBER_ROLE_CHANGED',
  'PROJECT_CREATED',
  'PROJECT_UPDATED',
  'PROJECT_ARCHIVED',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_STATUS_CHANGED',
  'TASK_ASSIGNED',
  'TASK_UNASSIGNED',
  'TASK_ARCHIVED',
  'COMMENT_ADDED',
  'LABEL_CREATED',
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/**
 * Display order for Kanban columns. Any-to-any status changes are allowed (a card
 * can be dragged directly from Backlog to Done); there is no enforced state
 * machine, since a real team's workflow does not fit one rigidly.
 */
export const TASK_STATUS_ORDER: readonly TaskStatus[] = TASK_STATUSES;
