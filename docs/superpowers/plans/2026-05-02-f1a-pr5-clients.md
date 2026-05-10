# F1a · PR5 — Client CRUD with Matriz/Filial + ViaCEP

> ⚠️ **SUPERSEDED** by [`2026-05-10-f1a-pr5-clients-v3.md`](./2026-05-10-f1a-pr5-clients-v3.md) on 2026-05-10. Kept for reference only (extended snippets and Robot Framework discussion). Do not use as the implementation guide — v3 locks in the current decisions (no E2E, cascade archive, CPF/CNPJ checksum, URL filters, Zod 4 `z.enum`).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full Client CRUD: list with filters, create, edit, archive (soft-delete), with ViaCEP autofill and matriz/filial hierarchy via `parentClientId`. AuditLog: `CLIENT_CREATED`, `CLIENT_UPDATED` (with diff), `CLIENT_DELETED`. This is the largest PR — split it across multiple work sessions.

**Architecture:** `features/clients/` holds schemas, queries, actions, constants, utils. UI under `app/admin/clients/`. Single shared form for create/edit, sectioned (Identification, Tax, Contact, Address, Additional Contacts, Status). ViaCEP via `lib/viacep.ts` + protected proxy at `/api/viacep/[cep]`. Matriz/filial: PJ-only, branch must share CNPJ root (8 digits) with the matriz, sub-branches are blocked.

**Tech Stack:** Server Components (queries) · Server Actions (mutations) · `react-hook-form` + `zodResolver` + `useFieldArray` · shadcn `<Form>`, `<Select>`, `<Textarea>`, `<Command>` (combobox), `<RadioGroup>` · `useDeferredValue` for debounced search · `fetch` + Next data cache for ViaCEP.

**Spec:** `docs/superpowers/specs/2026-04-27-f1a-admin-foundation-design.md`

**Plan index:** `docs/superpowers/plans/2026-05-02-f1a-admin-foundation-plan-index.md`

**Branch:** `feat/<DUO-50>/f1a-pr5-clients`

**Depends on:** PR1 (Client schema, AuditLog) + PR2 (auth helpers) + PR3 (admin shell) + PR4 (date helpers, shadcn Form/Table primitives).

---

## Pre-flight checklist

- [ ] PR4 merged into the integration branch (`chore/DUO-45/f1a-implementation-plans`).
- [ ] Update local copy:
  ```bash
  git checkout chore/DUO-45/f1a-implementation-plans && git pull
  ```
- [ ] Linear sub-issue exists (DUO-50 — F1a · PR5: Client CRUD).
- [ ] Tests pass:
  ```bash
  pnpm test --run
  ```
- [ ] Test DB up:
  ```bash
  docker compose -f docker-compose.test.yml up -d
  ```
- [ ] Branch:
  ```bash
  git checkout -b feat/DUO-50/f1a-pr5-clients
  ```

## Phase map (15 phases, ~30 commits)

| Phase | Tasks | Output |
|---|---|---|
| **A** Foundation | 1–4 | shadcn primitives, content blocks, constants, ViaCEP helper |
| **B** Domain logic | 5–8 | utils, schemas, queries, actions |
| **C** Form pieces | 9–14 | DocumentInput, AddressFields, AdditionalContactsField, ParentClientCombobox, ClientForm |
| **D** Pages | 15–18 | list, new, edit, archive button, error boundaries |
| **E** Verification | 19–20 | Robot E2E + manual smoke + PR open |

## File structure (this PR)

```
src/
├── components/ui/              (install) command, popover, radio-group
├── lib/
│   ├── viacep.ts               (new)
│   ├── viacep.test.ts          (new)
│   └── utils.ts                (extend) redactEmail
├── features/clients/
│   ├── constants.ts            (new)
│   ├── utils.ts                (new)
│   ├── utils.test.ts           (new)
│   ├── schemas.ts              (new)
│   ├── schemas.test.ts         (new)
│   ├── types.ts                (new)
│   ├── queries.ts              (new)
│   ├── queries.test.ts         (new)
│   ├── actions.ts              (new)
│   └── actions.test.ts         (new)
├── content/messages/
│   ├── common.ts               (extend) terms, masks
│   └── admin.ts                (extend) clients block, enums block
├── app/
│   ├── admin/clients/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx
│   │   ├── [id]/error.tsx
│   │   ├── error.tsx
│   │   ├── loading.tsx
│   │   └── _components/
│   │       ├── clients-table.tsx
│   │       ├── clients-filters.tsx
│   │       ├── client-form.tsx
│   │       ├── client-form-section.tsx
│   │       ├── document-input.tsx
│   │       ├── address-fields.tsx
│   │       ├── additional-contacts-field.tsx
│   │       ├── parent-client-combobox.tsx
│   │       └── archive-client-button.tsx
│   └── api/viacep/[cep]/route.ts
└── tests/robot/admin/
    └── client_crud.robot
```

---

## PHASE A — Foundation

### Task 1: Install shadcn primitives

**Files:**
- Create: `src/components/ui/command.tsx`
- Create: `src/components/ui/popover.tsx`
- Create: `src/components/ui/radio-group.tsx`

- [ ] **Step 1.1: Install**

```bash
pnpm dlx shadcn@latest add command popover radio-group
```

- [ ] **Step 1.2: Commit**

```bash
git add src/components/ui/
git commit -m "chore(ui): add shadcn command, popover, radio-group"
```

---

### Task 2: Extend `messages/common.ts` with form masks/terms for clients

**Files:**
- Modify: `src/content/messages/common.ts`

- [ ] **Step 2.1: Merge into existing object**

```ts
export const common = {
  // ...existing keys...
  terms: {
    // ...existing terms...
    cpf: "CPF",
    cnpj: "CNPJ",
    cep: "CEP",
    ie: "Inscrição Estadual",
    im: "Inscrição Municipal",
    document: "Documento",
    phone: "Telefone",
    whatsapp: "WhatsApp",
    address: "Endereço",
    street: "Logradouro",
    number: "Número",
    complement: "Complemento",
    neighborhood: "Bairro",
    city: "Cidade",
    state: "UF",
    legalName: "Razão social",
    tradeName: "Nome fantasia",
    contactName: "Nome do responsável",
    segment: "Segmento",
    notes: "Observações internas",
    type: "Tipo",
  },
  forms: {
    // ...existing forms...
    masks: {
      cpf: "000.000.000-00",
      cnpj: "00.000.000/0000-00",
      cep: "00000-000",
      phoneBR: "(00) 00000-0000",
    },
    placeholders: {
      // ...existing placeholders...
      cpf: "000.000.000-00",
      cnpj: "00.000.000/0000-00",
      cep: "00000-000",
      phoneBR: "(11) 99999-9999",
    },
  },
} as const;
```

- [ ] **Step 2.2: Commit**

```bash
git add src/content/messages/common.ts
git commit -m "feat(content): add client form terms, masks, placeholders"
```

---

### Task 3: Extend `messages/admin.ts` with `clients` and `enums` blocks

**Files:**
- Modify: `src/content/messages/admin.ts`

- [ ] **Step 3.1: Add the blocks**

