# ADR 0002: Prisma as the ORM

- **Status**: Accepted
- **Date**: 2026-10-28

## Context

The application needs type-safe database access, a migration workflow that can
recreate the schema from scratch, and reasonable protection against SQL injection
and mass-assignment by default.

## Decision

Use Prisma ORM (`prisma`, `@prisma/client`, `@prisma/adapter-pg`) with a single
`prisma/schema.prisma` as the source of truth, committed migrations under
`prisma/migrations/`, and the generated `PrismaClient` injected into services via a
`PrismaService` (extends `PrismaClient`, wired into Nest's lifecycle hooks).

## Consequences

- Query results are fully typed end to end; no hand-written SQL string
  concatenation, which removes an entire class of injection bugs by construction.
- Migrations are generated (`prisma migrate dev`) and reviewed, not hand-written,
  reducing drift between schema and migration history.
- Prisma's query API does not support arbitrarily dynamic column allowlisting as
  cleanly as a query builder would; sorting/filtering endpoints therefore use an
  explicit allowlist map in each service rather than passing client input directly
  into `orderBy`/`where`.
- Pinned to the 7.x stable line rather than the 8.x release candidate available at
  implementation time, to avoid depending on pre-release behavior.
