import type { MembershipRole } from '@taskforge/shared';

/**
 * Attached to the request by OrganizationContextGuard after verifying that
 * the authenticated user is actually a member of the requested organization.
 * Every tenant-scoped service should derive organizationId from this object,
 * never from a raw request field — see docs/ARCHITECTURE.md §2 and ADR 0004.
 */
export interface ActiveMembership {
  membershipId: string;
  organizationId: string;
  userId: string;
  role: MembershipRole;
}
