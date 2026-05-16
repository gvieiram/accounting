# F1a · PR5 — Client CRUD with Matriz/Filial + ViaCEP (v3, canonical)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> This is the **canonical** plan, replacing v1 (`2026-05-02-f1a-pr5-clients.md`, 3441 lines) and v2 (`2026-05-10-f1a-pr5-clients-v2.md`, 189 lines). v1 may still be consulted for extended Robot Framework / E2E discussion that no longer applies.

**Goal:** Deliver the full Client CRUD: list with URL-driven filters, create, edit, archive (soft-delete with matriz→filiais cascade), with ViaCEP autofill and matriz/filial hierarchy. Audit context extraction is refactored to a single shared helper; the `users` feature is migrated to it in the same PR.

**Architecture:** Domain logic in `src/features/clients/`. UI under `src/app/admin/clients/`. Unified form for create/edit. ViaCEP behind a `requireAdmin` proxy with per-user rate limit and 30-day cache. Matriz/filial validation runs in two layers: shape in Zod, parent-state in the action.

**Tech Stack:** Next.js Server Components & Server Actions · Prisma · React Hook Form + Zod 4 + `@hookform/resolvers/zod` · shadcn/ui (`<Form>`, `<Command>`, `<Popover>`, `<RadioGroup>`, `<Select>`) · `useDeferredValue` for debounced search · `fetch` + Next data cache for ViaCEP.

**Spec:** `docs/superpowers/specs/2026-04-27-f1a-admin-foundation-design.md`

**Plan index:** `docs/superpowers/plans/2026-05-02-f1a-admin-foundation-plan-index.md`

**Branch:** `feat/DUO-50/f1a-pr5-clients` (base: `main`)

**Depends on:** PR1 (Client schema + AuditLog enums), PR2 (auth helpers + magic link + invite tokens), PR3 (admin shell), PR4 (users feature, audit log helper, date helpers, shadcn Form/Table).

---

## Decisions locked-in (do not re-litigate during implementation)

| # | Topic | Decision |
|---|---|---|
| D1 | E2E | **No E2E for this PR.** Coverage via Vitest unit tests on schemas / queries / actions / utils. |
| D2 | CPF/CNPJ validation | **Checksum required.** `isValidCpf` and `isValidCnpj` live in `utils.ts` and run inside `superRefine`. |
| D3 | Archive cascade | **Matriz archive cascades to active filiais** in a single `db.$transaction`. |
| D4 | Scope | **Single PR.** Task 2 also migrates `features/users/actions.ts` to the new audit context API. |
| D5 | Zod enums | Use `z.enum([...CLIENT_TYPES] as const)` reading from `constants.ts`. **Do not** use `z.nativeEnum` — Prisma `prisma-client` emits const objects, not TS enums; behaviour differs in Zod 4. |
| D6 | `auditLog.write` API | Accepts `{ headers?: Headers; request?: Request; ipAddress?; userAgent? }`. **Does not** call `next/headers` itself — actions pass `headers: await headers()`. Preserves testability. |
| D7 | `additionalContacts` | Has its own Zod schema (`additionalContactSchema`), max 10 items, validated server-side. Not just a UI constraint. |
| D8 | ViaCEP | `requireAdmin` + per-**user** rate limit + Next `fetch` cache `revalidate: 60*60*24*30`. |
| D9 | Filters / search | **URL `searchParams`** (`?q=&type=&status=&archived=`). Server Component re-renders; no localStorage. |
| D10 | `computeDiff` | `JSON.stringify` with **sorted keys** + truncate `internalNotes` and `additionalContacts` snippets to **500 chars** in metadata. Field list always full; before/after values truncated. |
| D11 | Concurrency on edit | Last-writer-wins. Document the limitation in `updateClientAction` as a comment. |
| D12 | Matriz/filial validation | Schema enforces shape (PJ-only, `cnpjRoot` equality when both docs present). Action enforces parent state (exists, PJ, not a filial, not archived) and re-confirms CNPJ root. |

---

## Pre-flight

- [ ] Linear sub-issue DUO-50 (F1a · PR5: Client CRUD) updated to "In progress".
- [ ] Branch from `main`:
  ```bash
  git checkout main && git pull && git checkout -b feat/DUO-50/f1a-pr5-clients
  ```
- [ ] Test baseline green:
  ```bash
  pnpm test --run && pnpm build
  ```

---

## File map (this PR)

