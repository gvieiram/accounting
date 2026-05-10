# F1a — Admin Foundation Implementation Plan (Index)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each PR plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the admin foundation of DuoHub (auth + clients CRUD + audit) as five mergeable PRs that incrementally deliver value.

**Architecture:** Magic-link only authentication via Better Auth, server-side guard pattern, feature-first organization, Prisma + Postgres (Neon in prod, Docker locally for tests). Soft-deletes preserve `AuditLog` integrity; matriz/filial via `Client.parentClientId` self-reference.

**Tech Stack:** Next.js 16 (App Router) · React 19 · Better Auth · Prisma 7 · Postgres (Neon) · Tailwind v4 · shadcn/ui · react-hook-form · zod · date-fns · Resend · Upstash Redis · Vitest · Robot Framework (Playwright).

**Spec:** `docs/superpowers/specs/2026-04-27-f1a-admin-foundation-design.md`

---

## How this plan is organized

Each PR has its own self-contained plan file. They are designed to be executed **in order** because each depends on the schema/helpers from previous PRs. Open the file for the PR you're starting, work through it task-by-task, merge to `main`, then move to the next file.

| # | File | Goal | Estimated tasks |
|---|---|---|---|
| 1 | `2026-05-02-f1a-pr1-schema-audit.md` | Prisma schema (User, Client, etc.) + AuditLog helper. No UI yet. | ~12 |
| 2 | `2026-05-02-f1a-pr2-auth.md` | Better Auth + magic link + Postgres test setup + `/api/test/last-magic-link` + login UI. | ~22 |
| 3 | `2026-05-02-f1a-pr3-shell.md` | `/admin` middleware, layout, sidebar, header, dashboard placeholder. | ~13 |
| 4 | `2026-05-02-f1a-pr4-users.md` | `/admin/users` (list + invite + revoke) with audit + Robot E2E. Adds `lib/date.ts`. | ~16 |
| 5 | `2026-05-10-f1a-pr5-clients-v3.md` | `/admin/clients` CRUD with matriz/filial, ViaCEP, audit (cascade archive, CPF/CNPJ checksum, no E2E — Vitest + smoke manual). Supersedes the 2026-05-02 v1 and 2026-05-10 v2 drafts. | ~13 |

**Total estimated tasks:** ~83 across all five PRs.

## Branch convention & integration strategy

**Integration branch:** `chore/DUO-45/f1a-implementation-plans` (this branch — holds the spec + plans).

PRs 46–50 are **merged into the integration branch**, not into `main`. After all 5 PRs are merged, the epic branch is merged into `main` (strategy decided when closing the epic — merge commit / squash / rebase).

```
              ┌── feat/DUO-46/f1a-pr1-schema-audit ──┐
              ├── feat/DUO-47/f1a-pr2-auth ──────────┤
chore/DUO-45 ─┼── feat/DUO-48/f1a-pr3-shell ─────────┼──→ main (later)
              ├── feat/DUO-49/f1a-pr4-users ─────────┤
              └── feat/DUO-50/f1a-pr5-clients ───────┘
```

Each PR uses its own Linear issue and branch:

```
feat/DUO-46/f1a-pr1-schema-audit
feat/DUO-47/f1a-pr2-auth
feat/DUO-48/f1a-pr3-shell
feat/DUO-49/f1a-pr4-users
feat/DUO-50/f1a-pr5-clients
```

**When opening a sub-PR:** target `chore/DUO-45/f1a-implementation-plans`, NOT `main`.

```bash
gh pr create --base chore/DUO-45/f1a-implementation-plans --title "..." --body "..."
```

