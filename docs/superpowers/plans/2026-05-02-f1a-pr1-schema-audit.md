# F1a · PR1 — Prisma Schema + AuditLog Helper

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the F1a Prisma schema (User, Account, Session, Verification, Client, UserClient, AuditLog) and the `auditLog.write()` helper. No UI, no auth.

**Architecture:** Self-contained foundational PR. Models follow Better Auth conventions (so PR2 plugs in cleanly). Soft-deletes via `revokedAt` / `archivedAt` preserve audit FKs. `Client.parentClientId` self-reference handles matriz/filial. AuditLog helper writes asynchronously and never throws (best-effort).

**Tech Stack:** Prisma 7 · Postgres (Neon) · Vitest (unit tests with mocked db).

**Spec:** `docs/superpowers/specs/2026-04-27-f1a-admin-foundation-design.md`

**Plan index:** `docs/superpowers/plans/2026-05-02-f1a-admin-foundation-plan-index.md`

**Branch:** `feat/DUO-46/f1a-pr1-schema-audit`

---

## Pre-flight checklist

Before starting:

- [ ] On `main` and pulled latest:
  ```bash
  git checkout chore/DUO-45/f1a-implementation-plans && git pull
  ```
- [ ] Linear sub-issue exists (DUO-46 — F1a · PR1: Prisma schema + AuditLog helper).
- [ ] Tests pass on `main`:
  ```bash
  pnpm test --run
  # Expected: 11 passed (11), 77 passed (77)
  ```
- [ ] Create feature branch:
  ```bash
  git checkout -b feat/<DUO-46>/f1a-pr1-schema-audit
  ```

## File structure (this PR)

| File | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | modify | Add 7 models + 6 enums for F1a |
| `src/lib/audit/log.ts` | create | `auditLog.write()` helper |
| `src/lib/audit/log.test.ts` | create | Unit tests for the helper |
| `src/lib/audit/extract-request-context.ts` | create | Extract IP + UA from `Request` |
| `src/lib/audit/extract-request-context.test.ts` | create | Unit tests |

The `seed-admin.ts` script lives in PR2 (depends on Better Auth `account` row).

---

### Task 1: Add `User`, `Account`, `Session`, `Verification` models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1.1: Add UserRole enum, User, Account, Session, Verification at the end of `prisma/schema.prisma`**

```prisma
// === Better Auth core (F1a) ===

enum UserRole {
  ADMIN
  CLIENT
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  role          UserRole  @default(ADMIN)
  emailVerified Boolean   @default(false)
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  revokedAt     DateTime?

  accounts    Account[]
  sessions    Session[]
  userClients UserClient[]
  auditLogs   AuditLog[]   @relation("AuditLogActor")

  @@index([email])
  @@index([revokedAt])
}

model Account {
  id         String   @id @default(cuid())
  userId     String
  providerId String
  accountId  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@index([userId])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@index([expiresAt])
}
```

- [ ] **Step 1.2: Validate the schema parses**

```bash
pnpm prisma validate
```
Expected: `The schema at prisma/schema.prisma is valid 🚀`.

If validation fails, fix the syntax error reported by Prisma before proceeding.

- [ ] **Step 1.3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): add User, Account, Session, Verification models for F1a"
```

---

### Task 2: Add `Client` model with matriz/filial self-reference

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 2.1: Append Client enums and model**

```prisma
// === Client (F1a) ===

enum ClientType {
  PF
  PJ
}

enum TaxRegime {
  MEI
  SIMPLES_NACIONAL
  LUCRO_PRESUMIDO
  LUCRO_REAL
}

enum ClientStatus {
  ACTIVE
  PROSPECT
  INACTIVE
  CHURNED
}

