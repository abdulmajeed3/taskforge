# ADR 0001: Modular monolith over microservices

- **Status**: Accepted
- **Date**: 2026-10-28

## Context

TaskForge needs clear module boundaries (auth, organizations, projects, tasks,
etc.) but is built and operated by a small team (in practice, one developer for
this portfolio project).

## Decision

Build a single deployable NestJS application with internal modules enforcing
boundaries through controller/service layering and Nest's dependency injection,
rather than splitting into separate services communicating over the network.

## Consequences

- Transactions spanning multiple "modules" (e.g. creating a task and its activity
  log entry) can use a single Prisma transaction — no distributed transaction or
  saga needed.
- Deployment, logging, and local development stay simple (one process, one
  database connection pool).
- If a specific module later needs independent scaling (e.g. notifications), it
  can be extracted because its boundary is already explicit in code.
- Trade-off accepted: the whole API scales as one unit; this is appropriate for
  the target audience (small teams/organizations), not a high-scale consumer app.