```ts
import {
  AuditAction,
  ClientStatus,
  ClientType,
  TaxRegime,
  UserRole,
} from "@/generated/prisma";

export const admin = {
  // ...existing nav, shell, dashboard, errors, users...

  clients: {
    title: "Clientes",
    subtitle: "Cadastro de pessoas físicas e jurídicas atendidas.",
    new: "Novo cliente",
    empty: {
      title: "Nenhum cliente cadastrado",
      description: "Comece cadastrando o primeiro cliente.",
      action: "Novo cliente",
    },
    filters: {
      search: "Buscar por nome, e-mail ou documento",
      type: "Tipo",
      status: "Status",
      includeArchived: "Mostrar arquivados",
      all: "Todos",
    },
    columns: {
      name: "Cliente",
      document: "Documento",
      type: "Tipo",
      taxRegime: "Regime",
      status: "Status",
      city: "Cidade",
      actions: "Ações",
    },
    branchBadge: "Filial",
    matrizBadge: "Matriz",
    edit: "Editar",
    form: {
      sections: {
        identification: "Identificação",
        identificationDescription: "Dados básicos para emissão e relacionamento.",
        tax: "Tributação",
        taxDescription: "Regime e inscrições — opcional para PF.",
        contact: "Contato principal",
        contactDescription: "Pessoa responsável e canais oficiais.",
        address: "Endereço",
        addressDescription: "Usado em propostas e documentos.",
        additionalContacts: "Contatos adicionais",
        additionalContactsDescription:
          "Outras pessoas autorizadas (até 10).",
        status: "Status e observações",
      },
      type: {
        label: "Tipo de cliente",
        pf: "Pessoa Física",
        pj: "Pessoa Jurídica",
      },
      parent: {
        label: "Vinculado a uma matriz?",
        none: "Não — é matriz ou autônomo",
        placeholder: "Buscar matriz por nome ou CNPJ",
        rootMismatch:
          "A raiz do CNPJ da filial precisa coincidir com a da matriz.",
        notFound: "Nenhuma matriz encontrada",
      },
      additionalContact: {
        add: "Adicionar contato",
        remove: "Remover",
        nameLabel: "Nome",
        emailLabel: "E-mail",
        phoneLabel: "Telefone",
        roleLabel: "Função",
      },
      submit: {
        create: "Cadastrar cliente",
        update: "Salvar alterações",
      },
      success: {
        created: "Cliente cadastrado.",
        updated: "Alterações salvas.",
      },
    },
    archiveDialog: {
      title: "Arquivar cliente?",
      description:
        "O cliente sai da lista padrão e deixa de aparecer em buscas. Histórico e propostas são preservados. Pode ser desarquivado depois.",
      confirm: "Arquivar",
      cancel: "Cancelar",
      success: "Cliente arquivado.",
    },
    errors: {
      duplicateDocument: "Já existe um cliente com este documento.",
      parentArchived: "A matriz selecionada está arquivada.",
      parentMustBePj: "A matriz precisa ser uma pessoa jurídica.",
      parentIsBranch:
        "Não é possível vincular uma filial a outra filial. Escolha a matriz raiz.",
      cnpjRootMismatch:
        "A raiz do CNPJ da filial não coincide com a da matriz.",
      generic: "Não foi possível concluir. Tente novamente.",
    },
  },

  enums: {
    userRole: {
      [UserRole.ADMIN]: "Administrador",
      [UserRole.CLIENT]: "Cliente",
    } satisfies Record<UserRole, string>,

    clientType: {
      [ClientType.PF]: "Pessoa Física",
      [ClientType.PJ]: "Pessoa Jurídica",
    } satisfies Record<ClientType, string>,

    clientStatus: {
      [ClientStatus.ACTIVE]: "Ativo",
      [ClientStatus.PROSPECT]: "Em negociação",
      [ClientStatus.INACTIVE]: "Pausado",
      [ClientStatus.CHURNED]: "Encerrado",
    } satisfies Record<ClientStatus, string>,

    taxRegime: {
      [TaxRegime.MEI]: "MEI",
      [TaxRegime.SIMPLES_NACIONAL]: "Simples Nacional",
      [TaxRegime.LUCRO_PRESUMIDO]: "Lucro Presumido",
      [TaxRegime.LUCRO_REAL]: "Lucro Real",
    } satisfies Record<TaxRegime, string>,

    taxRegimeShort: {
      [TaxRegime.MEI]: "MEI",
      [TaxRegime.SIMPLES_NACIONAL]: "Simples",
      [TaxRegime.LUCRO_PRESUMIDO]: "L. Presumido",
      [TaxRegime.LUCRO_REAL]: "L. Real",
    } satisfies Record<TaxRegime, string>,

    auditAction: {
      [AuditAction.USER_LOGIN_SUCCESS]: "Login bem-sucedido",
      [AuditAction.USER_LOGIN_FAILED]: "Login falhou",
      [AuditAction.USER_LOGOUT]: "Logout",
      [AuditAction.MAGIC_LINK_SENT]: "Magic link enviado",
      [AuditAction.MAGIC_LINK_USED]: "Magic link usado",
      [AuditAction.USER_INVITED]: "Usuário convidado",
      [AuditAction.USER_REVOKED]: "Usuário revogado",
      [AuditAction.CLIENT_CREATED]: "Cliente criado",
      [AuditAction.CLIENT_UPDATED]: "Cliente atualizado",
      [AuditAction.CLIENT_DELETED]: "Cliente arquivado",
    } satisfies Record<AuditAction, string>,
  },
} as const;
```

- [ ] **Step 3.2: Run typecheck — `satisfies` errors here are caught at compile**

```bash
pnpm lint
pnpm test --run
```

- [ ] **Step 3.3: Commit**

```bash
git add src/content/messages/admin.ts
git commit -m "feat(content): add admin.clients + admin.enums blocks"
```

---

### Task 4: ViaCEP helper + proxy

**Files:**
- Create: `src/lib/viacep.ts`
- Create: `src/lib/viacep.test.ts`
- Create: `src/app/api/viacep/[cep]/route.ts`

- [ ] **Step 4.1: Tests**

```ts
// src/lib/viacep.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { lookupCep } from "./viacep";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
});

describe("lookupCep", () => {
  it("returns address for a valid CEP", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        cep: "01310-100",
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      }),
    });

    const result = await lookupCep("01310100");
    expect(result).toEqual({
      zipCode: "01310100",
      street: "Avenida Paulista",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    });
  });

  it("returns null when ViaCEP responds with `erro: true`", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ erro: true }),
    });
    expect(await lookupCep("00000000")).toBeNull();
  });

  it("returns null on non-8-digit input", async () => {
    expect(await lookupCep("123")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns null on fetch failure", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network"));
    expect(await lookupCep("01310100")).toBeNull();
  });

  it("returns null on timeout", async () => {
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );
    expect(await lookupCep("01310100")).toBeNull();
  });
});
```

- [ ] **Step 4.2: RED**

```bash
pnpm test --run src/lib/viacep.test.ts
```

- [ ] **Step 4.3: Implement helper**

```ts
// src/lib/viacep.ts
export type CepLookupResult = {
  zipCode: string;
  street: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
};

const ONLY_DIGITS = /\D/g;
const VIACEP_TIMEOUT_MS = 3000;

export async function lookupCep(
  cep: string,
): Promise<CepLookupResult | null> {
  const digits = cep.replace(ONLY_DIGITS, "");
  if (digits.length !== 8) return null;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(VIACEP_TIMEOUT_MS),
      next: { revalidate: 60 * 60 * 24 * 30 }, // 30d Next data cache
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      erro?: boolean;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
    };

    if (data.erro) return null;

    return {
      zipCode: digits,
      street: data.logradouro || null,
      neighborhood: data.bairro || null,
      city: data.localidade || null,
      state: data.uf || null,
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4.4: GREEN**

```bash
pnpm test --run src/lib/viacep.test.ts
```

- [ ] **Step 4.5: Implement protected proxy route**

```ts
// src/app/api/viacep/[cep]/route.ts
import "server-only";

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/helpers";
import { lookupCep } from "@/lib/viacep";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ cep: string }> },
): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return new NextResponse(null, { status: 404 });
  }

  const { cep } = await context.params;
  const result = await lookupCep(cep);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result);
}
```

> Returning 404 (not 401/403) for unauthenticated requests is intentional — no fingerprint that the endpoint exists. Same pattern as `/api/test/last-magic-link` from PR2.

- [ ] **Step 4.6: Commit**

```bash
git add src/lib/viacep.ts src/lib/viacep.test.ts src/app/api/viacep
git commit -m "feat(viacep): add cep lookup with cache + protected proxy"
```

---

## PHASE B — Domain logic

### Task 5: Constants (`features/clients/constants.ts`)

**Files:**
- Create: `src/features/clients/constants.ts`

- [ ] **Step 5.1: Implement**

```ts
// src/features/clients/constants.ts
import {
  ClientStatus,
  ClientType,
  TaxRegime,
} from "@/generated/prisma";

export { ClientStatus, ClientType, TaxRegime };

export const CLIENT_TYPES_ORDER: ClientType[] = [
  ClientType.PJ,
  ClientType.PF,
];

export const CLIENT_STATUS_ORDER: ClientStatus[] = [
  ClientStatus.ACTIVE,
  ClientStatus.PROSPECT,
  ClientStatus.INACTIVE,
  ClientStatus.CHURNED,
];

export const TAX_REGIMES_ORDER: TaxRegime[] = [
  TaxRegime.MEI,
  TaxRegime.SIMPLES_NACIONAL,
  TaxRegime.LUCRO_PRESUMIDO,
  TaxRegime.LUCRO_REAL,
];

export const CLIENT_LIST_LIMIT = 100;
export const ADDITIONAL_CONTACTS_MAX = 10;
```

- [ ] **Step 5.2: Commit**

```bash
git add src/features/clients/constants.ts
git commit -m "feat(clients): add constants (enums + ordered arrays)"
```

---

### Task 6: Utils (`features/clients/utils.ts`)

**Files:**
- Create: `src/features/clients/utils.ts`
- Create: `src/features/clients/utils.test.ts`

- [ ] **Step 6.1: Tests**

```ts
// src/features/clients/utils.test.ts
import { describe, expect, it } from "vitest";

import {
  cnpjRoot,
  computeDiff,
  formatCep,
  formatCnpj,
  formatCpf,
  formatDocument,
  formatPhoneBR,
  isMatrizCnpj,
  stripDocument,
} from "./utils";

describe("stripDocument", () => {
  it("strips non-digits", () => {
    expect(stripDocument("123.456.789-00")).toBe("12345678900");
  });
});

describe("formatCpf / formatCnpj / formatDocument / formatCep / formatPhoneBR", () => {
  it("formats CPF (11 digits)", () => {
    expect(formatCpf("12345678900")).toBe("123.456.789-00");
  });

  it("formats CNPJ (14 digits)", () => {
    expect(formatCnpj("12345678000190")).toBe("12.345.678/0001-90");
  });

  it("formatDocument picks the right one", () => {
    expect(formatDocument("12345678900")).toBe("123.456.789-00");
    expect(formatDocument("12345678000190")).toBe("12.345.678/0001-90");
    expect(formatDocument("123")).toBe("123");
  });

  it("formats CEP", () => {
    expect(formatCep("01310100")).toBe("01310-100");
  });

  it("formats Brazilian mobile (11 digits)", () => {
    expect(formatPhoneBR("11987654321")).toBe("(11) 98765-4321");
  });

  it("formats Brazilian landline (10 digits)", () => {
    expect(formatPhoneBR("1133334444")).toBe("(11) 3333-4444");
  });
});

describe("cnpjRoot / isMatrizCnpj", () => {
  it("extracts the 8-digit root", () => {
    expect(cnpjRoot("12345678000190")).toBe("12345678");
  });

  it("returns null for non-14-digit input", () => {
    expect(cnpjRoot("123")).toBeNull();
  });

  it("identifies matriz by ending in 0001", () => {
    expect(isMatrizCnpj("12345678000190")).toBe(true);
    expect(isMatrizCnpj("12345678000291")).toBe(false);
  });
});

