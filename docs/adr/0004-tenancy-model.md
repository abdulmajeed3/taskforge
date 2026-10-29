# ADR 0004: Shared-schema multi-tenancy with server-derived organization context

- **Status**: Accepted
- **Date**: 2026-10-28

## Context

TaskForge is multi-tenant at the organization level. Tenant data must never leak
across organizations, whether through a forged request field, a missing `WHERE`
clause, or a client-controlled `organizationId`.

## Decision

- A single shared schema; every tenant-scoped table carries an `organizationId`
  (directly, or via a parent that does) with an index supporting it.
- The active organization for a request is resolved by `OrganizationContextGuard`
  from the authenticated user's `OrganizationMembership` rows plus an
  `X-Organization-Id` header, which is validated against that user's actual
  memberships before being trusted — a client cannot claim membership in an
  organization it does not belong to. The resulting `req.membership` (containing
  the verified `organizationId` and `role`) is what every service method uses, not
  the raw header or any `organizationId` present in a request body.
- `RolesGuard` reads `@Roles(...)` metadata and checks it against
  `req.membership.role`, after the guard above has verified membership.
- Every Prisma query in a tenant-scoped service includes `organizationId` in its
  `where` clause (directly, or by joining through a relation already filtered by
  it), proven by the cross-tenant isolation tests in each module.

## Consequences

- No per-tenant schema or database to manage; simpler operations.
- Correctness depends on discipline in the service layer — mitigated by the
  isolation tests being a required part of each module's "done" checklist (see
  `docs/IMPLEMENTATION_PLAN.md` §3) and by thin controllers that cannot bypass the
  guard chain.
- A separate-database-per-tenant model was rejected as unnecessary operational
  complexity for the target scale (small teams/organizations), and row-level
  security in PostgreSQL was considered but deferred — it would add a second place
  (DB session variables) where tenancy logic must be kept correct, for a project
  of this size the application-layer guard chain is judged sufficient and is
  easier to test. This is a documented limitation, not a claim of defense in depth.