model Client {
  id String @id @default(cuid())

  type      ClientType
  legalName String
  tradeName String?
  document  String     @unique // CPF (PF) ou CNPJ (PJ), só dígitos

  taxRegime         TaxRegime?
  stateRegistration String?
  cityRegistration  String?

  segment String?

  primaryEmail String
  primaryPhone String
  contactName  String

  zipCode      String?
  street       String?
  number       String?
  complement   String?
  neighborhood String?
  city         String?
  state        String?

  additionalContacts Json?

  parentClientId String?
  parentClient   Client?  @relation("ClientBranches", fields: [parentClientId], references: [id], onDelete: Restrict)
  branches       Client[] @relation("ClientBranches")

  status        ClientStatus @default(ACTIVE)
  internalNotes String?

  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  archivedAt DateTime?

  userClients UserClient[]

  @@index([type])
  @@index([taxRegime])
  @@index([status])
  @@index([archivedAt])
  @@index([legalName])
  @@index([parentClientId])
}
```

- [ ] **Step 2.2: Validate the schema parses**

```bash
pnpm prisma validate
```
Expected: schema valid.

- [ ] **Step 2.3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): add Client model with matriz/filial self-reference"
```

---

### Task 3: Add `UserClient` and `AuditLog` models

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 3.1: Append UserClient and AuditLog**

```prisma
// === N:N preparado para F4 ===

enum UserClientRole {
  OWNER
  VIEWER
}

model UserClient {
  id        String         @id @default(cuid())
  userId    String
  clientId  String
  role      UserClientRole @default(VIEWER)
  createdAt DateTime       @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  client Client @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([userId, clientId])
  @@index([userId])
  @@index([clientId])
}

// === Audit log (F1a) ===

enum AuditAction {
  USER_LOGIN_SUCCESS
  USER_LOGIN_FAILED
  USER_LOGOUT
  MAGIC_LINK_SENT
  MAGIC_LINK_USED
  USER_INVITED
  USER_REVOKED
  CLIENT_CREATED
  CLIENT_UPDATED
  CLIENT_DELETED
}

model AuditLog {
  id String @id @default(cuid())

  actorId    String?
  actorEmail String?

  action       AuditAction
  resourceType String?
  resourceId   String?

  metadata  Json?
  ipAddress String?
  userAgent String?

  createdAt DateTime @default(now())

  actor User? @relation("AuditLogActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([actorId, createdAt])
  @@index([resourceType, resourceId])
  @@index([action, createdAt])
  @@index([createdAt])
}
```

- [ ] **Step 3.2: Validate the schema parses**

```bash
pnpm prisma validate
```
Expected: schema valid.

- [ ] **Step 3.3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(prisma): add UserClient pivot and AuditLog models"
```

---

### Task 4: Generate the migration locally (do NOT apply yet)

> ⚠️ Per the user's rules: the user must run `npx prisma migrate dev --name <name>` manually. Do NOT run it in this task — instead, instruct the user to run it and confirm.

- [ ] **Step 4.1: Stop and ask the user to run the migration**

Print this exact request to the user:

> "I'm ready to apply the F1a migration. Please run:
> ```bash
> npx prisma migrate dev --name f1a_admin_foundation
> ```
> This creates the SQL migration in `prisma/migrations/<timestamp>_f1a_admin_foundation/migration.sql` and applies it to the local database. Once you confirm it succeeded, I'll continue."

Wait for the user's confirmation before continuing.

- [ ] **Step 4.2: Verify the migration was created and the Prisma client regenerated**

```bash
ls prisma/migrations/ | tail -3
pnpm prisma generate
```
Expected: a new directory `<timestamp>_f1a_admin_foundation/` exists. `pnpm prisma generate` finishes without errors.

- [ ] **Step 4.3: Verify generated types include new models**

```bash
node -e "const { Prisma } = require('./src/generated/prisma'); console.log(Object.keys(Prisma).filter(k => k.includes('Client') || k.includes('User') || k.includes('Audit')).slice(0, 20));"
```
Expected: array includes `ClientStatus`, `ClientType`, `UserRole`, `AuditAction`, etc.

- [ ] **Step 4.4: Commit the migration**

```bash
git add prisma/migrations/
git commit -m "feat(prisma): apply f1a_admin_foundation migration"
```

---

### Task 5: Create `extractRequestContext()` helper

This helper extracts IP + User-Agent from a `Request` (Web Fetch API) for use by audit log writers. Pure function, easy to test.

**Files:**
- Create: `src/lib/audit/extract-request-context.ts`
- Create: `src/lib/audit/extract-request-context.test.ts`

- [ ] **Step 5.1: Write the failing test**

```ts
// src/lib/audit/extract-request-context.test.ts
// @vitest-environment node

