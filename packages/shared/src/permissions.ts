import type { MembershipRole } from './enums.js';

/**
 * The organization permissions matrix.
 *
 * This is used by the frontend to decide what to render (disable a button, hide
 * a menu item) and, separately, by the backend's `RolesGuard`/service-layer
 * checks to decide what to *allow*. The frontend copy is a UX convenience only —
 * every capability here is re-checked on the server before the corresponding
 * mutation runs (see docs/SECURITY.md §3). Capabilities named here are
 * coarse-grained, role-level checks; resource-specific rules (e.g. "only the
 * task's assignee or creator may do X", "an organization's last OWNER cannot be
 * removed") are enforced in the relevant service and documented alongside it,
 * not in this matrix.
 */
export const CAPABILITIES = [
  'organization:update',
  'organization:archive',
  'organization:delete',
  'member:invite',
  'member:remove',
  'member:changeRole',
  'project:create',
  'project:update',
  'project:archive',
  'project:manageMembers',
  'task:create',
  'task:update',
  'task:assign',
  'task:archive',
  'task:comment',
  'label:manage',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const ALL_TRUE = Object.fromEntries(CAPABILITIES.map((c) => [c, true])) as Record<
  Capability,
  boolean
>;
const ALL_FALSE = Object.fromEntries(CAPABILITIES.map((c) => [c, false])) as Record<
  Capability,
  boolean
>;

export const PERMISSION_MATRIX: Record<MembershipRole, Record<Capability, boolean>> = {
  OWNER: ALL_TRUE,
  ADMIN: { ...ALL_TRUE, 'organization:delete': false },
  MEMBER: {
    ...ALL_FALSE,
    'project:create': true,
    'project:update': true,
    'task:create': true,
    'task:update': true,
    'task:assign': true,
    'task:archive': true,
    'task:comment': true,
    'label:manage': true,
  },
  VIEWER: ALL_FALSE,
};

export function roleCan(role: MembershipRole, capability: Capability): boolean {
  return PERMISSION_MATRIX[role][capability];
}

/** Relative rank, higher is more privileged. Useful for "can X manage a member with role Y" checks. */
export const ROLE_RANK: Record<MembershipRole, number> = {
  VIEWER: 0,
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};