describe("computeDiff", () => {
  it("returns the keys whose values changed", () => {
    const before = { a: 1, b: "x", c: null };
    const after = { a: 1, b: "y", c: "now-set" };
    expect(computeDiff(before, after)).toEqual({
      b: { from: "x", to: "y" },
      c: { from: null, to: "now-set" },
    });
  });

  it("returns empty when nothing changed", () => {
    expect(computeDiff({ a: 1 }, { a: 1 })).toEqual({});
  });

  it("treats deep arrays via JSON equality", () => {
    expect(
      computeDiff(
        { contacts: [{ name: "A" }] },
        { contacts: [{ name: "B" }] },
      ),
    ).toHaveProperty("contacts");
  });
});
```

- [ ] **Step 6.2: RED**

```bash
pnpm test --run src/features/clients/utils.test.ts
```

- [ ] **Step 6.3: Implement**

```ts
// src/features/clients/utils.ts
const ONLY_DIGITS_RE = /\D/g;

export function stripDocument(input: string): string {
  return input.replace(ONLY_DIGITS_RE, "");
}

export function formatCpf(digits: string): string {
  const d = stripDocument(digits);
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function formatCnpj(digits: string): string {
  const d = stripDocument(digits);
  if (d.length !== 14) return digits;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(
    8,
    12,
  )}-${d.slice(12)}`;
}

export function formatDocument(digits: string): string {
  const d = stripDocument(digits);
  if (d.length === 11) return formatCpf(d);
  if (d.length === 14) return formatCnpj(d);
  return digits;
}

export function formatCep(input: string): string {
  const d = stripDocument(input);
  if (d.length !== 8) return input;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function formatPhoneBR(input: string): string {
  const d = stripDocument(input);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return input;
}

export function cnpjRoot(cnpj: string): string | null {
  const d = stripDocument(cnpj);
  if (d.length !== 14) return null;
  return d.slice(0, 8);
}

export function isMatrizCnpj(cnpj: string): boolean {
  const d = stripDocument(cnpj);
  return d.length === 14 && d.slice(8, 12) === "0001";
}

export function isBranchCnpj(cnpj: string): boolean {
  const d = stripDocument(cnpj);
  return d.length === 14 && d.slice(8, 12) !== "0001";
}

type DiffEntry = { from: unknown; to: unknown };

export function computeDiff<T extends Record<string, unknown>>(
  before: T,
  after: T,
): Record<string, DiffEntry> {
  const diff: Record<string, DiffEntry> = {};
  for (const key of Object.keys({ ...before, ...after })) {
    const a = before[key as keyof T];
    const b = after[key as keyof T];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      diff[key] = { from: a ?? null, to: b ?? null };
    }
  }
  return diff;
}
```

- [ ] **Step 6.4: GREEN**

```bash
pnpm test --run src/features/clients/utils.test.ts
```

- [ ] **Step 6.5: Commit**

```bash
git add src/features/clients/utils.ts src/features/clients/utils.test.ts
git commit -m "feat(clients): add formatting + diff utils"
```

---

### Task 7: Schema (`features/clients/schemas.ts`)

**Files:**
- Create: `src/features/clients/schemas.ts`
- Create: `src/features/clients/schemas.test.ts`
- Create: `src/features/clients/types.ts`

- [ ] **Step 7.1: Tests (focus on refines, not Zod itself)**

```ts
// src/features/clients/schemas.test.ts
import { describe, expect, it } from "vitest";

import { ClientStatus, ClientType, TaxRegime } from "./constants";
import { clientSchema } from "./schemas";

const validBase = {
  type: ClientType.PJ,
  legalName: "Empresa LTDA",
  tradeName: "Empresa",
  document: "12345678000190",
  taxRegime: TaxRegime.SIMPLES_NACIONAL,
  stateRegistration: "",
  cityRegistration: "",
  segment: "Tech",
  primaryEmail: "contato@empresa.com",
  primaryPhone: "11987654321",
  contactName: "Fulano",
  zipCode: "01310100",
  street: "Avenida Paulista",
  number: "1000",
  complement: "",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
  additionalContacts: [],
  parentClientId: null,
  status: ClientStatus.ACTIVE,
  internalNotes: "",
};

describe("clientSchema", () => {
  it("accepts a valid PJ", () => {
    expect(clientSchema.safeParse(validBase).success).toBe(true);
  });

  it("rejects PF with CNPJ-length document", () => {
    const result = clientSchema.safeParse({
      ...validBase,
      type: ClientType.PF,
      document: "12345678000190",
    });
    expect(result.success).toBe(false);
  });

  it("rejects PJ with CPF-length document", () => {
    const result = clientSchema.safeParse({
      ...validBase,
      document: "12345678900",
    });
    expect(result.success).toBe(false);
  });

  it("rejects PF with parentClientId", () => {
    const result = clientSchema.safeParse({
      ...validBase,
      type: ClientType.PF,
      document: "12345678900",
      parentClientId: "some-id",
    });
    expect(result.success).toBe(false);
  });

  it("caps additional contacts at 10", () => {
    const tooMany = Array.from({ length: 11 }, (_, i) => ({
      name: `C${i}`,
      email: `c${i}@x.com`,
      phone: "",
      role: "",
    }));
    const result = clientSchema.safeParse({
      ...validBase,
      additionalContacts: tooMany,
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 7.2: RED**

```bash
pnpm test --run src/features/clients/schemas.test.ts
```

- [ ] **Step 7.3: Implement**

```ts
// src/features/clients/schemas.ts
import { z } from "zod";

import {
  ADDITIONAL_CONTACTS_MAX,
  ClientStatus,
  ClientType,
  TaxRegime,
} from "./constants";

const optionalString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal("").transform(() => undefined));

export const additionalContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  role: z.string().trim().max(60).optional().or(z.literal("")),
});

export type AdditionalContactInput = z.infer<typeof additionalContactSchema>;

export const clientSchema = z
  .object({
    type: z.nativeEnum(ClientType),
    legalName: z.string().trim().min(2).max(200),
    tradeName: optionalString(120),
    document: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{11}$|^\d{14}$/, "Documento inválido")),
    taxRegime: z.nativeEnum(TaxRegime).optional().nullable(),
    stateRegistration: optionalString(40),
    cityRegistration: optionalString(40),
    segment: optionalString(120),
    primaryEmail: z.string().trim().toLowerCase().email().max(254),
    primaryPhone: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(z.string().regex(/^\d{10}$|^\d{11}$/, "Telefone inválido")),
    contactName: z.string().trim().min(2).max(120),
    zipCode: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .pipe(
        z
          .string()
          .regex(/^\d{8}$|^$/, "CEP inválido")
          .or(z.literal("")),
      )
      .optional(),
    street: optionalString(200),
    number: optionalString(20),
    complement: optionalString(120),
    neighborhood: optionalString(120),
    city: optionalString(120),
    state: optionalString(2),
    additionalContacts: z.array(additionalContactSchema).max(ADDITIONAL_CONTACTS_MAX),
    parentClientId: z.string().trim().min(1).nullable(),
    status: z.nativeEnum(ClientStatus),
    internalNotes: optionalString(2000),
  })
  .superRefine((data, ctx) => {
    // PF must have 11 digits, PJ must have 14
    if (data.type === ClientType.PF && data.document.length !== 11) {
      ctx.addIssue({
        path: ["document"],
        code: z.ZodIssueCode.custom,
        message: "PF requer CPF (11 dígitos).",
      });
    }
    if (data.type === ClientType.PJ && data.document.length !== 14) {
      ctx.addIssue({
        path: ["document"],
        code: z.ZodIssueCode.custom,
        message: "PJ requer CNPJ (14 dígitos).",
      });
    }
    if (data.type === ClientType.PF && data.parentClientId) {
      ctx.addIssue({
        path: ["parentClientId"],
        code: z.ZodIssueCode.custom,
        message: "PF não pode ser filial.",
      });
    }
  });

export type ClientFormInput = z.infer<typeof clientSchema>;

export const archiveClientSchema = z.object({
  id: z.string().min(1),
});
```

- [ ] **Step 7.4: Types file**

```ts
// src/features/clients/types.ts
import type {
  Client,
  ClientStatus,
  ClientType,
  TaxRegime,
} from "@/generated/prisma";

export type ClientListItem = Pick<
  Client,
  | "id"
  | "type"
  | "legalName"
  | "tradeName"
  | "document"
  | "taxRegime"
  | "status"
  | "city"
  | "state"
  | "parentClientId"
  | "archivedAt"
  | "createdAt"
>;

export type ClientFilters = {
  search?: string;
  type?: ClientType | "all";
  status?: ClientStatus | "all";
  taxRegime?: TaxRegime | "all";
  includeArchived?: boolean;
};
```

- [ ] **Step 7.5: GREEN**

```bash
pnpm test --run src/features/clients/schemas.test.ts
```

- [ ] **Step 7.6: Commit**

```bash
git add src/features/clients/schemas.ts src/features/clients/schemas.test.ts src/features/clients/types.ts
git commit -m "feat(clients): add zod schemas + types"
```

---

### Task 8: Queries (`features/clients/queries.ts`)

**Files:**
- Create: `src/features/clients/queries.ts`
- Create: `src/features/clients/queries.test.ts`

- [ ] **Step 8.1: Tests**

```ts
// src/features/clients/queries.test.ts
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { ClientStatus, ClientType } from "./constants";
import { getClient, listClients, listMatrizCandidates } from "./queries";