import { describe, expect, it } from "vitest";
import { extractRequestContext } from "./extract-request-context";

describe("extractRequestContext", () => {
  it("returns nulls when no request is provided", () => {
    expect(extractRequestContext(undefined)).toEqual({
      ipAddress: null,
      userAgent: null,
    });
  });

  it("extracts IP from x-forwarded-for, taking only the first hop", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
    });
    expect(extractRequestContext(req).ipAddress).toBe("203.0.113.1");
  });

  it("falls back to x-real-ip when x-forwarded-for is missing", () => {
    const req = new Request("https://example.com", {
      headers: { "x-real-ip": "203.0.113.5" },
    });
    expect(extractRequestContext(req).ipAddress).toBe("203.0.113.5");
  });

  it("returns null IP when no proxy headers are set", () => {
    const req = new Request("https://example.com");
    expect(extractRequestContext(req).ipAddress).toBeNull();
  });

  it("extracts user-agent header", () => {
    const req = new Request("https://example.com", {
      headers: { "user-agent": "Mozilla/5.0 Test" },
    });
    expect(extractRequestContext(req).userAgent).toBe("Mozilla/5.0 Test");
  });

  it("trims whitespace around IP from x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "  203.0.113.1  , 10.0.0.1" },
    });
    expect(extractRequestContext(req).ipAddress).toBe("203.0.113.1");
  });
});
```

- [ ] **Step 5.2: Run the test to confirm RED**

```bash
pnpm test --run src/lib/audit/extract-request-context.test.ts
```
Expected: FAIL with `Failed to resolve import "./extract-request-context"`.

- [ ] **Step 5.3: Implement the helper**

```ts
// src/lib/audit/extract-request-context.ts
export type RequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

export function extractRequestContext(
  request: Request | undefined,
): RequestContext {
  if (!request) {
    return { ipAddress: null, userAgent: null };
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const userAgent = request.headers.get("user-agent");

  let ipAddress: string | null = null;
  if (forwardedFor) {
    ipAddress = forwardedFor.split(",")[0]?.trim() ?? null;
  } else if (realIp) {
    ipAddress = realIp.trim();
  }

  return {
    ipAddress: ipAddress || null,
    userAgent: userAgent?.trim() || null,
  };
}
```

- [ ] **Step 5.4: Run the tests to confirm GREEN**

```bash
pnpm test --run src/lib/audit/extract-request-context.test.ts
```
Expected: PASS, 6/6.

- [ ] **Step 5.5: Commit**

```bash
git add src/lib/audit/extract-request-context.ts src/lib/audit/extract-request-context.test.ts
git commit -m "feat(audit): add extractRequestContext helper"
```

---

### Task 6: Create `auditLog.write()` helper — happy path test

**Files:**
- Create: `src/lib/audit/log.ts`
- Create: `src/lib/audit/log.test.ts`

- [ ] **Step 6.1: Write the failing happy-path test**

```ts
// src/lib/audit/log.test.ts
// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auditLogCreateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: { auditLog: { create: auditLogCreateMock } },
}));

const { auditLog } = await import("./log");

