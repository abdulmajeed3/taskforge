# ADR 0003: JWT access token + rotating opaque refresh token

- **Status**: Accepted
- **Date**: 2026-10-28

## Context

The API needs stateless, fast authorization checks on every request, but also
needs the ability to revoke a compromised session immediately — which pure
stateless JWTs cannot do without a denylist.

## Decision

- **Access token**: a short-lived (15 minute) signed JWT containing `sub` (user
  id) only — no role or organization claims, since those can change between
  requests and must be re-derived from the database on every request via
  `OrganizationContextGuard`. Returned in the JSON response body; the frontend
  keeps it in memory only.
- **Refresh token**: a long-lived (30 day), opaque, cryptographically random
  value. Only its SHA-256 hash is persisted (`RefreshToken.tokenHash`), set as an
  `httpOnly`, `secure`, `sameSite=lax` cookie scoped to `/api/v1/auth`. Each use
  rotates it (issues a new token, marks the old one `revokedAt`, links via
  `replacedByTokenHash`) and reuse of an already-rotated token revokes the whole
  `family`, treating it as a theft signal.

## Consequences

- Revoking a session (logout, or detected reuse) takes effect immediately because
  refresh is checked against the database; access-token-only compromise is
  limited to a 15-minute window.
- The access token is never persisted in `localStorage`, reducing the impact of
  XSS; it is still exposed to any JS running on the page as it must be attached to
  `Authorization` headers — see `docs/SECURITY.md` for the full XSS/CSRF
  discussion and `/auth/refresh`'s CSRF mitigations (double-submit is unnecessary
  here because the refresh cookie is scoped to a same-site, state-changing POST
  route guarded by `sameSite=lax`, and the endpoint performs no state change
  readable cross-site).
- This is more complex than a single long-lived JWT, but meaningfully more secure
  and auditable; simpler than a full server-side session store for every request.