const baseInput = {
  legalName: "Test PJ",
  contactName: "Test",
  primaryEmail: "test@x.com",
  primaryPhone: "11999999999",
};

describe("listClients", () => {
  beforeEach(async () => {
    await db.client.deleteMany();
  });

  it("returns recent first, hides archived by default", async () => {
    await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PJ,
        document: "11111111000111",
        status: ClientStatus.ACTIVE,
      },
    });
    await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PJ,
        document: "22222222000122",
        status: ClientStatus.ACTIVE,
        archivedAt: new Date(),
      },
    });

    const all = await listClients({});
    expect(all).toHaveLength(1);

    const withArchived = await listClients({ includeArchived: true });
    expect(withArchived).toHaveLength(2);
  });

  it("filters by type and status", async () => {
    await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PF,
        document: "11111111111",
        status: ClientStatus.ACTIVE,
      },
    });
    await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PJ,
        document: "33333333000133",
        status: ClientStatus.PROSPECT,
      },
    });

    expect(await listClients({ type: ClientType.PF })).toHaveLength(1);
    expect(await listClients({ status: ClientStatus.PROSPECT })).toHaveLength(1);
  });

  it("searches by legalName, document, and email", async () => {
    await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PJ,
        document: "44444444000144",
        legalName: "Acme Corp",
      },
    });
    expect((await listClients({ search: "Acme" })).length).toBe(1);
    expect((await listClients({ search: "44444444" })).length).toBe(1);
    expect((await listClients({ search: "test@x.com" })).length).toBe(1);
  });
});

describe("getClient", () => {
  beforeEach(async () => {
    await db.client.deleteMany();
  });

  it("returns null for missing id", async () => {
    expect(await getClient("nope")).toBeNull();
  });

  it("returns the full client", async () => {
    const created = await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PJ,
        document: "55555555000155",
      },
    });
    const result = await getClient(created.id);
    expect(result?.id).toBe(created.id);
  });
});

describe("listMatrizCandidates", () => {
  beforeEach(async () => {
    await db.client.deleteMany();
  });

  it("returns only PJ, not archived, not branches", async () => {
    const matriz = await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PJ,
        document: "66666666000166",
      },
    });
    await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PJ,
        document: "66666666000266",
        parentClientId: matriz.id,
      },
    });
    await db.client.create({
      data: {
        ...baseInput,
        type: ClientType.PF,
        document: "12312312399",
      },
    });

    const result = await listMatrizCandidates("");
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(matriz.id);
  });
});
```

- [ ] **Step 8.2: RED**

```bash
DATABASE_URL=postgresql://duohub_test:duohub_test@localhost:5433/duohub_test \
  pnpm test --run src/features/clients/queries.test.ts
```

- [ ] **Step 8.3: Implement**

```ts
// src/features/clients/queries.ts
import "server-only";

import type { Prisma } from "@/generated/prisma";
import { db } from "@/lib/db";
import { CLIENT_LIST_LIMIT } from "./constants";
import type { ClientFilters, ClientListItem } from "./types";

export async function listClients(
  filters: ClientFilters,
): Promise<ClientListItem[]> {
  const where: Prisma.ClientWhereInput = {};

  if (!filters.includeArchived) {
    where.archivedAt = null;
  }
  if (filters.type && filters.type !== "all") where.type = filters.type;
  if (filters.status && filters.status !== "all") where.status = filters.status;
  if (filters.taxRegime && filters.taxRegime !== "all") where.taxRegime = filters.taxRegime;

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    const digits = term.replace(/\D/g, "");
    const orClauses: Prisma.ClientWhereInput[] = [
      { legalName: { contains: term, mode: "insensitive" } },
      { tradeName: { contains: term, mode: "insensitive" } },
      { primaryEmail: { contains: term, mode: "insensitive" } },
    ];
    if (digits.length >= 3) {
      orClauses.push({ document: { contains: digits } });
    }
    where.OR = orClauses;
  }

  return db.client.findMany({
    where,
    select: {
      id: true,
      type: true,
      legalName: true,
      tradeName: true,
      document: true,
      taxRegime: true,
      status: true,
      city: true,
      state: true,
      parentClientId: true,
      archivedAt: true,
      createdAt: true,
    },
    orderBy: [{ archivedAt: "asc" }, { legalName: "asc" }],
    take: CLIENT_LIST_LIMIT,
  });
}

export async function getClient(id: string) {
  return db.client.findUnique({ where: { id } });
}

export async function listMatrizCandidates(search: string) {
  return db.client.findMany({
    where: {
      type: "PJ",
      archivedAt: null,
      parentClientId: null,
      ...(search.trim()
        ? {
            OR: [
              { legalName: { contains: search.trim(), mode: "insensitive" } },
              { document: { contains: search.replace(/\D/g, "") } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      legalName: true,
      tradeName: true,
      document: true,
      taxRegime: true,
      segment: true,
    },
    orderBy: { legalName: "asc" },
    take: 20,
  });
}
```

- [ ] **Step 8.4: GREEN**

```bash
DATABASE_URL=postgresql://duohub_test:duohub_test@localhost:5433/duohub_test \
  pnpm test --run src/features/clients/queries.test.ts
```

- [ ] **Step 8.5: Commit**

```bash
git add src/features/clients/queries.ts src/features/clients/queries.test.ts
git commit -m "feat(clients): add list/get/matrizCandidates queries"
```

---

### Task 9: Actions (`features/clients/actions.ts`)

**Files:**
- Create: `src/features/clients/actions.ts`
- Create: `src/features/clients/actions.test.ts`

- [ ] **Step 9.1: Tests (key flows: create, update with diff, archive, matriz validations)**

```ts
// src/features/clients/actions.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { db } from "@/lib/db";
import { ClientStatus, ClientType, TaxRegime } from "./constants";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`__redirect__:${path}`);
  },
}));
vi.mock("@/lib/auth/helpers", () => ({
  requireAdmin: vi.fn(async () => ({
    user: { id: "admin-1", email: "admin@test.com", role: "ADMIN" },
    session: { id: "s1" },
  })),
}));

const {
  archiveClientAction,
  createClientAction,
  updateClientAction,
} = await import("./actions");

const validBase = {
  type: ClientType.PJ,
  legalName: "Acme",
  tradeName: "",
  document: "11222333000144",
  taxRegime: TaxRegime.SIMPLES_NACIONAL,
  stateRegistration: "",
  cityRegistration: "",
  segment: "",
  primaryEmail: "contact@acme.com",
  primaryPhone: "11987654321",
  contactName: "Owner",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  additionalContacts: [],
  parentClientId: null,
  status: ClientStatus.ACTIVE,
  internalNotes: "",
};

describe("createClientAction", () => {
  beforeEach(async () => {
    await db.client.deleteMany();
    await db.user.deleteMany();
    await db.user.create({
      data: { id: "admin-1", email: "admin@test.com", emailVerified: true },
    });
  });

  it("creates a client", async () => {
    const result = await createClientAction(validBase);
    expect(result.success).toBe(true);
    const inserted = await db.client.findUnique({
      where: { document: "11222333000144" },
    });
    expect(inserted).not.toBeNull();
  });

  it("rejects duplicate document", async () => {
    await createClientAction(validBase);
    const result = await createClientAction(validBase);
    expect(result.success).toBe(false);
  });

  it("blocks branch when CNPJ root mismatches matriz", async () => {
    const matriz = await db.client.create({
      data: {
        ...validBase,
        document: "11222333000144",
      },
    });
    const result = await createClientAction({
      ...validBase,
      document: "99999999000299", // root 99999999, doesn't match
      parentClientId: matriz.id,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/raiz/i);
  });

  it("blocks sub-branch (parent already a branch)", async () => {
    const matriz = await db.client.create({
      data: { ...validBase, document: "11222333000144" },
    });
    const branch = await db.client.create({
      data: {
        ...validBase,
        document: "11222333000244",
        parentClientId: matriz.id,
      },
    });
    const result = await createClientAction({
      ...validBase,
      document: "11222333000344",
      parentClientId: branch.id,
    });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/filial.*filial/i);
  });
});

describe("updateClientAction", () => {
  beforeEach(async () => {
    await db.client.deleteMany();
    await db.user.deleteMany();
    await db.user.create({
      data: { id: "admin-1", email: "admin@test.com", emailVerified: true },
    });
  });

  it("computes a diff and writes audit only when there is change", async () => {
    const created = await db.client.create({
      data: { ...validBase, document: "11222333000144" },
    });
    const result = await updateClientAction(created.id, {
      ...validBase,
      legalName: "Acme Renamed",
    });
    expect(result.success).toBe(true);
    const audit = await db.auditLog.findFirst({
      where: { action: "CLIENT_UPDATED", resourceId: created.id },
    });
    expect(audit?.metadata).toHaveProperty("diff");
  });
});

describe("archiveClientAction", () => {
  beforeEach(async () => {
    await db.client.deleteMany();
    await db.user.deleteMany();
    await db.user.create({
      data: { id: "admin-1", email: "admin@test.com", emailVerified: true },
    });
  });

  it("sets archivedAt and redirects", async () => {
    const created = await db.client.create({
      data: { ...validBase, document: "11222333000144" },
    });
    await expect(archiveClientAction({ id: created.id })).rejects.toThrow(
      "__redirect__:/admin/clients",
    );
    const after = await db.client.findUnique({ where: { id: created.id } });
    expect(after?.archivedAt).not.toBeNull();
  });
});
```

- [ ] **Step 9.2: RED**

```bash
DATABASE_URL=postgresql://duohub_test:duohub_test@localhost:5433/duohub_test \
  pnpm test --run src/features/clients/actions.test.ts