describe("auditLog.write — happy path", () => {
  beforeEach(() => {
    auditLogCreateMock.mockReset();
    auditLogCreateMock.mockResolvedValue({ id: "log_1" });
  });

  it("writes an entry with the provided fields", async () => {
    await auditLog.write({
      action: "USER_LOGIN_SUCCESS",
      actorId: "user_1",
      actorEmail: "admin@duohubcontabil.com.br",
    });

    expect(auditLogCreateMock).toHaveBeenCalledWith({
      data: {
        action: "USER_LOGIN_SUCCESS",
        actorId: "user_1",
        actorEmail: "admin@duohubcontabil.com.br",
        resourceType: undefined,
        resourceId: undefined,
        metadata: undefined,
        ipAddress: null,
        userAgent: null,
      },
    });
  });

  it("forwards resource fields when given", async () => {
    await auditLog.write({
      action: "CLIENT_CREATED",
      actorId: "user_1",
      actorEmail: "admin@duohubcontabil.com.br",
      resourceType: "Client",
      resourceId: "client_42",
      metadata: { legalName: "ACME LTDA" },
    });

    const call = auditLogCreateMock.mock.calls[0]?.[0];
    expect(call?.data.resourceType).toBe("Client");
    expect(call?.data.resourceId).toBe("client_42");
    expect(call?.data.metadata).toEqual({ legalName: "ACME LTDA" });
  });
});
```

- [ ] **Step 6.2: Run the test to confirm RED**

```bash
pnpm test --run src/lib/audit/log.test.ts
```
Expected: FAIL with `Failed to resolve import "./log"`.

- [ ] **Step 6.3: Implement the minimum**

```ts
// src/lib/audit/log.ts
import "server-only";

import type { AuditAction } from "@/generated/prisma";
import { db } from "@/lib/db";
import { extractRequestContext } from "./extract-request-context";

export type AuditWriteInput = {
  action: AuditAction;
  actorId?: string | null;
  actorEmail?: string | null;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: Request;
};

async function write(input: AuditWriteInput): Promise<void> {
  const { ipAddress, userAgent } = extractRequestContext(input.request);

  await db.auditLog.create({
    data: {
      action: input.action,
      actorId: input.actorId ?? null,
      actorEmail: input.actorEmail ?? null,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: input.metadata as never,
      ipAddress,
      userAgent,
    },
  });
}

