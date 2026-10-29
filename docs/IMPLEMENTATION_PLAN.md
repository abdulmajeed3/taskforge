# TaskForge — Implementation Plan

This document tracks the implementation of TaskForge from inspection through release
preparation. It is updated as work progresses. Status markers: `[ ]` not started,
`[~]` in progress, `[x]` done.

## 1. Environment Inspection (completed 2026-10-28)

| Item | Finding | Decision |
|---|---|---|
| Workspace | Empty, no existing code | Initialize from scratch |
| Git | Not initialized | `git init -b main` performed |
| Node.js | v26.11.1 installed | Node 26.x is the LTS line as of Oct 2026 (even-numbered majors become LTS each October); pin via `.nvmrc` = `26.11.1`, `engines.node` = `>=26.11 <27` |
| npm | 11.20.0 | Use npm workspaces (no pnpm/yarn installed) |
| Docker | Not installed on this machine | `docker-compose.yml` / `Dockerfile`s are still authored for other developers and CI, but **not verified in this session**. Local dev/test here uses a native PostgreSQL 18 Windows service instead (see below). This is called out explicitly in the README/TROUBLESHOOTING so it isn't mistaken for a tested Docker workflow. |
| PostgreSQL | Native Windows service `postgresql-x64-18` already running on `127.0.0.1:5432` | Created a dedicated login role `taskforge` (generated password, stored only in the local untracked `.env`) owning two databases: `taskforge_dev` and `taskforge_test`. This was done by briefly adding a `trust` rule for `127.0.0.1` to `pg_hba.conf`, creating the role/databases, then restoring the original `pg_hba.conf` (scram-sha-256) from a backup and reloading. No existing data, roles, or other databases (e.g. `medics360`) were touched. |

### Package version policy

All dependency versions below were confirmed against the live npm registry at
implementation time (not from training-data memory), using `npm view <pkg> dist-tags`
to avoid accidentally pinning a prerelease. Two deliberate overrides from "absolute
latest":

- `prisma` / `@prisma/client` / `@prisma/adapter-pg` are pinned to **7.10.1**, not the
  `latest`-tagged `8.0.0-rc.28`, because the 8.x line is still a release candidate.
- Everything else uses the registry's stable `latest` tag at time of writing.

## 2. Goals and Non-Goals

See `docs/ARCHITECTURE.md` for the full architecture. In short: a modular-monolith
NestJS + Fastify API, a React + Vite SPA, PostgreSQL via Prisma, JWT auth with
refresh-token rotation, and strict organization-level tenancy isolation enforced in
the service layer, backed by tests.

Non-goals for v1: microservices, real-time websockets/live collaboration, recurring
tasks, task dependency graphs, real outbound email delivery (the email *provider
interface* is implemented; a real SMTP/API provider is left as a documented
configuration step since no credentials were supplied).

## 3. Phases and Acceptance Criteria

### Phase 1 — Inspection & Planning — `[x]`
- Workspace inspected, tooling verified, DB provisioned.
- This plan, `docs/ARCHITECTURE.md`, and the initial Prisma schema design written.
- Acceptance: a developer reading this file understands exactly what exists and why.

### Phase 2 — Repository Foundation — `[x]`
- npm workspaces monorepo (`apps/api`, `apps/web`, `packages/shared`).
- Root TypeScript base config, ESLint 10 flat config, Prettier, EditorConfig, `.nvmrc`.
- `docker-compose.yml` (Postgres) + API/web Dockerfiles (documented as unverified here).
- `.env.example`, `.gitignore`.
- GitHub Actions CI skeleton (`.github/workflows/ci.yml`).
- Acceptance: `npm install` succeeds at the root; `npm run -w apps/api build` and
  `npm run -w apps/web build` succeed (empty/near-empty apps at this point).

### Phase 3 — Database & Security Foundation — `[x]`
- Full Prisma schema (all entities from §8 of the brief), initial migration applied
  to `taskforge_dev`, seed script, migration applied/verified against the real local
  database.
- `packages/shared`: enums, DTO-adjacent types, pagination/response contract types.
- API bootstrap: Fastify adapter, Helmet, CORS, cookie plugin, global validation
  pipe, global exception filter, request-ID middleware, structured Pino logging,
  Zod-validated environment configuration.
- Auth foundations: Argon2id hashing, JWT access/refresh strategy, refresh-token
  rotation/revocation persisted via `RefreshToken` table, auth guards, roles guard,
  tenancy guard (derives active organization from membership, never from a raw
  client-supplied field alone).
- Tests for the above (hashing, token rotation, guards, config validation).
- Acceptance: `npx prisma migrate deploy` succeeds against `taskforge_dev`/`taskforge_test`;
  `npm run -w apps/api test` passes for this slice.

### Phase 4 — Backend Modules — `[~]`
For each module: DTOs → service logic → persistence → authorization → tests → Swagger →
docs. Order: `auth` → `users` → `organizations` → `memberships` → `invitations` →
`projects` → `tasks` (+ `labels`) → `comments` → `activity` → `notifications` →
`dashboard`.
- Acceptance per module: unit + integration tests green, endpoints visible in
  `/api/docs` (Swagger), cross-tenant isolation test passing for that module.

### Phase 5 — Frontend — `[ ]`
Design system primitives → auth pages → org onboarding/switching → dashboard →
projects → Kanban + task table/detail → team management → notifications → settings.
- Acceptance: pages consume the real API (no mocked data in the shipped app — MSW is
  test-only), with loading/empty/error states and responsive layout.

### Phase 6 — Integration & Quality — `[ ]`
Full lint/typecheck/test/build sweep across the monorepo; Playwright critical-path
flows; fix root causes rather than suppressing errors.

### Phase 7 — Documentation & Release Prep — `[ ]`
Finish README and all `docs/*.md`, verify every command/link/diagram/env var/endpoint
reference, confirm no secrets are committed, write the final implementation report.

## 4. External Credentials / Infrastructure Required (none fabricated)

| Need | Status | Where documented |
|---|---|---|
| Outbound email provider (SMTP or API, e.g. for verification/reset emails) | Not configured — no provider credentials available | `.env.example`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`; `EmailService` has a working `ConsoleEmailProvider` for local dev and a typed interface for a real provider |
| Docker runtime | Not installed in this environment | `docker-compose.yml`/Dockerfiles authored but unverified here; native Postgres used instead |
| Production PostgreSQL instance | Out of scope for this session | `docs/DEPLOYMENT.md` |
| TLS/HTTPS termination | Out of scope for local dev | `docs/DEPLOYMENT.md` |

## 5. Known Risks Identified Up Front

- **Scope**: this brief specifies a very large application. Depth is prioritized
  over breadth: auth, tenancy, projects, and tasks are implemented completely and
  tested; some later items (full notification fan-out rules, exhaustive Playwright
  coverage) may be reduced in scope if time runs out, and will be reported honestly
  rather than claimed as done.
- **Docker unverified**: compose files are written to the same standard as the rest
  of the code but cannot be executed in this environment.
- **Node 26 is very new**: some third-party tooling may lag; pinned via `.nvmrc` and
  called out in TROUBLESHOOTING if it causes friction.
- **Email delivery**: no real provider — reporting this explicitly rather than
  claiming verification emails are sent.

## 6. Progress Log

- 2026-10-28 — Phase 1 complete. Environment inspected, native Postgres role/databases
  provisioned, plan and architecture docs started.