```

- [ ] **Step 9.3: Implement**

```ts
// src/features/clients/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auditLog } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { archiveClientSchema, clientSchema, type ClientFormInput } from "./schemas";
import { cnpjRoot, computeDiff } from "./utils";

type ActionResult = { success: true; id: string } | { success: false; error: string };

async function validateMatrizFilial(
  data: ClientFormInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!data.parentClientId) return { ok: true };

  const parent = await db.client.findUnique({
    where: { id: data.parentClientId },
    select: {
      id: true,
      type: true,
      document: true,
      archivedAt: true,
      parentClientId: true,
    },
  });

  if (!parent) {
    return { ok: false, error: "A matriz selecionada não existe." };
  }
  if (parent.archivedAt) {
    return { ok: false, error: "A matriz selecionada está arquivada." };
  }
  if (parent.type !== "PJ") {
    return { ok: false, error: "A matriz precisa ser uma pessoa jurídica." };
  }
  if (parent.parentClientId) {
    return {
      ok: false,
      error:
        "Não é possível vincular uma filial a outra filial. Escolha a matriz raiz.",
    };
  }

  const childRoot = cnpjRoot(data.document);
  const parentRoot = cnpjRoot(parent.document);
  if (!childRoot || !parentRoot || childRoot !== parentRoot) {
    return {
      ok: false,
      error: "A raiz do CNPJ da filial não coincide com a da matriz.",
    };
  }

  return { ok: true };
}

function toCreateData(input: ClientFormInput) {
  return {
    type: input.type,
    legalName: input.legalName,
    tradeName: input.tradeName ?? null,
    document: input.document,
    taxRegime: input.taxRegime ?? null,
    stateRegistration: input.stateRegistration ?? null,
    cityRegistration: input.cityRegistration ?? null,
    segment: input.segment ?? null,
    primaryEmail: input.primaryEmail,
    primaryPhone: input.primaryPhone,
    contactName: input.contactName,
    zipCode: input.zipCode || null,
    street: input.street ?? null,
    number: input.number ?? null,
    complement: input.complement ?? null,
    neighborhood: input.neighborhood ?? null,
    city: input.city ?? null,
    state: input.state ?? null,
    additionalContacts:
      input.additionalContacts.length === 0
        ? null
        : (input.additionalContacts as never),
    parentClientId: input.parentClientId,
    status: input.status,
    internalNotes: input.internalNotes ?? null,
  };
}

export async function createClientAction(
  raw: ClientFormInput,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos." };
  }

  const data = parsed.data;

  const existing = await db.client.findUnique({
    where: { document: data.document },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: "Já existe um cliente com este documento.",
    };
  }

  const matrizCheck = await validateMatrizFilial(data);
  if (!matrizCheck.ok) return { success: false, error: matrizCheck.error };

  const created = await db.client.create({
    data: toCreateData(data),
    select: { id: true, legalName: true, document: true },
  });

  await auditLog.write({
    action: "CLIENT_CREATED",
    actorId: session.user.id,
    actorEmail: session.user.email,
    resourceType: "Client",
    resourceId: created.id,
    metadata: { legalName: created.legalName, document: created.document },
  });

  revalidatePath("/admin/clients");
  return { success: true, id: created.id };
}

export async function updateClientAction(
  id: string,
  raw: ClientFormInput,
): Promise<ActionResult> {
  const session = await requireAdmin();

  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos." };
  }

  const data = parsed.data;

  const before = await db.client.findUnique({ where: { id } });
  if (!before) {
    return { success: false, error: "Cliente não encontrado." };
  }
  if (before.archivedAt) {
    return { success: false, error: "Não é possível editar um cliente arquivado." };
  }

  // Document changed → re-check uniqueness
  if (before.document !== data.document) {
    const dup = await db.client.findUnique({
      where: { document: data.document },
      select: { id: true },
    });
    if (dup && dup.id !== id) {
      return {
        success: false,
        error: "Já existe um cliente com este documento.",
      };
    }
  }

  const matrizCheck = await validateMatrizFilial(data);
  if (!matrizCheck.ok) return { success: false, error: matrizCheck.error };

  const updated = await db.client.update({
    where: { id },
    data: toCreateData(data),
  });

  const diff = computeDiff(
    before as unknown as Record<string, unknown>,
    updated as unknown as Record<string, unknown>,
  );

  if (Object.keys(diff).length > 0) {
    await auditLog.write({
      action: "CLIENT_UPDATED",
      actorId: session.user.id,
      actorEmail: session.user.email,
      resourceType: "Client",
      resourceId: id,
      metadata: { diff },
    });
  }

  revalidatePath("/admin/clients");
  revalidatePath(`/admin/clients/${id}`);
  return { success: true, id };
}

export async function archiveClientAction(input: {
  id: string;
}): Promise<never> {
  const session = await requireAdmin();
  const parsed = archiveClientSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid input");

  const target = await db.client.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, legalName: true, archivedAt: true },
  });
  if (!target) throw new Error("Client not found");
  if (target.archivedAt) {
    redirect("/admin/clients");
  }

  await db.client.update({
    where: { id: target.id },
    data: { archivedAt: new Date() },
  });

  await auditLog.write({
    action: "CLIENT_DELETED",
    actorId: session.user.id,
    actorEmail: session.user.email,
    resourceType: "Client",
    resourceId: target.id,
    metadata: { legalName: target.legalName },
  });

  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}
```

- [ ] **Step 9.4: GREEN**

```bash
DATABASE_URL=postgresql://duohub_test:duohub_test@localhost:5433/duohub_test \
  pnpm test --run src/features/clients/actions.test.ts
```

- [ ] **Step 9.5: Commit**

```bash
git add src/features/clients/actions.ts src/features/clients/actions.test.ts
git commit -m "feat(clients): add create/update/archive actions with audit + matriz validation"
```

---

## PHASE C — Form pieces

### Task 10: `DocumentInput` (CPF/CNPJ mask)

**Files:**
- Create: `src/app/admin/clients/_components/document-input.tsx`

- [ ] **Step 10.1: Implement**

```tsx
// src/app/admin/clients/_components/document-input.tsx
"use client";

import { forwardRef } from "react";

import { Input } from "@/components/ui/input";
import { ClientType } from "@/features/clients/constants";
import { useMessages } from "@/stores/use-content-store";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  type: ClientType;
};

export const DocumentInput = forwardRef<HTMLInputElement, Props>(
  function DocumentInput({ type, value, onChange, ...rest }, ref) {
    const { common } = useMessages();
    const placeholder =
      type === ClientType.PJ
        ? common.forms.placeholders.cnpj
        : common.forms.placeholders.cpf;

    function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
      const digits = event.target.value.replace(/\D/g, "");
      const max = type === ClientType.PJ ? 14 : 11;
      const trimmed = digits.slice(0, max);
      const formatted = formatLive(trimmed, type);
      // Re-create event with formatted value
      const synthetic = {
        ...event,
        target: { ...event.target, value: formatted },
        currentTarget: { ...event.currentTarget, value: formatted },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange?.(synthetic);
    }

    return (
      <Input
        ref={ref}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="numeric"
        autoComplete="off"
        {...rest}
      />
    );
  },
);

function formatLive(digits: string, type: ClientType): string {
  if (type === ClientType.PJ) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12)
      return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
        5,
        8,
      )}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(
      5,
      8,
    )}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  // CPF
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9)
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(
    6,
    9,
  )}-${digits.slice(9)}`;
}
```

- [ ] **Step 10.2: Commit**

```bash
git add src/app/admin/clients/_components/document-input.tsx
git commit -m "feat(clients): add document input with live CPF/CNPJ mask"
```

---

### Task 11: `AddressFields` (with ViaCEP onBlur)

**Files:**
- Create: `src/app/admin/clients/_components/address-fields.tsx`

- [ ] **Step 11.1: Implement**

```tsx
// src/app/admin/clients/_components/address-fields.tsx
"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { ClientFormInput } from "@/features/clients/schemas";
import { useMessages } from "@/stores/use-content-store";

type Props = {
  form: UseFormReturn<ClientFormInput>;
};

export function AddressFields({ form }: Props) {
  const { common } = useMessages();
  const [loadingCep, setLoadingCep] = useState(false);

  async function handleCepBlur(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setLoadingCep(true);
    try {
      const response = await fetch(`/api/viacep/${digits}`);
      if (!response.ok) return;
      const data = (await response.json()) as {
        street: string | null;
        neighborhood: string | null;
        city: string | null;
        state: string | null;
      };
      form.setValue("street", data.street ?? "", { shouldDirty: true });
      form.setValue("neighborhood", data.neighborhood ?? "", { shouldDirty: true });
      form.setValue("city", data.city ?? "", { shouldDirty: true });
      form.setValue("state", data.state ?? "", { shouldDirty: true });
    } finally {
      setLoadingCep(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
      <FormField
        control={form.control}
        name="zipCode"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>{common.terms.cep}</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder={common.forms.placeholders.cep}
                inputMode="numeric"
                onBlur={(e) => {
                  field.onBlur();
                  void handleCepBlur(e.target.value);
                }}
                disabled={loadingCep}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="street"
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>{common.terms.street}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="number"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>{common.terms.number}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="complement"
        render={({ field }) => (
          <FormItem className="md:col-span-4">
            <FormLabel>{common.terms.complement}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="neighborhood"
        render={({ field }) => (
          <FormItem className="md:col-span-2">
            <FormLabel>{common.terms.neighborhood}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem className="md:col-span-3">
            <FormLabel>{common.terms.city}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="state"
        render={({ field }) => (
          <FormItem className="md:col-span-1">
            <FormLabel>{common.terms.state}</FormLabel>
            <FormControl>
              <Input {...field} maxLength={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
```