```
src/
├── app/
│   ├── admin/clients/
│   │   ├── page.tsx                              # NEW — list + filters (URL searchParams)
│   │   ├── new/page.tsx                          # NEW — create
│   │   ├── [id]/page.tsx                         # NEW — edit
│   │   └── _components/
│   │       ├── clients-table.tsx                 # NEW
│   │       ├── clients-filters.tsx               # NEW — search + status/type/archived
│   │       ├── client-form.tsx                   # NEW — unified create/edit
│   │       ├── document-input.tsx                # NEW
│   │       ├── address-fields.tsx                # NEW (+ ViaCEP onBlur)
│   │       ├── parent-client-combobox.tsx        # NEW
│   │       ├── additional-contacts-field.tsx     # NEW
│   │       └── archive-client-button.tsx         # NEW
│   └── api/viacep/[cep]/route.ts                 # NEW
├── components/ui/
│   ├── command.tsx                               # NEW (shadcn add)
│   ├── popover.tsx                               # NEW (shadcn add)
│   └── radio-group.tsx                           # NEW (shadcn add)
├── content/messages/
│   ├── common.ts                                 # EXTEND — terms, masks
│   └── admin.ts                                  # EXTEND — clients block, enums labels
├── features/
│   ├── clients/                                  # NEW dir
│   │   ├── constants.ts
│   │   ├── utils.ts
│   │   ├── utils.test.ts
│   │   ├── schemas.ts
│   │   ├── schemas.test.ts
│   │   ├── types.ts
│   │   ├── queries.ts
│   │   ├── queries.test.ts
│   │   ├── actions.ts
│   │   └── actions.test.ts
│   └── users/actions.ts                          # MODIFY — migrate to new audit API
└── lib/
    ├── audit/
    │   ├── extract-request-context.ts            # MODIFY — accept Headers too
    │   ├── extract-request-context.test.ts       # MODIFY — add Headers cases
    │   └── log.ts                                # MODIFY — accept headers
    ├── viacep.ts                                 # NEW
    ├── viacep.test.ts                            # NEW
    └── ratelimit.ts                              # EXTEND — viaCepRateLimitByUser
```

---

## Phase A — Foundation & refinements

### Task 1: Install shadcn primitives

**Files (new):** `src/components/ui/command.tsx`, `src/components/ui/popover.tsx`, `src/components/ui/radio-group.tsx`.

- [ ] **Step 1.1** Install via CLI (one at a time; the project uses `new-york` style and the existing `components.json`):
  ```bash
  pnpm dlx shadcn@latest add command popover radio-group
  ```
- [ ] **Step 1.2** Verify generated files have the standard `import { cn } from "@/lib/utils";` and `"use client";` where appropriate. No manual edits beyond what shadcn produces.
- [ ] **Step 1.3** Commit: `chore(ui): add command, popover, radio-group primitives`.

---

### Task 2: Refactor audit context + migrate `users`

Today each action duplicates `extractClientContext(reqHeaders: Headers)`. We consolidate into `extractRequestContext` and the `auditLog.write` API, then migrate `features/users` so a single pattern lives in the codebase.

**Files:**
- Modify: `src/lib/audit/extract-request-context.ts`
- Modify: `src/lib/audit/extract-request-context.test.ts`
- Modify: `src/lib/audit/log.ts`
- Modify: `src/features/users/actions.ts` (remove local `extractClientContext`, pass `headers` to `auditLog.write`)
- Verify: `src/lib/audit/log.test.ts`, `src/features/users/actions.test.ts` still pass (mocks adjusted as needed).

- [ ] **Step 2.1** Extend `extractRequestContext` to accept `Headers | Request | undefined`:
  ```ts
  export type RequestLike = Request | Headers | undefined;

  export function extractRequestContext(source: RequestLike): RequestContext {
    if (!source) return { ipAddress: null, userAgent: null };
    const headers = source instanceof Headers ? source : source.headers;
    const forwardedFor = headers.get("x-forwarded-for");
    const realIp = headers.get("x-real-ip");
    const userAgent = headers.get("user-agent");
    const ipAddress =
      forwardedFor?.split(",")[0]?.trim() || realIp?.trim() || null;
    return {
      ipAddress: ipAddress || null,
      userAgent: userAgent?.trim() || null,
    };
  }
  ```
- [ ] **Step 2.2** Update `auditLog.write` to accept `headers?: Headers` and merge with `request` precedence (explicit `ipAddress`/`userAgent` wins, then `headers`, then `request`):
  ```ts
  export type AuditWriteInput = {
    action: AuditAction;
    actorId?: string | null;
    actorEmail?: string | null;
    resourceType?: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
    headers?: Headers;
    request?: Request;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
  ```
  Inside `write`, derive context as: `const ctx = extractRequestContext(input.headers ?? input.request);` then prefer explicit overrides.