export const auditLog = { write };
```

- [ ] **Step 6.4: Run the tests to confirm GREEN**

```bash
pnpm test --run src/lib/audit/log.test.ts
```
Expected: PASS, 2/2.

- [ ] **Step 6.5: Commit**

```bash
git add src/lib/audit/log.ts src/lib/audit/log.test.ts
git commit -m "feat(audit): add auditLog.write happy path"
```

---

### Task 7: `auditLog.write` extracts IP and User-Agent from request

**Files:**
- Modify: `src/lib/audit/log.test.ts`

- [ ] **Step 7.1: Add the failing test for request context**

Append to `describe(...)`:

```ts
describe("auditLog.write — request context", () => {
  beforeEach(() => {
    auditLogCreateMock.mockReset();
    auditLogCreateMock.mockResolvedValue({ id: "log_2" });
  });

  it("extracts IP and User-Agent from request and persists them", async () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-forwarded-for": "203.0.113.7",
        "user-agent": "DuoHub-Tests/1.0",
      },
    });

    await auditLog.write({
      action: "MAGIC_LINK_SENT",
      actorEmail: "admin@duohubcontabil.com.br",
      request,
    });

    const call = auditLogCreateMock.mock.calls[0]?.[0];
    expect(call?.data.ipAddress).toBe("203.0.113.7");
    expect(call?.data.userAgent).toBe("DuoHub-Tests/1.0");
  });

  it("persists null IP/UA when no request is provided", async () => {
    await auditLog.write({
      action: "USER_LOGOUT",
      actorId: "user_1",
      actorEmail: "admin@duohubcontabil.com.br",
    });

    const call = auditLogCreateMock.mock.calls[0]?.[0];
    expect(call?.data.ipAddress).toBeNull();
    expect(call?.data.userAgent).toBeNull();
  });
});
```

- [ ] **Step 7.2: Run the test**

```bash
pnpm test --run src/lib/audit/log.test.ts
```
Expected: PASS — the implementation from Task 6 already handles this. If it FAILs, fix the implementation, not the test.

- [ ] **Step 7.3: Commit**

```bash
git add src/lib/audit/log.test.ts
git commit -m "test(audit): cover request context extraction"
```

---

### Task 8: `auditLog.write` swallows DB errors silently

The helper must never throw — audit failure should not abort the parent action.

**Files:**
- Modify: `src/lib/audit/log.test.ts`
- Modify: `src/lib/audit/log.ts`

- [ ] **Step 8.1: Write the failing test**

Append to `src/lib/audit/log.test.ts`:

```ts
describe("auditLog.write — error swallowing", () => {
  it("does not throw when the database call fails", async () => {
    auditLogCreateMock.mockReset();
    auditLogCreateMock.mockRejectedValueOnce(new Error("connection refused"));

    await expect(
      auditLog.write({
        action: "USER_LOGIN_FAILED",
        actorEmail: "stranger@example.com",
      }),
    ).resolves.toBeUndefined();
  });

  it("logs to console.error when DB fails (best-effort visibility)", async () => {
    auditLogCreateMock.mockReset();
    auditLogCreateMock.mockRejectedValueOnce(new Error("write timeout"));

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await auditLog.write({ action: "USER_LOGOUT" });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0]?.[0]).toMatch(/audit/);
    errorSpy.mockRestore();
  });
});
```

- [ ] **Step 8.2: Run the test to confirm RED**

```bash
pnpm test --run src/lib/audit/log.test.ts
```
Expected: FAIL — Task 6 implementation throws on error.

- [ ] **Step 8.3: Wrap the DB call in try/catch**

Replace the body of `write` in `src/lib/audit/log.ts`:

```ts
async function write(input: AuditWriteInput): Promise<void> {
  const { ipAddress, userAgent } = extractRequestContext(input.request);

  try {
    await db.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId ?? null,
        actorEmail: input.actorEmail ?? null,
        resourceType: input.resourceType,
        resourceId: input.resourceId,
        metadata: input.metadata as never,
        ipAddress,
        userAgent,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(
      `[audit] failed to write ${input.action}: ${message}`,
    );
  }
}
```

- [ ] **Step 8.4: Run the tests to confirm GREEN**

```bash
pnpm test --run src/lib/audit/log.test.ts
```
Expected: PASS, all tests in this file (4-6 cases).

- [ ] **Step 8.5: Commit**

```bash
git add src/lib/audit/log.ts src/lib/audit/log.test.ts
git commit -m "feat(audit): swallow DB errors so audit never aborts caller"
```

---

### Task 9: Document `auditLog.write` for downstream consumers

**Files:**
- Modify: `src/lib/audit/log.ts`

- [ ] **Step 9.1: Add JSDoc to the helper**

Replace the export block at the bottom:

```ts
/**
 * Write an audit log entry for sensitive operations.
 *
 * Best-effort: never throws. If the database write fails, the error is logged
 * to `console.error` and the calling action proceeds normally. This trade-off
 * is intentional — losing an occasional audit row beats failing user-visible
 * actions because of a transient audit issue.
 *
 * Use `request` to capture IP + User-Agent (typically the `Request` argument
 * from a Server Action or route handler).
 */