- [ ] **Step 11.2: Commit**

```bash
git add src/app/admin/clients/_components/address-fields.tsx
git commit -m "feat(clients): add address fields with viacep autofill"
```

---

### Task 12: `AdditionalContactsField` (`useFieldArray`)

**Files:**
- Create: `src/app/admin/clients/_components/additional-contacts-field.tsx`

- [ ] **Step 12.1: Implement**

```tsx
// src/app/admin/clients/_components/additional-contacts-field.tsx
"use client";

import { PlusIcon, TrashIcon } from "lucide-react";
import { type UseFormReturn, useFieldArray } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  ADDITIONAL_CONTACTS_MAX,
} from "@/features/clients/constants";
import type { ClientFormInput } from "@/features/clients/schemas";
import { useMessages } from "@/stores/use-content-store";

type Props = {
  form: UseFormReturn<ClientFormInput>;
};

export function AdditionalContactsField({ form }: Props) {
  const { admin, common } = useMessages();
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "additionalContacts",
  });

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-12"
        >
          <FormField
            control={form.control}
            name={`additionalContacts.${index}.name`}
            render={({ field: f }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>{admin.clients.form.additionalContact.nameLabel}</FormLabel>
                <FormControl>
                  <Input {...f} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`additionalContacts.${index}.email`}
            render={({ field: f }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>{admin.clients.form.additionalContact.emailLabel}</FormLabel>
                <FormControl>
                  <Input type="email" {...f} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`additionalContacts.${index}.phone`}
            render={({ field: f }) => (
              <FormItem className="md:col-span-3">
                <FormLabel>{admin.clients.form.additionalContact.phoneLabel}</FormLabel>
                <FormControl>
                  <Input
                    {...f}
                    placeholder={common.forms.placeholders.phoneBR}
                    inputMode="tel"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name={`additionalContacts.${index}.role`}
            render={({ field: f }) => (
              <FormItem className="md:col-span-2">
                <FormLabel>{admin.clients.form.additionalContact.roleLabel}</FormLabel>
                <FormControl>
                  <Input {...f} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex items-end md:col-span-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              aria-label={admin.clients.form.additionalContact.remove}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
      {fields.length < ADDITIONAL_CONTACTS_MAX ? (
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ name: "", email: "", phone: "", role: "" })}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {admin.clients.form.additionalContact.add}
        </Button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 12.2: Commit**

```bash
git add src/app/admin/clients/_components/additional-contacts-field.tsx
git commit -m "feat(clients): add additional contacts field with useFieldArray"
```

---

### Task 13: `ParentClientCombobox`

**Files:**
- Create: `src/app/admin/clients/_components/parent-client-combobox.tsx`

- [ ] **Step 13.1: Implement (uses /api proxy that wraps `listMatrizCandidates`)**

```tsx
// src/app/admin/clients/_components/parent-client-combobox.tsx
"use client";

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatCnpj } from "@/features/clients/utils";
import { cn } from "@/lib/utils";
import { useMessages } from "@/stores/use-content-store";

type Candidate = {
  id: string;
  legalName: string;
  tradeName: string | null;
  document: string;
};

type Props = {
  value: string | null;
  onChange: (id: string | null, candidate: Candidate | null) => void;
};