- [ ] **Step 2.3** Migrate `features/users/actions.ts`:
  - Remove the local `extractClientContext` helper.
  - Each call site becomes:
    ```ts
    await auditLog.write({
      action: "USER_INVITED",
      actorId: session.user.id,
      actorEmail: session.user.email,
      resourceType: "Invitation",
      resourceId: created.id,
      metadata: { email: created.email },
      headers: await headers(),
    });
    ```
  - For `acceptInvitationAction`, where we already read `headers` for rate limiting, **reuse** the same `Headers` instance (don't call `headers()` twice).
- [ ] **Step 2.4** Update tests:
  - `extract-request-context.test.ts`: add cases for `Headers` and `undefined`.
  - `users/actions.test.ts`: update mocks to assert `headers` is passed to `auditLog.write` (instead of `ipAddress`/`userAgent`).
- [ ] **Step 2.5** Verify:
  ```bash
  pnpm test --run src/lib/audit src/features/users
  ```
- [ ] **Step 2.6** Commit: `refactor(audit): unify request-context extraction and adopt in users feature`.

---

### Task 3: Content messages (`common` + `admin`)

All user-facing text goes through `content/messages/*`. Do not hardcode strings in components. Use pt-BR.

**Files:** Modify `src/content/messages/common.ts`, `src/content/messages/admin.ts`.

- [ ] **Step 3.1** Extend `common.ts`:
  - `forms.masks`: `cpf: "000.000.000-00"`, `cnpj: "00.000.000/0000-00"`, `cep: "00000-000"`, `phone: "(00) 00000-0000"`.
  - `terms`: keep existing; add `notInformed: "Não informado"`, `matriz: "Matriz"`, `filial: "Filial"`, `standalone: "Independente"`.
- [ ] **Step 3.2** Add `admin.clients` and `admin.enums` blocks. Suggested shape (refine during Task 12 if needed):
  ```ts
  clients: {
    title: "Clientes",
    subtitle: "Cadastro de clientes PF e PJ.",
    new: "Novo cliente",
    edit: "Editar cliente",
    columns: { client: "Cliente", document: "Documento", type: "Tipo", regime: "Regime", status: "Status", createdAt: "Cadastrado em" },
    empty: { title: "Nenhum cliente cadastrado", description: "Cadastre o primeiro cliente." },
    emptyForFilter: { noMatch: "Nenhum cliente corresponde aos filtros." },
    filter: {
      search: "Buscar por nome, fantasia, e-mail ou documento",
      type: "Tipo", status: "Status", archived: "Mostrar arquivados",
      allTypes: "Todos", allStatuses: "Todos",
    },
    form: {
      sections: {
        identification: "Identificação", taxation: "Tributação",
        primaryContact: "Contato principal", address: "Endereço",
        additionalContacts: "Contatos adicionais", hierarchy: "Hierarquia",
        notes: "Notas internas",
      },
      fields: { /* one entry per Client field */ },
      hints: { cepLookup: "Buscando endereço…", cnpjRootMustMatch: "A filial precisa compartilhar a raiz do CNPJ (8 dígitos) com a matriz." },
      submit: { create: "Cadastrar cliente", update: "Salvar alterações", saving: "Salvando…" },
    },
    archiveDialog: {
      title: "Arquivar cliente?",
      description: (n: number) => n > 0
        ? `Esta matriz tem ${n} filial(is) ativa(s); todas serão arquivadas junto.`
        : "O cliente poderá ser restaurado depois pela equipe.",
      confirm: "Arquivar", cancel: "Voltar", success: "Cliente arquivado.",
    },
    errors: {
      duplicateDocument: "Já existe um cliente com este documento.",
      invalidCpf: "CPF inválido.", invalidCnpj: "CNPJ inválido.",
      parentNotMatriz: "O cliente selecionado já é uma filial.",
      parentArchived: "A matriz selecionada está arquivada.",
      parentTypeMismatch: "Filial só pode pertencer a uma matriz PJ.",
      cnpjRootMismatch: "O CNPJ da filial precisa compartilhar a raiz com a matriz.",
      generic: "Não foi possível concluir. Tente novamente.",
    },
  },
  enums: {
    clientType: { PF: "Pessoa Física", PJ: "Pessoa Jurídica" },
    taxRegime: { MEI: "MEI", SIMPLES_NACIONAL: "Simples Nacional", LUCRO_PRESUMIDO: "Lucro Presumido", LUCRO_REAL: "Lucro Real" },
    clientStatus: { ACTIVE: "Ativo", PROSPECT: "Prospect", INACTIVE: "Inativo", CHURNED: "Churn" },
  },
  ```
  > These objects MUST `satisfies Record<<Enum>, string>` so adding a new enum value is a compile error.
- [ ] **Step 3.3** Commit: `feat(content): add clients and enums blocks to admin messages`.

---

### Task 4: ViaCEP helper + protected proxy + rate limit

**Files:**
- Create: `src/lib/viacep.ts`
- Create: `src/lib/viacep.test.ts`
- Create: `src/app/api/viacep/[cep]/route.ts`
- Modify: `src/lib/ratelimit.ts` (add `viaCepRateLimitByUser`)

- [ ] **Step 4.1** Add the rate limit (10 lookups / user / minute is plenty for typing):
  ```ts
  export const viaCepRateLimitByUser =
    globalForRatelimit.viaCepRateLimitByUser ??
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "ratelimit:viacep",
    });
  if (process.env.NODE_ENV !== "production")
    globalForRatelimit.viaCepRateLimitByUser = viaCepRateLimitByUser;
  ```
- [ ] **Step 4.2** Implement `lookupCep`:
  ```ts
  // src/lib/viacep.ts
  import "server-only";

  export type ViaCepResult =
    | { ok: true; data: { cep: string; street: string; neighborhood: string; city: string; state: string } }
    | { ok: false; reason: "invalid_format" | "not_found" | "timeout" | "upstream_error" };

  const CEP_REGEX = /^\d{8}$/;

  export async function lookupCep(rawCep: string): Promise<ViaCepResult> {
    const cep = rawCep.replace(/\D/g, "");
    if (!CEP_REGEX.test(cep)) return { ok: false, reason: "invalid_format" };

    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        signal: AbortSignal.timeout(3000),
        next: { revalidate: 60 * 60 * 24 * 30 }, // 30 days
      });
      if (!res.ok) return { ok: false, reason: "upstream_error" };
      const json = (await res.json()) as { erro?: boolean; logradouro?: string; bairro?: string; localidade?: string; uf?: string; cep?: string };
      if (json.erro) return { ok: false, reason: "not_found" };
      return {
        ok: true,
        data: {
          cep: json.cep?.replace(/\D/g, "") ?? cep,
          street: json.logradouro ?? "",
          neighborhood: json.bairro ?? "",
          city: json.localidade ?? "",
          state: json.uf ?? "",
        },
      };
    } catch (e) {
      const isTimeout = e instanceof Error && e.name === "TimeoutError";
      return { ok: false, reason: isTimeout ? "timeout" : "upstream_error" };
    }
  }
  ```
- [ ] **Step 4.3** Implement the route handler:
  ```ts
  // src/app/api/viacep/[cep]/route.ts
  import { NextResponse } from "next/server";
  import { requireAdmin } from "@/lib/auth/helpers";
  import { viaCepRateLimitByUser } from "@/lib/ratelimit";
  import { lookupCep } from "@/lib/viacep";

  export async function GET(
    _req: Request,
    { params }: { params: Promise<{ cep: string }> },
  ) {
    const session = await requireAdmin();
    const limit = await viaCepRateLimitByUser.limit(session.user.id);
    if (!limit.success) {
      return NextResponse.json({ ok: false, reason: "rate_limited" }, { status: 429 });
    }
    const { cep } = await params;
    const result = await lookupCep(cep);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }
  ```
- [ ] **Step 4.4** Unit tests (`viacep.test.ts`): mock `fetch` and cover `invalid_format`, `not_found` (`erro: true`), `upstream_error` (non-2xx), `timeout` (AbortSignal), and happy path.
- [ ] **Step 4.5** Commit: `feat(viacep): add lookup helper and authenticated proxy route`.

---

## Phase B — Domain logic

### Task 5: Constants + utils (masks, checksum, cnpjRoot, computeDiff)

**Files:** `src/features/clients/constants.ts`, `src/features/clients/utils.ts`, `src/features/clients/utils.test.ts`.

- [ ] **Step 5.1** `constants.ts`:
  ```ts
  import { ClientStatus, ClientType, TaxRegime } from "@/generated/prisma/enums";

  export const CLIENT_TYPES = [ClientType.PF, ClientType.PJ] as const;
  export const TAX_REGIMES = [
    TaxRegime.MEI,
    TaxRegime.SIMPLES_NACIONAL,
    TaxRegime.LUCRO_PRESUMIDO,
    TaxRegime.LUCRO_REAL,
  ] as const;
  export const CLIENT_STATUSES = [
    ClientStatus.ACTIVE,
    ClientStatus.PROSPECT,
    ClientStatus.INACTIVE,
    ClientStatus.CHURNED,
  ] as const;

  export const MAX_ADDITIONAL_CONTACTS = 10;
  export const MAX_NOTES_LENGTH = 5000;
  export const AUDIT_DIFF_FIELD_TRUNCATE = 500;
  export const CLIENTS_PAGE_SIZE = 100;
  ```
- [ ] **Step 5.2** `utils.ts`:
  - `stripDocument(value: string): string` — `value.replace(/\D/g, "")`.
  - `formatCpf`, `formatCnpj`, `formatDocument(type, value)`, `formatCep`, `formatPhoneBR`.
  - `isValidCpf(value: string): boolean` and `isValidCnpj(value: string): boolean` — full checksum (mod 11 with weighting). Reject sequences `000…000`, `111…111`, etc.
  - `cnpjRoot(value: string): string` — first 8 digits of stripped CNPJ.
  - `isMatrizCnpj(value: string): boolean` — order `0001` (positions 9-12 after the root).
  - `computeDiff<T extends Record<string, unknown>>(before: T, after: T): { changedFields: string[]; metadata: Record<string, { from: unknown; to: unknown }> }`:
    ```ts
    function stableStringify(value: unknown): string {
      return JSON.stringify(value, (_k, v) =>
        v && typeof v === "object" && !Array.isArray(v)
          ? Object.keys(v).sort().reduce((acc, k) => { acc[k] = (v as Record<string, unknown>)[k]; return acc; }, {} as Record<string, unknown>)
          : v,
      );
    }
    function truncate(value: unknown, max = AUDIT_DIFF_FIELD_TRUNCATE): unknown {
      if (typeof value === "string" && value.length > max) return `${value.slice(0, max)}…`;
      if (Array.isArray(value) || (value && typeof value === "object")) {
        const s = stableStringify(value);
        return s.length > max ? `${s.slice(0, max)}…` : value;
      }
      return value;
    }
    export function computeDiff<T extends Record<string, unknown>>(before: T, after: T) {
      const changedFields: string[] = [];
      const metadata: Record<string, { from: unknown; to: unknown }> = {};
      for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (stableStringify(before[key]) !== stableStringify(after[key])) {
          changedFields.push(key);
          metadata[key] = { from: truncate(before[key]), to: truncate(after[key]) };
        }
      }
      return { changedFields, metadata };
    }
    ```
- [ ] **Step 5.3** `utils.test.ts` — minimum suite:
  - `stripDocument` strips non-digits.
  - `isValidCpf`: accepts known-valid CPF, rejects `12345678900`, rejects `11111111111`.
  - `isValidCnpj`: accepts known-valid CNPJ, rejects malformed.
  - `cnpjRoot` returns first 8 digits.
  - `computeDiff`: detects changed key, ignores unchanged, normalises key order, truncates long strings, returns empty `changedFields` when equal.
- [ ] **Step 5.4** Commit: `feat(clients): add constants and utils (mask, checksum, diff)`.

---

### Task 6: Zod schemas + types

**Files:** `src/features/clients/schemas.ts`, `src/features/clients/types.ts`, `src/features/clients/schemas.test.ts`.

- [ ] **Step 6.1** `additionalContactSchema`:
  ```ts
  export const additionalContactSchema = z.object({
    name: z.string().trim().min(1).max(120),
    role: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),
    email: z.string().trim().email().toLowerCase(),
    phone: z.string().trim().regex(/^\d{10,11}$/),
  });
  ```
- [ ] **Step 6.2** `clientSchema` — single schema for create + edit. `superRefine` enforces (a) PF→11-digit CPF + checksum, (b) PJ→14-digit CNPJ + checksum, (c) `parentClientId` only when `type === PJ`, (d) if `parentDocument` is provided, `cnpjRoot` must match:
  ```ts
  export const clientSchema = z.object({
    type: z.enum([...CLIENT_TYPES] as const),
    legalName: z.string().trim().min(2).max(200),
    tradeName: z.string().trim().max(200).optional().or(z.literal("").transform(() => undefined)),
    document: z.string().transform(stripDocument),
    taxRegime: z.enum([...TAX_REGIMES] as const).nullable().optional(),
    stateRegistration: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
    cityRegistration: z.string().trim().max(40).optional().or(z.literal("").transform(() => undefined)),
    segment: z.string().trim().max(80).optional().or(z.literal("").transform(() => undefined)),
    primaryEmail: z.string().trim().email().toLowerCase(),
    primaryPhone: z.string().trim().regex(/^\d{10,11}$/),
    contactName: z.string().trim().min(2).max(120),
    zipCode: z.string().transform((v) => v.replace(/\D/g, "")).pipe(z.string().regex(/^\d{8}$/).optional().or(z.literal(""))).optional(),
    street: z.string().trim().max(200).optional(),
    number: z.string().trim().max(20).optional(),
    complement: z.string().trim().max(120).optional(),
    neighborhood: z.string().trim().max(120).optional(),
    city: z.string().trim().max(120).optional(),
    state: z.string().trim().length(2).optional(),
    additionalContacts: z.array(additionalContactSchema).max(MAX_ADDITIONAL_CONTACTS).default([]),
    parentClientId: z.string().min(1).nullable().optional(),
    parentDocument: z.string().optional(), // hidden field populated by the combobox; only used by superRefine
    status: z.enum([...CLIENT_STATUSES] as const),
    internalNotes: z.string().max(MAX_NOTES_LENGTH).optional().or(z.literal("").transform(() => undefined)),
  }).superRefine((data, ctx) => {
    if (data.type === "PF") {
      if (data.document.length !== 11 || !isValidCpf(data.document))
        ctx.addIssue({ code: "custom", path: ["document"], message: "CPF inválido." });
      if (data.parentClientId)
        ctx.addIssue({ code: "custom", path: ["parentClientId"], message: "Apenas PJ pode ter matriz." });
    } else {
      if (data.document.length !== 14 || !isValidCnpj(data.document))
        ctx.addIssue({ code: "custom", path: ["document"], message: "CNPJ inválido." });
      if (data.parentClientId && data.parentDocument && cnpjRoot(data.document) !== cnpjRoot(data.parentDocument))
        ctx.addIssue({ code: "custom", path: ["document"], message: "A filial precisa compartilhar a raiz do CNPJ com a matriz." });
    }
  });
  ```
- [ ] **Step 6.3** `archiveClientSchema`: `{ clientId: z.string().min(1) }`.
- [ ] **Step 6.4** `types.ts`:
  ```ts
  export type ClientListFilters = {
    q?: string;
    type?: ClientType;
    status?: ClientStatus;
    archived?: boolean;
  };
  export type ClientListItem = { /* see queries.ts */ };
  export type ParentClientCandidate = { id: string; legalName: string; tradeName: string | null; document: string };
  ```
- [ ] **Step 6.5** Tests (`schemas.test.ts`): cover PF valid/invalid (length, checksum), PJ valid/invalid, parentClientId rejected for PF, cnpjRoot mismatch flagged, additionalContacts >10 rejected, empty strings normalised to `undefined`.
- [ ] **Step 6.6** Commit: `feat(clients): add zod schemas and types`.

---

### Task 7: Prisma queries

**Files:** `src/features/clients/queries.ts`, `src/features/clients/queries.test.ts`.

- [ ] **Step 7.1** `listClients(filters: ClientListFilters)`:
  - Build `where`:
    - `archivedAt: filters.archived ? { not: null } : null`.
    - `type` and `status` when provided.
    - `q`: if input is mostly digits, also match `document.startsWith(strippedQ)`; otherwise OR over `legalName`/`tradeName`/`primaryEmail` (case-insensitive `contains`).
  - `select` only what the table needs (id, type, legalName, tradeName, document, taxRegime, status, createdAt, parentClientId).
  - `orderBy: [{ legalName: "asc" }]`.
  - `take: CLIENTS_PAGE_SIZE`.
- [ ] **Step 7.2** `getClient(id: string)`: full record including `additionalContacts` and `parentClient: { select: { id, legalName, document } }`. Returns `null` when missing.
- [ ] **Step 7.3** `listMatrizCandidates(input: { search: string; excludeId?: string }): Promise<ParentClientCandidate[]>` — PJ, `archivedAt: null`, `parentClientId: null`, `id !== excludeId`, `take: 20`. Sorted by `legalName`.
- [ ] **Step 7.4** `countActiveBranches(matrizId: string): Promise<number>` — needed for archive confirmation copy and cascade decisions.
- [ ] **Step 7.5** Tests: mock Prisma; assert `where` clauses for each filter combination and that `q` numeric path matches `document.startsWith`. Cover the search → field-list mapping.
- [ ] **Step 7.6** Commit: `feat(clients): add prisma queries with URL-driven filters`.

---

### Task 8: Server Actions (create / update / archive with cascade)

**Files:** `src/features/clients/actions.ts`, `src/features/clients/actions.test.ts`.

- [ ] **Step 8.1** `createClientAction`:
  - `await requireAdmin()`.
  - `clientSchema.safeParse(input)`; on failure → `{ success: false, error: "Dados inválidos." }`.
  - **Parent validation** (if `parentClientId`):
    - `const parent = await db.client.findUnique({ where: { id }, select: { id, type, parentClientId, archivedAt, document } })`.
    - Reject if missing, archived, `type !== PJ`, `parentClientId !== null` (sub-filial), or `cnpjRoot(parent.document) !== cnpjRoot(data.document)`.
  - Document uniqueness: surface `P2002` as `errors.duplicateDocument`.
  - Wrap `db.client.create` + `auditLog.write({ action: "CLIENT_CREATED", resourceType: "Client", resourceId, headers: await headers(), metadata: { type, legalName } })`.
  - `revalidatePath("/admin/clients")`.
- [ ] **Step 8.2** `updateClientAction`:
  - Same guards, plus: if changing `type` from PJ to PF while branches exist → reject.
  - Load `before` with the **same projection** as `after`, build `after` (post-write), call `computeDiff`, and write audit only if `changedFields.length > 0`:
    ```ts
    // Last-writer-wins on concurrent edits; F1a accepts this trade-off.
    // Bumping `updatedAt` is enough for downstream consumers to detect drift.
    ```
  - Audit `metadata`: `{ changedFields, diff: metadata, legalName: after.legalName }`.
  - `revalidatePath("/admin/clients")` and `revalidatePath(\`/admin/clients/${id}\`)`.
- [ ] **Step 8.3** `archiveClientAction` with **cascade**:
  ```ts
  await db.$transaction(async (tx) => {
    const target = await tx.client.findUnique({
      where: { id }, select: { id: true, archivedAt: true, parentClientId: true },
    });
    if (!target || target.archivedAt) return; // idempotent
    const now = new Date();
    await tx.client.update({ where: { id }, data: { archivedAt: now } });
    if (target.parentClientId === null) {
      // It's a matriz/standalone → cascade to any active branches.
      await tx.client.updateMany({
        where: { parentClientId: id, archivedAt: null },
        data: { archivedAt: now },
      });
    }
  });
  ```
  - Audit: write `CLIENT_DELETED` for the matriz with `metadata.cascadedBranchIds` (query branches before the transaction or capture inside it). Don't write per-branch audit rows; the cascade context is enough.
  - `revalidatePath("/admin/clients")`.
- [ ] **Step 8.4** Tests (`actions.test.ts`): mock `db`, `requireAdmin`, `auditLog`, `next/headers`, `next/cache`. Cover:
  - Create: invalid schema, duplicate document (P2002), parent missing, parent archived, parent not PJ, parent is filial, cnpj-root mismatch, happy path writes audit.
  - Update: no-op when nothing changed (no audit write), diff captured, type change PJ→PF with branches rejected.
  - Archive: idempotent on already-archived, cascade includes only active branches, audit metadata contains cascaded IDs.
- [ ] **Step 8.5** Commit: `feat(clients): add server actions with audit log and matriz cascade`.

---

## Phase C — UI components

### Task 9: `DocumentInput` + `AddressFields`

**Files:** `src/app/admin/clients/_components/document-input.tsx`, `src/app/admin/clients/_components/address-fields.tsx`.

- [ ] **Step 9.1** `DocumentInput`:
  - Receives `type: ClientType` (watched via RHF) and uses `formatDocument` to mask onChange.
  - Stores **raw digits** in form state; only the display value is masked.
  - When `type` flips, reset value to avoid lingering 14 digits in a PF field.
- [ ] **Step 9.2** `AddressFields`:
  - Fields: `zipCode`, `street`, `number`, `complement`, `neighborhood`, `city`, `state`.
  - On `zipCode` blur, when length is 8, call `GET /api/viacep/${cep}`:
    - Success → fill `street`, `neighborhood`, `city`, `state` only if currently empty (don't clobber user edits).
    - 429 → toast `messages.admin.clients.errors.generic` + tone "Tente novamente em um minuto".
    - Other failures → silent, leave fields blank.
  - Show a small loading hint (`messages.admin.clients.form.hints.cepLookup`) during fetch.
- [ ] **Step 9.3** Commit: `feat(clients): add document input and address fields with viacep`.

---

### Task 10: `ParentClientCombobox` + `AdditionalContactsField`

**Files:** `src/app/admin/clients/_components/parent-client-combobox.tsx`, `src/app/admin/clients/_components/additional-contacts-field.tsx`.

- [ ] **Step 10.1** `ParentClientCombobox`:
  - Built on shadcn `<Command>` + `<Popover>`.
  - Async search by `legalName` / `tradeName` / `document` via a **Server Action** wrapping `listMatrizCandidates`. Debounce inside the popover (`useDeferredValue`).
  - First option: `"Nenhuma (esta é matriz ou independente)"`.
  - Visible only when `type === PJ`.
  - On selection, write both `parentClientId` and `parentDocument` into the form (the latter is needed by `superRefine`).
- [ ] **Step 10.2** `AdditionalContactsField`:
  - `useFieldArray` over `additionalContacts`.
  - Add/remove buttons; disable "Add" when count is `MAX_ADDITIONAL_CONTACTS`.
  - Show count "x/10" in the section header.
- [ ] **Step 10.3** Commit: `feat(clients): add parent combobox and additional contacts repeater`.

---

### Task 11: Unified `ClientForm`

**Files:** `src/app/admin/clients/_components/client-form.tsx`.

- [ ] **Step 11.1** Props: `{ initialValues?: ClientFormInput; clientId?: string }`. No `initialValues` → create mode. Action called: `createClientAction` or `updateClientAction`. Form sections in order:
  1. **Identification** — `type` radio, `document`, `legalName`, `tradeName`.
  2. **Taxation** (PJ only, conditional) — `taxRegime`, `stateRegistration`, `cityRegistration`, `segment`.
  3. **Primary contact** — `contactName`, `primaryEmail`, `primaryPhone`.
  4. **Address** — `<AddressFields />`.
  5. **Hierarchy** (PJ only) — `<ParentClientCombobox />`.
  6. **Additional contacts** — `<AdditionalContactsField />`.
  7. **Status & notes** — `status`, `internalNotes`.
- [ ] **Step 11.2** RHF wiring:
  ```ts
  const form = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialValues ?? defaults,
    mode: "onBlur",
  });
  ```
  - On submit, `useTransition` + toast on success/error using `messages.admin.clients.form.submit` and `errors.*`.
  - After success on create → `router.push("/admin/clients")`; on update → keep the user on the page and toast.
- [ ] **Step 11.3** Commit: `feat(clients): add unified client form`.

---

## Phase D — Pages & routing

### Task 12: List page + filters (URL searchParams)

**Files:** `src/app/admin/clients/page.tsx`, `src/app/admin/clients/_components/clients-table.tsx`, `src/app/admin/clients/_components/clients-filters.tsx`.

- [ ] **Step 12.1** `page.tsx` is a Server Component:
  ```ts
  type SearchParams = Promise<{ q?: string; type?: string; status?: string; archived?: string }>;
  export default async function ClientsPage({ searchParams }: { searchParams: SearchParams }) {
    await requireAdmin();
    const sp = await searchParams;
    const filters: ClientListFilters = {
      q: sp.q?.trim() || undefined,
      type: CLIENT_TYPES.includes(sp.type as ClientType) ? (sp.type as ClientType) : undefined,
      status: CLIENT_STATUSES.includes(sp.status as ClientStatus) ? (sp.status as ClientStatus) : undefined,
      archived: sp.archived === "1",
    };
    const clients = await listClients(filters);
    // render header (title + "Novo cliente"), <ClientsFilters />, <ClientsTable clients={clients} />
  }
  ```
- [ ] **Step 12.2** `<ClientsFilters />` is a Client Component using `useRouter` + `useSearchParams`. Updates URL on change with `router.replace(...)` so back/forward works. Debounce `q` with `useDeferredValue`.
- [ ] **Step 12.3** `<ClientsTable />`: name+trade, document (masked), type badge, regime, status badge, "Editar" link, archive button (opens dialog from Task 13). Indent filiais under matriz (sort: matriz first, then its branches).
- [ ] **Step 12.4** Commit: `feat(clients): add list page with url-driven filters`.

---

### Task 13: New + Edit pages + Archive dialog

**Files:** `src/app/admin/clients/new/page.tsx`, `src/app/admin/clients/[id]/page.tsx`, `src/app/admin/clients/_components/archive-client-button.tsx`.

- [ ] **Step 13.1** `new/page.tsx`:
  ```ts
  export default async function NewClientPage() {
    await requireAdmin();
    return (
      <>
        <header>…title + breadcrumb already handled by admin shell…</header>
        <ClientForm />
      </>
    );
  }
  ```
- [ ] **Step 13.2** `[id]/page.tsx`:
  - Server Component: `await requireAdmin(); const client = await getClient(params.id); if (!client) notFound();`.
  - Map DB record → `ClientFormInput` (mask document for display? No — keep raw digits in form, masking is done by `DocumentInput`).
  - Render `<ClientForm initialValues={...} clientId={client.id} />`.
- [ ] **Step 13.3** `<ArchiveClientButton />`:
  - shadcn `<AlertDialog>`.
  - Opens with description varying by `branchCount` (passed in from the table row).
  - On confirm → `archiveClientAction({ clientId })`, toast, revalidate via server action's `revalidatePath`.
- [ ] **Step 13.4** Commit: `feat(clients): add create, edit pages and archive dialog`.

---

## Final verification

- [ ] **F.1** `pnpm test --run` (must include new tests for `viacep`, `clients/utils`, `clients/schemas`, `clients/queries`, `clients/actions`, updated `users/actions` and `audit/*`).
- [ ] **F.2** `pnpm build` (catches Zod 4 / Prisma type drift early).
- [ ] **F.3** `pnpm lint`.
- [ ] **F.4** Manual smoke (admin logged in):
  1. Create a PJ matriz with full address (CEP autofill works).
  2. Create a PJ filial pointing at the matriz; confirm root-CNPJ check rejects mismatched roots.
  3. Try creating a PF with `parentClientId` selected — combobox should not appear.
  4. Edit the matriz `legalName`; audit log shows `CLIENT_UPDATED` with `changedFields: ["legalName"]`.
  5. Archive the matriz → confirm filiais also become archived; list with `archived=1` shows all.
  6. Hit `/api/viacep/00000000` while not logged in → 401/redirect.
  7. Rapid CEP edits don't generate >10 requests/minute (rate limit kicks in cleanly).
- [ ] **F.5** Update Linear DUO-50 to "In review" and open PR.

---

## Out of scope (do not add to this PR)

- Pagination beyond `take: 100` (follow-up when client volume grows).
- Bulk import / export.
- Document upload (lives in F1b / F4).
- Optimistic concurrency (`updatedAt` echo check).
- Per-filial audit rows on cascade archive.
- E2E tests (Robot Framework or Playwright) — covered by Vitest + manual smoke.
