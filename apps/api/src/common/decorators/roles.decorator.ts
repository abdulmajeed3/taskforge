import { SetMetadata } from '@nestjs/common';
import type { MembershipRole } from '@taskforge/shared';

export const ROLES_KEY = 'roles';

/**
 * Specifies the minimum membership role(s) required to access an endpoint.
 * Used in conjunction with RolesGuard. Any listed role is sufficient (OR logic).
 *
 * @example
 * @Roles('OWNER', 'ADMIN')
 * async deleteOrganization() { ... }
 */
export const Roles = (...roles: MembershipRole[]) => SetMetadata(ROLES_KEY, roles);