export const auditLog = { write };
```

- [ ] **Step 9.2: Run all tests to confirm nothing broke**

```bash
pnpm test --run
```
Expected: all suites pass.

- [ ] **Step 9.3: Commit**

```bash
git add src/lib/audit/log.ts
git commit -m "docs(audit): document the write helper contract"
```

---

### Task 10: Update `src/content/messages` index — no-op safety check

This task verifies nothing else broke. The PR doesn't add new content yet (PR2 onwards do); we just want a clean lint/test/build state.

- [ ] **Step 10.1: Run full lint**

```bash
pnpm lint
```
Expected: no errors. If Biome reports any, fix inline before committing.

- [ ] **Step 10.2: Run full test suite**

```bash
pnpm test --run
```
Expected: all suites green, including pre-existing ones (77 + new ones from Tasks 5–8 ≈ 88+).

- [ ] **Step 10.3: Run build**

```bash
pnpm build
```
Expected: build completes without TypeScript errors.

If any of these fail, fix the failure, then re-run all three commands until green.

---

### Task 11: Update `prisma/seed.ts` to be aware of new models (no data yet)

If a `prisma/seed.ts` exists from F0, ensure it still runs with the new schema. If it doesn't exist, skip this task.

**Files:**
- Inspect / modify: `prisma/seed.ts` (if present)

- [ ] **Step 11.1: Check for an existing seed file**

```bash
ls prisma/seed.ts 2>/dev/null && echo "exists" || echo "absent"
```

- [ ] **Step 11.2: If present, run it to confirm it still works**

```bash
pnpm prisma db seed
```
Expected: completes without errors.

If it does NOT exist, skip the rest of this task.

- [ ] **Step 11.3: If you had to modify the file, commit**

```bash
git add prisma/seed.ts
git commit -m "chore(prisma): keep seed compatible with F1a schema"
```

---

### Task 12: Open PR

- [ ] **Step 12.1: Push the branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 12.2: Verify the branch diff against `main`**

```bash
git diff chore/DUO-45/f1a-implementation-plans...HEAD --stat
```
Expected output: roughly

```
prisma/migrations/<ts>_f1a_admin_foundation/migration.sql | XXX +
prisma/schema.prisma                                     | ~150 +
src/lib/audit/extract-request-context.test.ts            | ~50 +
src/lib/audit/extract-request-context.ts                 | ~30 +
src/lib/audit/log.test.ts                                | ~120 +
src/lib/audit/log.ts                                     | ~60 +
6 files changed
```

- [ ] **Step 12.3: Open the PR with `gh`**

```bash
gh pr create --base chore/DUO-45/f1a-implementation-plans --title "feat(f1a): prisma schema + audit log helper (PR1)" --body "$(cat <<'EOF'
## Summary

- Adds the F1a Prisma schema: `User`, `Account`, `Session`, `Verification`, `Client` (with matriz/filial via `parentClientId`), `UserClient` (N:N for F4), `AuditLog`, plus 6 enums.
- Adds `src/lib/audit/log.ts` — best-effort `auditLog.write()` helper that never throws.
- Adds `src/lib/audit/extract-request-context.ts` — IP + UA extraction from `Request`.
- 100% unit-test coverage for both helpers.

## Test plan

- [x] `pnpm test --run` passes (all suites)
- [x] `pnpm lint` clean
- [x] `pnpm build` clean
- [x] `pnpm prisma validate` clean
- [x] Migration `f1a_admin_foundation` applied locally

## Notes

- No UI in this PR. PR2 (auth) plugs Better Auth into these models.
- Migration uses `onDelete: Restrict` on `Client.parentClient` to prevent deletion of matriz with branches.
- `AuditLog.actor` uses `onDelete: SetNull` so audit history survives if the User is hard-deleted.

## Plan reference

`docs/superpowers/plans/2026-05-02-f1a-pr1-schema-audit.md`
EOF
)"
```

- [ ] **Step 12.4: Update Linear sub-issue**

In the Linear sub-issue (DUO-46 — F1a · PR1), paste the PR URL and move the issue to "In Review".

---

## Definition of Done (run before merging)

- [ ] All tests in this PR pass: `pnpm test --run`
- [ ] No regression in pre-existing tests
- [ ] `pnpm lint` clean
- [ ] `pnpm build` clean
- [ ] `pnpm prisma validate` clean
- [ ] Migration applied locally and committed
- [ ] PR description matches the spec
- [ ] Linear sub-issue updated with PR link
- [ ] Branch rebased on the latest `chore/DUO-45/f1a-implementation-plans` if needed

When all checked, merge with **squash** (preserves the commit history as a single PR commit on `main`). Delete the branch after merge.

---

## Next PR

Open `docs/superpowers/plans/2026-05-02-f1a-pr2-auth.md` to start PR2 (Better Auth + magic link).