Linear issues (already created — see [DUO-45](https://linear.app/gvieiram/issue/DUO-45/f1a-admin-foundation)):

- **[DUO-45](https://linear.app/gvieiram/issue/DUO-45/f1a-admin-foundation)** (epic) — F1a: Admin Foundation
  - **[DUO-46](https://linear.app/gvieiram/issue/DUO-46/f1a-pr1-prisma-schema-auditlog-helper)** — F1a · PR1: Prisma schema + AuditLog helper
  - **[DUO-47](https://linear.app/gvieiram/issue/DUO-47/f1a-pr2-better-auth-magic-link-login-ui)** — F1a · PR2: Better Auth magic-link + login UI
  - **[DUO-48](https://linear.app/gvieiram/issue/DUO-48/f1a-pr3-admin-shell-middleware-csp)** — F1a · PR3: Admin shell, middleware, CSP
  - **[DUO-49](https://linear.app/gvieiram/issue/DUO-49/f1a-pr4-user-management-list-invite-revoke)** — F1a · PR4: User management UI
  - **[DUO-50](https://linear.app/gvieiram/issue/DUO-50/f1a-pr5-client-crud-com-matrizfilial-viacep)** — F1a · PR5: Client CRUD with matriz/filial + ViaCEP

## Testing strategy (cross-PR)

| Test type | Tool | Where | When |
|---|---|---|---|
| Unit / domain logic | Vitest | `src/**/*.test.ts(x)` | TDD micro-cyclic per task |
| Integration (Server Actions w/ mocked DB) | Vitest | same | TDD micro-cyclic per task |
| End-to-end (browser) | Robot Framework via `ze testa` | `tests/robot/<area>/<flow>.robot` (e.g. `tests/robot/admin/user_management.robot`) | Last step before opening PR |
| Static checks | Biome (`pnpm lint`), TS (`pnpm build`) | — | Before commit + before PR |

**TDD discipline:** for every Server Action, util, query, schema, helper:

1. Write a single failing test (RED).
2. Implement minimal code to make it pass (GREEN).
3. Move on to the next test case for that unit.
4. Refactor only when the unit is fully tested.

**No tests for:** purely visual components (sidebar layout, badge styling, dashboard placeholder). Confidence comes from Vitest coverage of business logic and Robot E2E coverage of critical flows.

**Robot E2E coverage:** only PR2, PR4, PR5 ship Robot suites. Each suite covers the **happy path of the PR's main flow** plus one edge case.

## Per-PR Definition of Done

A PR may not open until ALL of the following are true:

- [ ] All Vitest tests added in this PR pass (`pnpm test --run`)
- [ ] All Vitest tests in the repo still pass (no regression)
- [ ] `pnpm lint` is clean
- [ ] `pnpm build` is clean
- [ ] If applicable, the Robot suite for this PR passes (e.g. `ze testa tests/robot/admin/<flow>.robot` — see each PR for the exact path)
- [ ] Branch is rebased on the latest `chore/DUO-45/f1a-implementation-plans`
- [ ] `docs/superpowers/specs/2026-04-27-f1a-admin-foundation-design.md` is updated if any decision drifted during implementation
- [ ] Linear sub-issue is updated with PR link

## Pre-flight before PR1 (one-time setup, ~15min)

These are needed before starting any PR. Do them now:

- [ ] Confirm Zé Papagaio stack is running:
  ```bash
  ze status
  # If anything is missing: ze voltar
  ```
- [ ] Confirm `pnpm test --run` passes on `main` (no pre-existing failures):
  ```bash
  pnpm test --run
  # Expected: 11 passed (11), 77 passed (77)
  ```
- [ ] Read the spec end-to-end:
  ```bash
  open docs/superpowers/specs/2026-04-27-f1a-admin-foundation-design.md
  ```
- [x] Linear epic + 5 sub-issues already created (see DUO-45 / DUO-46–50 above).

## Cross-PR file index

Files that span multiple PRs and where they're created/touched:

| File | PR1 | PR2 | PR3 | PR4 | PR5 |
|---|---|---|---|---|---|
| `prisma/schema.prisma` | create models | — | — | — | — |
| `src/lib/audit/log.ts` | create | use | use | use | use |
| `src/lib/auth/auth.ts` | — | create | use | use | use |
| `src/lib/auth/helpers.ts` | — | create | use (`requireAdmin`) | use | use |
| `src/lib/env.ts` | — | extend | — | — | — |
| `src/lib/ratelimit.ts` | — | extend | — | — | — |
| `src/middleware.ts` | — | — | create | — | — |
| `src/app/admin/layout.tsx` | — | — | create | — | — |
| `src/app/admin/_components/*` | — | — | create | — | — |
| `src/content/messages/common.ts` | — | — | — | extend | extend |
| `src/content/messages/auth.ts` | — | create | — | — | — |
| `src/content/messages/admin.ts` | — | — | create | extend | extend |
| `src/lib/date.ts` | — | — | — | create | use |
| `src/lib/viacep.ts` | — | — | — | — | create |

## When you're ready

Open `docs/superpowers/plans/2026-05-02-f1a-pr1-schema-audit.md` and start.