export function ParentClientCombobox({ value, onChange }: Props) {
  const { admin } = useMessages();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Candidate[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      const params = new URLSearchParams({ q: search });
      const response = await fetch(`/api/admin/clients/matriz?${params}`);
      if (!response.ok || cancelled) return;
      const data = (await response.json()) as { candidates: Candidate[] };
      setItems(data.candidates);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [search]);

  function handleSelect(candidate: Candidate | null) {
    if (!candidate) {
      onChange(null, null);
      setSelectedLabel(null);
    } else {
      onChange(candidate.id, candidate);
      setSelectedLabel(candidate.legalName);
    }
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between" type="button">
          {value && selectedLabel
            ? selectedLabel
            : admin.clients.form.parent.none}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={admin.clients.form.parent.placeholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{admin.clients.form.parent.notFound}</CommandEmpty>
            <CommandItem onSelect={() => handleSelect(null)}>
              <CheckIcon
                className={cn(
                  "mr-2 h-4 w-4",
                  value === null ? "opacity-100" : "opacity-0",
                )}
              />
              {admin.clients.form.parent.none}
            </CommandItem>
            {items.map((c) => (
              <CommandItem key={c.id} onSelect={() => handleSelect(c)}>
                <CheckIcon
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === c.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="flex flex-col">
                  <span>{c.legalName}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCnpj(c.document)}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 13.2: Add API route for matriz search**

Create `src/app/api/admin/clients/matriz/route.ts`:

```ts
// src/app/api/admin/clients/matriz/route.ts
import "server-only";

import { NextResponse } from "next/server";

import { listMatrizCandidates } from "@/features/clients/queries";
import { getCurrentUser } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const candidates = await listMatrizCandidates(q);
  return NextResponse.json({ candidates });
}
```

- [ ] **Step 13.3: Commit**

```bash
git add src/app/admin/clients/_components/parent-client-combobox.tsx src/app/api/admin/clients
git commit -m "feat(clients): add parent client combobox + matriz search api"
```

---

### Task 14: `ClientForm` + `ClientFormSection`

**Files:**
- Create: `src/app/admin/clients/_components/client-form-section.tsx`
- Create: `src/app/admin/clients/_components/client-form.tsx`

- [ ] **Step 14.1: Section wrapper**

```tsx
// src/app/admin/clients/_components/client-form-section.tsx
type Props = {
  title: string;
  description?: string;
  children: React.ReactNode;
};

export function ClientFormSection({ title, description, children }: Props) {
  return (
    <section className="grid grid-cols-1 gap-6 border-t pt-6 md:grid-cols-3">
      <div className="md:col-span-1">
        <h3 className="font-medium">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="space-y-4 md:col-span-2">{children}</div>
    </section>
  );
}
```

- [ ] **Step 14.2: Form**

```tsx
// src/app/admin/clients/_components/client-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  CLIENT_STATUS_ORDER,
  CLIENT_TYPES_ORDER,
  ClientType,
  TAX_REGIMES_ORDER,
} from "@/features/clients/constants";
import {
  createClientAction,
  updateClientAction,
} from "@/features/clients/actions";
import {
  type ClientFormInput,
  clientSchema,
} from "@/features/clients/schemas";
import { useMessages } from "@/stores/use-content-store";
import { AdditionalContactsField } from "./additional-contacts-field";
import { AddressFields } from "./address-fields";
import { ClientFormSection } from "./client-form-section";
import { DocumentInput } from "./document-input";
import { ParentClientCombobox } from "./parent-client-combobox";

type Props = {
  mode: "create" | "edit";
  initialValues: ClientFormInput;
  clientId?: string;
};

export function ClientForm({ mode, initialValues, clientId }: Props) {
  const { admin, common } = useMessages();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<ClientFormInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialValues,
  });

  const watchedType = form.watch("type");

  function onSubmit(values: ClientFormInput) {
    startTransition(async () => {
      const result =
        mode === "create"
          ? await createClientAction(values)
          : await updateClientAction(clientId as string, values);

      if (result.success) {
        toast.success(
          mode === "create"
            ? admin.clients.form.success.created
            : admin.clients.form.success.updated,
        );
        if (mode === "create") {
          router.push(`/admin/clients/${result.id}`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <ClientFormSection
          title={admin.clients.form.sections.identification}
          description={admin.clients.form.sections.identificationDescription}
        >
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{admin.clients.form.type.label}</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex gap-6"
                  >
                    {CLIENT_TYPES_ORDER.map((t) => (
                      <label key={t} className="flex items-center gap-2">
                        <RadioGroupItem value={t} />
                        {admin.enums.clientType[t]}
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="legalName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{common.terms.legalName}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {watchedType === ClientType.PJ ? (
              <FormField
                control={form.control}
                name="tradeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{common.terms.tradeName}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}
          </div>
          <FormField
            control={form.control}
            name="document"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{common.terms.document}</FormLabel>
                <FormControl>
                  <DocumentInput type={watchedType} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {watchedType === ClientType.PJ ? (
            <FormField
              control={form.control}
              name="parentClientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{admin.clients.form.parent.label}</FormLabel>
                  <FormControl>
                    <ParentClientCombobox
                      value={field.value}
                      onChange={(id, candidate) => {
                        field.onChange(id);
                        // Pre-fill on create
                        if (mode === "create" && candidate) {
                          form.setValue("legalName", candidate.legalName);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </ClientFormSection>

        {watchedType === ClientType.PJ ? (
          <ClientFormSection
            title={admin.clients.form.sections.tax}
            description={admin.clients.form.sections.taxDescription}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="taxRegime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{common.terms.taxRegime ?? "Regime"}</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={(v) => field.onChange(v || null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {TAX_REGIMES_ORDER.map((r) => (
                          <SelectItem key={r} value={r}>
                            {admin.enums.taxRegime[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stateRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{common.terms.ie}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cityRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{common.terms.im}</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </ClientFormSection>
        ) : null}

        <ClientFormSection
          title={admin.clients.form.sections.contact}
          description={admin.clients.form.sections.contactDescription}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="contactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{common.terms.contactName}</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{common.terms.email}</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{common.terms.phone}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={common.forms.placeholders.phoneBR}
                      inputMode="tel"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </ClientFormSection>

        <ClientFormSection
          title={admin.clients.form.sections.address}
          description={admin.clients.form.sections.addressDescription}
        >
          <AddressFields form={form} />
        </ClientFormSection>

        <ClientFormSection
          title={admin.clients.form.sections.additionalContacts}
          description={admin.clients.form.sections.additionalContactsDescription}
        >
          <AdditionalContactsField form={form} />
        </ClientFormSection>

        <ClientFormSection title={admin.clients.form.sections.status}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{common.terms.status}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CLIENT_STATUS_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {admin.enums.clientStatus[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="internalNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{common.terms.notes}</FormLabel>
                <FormControl>
                  <Textarea rows={4} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </ClientFormSection>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending
              ? common.forms.submit.saving
              : mode === "create"
                ? admin.clients.form.submit.create
                : admin.clients.form.submit.update}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

- [ ] **Step 14.3: Commit**

```bash
git add src/app/admin/clients/_components/client-form.tsx src/app/admin/clients/_components/client-form-section.tsx
git commit -m "feat(clients): add unified client form (create + edit)"
```

---

## PHASE D — Pages

### Task 15: List page (`page.tsx`) + filters + table + archive button

**Files:**
- Create: `src/app/admin/clients/page.tsx`
- Create: `src/app/admin/clients/_components/clients-filters.tsx`
- Create: `src/app/admin/clients/_components/clients-table.tsx`
- Create: `src/app/admin/clients/_components/archive-client-button.tsx`

- [ ] **Step 15.1: Filters component**

```tsx
// src/app/admin/clients/_components/clients-filters.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLIENT_STATUS_ORDER,
  CLIENT_TYPES_ORDER,
} from "@/features/clients/constants";
import { useMessages } from "@/stores/use-content-store";

export function ClientsFilters() {
  const { admin } = useMessages();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (deferredSearch) params.set("search", deferredSearch);
    else params.delete("search");
    router.replace(`${pathname}?${params.toString()}`);
  }, [deferredSearch, pathname, router, searchParams]);

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (value && value !== "all") params.set(key, value);
    else params.delete(key);
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Input
        placeholder={admin.clients.filters.search}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <Select
        value={searchParams.get("type") ?? "all"}
        onValueChange={(v) => setParam("type", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={admin.clients.filters.type} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{admin.clients.filters.all}</SelectItem>
          {CLIENT_TYPES_ORDER.map((t) => (
            <SelectItem key={t} value={t}>
              {admin.enums.clientType[t]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={searchParams.get("status") ?? "all"}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder={admin.clients.filters.status} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{admin.clients.filters.all}</SelectItem>
          {CLIENT_STATUS_ORDER.map((s) => (
            <SelectItem key={s} value={s}>
              {admin.enums.clientStatus[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
```

- [ ] **Step 15.2: Table**

```tsx
// src/app/admin/clients/_components/clients-table.tsx
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ClientListItem } from "@/features/clients/types";
import { formatDocument } from "@/features/clients/utils";
import { useMessages } from "@/stores/use-content-store";

type Props = {
  clients: ClientListItem[];
};

export function ClientsTable({ clients }: Props) {
  const { admin } = useMessages();

  if (clients.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <h3 className="font-medium">{admin.clients.empty.title}</h3>
        <p className="text-sm text-muted-foreground">
          {admin.clients.empty.description}
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{admin.clients.columns.name}</TableHead>
          <TableHead>{admin.clients.columns.document}</TableHead>
          <TableHead>{admin.clients.columns.type}</TableHead>
          <TableHead>{admin.clients.columns.taxRegime}</TableHead>
          <TableHead>{admin.clients.columns.status}</TableHead>
          <TableHead>{admin.clients.columns.city}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((c) => (
          <TableRow key={c.id} data-testid={`client-row-${c.id}`}>
            <TableCell>
              <Link href={`/admin/clients/${c.id}`} className="hover:underline">
                <div className="flex flex-col">
                  <span className="font-medium">{c.legalName}</span>
                  {c.tradeName ? (
                    <span className="text-xs text-muted-foreground">
                      {c.tradeName}
                    </span>
                  ) : null}
                </div>
              </Link>
              {c.parentClientId ? (
                <Badge variant="outline" className="mt-1">
                  {admin.clients.branchBadge}
                </Badge>
              ) : null}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {formatDocument(c.document)}
            </TableCell>
            <TableCell>{admin.enums.clientType[c.type]}</TableCell>
            <TableCell>
              {c.taxRegime ? admin.enums.taxRegimeShort[c.taxRegime] : "—"}
            </TableCell>
            <TableCell>
              <Badge
                variant={c.archivedAt ? "secondary" : "default"}
                data-testid={`client-status-${c.id}`}
              >
                {c.archivedAt
                  ? admin.enums.clientStatus.CHURNED
                  : admin.enums.clientStatus[c.status]}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {c.city ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 15.3: Archive button**

```tsx
// src/app/admin/clients/_components/archive-client-button.tsx
"use client";

import { useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { archiveClientAction } from "@/features/clients/actions";
import { useMessages } from "@/stores/use-content-store";

type Props = { clientId: string };

export function ArchiveClientButton({ clientId }: Props) {
  const { admin } = useMessages();
  const [isPending, startTransition] = useTransition();

  function onConfirm() {
    startTransition(async () => {
      await archiveClientAction({ id: clientId });
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isPending} data-testid="archive-client">
          {admin.clients.archiveDialog.confirm}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{admin.clients.archiveDialog.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {admin.clients.archiveDialog.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{admin.clients.archiveDialog.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {admin.clients.archiveDialog.confirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

- [ ] **Step 15.4: List page (Server Component)**

```tsx
// src/app/admin/clients/page.tsx
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { messages } from "@/content/messages";
import {
  ClientStatus,
  ClientType,
} from "@/features/clients/constants";
import { listClients } from "@/features/clients/queries";
import { requireAdmin } from "@/lib/auth/helpers";
import { ClientsFilters } from "./_components/clients-filters";
import { ClientsTable } from "./_components/clients-table";

type SearchParams = Promise<{
  search?: string;
  type?: string;
  status?: string;
  archived?: string;
}>;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const params = await searchParams;
  const { admin } = messages;

  const clients = await listClients({
    search: params.search,
    type: params.type ? (params.type as ClientType | "all") : undefined,
    status: params.status ? (params.status as ClientStatus | "all") : undefined,
    includeArchived: params.archived === "1",
  });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl">{admin.clients.title}</h1>
          <p className="text-muted-foreground">{admin.clients.subtitle}</p>
        </div>
        <Button asChild data-testid="new-client-button">
          <Link href="/admin/clients/new">{admin.clients.new}</Link>
        </Button>
      </div>

      <ClientsFilters />

      <ClientsTable clients={clients} />
    </div>
  );
}
```

- [ ] **Step 15.5: Loading + error**

```tsx
// src/app/admin/clients/loading.tsx
export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="h-32 animate-pulse rounded bg-muted" />
      <div className="h-64 animate-pulse rounded bg-muted" />
    </div>
  );
}
```

```tsx
// src/app/admin/clients/error.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useMessages } from "@/stores/use-content-store";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const { admin } = useMessages();
  console.error("[admin/clients/error.tsx]", error.message);
  return (
    <div className="rounded-lg border border-destructive/50 p-6">
      <h2 className="font-medium">{admin.errors.pageBoundary}</h2>
      <Button variant="outline" onClick={reset} className="mt-4">
        {admin.errors.retry}
      </Button>
    </div>
  );
}
```

- [ ] **Step 15.6: Commit**

```bash
git add src/app/admin/clients/page.tsx src/app/admin/clients/loading.tsx src/app/admin/clients/error.tsx src/app/admin/clients/_components/{clients-filters,clients-table,archive-client-button}.tsx
git commit -m "feat(clients): add list page with filters, table, archive button"
```

---

### Task 16: New client page

**Files:**
- Create: `src/app/admin/clients/new/page.tsx`

- [ ] **Step 16.1: Implement**

```tsx
// src/app/admin/clients/new/page.tsx
import { messages } from "@/content/messages";
import {
  ClientStatus,
  ClientType,
} from "@/features/clients/constants";
import type { ClientFormInput } from "@/features/clients/schemas";
import { requireAdmin } from "@/lib/auth/helpers";
import { ClientForm } from "../_components/client-form";

const blankClient: ClientFormInput = {
  type: ClientType.PJ,
  legalName: "",
  tradeName: "",
  document: "",
  taxRegime: null,
  stateRegistration: "",
  cityRegistration: "",
  segment: "",
  primaryEmail: "",
  primaryPhone: "",
  contactName: "",
  zipCode: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  additionalContacts: [],
  parentClientId: null,
  status: ClientStatus.ACTIVE,
  internalNotes: "",
};

export default async function NewClientPage() {
  await requireAdmin();
  const { admin } = messages;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="font-heading text-3xl">{admin.clients.new}</h1>
      </header>
      <ClientForm mode="create" initialValues={blankClient} />
    </div>
  );
}
```

- [ ] **Step 16.2: Commit**

```bash
git add src/app/admin/clients/new
git commit -m "feat(clients): add new client page"
```

---

### Task 17: Edit client page

**Files:**
- Create: `src/app/admin/clients/[id]/page.tsx`
- Create: `src/app/admin/clients/[id]/error.tsx`

- [ ] **Step 17.1: Implement edit page**

```tsx
// src/app/admin/clients/[id]/page.tsx
import { notFound } from "next/navigation";

import { messages } from "@/content/messages";
import {
  ClientStatus,
  ClientType,
} from "@/features/clients/constants";
import { getClient } from "@/features/clients/queries";
import type { ClientFormInput } from "@/features/clients/schemas";
import { requireAdmin } from "@/lib/auth/helpers";
import { ArchiveClientButton } from "../_components/archive-client-button";
import { ClientForm } from "../_components/client-form";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const { admin } = messages;

  const initial: ClientFormInput = {
    type: client.type as ClientType,
    legalName: client.legalName,
    tradeName: client.tradeName ?? "",
    document: client.document,
    taxRegime: client.taxRegime,
    stateRegistration: client.stateRegistration ?? "",
    cityRegistration: client.cityRegistration ?? "",
    segment: client.segment ?? "",
    primaryEmail: client.primaryEmail,
    primaryPhone: client.primaryPhone,
    contactName: client.contactName,
    zipCode: client.zipCode ?? "",
    street: client.street ?? "",
    number: client.number ?? "",
    complement: client.complement ?? "",
    neighborhood: client.neighborhood ?? "",
    city: client.city ?? "",
    state: client.state ?? "",
    additionalContacts: (client.additionalContacts as never) ?? [],
    parentClientId: client.parentClientId,
    status: client.status as ClientStatus,
    internalNotes: client.internalNotes ?? "",
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl">{client.legalName}</h1>
          <p className="text-muted-foreground">{admin.clients.edit}</p>
        </div>
        {!client.archivedAt ? <ArchiveClientButton clientId={client.id} /> : null}
      </header>
      <ClientForm mode="edit" clientId={client.id} initialValues={initial} />
    </div>
  );
}
```

- [ ] **Step 17.2: Error boundary (mirror pattern)**

```tsx
// src/app/admin/clients/[id]/error.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useMessages } from "@/stores/use-content-store";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const { admin } = useMessages();
  console.error("[admin/clients/[id]/error.tsx]", error.message);
  return (
    <div className="rounded-lg border border-destructive/50 p-6">
      <h2 className="font-medium">{admin.errors.pageBoundary}</h2>
      <Button variant="outline" onClick={reset} className="mt-4">
        {admin.errors.retry}
      </Button>
    </div>
  );
}
```

- [ ] **Step 17.3: Commit**

```bash
git add src/app/admin/clients/[id]
git commit -m "feat(clients): add edit page with archive button"
```

---

### Task 18: Quick smoke test

```bash
pnpm dev &
DEV_PID=$!
sleep 6
# Login first manually, then:
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/clients
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/clients/new
kill $DEV_PID
```

Expected: 307 (redirect to login when no session). With session: 200.

---

## PHASE E — Verification

### Task 19: Robot E2E

**Files:**
- Create: `tests/robot/admin/client_crud.robot`

- [ ] **Step 19.1: Implement (focus: 4 critical flows)**

```robot
*** Settings ***
Documentation    F1a · PR5 — Client CRUD E2E
Resource         ${EXECDIR}/tests/robot/resources/auth.resource
Resource         ${EXECDIR}/tests/robot/resources/admin.resource
Library          Browser
Suite Setup      Setup Test DB And Seed Admin
Test Setup       New Browser Context

*** Test Cases ***
Admin creates a PJ client
    Login As Seeded Admin
    Go To    ${BASE_URL}/admin/clients
    Click    [data-testid="new-client-button"]
    Fill Text    [name="legalName"]    Empresa Robot LTDA
    Fill Text    [name="document"]    11.222.333/0001-44
    Fill Text    [name="primaryEmail"]    contato@empresa.com
    Fill Text    [name="primaryPhone"]    11987654321
    Fill Text    [name="contactName"]    João da Silva
    Click    button[type="submit"]
    Wait For Elements State    text=Cliente cadastrado    visible
    Wait For Elements State    text=Empresa Robot LTDA    visible

Admin creates a branch under matriz
    Login As Seeded Admin
    Create Test Client With Document    11222333000144    Matriz LTDA
    Go To    ${BASE_URL}/admin/clients/new
    Fill Text    [name="legalName"]    Filial LTDA
    Fill Text    [name="document"]    11.222.333/0002-25
    Fill Text    [name="primaryEmail"]    filial@empresa.com
    Fill Text    [name="primaryPhone"]    11987654322
    Fill Text    [name="contactName"]    Maria
    # Open parent combobox and pick the matriz
    Click    button:has-text("Não — é matriz ou autônomo")
    Fill Text    role=combobox    Matriz
    Click    [cmdk-item]:has-text("Matriz LTDA")
    Click    button[type="submit"]
    Wait For Elements State    text=Cliente cadastrado    visible
    Wait For Elements State    text=Filial    visible

Admin sees CNPJ root mismatch error
    Login As Seeded Admin
    Create Test Client With Document    11222333000144    Matriz X
    Go To    ${BASE_URL}/admin/clients/new
    Fill Text    [name="legalName"]    Filial errada
    Fill Text    [name="document"]    99.999.999/0002-25
    Fill Text    [name="primaryEmail"]    erro@x.com
    Fill Text    [name="primaryPhone"]    11999999999
    Fill Text    [name="contactName"]    Z
    Click    button:has-text("Não — é matriz ou autônomo")
    Fill Text    role=combobox    Matriz
    Click    [cmdk-item]:has-text("Matriz X")
    Click    button[type="submit"]
    Wait For Elements State    text=raiz do CNPJ    visible

Admin archives a client
    Login As Seeded Admin
    ${id}=    Create Test Client With Document    44455566000177    Para Arquivar
    Go To    ${BASE_URL}/admin/clients/${id}
    Click    [data-testid="archive-client"]
    Click    role=button[name=Arquivar]
    Wait For Url Contains    /admin/clients
    Go To    ${BASE_URL}/admin/clients?archived=1
    Wait For Elements State    text=Para Arquivar    visible
```

- [ ] **Step 19.2: Run**

```bash
ze testa client_crud
```

- [ ] **Step 19.3: Commit**

```bash
git add tests/robot/admin/client_crud.robot tests/robot/resources/admin.resource
git commit -m "test(clients): robot e2e for create + branch + cnpj mismatch + archive"
```

---

### Task 20: PR-level verification + open PR

- [ ] **Step 20.1: Full test run**

```bash
DATABASE_URL=postgresql://duohub_test:duohub_test@localhost:5433/duohub_test \
  pnpm test --run
```

- [ ] **Step 20.2: Lint + build**

```bash
pnpm lint && pnpm build
```

- [ ] **Step 20.3: Manual smoke**

- [ ] List shows seeded admin client (or empty state).
- [ ] Create new PJ → ViaCEP autofills address on CEP blur → save → redirect to edit.
- [ ] Edit PJ → change name → save → toast + audit log entry.
- [ ] Try to create branch with mismatched CNPJ root → error toast.
- [ ] Archive client → redirected to list → not visible by default → visible with `?archived=1`.
- [ ] Try to delete (no UI for it — only archive). ✓ as designed.

- [ ] **Step 20.4: Push and open PR**

```bash
git push -u origin HEAD

gh pr create --base chore/DUO-45/f1a-implementation-plans --title "feat(f1a): client CRUD with matriz/filial + ViaCEP (PR5)" --body "$(cat <<'EOF'
## Summary

- `/admin/clients` (list with search, type/status filters, archived toggle), `/admin/clients/new`, `/admin/clients/[id]`.
- Single shared `<ClientForm>` for create + edit, sectioned (Identification, Tax, Contact, Address, Additional Contacts, Status).
- ViaCEP autofill on CEP blur, behind a protected proxy (`/api/viacep/[cep]`, requireAdmin).
- Matriz/filial via `parentClientId`. Branch must share CNPJ root (8 digits) with matriz; sub-branches blocked; PF cannot have parent.
- Soft-delete via `archivedAt`. AuditLog entries: `CLIENT_CREATED`, `CLIENT_UPDATED` (with diff), `CLIENT_DELETED`.
- `react-hook-form` + `zodResolver`. `useFieldArray` for additional contacts (max 10). `useDeferredValue` for search debounce.
- All copy in `messages/admin.ts` and `messages/common.ts` with `satisfies Record<Enum, string>` for compile-time enum coverage.

## Test plan

- [x] Vitest unit/integration: utils, schemas, queries, actions, viacep
- [x] Robot E2E: create PJ, create branch, CNPJ mismatch error, archive flow
- [x] `pnpm lint` clean
- [x] `pnpm build` clean

## Plan reference

`docs/superpowers/plans/2026-05-02-f1a-pr5-clients.md`
EOF
)"
```

- [ ] **Step 20.5: Update Linear sub-issue.**

---

## Definition of Done

- [ ] All Vitest passes
- [ ] All Robot E2E passes
- [ ] `pnpm lint` clean
- [ ] `pnpm build` clean
- [ ] Zero hardcoded UI text
- [ ] ViaCEP works end-to-end with autofill
- [ ] Matriz/filial validations enforced (4 cases: not exists, archived, not PJ, root mismatch, sub-branch)
- [ ] Audit entries appear for CLIENT_CREATED, CLIENT_UPDATED (with diff), CLIENT_DELETED
- [ ] Archive is soft (archivedAt set, record preserved)
- [ ] Linear sub-issue updated

When all checked, merge with **squash**.

---

## After this PR — F1a is done

- F1a fully delivered. Branch protection should now require all 5 PRs merged.
- Update `project_duohub_roadmap`: `F1a ✅ delivered`, mark `F1b ⏳ next`.
- Update `MEMORY.md` with reference to the completed F1a notes.

🎉 Foundation complete. F1b (vault), F2 (proposals), F3 (SEO tools), F4 (client portal) all build on top of this.
