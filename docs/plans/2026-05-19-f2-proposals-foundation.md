# F2 Proposals — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the data layer (Prisma schema), template registry pattern, render pipeline with escape & typed fields, parity check tests, and idempotent seed for the F2 Proposals module. After this plan lands, the renderer can produce HTML from one fully-implemented template (Desenquadramento) and CI guards against drift.

**Architecture:**
- Prisma migration adds 4 new models (`ProposalTemplate`, `ProposalTemplateVersion`, `Proposal`, `ProposalPublishedVersion`) plus enum extensions on `AuditAction`.
- `src/features/proposals/` houses the domain code. Each template is a self-contained folder under `templates/` with HTML, Zod schema, metadata, and default content.
- Templates registry pattern (`templateRegistry`) exposes only templates that have HTML/code support. The seed iterates this registry and upserts into the database.
- `renderTemplate(html, data, metadata)` is a pure function that replaces `{{path.to.field}}` placeholders by walking the data object and applying the field-type-specific renderer.
- A Vitest parity check verifies that placeholders in HTML, Zod schema paths, and metadata paths stay in sync, failing CI when they drift.

**Tech Stack:**
- Prisma 7 + Neon Postgres via `PrismaNeon` adapter
- Zod 4 (`z.discriminatedUnion`, `z.object`, `deepPartial`)
- Zod 4 built-in `z.toJSONSchema()` for `fieldsSchema` serialization
- Vitest + jsdom (existing stack)
- date-fns (existing stack). `date-fns-tz` will be added in the later public-link/expiration plan when timezone conversion is implemented.

**Linear:** [DUO-57 — F2.1 — Foundation: schema + renderer + Desenquadramento](https://linear.app/gvieiram/issue/DUO-57/f21-foundation-schema-renderer-desenquadramento) (parent: DUO-56 — F2: Propostas comerciais). Branch: `feat/DUO-57/proposals-foundation`.

**Scope of this plan (NOT in scope, see follow-up plans):**
- Admin CRUD + editor — Plan 2.
- Template default-content editor — Plan 3.
- Public link + cron — Plan 4.
- Second template (Reestruturação) — small follow-up after this plan lands (replicates Desenquadramento structure).

---

## File Structure

### Created
```
prisma/
└── seed.ts                                              # Entry point for pnpm db:seed (re-exports + composes)

src/features/proposals/
├── templates/
│   ├── index.ts                                         # templateRegistry
│   └── desenquadramento/
│       ├── template.html                                # HTML A4 with {{placeholders}}
│       ├── schema.ts                                    # Zod editableContentSchema
│       ├── metadata.ts                                  # fieldMetadata
│       ├── default-content.ts                           # initial values per field
│       └── index.ts                                     # exports { key, name, category, html, schema, metadata, defaultContent }
├── render.ts                                            # renderTemplate, renderField, getNested
├── escape.ts                                            # escapeHtml
├── format.ts                                            # formatBRL, formatDateBR
├── types.ts                                             # FieldKind, FieldMetadata, Template
├── seed.ts                                              # seedProposalTemplates (idempotent)
└── tests/
    ├── escape.test.ts
    ├── format.test.ts
    ├── render.test.ts
    └── parity.test.ts
```

### Modified
- `prisma/schema.prisma` — add 4 models, 3 enums, extend `AuditAction`.
- `package.json` — ensure `db:seed` script points to `prisma/seed.ts` if needed.

### Moved
- `docs/propostas/proposta_desenquadramento.html` → `src/features/proposals/templates/desenquadramento/template.html` (with placeholder substitutions).

---

## Tasks

### Task 1: Add Prisma enums for proposals

**Files:**
- Modify: `prisma/schema.prisma` (append after existing `ClientStatus` block)

- [ ] **Step 1: Add the three new enums**

Append to `prisma/schema.prisma`, after the existing `// === Audit log (F1a) ===` block or before it — order doesn't matter to Prisma:

```prisma
// === Proposals (F2) ===

enum ProposalTemplateKey {
  DESENQUADRAMENTO
  REESTRUTURACAO
  ABERTURA
  TRANSFERENCIA
  ENTREGA_ANUAL_MEI
  ANALISE_CONTABIL
}

enum ProposalTemplateCategory {
  CONTINUOUS
  ONE_OFF
}

enum ProposalStatus {
  DRAFT
  PUBLISHED
  SENT
  ACCEPTED
  DECLINED
  CANCELLED
  EXPIRED
}
```

- [ ] **Step 2: Format the schema**

Run:
```bash
pnpm prisma format
```

Expected: no errors. File reformatted in place.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(proposals): add ProposalTemplateKey/Category/Status enums"
```

---

### Task 2: Extend AuditAction enum

**Files:**
- Modify: `prisma/schema.prisma` (the `AuditAction` enum block, ending at `CLIENT_RESTORED`)

- [ ] **Step 1: Append the 8 new audit actions**

In `prisma/schema.prisma`, locate the `enum AuditAction { ... }` block and add the new values at the end (after `CLIENT_RESTORED`):

```prisma
enum AuditAction {
  USER_LOGIN_SUCCESS
  USER_LOGIN_FAILED
  USER_LOGOUT
  USER_ACCESS_DENIED
  MAGIC_LINK_SENT
  MAGIC_LINK_USED
  USER_INVITED
  USER_INVITE_RESENT
  USER_INVITE_CANCELLED
  USER_INVITE_ACCEPTED
  USER_REACTIVATED
  USER_REVOKED
  CLIENT_CREATED
  CLIENT_UPDATED
  CLIENT_DELETED
  CLIENT_RESTORED
  PROPOSAL_CREATED
  PROPOSAL_PUBLISHED
  PROPOSAL_MARKED_SENT
  PROPOSAL_ACCEPTED
  PROPOSAL_DECLINED
  PROPOSAL_CANCELLED
  PROPOSAL_TOKEN_ROTATED
  PROPOSAL_TEMPLATE_UPDATED
}
```

- [ ] **Step 2: Format**

```bash
pnpm prisma format
```

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(audit): add proposal audit actions"
```

---

### Task 3: Add ProposalTemplate + ProposalTemplateVersion models

**Files:**
- Modify: `prisma/schema.prisma` (append in the proposals section started by Task 1)

- [ ] **Step 1: Add both models**

Append to `prisma/schema.prisma`, after the enums from Task 1:

```prisma
model ProposalTemplate {
  id   String              @id @default(cuid())
  key  ProposalTemplateKey @unique
  name String
  category ProposalTemplateCategory
  isActive Boolean         @default(true)

  currentVersionId String?  @unique
  currentVersion   ProposalTemplateVersion? @relation("CurrentVersion", fields: [currentVersionId], references: [id], onDelete: SetNull)

  versions  ProposalTemplateVersion[] @relation("TemplateVersions")
  proposals Proposal[]

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ProposalTemplateVersion {
  id         String @id @default(cuid())
  templateId String
  template   ProposalTemplate @relation("TemplateVersions", fields: [templateId], references: [id], onDelete: Cascade)

  version        Int
  fieldsSchema   Json
  defaultContent Json

  createdById String
  createdBy   User @relation("ProposalTemplateVersionsCreated", fields: [createdById], references: [id], onDelete: Restrict)
  createdAt   DateTime @default(now())

  currentOf ProposalTemplate? @relation("CurrentVersion")
  proposals Proposal[]

  @@unique([templateId, version])
  @@index([templateId])
}
```

- [ ] **Step 2: Format**

```bash
pnpm prisma format
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(proposals): add ProposalTemplate and ProposalTemplateVersion models"
```

---

### Task 4: Add Proposal + ProposalPublishedVersion models

**Files:**
- Modify: `prisma/schema.prisma` (append after Task 3 models)

- [ ] **Step 1: Add both models**

Append to `prisma/schema.prisma`:

```prisma
model Proposal {
  id String @id @default(cuid())

  templateId        String
  template          ProposalTemplate @relation(fields: [templateId], references: [id], onDelete: Restrict)
  templateVersionId String
  templateVersion   ProposalTemplateVersion @relation(fields: [templateVersionId], references: [id], onDelete: Restrict)

  clientId     String?
  client       Client? @relation(fields: [clientId], references: [id], onDelete: SetNull)
  prospectData Json?

  editableContent Json @default("{}")

  mainAmount      Decimal? @db.Decimal(12, 2)
  recurringAmount Decimal? @db.Decimal(12, 2)
  currency        String   @default("BRL")
  commercialData  Json     @default("{}")

  status    ProposalStatus @default(DRAFT)
  expiresAt DateTime?

  publicTokenHash String?   @unique
  firstViewedAt   DateTime?
  lastViewedAt    DateTime?

  createdById String
  createdBy   User @relation("ProposalsCreated", fields: [createdById], references: [id], onDelete: Restrict)

  cancelledAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  publishedVersions ProposalPublishedVersion[]

  @@index([status, createdAt])
  @@index([clientId])
  @@index([status, expiresAt])
}

model ProposalPublishedVersion {
  id         String   @id @default(cuid())
  proposalId String
  proposal   Proposal @relation(fields: [proposalId], references: [id], onDelete: Cascade)

  version         Int
  templateKey     ProposalTemplateKey
  templateVersion Int
  snapshot        Json
  renderedHtml    String @db.Text

  publishedById String
  publishedBy   User @relation("ProposalsPublished", fields: [publishedById], references: [id], onDelete: Restrict)
  publishedAt   DateTime @default(now())

  @@unique([proposalId, version])
  @@index([proposalId])
}
```

- [ ] **Step 2: Add reverse relations on User**

Locate the existing `model User { ... }` in `prisma/schema.prisma` and add these three relation lines at the appropriate place inside the model (next to other reverse relations):

```prisma
  proposalsCreated             Proposal[]                @relation("ProposalsCreated")
  proposalsPublished           ProposalPublishedVersion[] @relation("ProposalsPublished")
  proposalTemplateVersions     ProposalTemplateVersion[]  @relation("ProposalTemplateVersionsCreated")
```

- [ ] **Step 3: Format**

```bash
pnpm prisma format
```

Expected: no errors. If Prisma complains about missing reverse relations, double-check Step 2.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(proposals): add Proposal and ProposalPublishedVersion models"
```

---

### Task 5: Generate and apply the migration

**Files:**
- Create: `prisma/migrations/<timestamp>_f2_proposals_foundation/migration.sql`

- [ ] **Step 1: Run prisma migrate dev**

```bash
pnpm prisma migrate dev --name f2_proposals_foundation
```

Expected:
- Prisma generates a new migration file under `prisma/migrations/<timestamp>_f2_proposals_foundation/`.
- Applies it to the local Neon dev branch.
- Regenerates the Prisma client.

- [ ] **Step 2: Verify the migration**

Inspect the generated SQL file:

```bash
ls prisma/migrations/ | tail -1
```

Open the latest migration's `migration.sql` and confirm it contains:
- `CREATE TYPE "ProposalTemplateKey"` (and the two other enums).
- `ALTER TYPE "AuditAction" ADD VALUE 'PROPOSAL_CREATED'` (and 7 more `ADD VALUE` lines).
- `CREATE TABLE "ProposalTemplate"`, `"ProposalTemplateVersion"`, `"Proposal"`, `"ProposalPublishedVersion"`.
- `CREATE INDEX` lines matching the `@@index` declarations.

- [ ] **Step 3: Sanity check the client**

```bash
pnpm tsc --noEmit
```

Expected: no errors. The Prisma client now exports types for the new models.

- [ ] **Step 4: Commit the migration**

```bash
git add prisma/migrations/
git commit -m "feat(proposals): apply foundation migration"
```

---

### Task 6: Confirm Zod 4 JSON Schema API

**Files:**
- No file changes

- [ ] **Step 1: Confirm the project uses Zod 4**

```bash
pnpm list zod
```

Expected: `zod@4.x`.

- [ ] **Step 2: Use Zod's built-in JSON Schema conversion**

Do not add `zod-to-json-schema`. Zod 4 exposes `z.toJSONSchema(schema)`, which is the canonical API for this project.

- [ ] **Step 3: Continue without a commit**

No files change in this task. Continue to Task 7.

---

### Task 7: Domain types module

**Files:**
- Create: `src/features/proposals/types.ts`

- [ ] **Step 1: Write the types**

Create `src/features/proposals/types.ts`:

```ts
import type { z } from "zod";

export type FieldKind = "text" | "multiline" | "currency" | "date" | "list";

export type FieldMetadata = Record<
	string,
	{
		kind: FieldKind;
		label: string;
		section: string;
		required?: boolean;
		itemLabel?: string; // for `list` kind, label of each item
	}
>;

export type Template<TSchema extends z.ZodTypeAny = z.ZodTypeAny> = {
	key:
		| "DESENQUADRAMENTO"
		| "REESTRUTURACAO"
		| "ABERTURA"
		| "TRANSFERENCIA"
		| "ENTREGA_ANUAL_MEI"
		| "ANALISE_CONTABIL";
	name: string;
	category: "CONTINUOUS" | "ONE_OFF";
	html: string;
	schema: TSchema;
	metadata: FieldMetadata;
	defaultContent: z.infer<TSchema>;
};

/** Data shape passed to renderTemplate. Templates reference these namespaces in placeholders. */
export type RenderData = {
	client: {
		name: string;
		document: string; // formatted CPF/CNPJ
		contact?: string;
		email?: string;
		phone?: string;
	};
	commercial: {
		mainAmount?: number;
		recurringAmount?: number;
		currency: string;
		paymentTerms?: string;
		[key: string]: unknown;
	};
	content: Record<string, unknown>; // editableContent
	proposal: {
		expiresAt?: Date;
	};
};
```

- [ ] **Step 2: Verify types compile**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/types.ts
git commit -m "feat(proposals): add domain types (Template, FieldKind, RenderData)"
```

---

### Task 8: escapeHtml — TDD

**Files:**
- Create: `src/features/proposals/escape.ts`
- Create: `src/features/proposals/tests/escape.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/escape.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { escapeHtml } from "../escape";

describe("escapeHtml", () => {
	it("escapes ampersand", () => {
		expect(escapeHtml("a & b")).toBe("a &amp; b");
	});

	it("escapes angle brackets", () => {
		expect(escapeHtml("<script>alert(1)</script>")).toBe(
			"&lt;script&gt;alert(1)&lt;/script&gt;",
		);
	});

	it("escapes double and single quotes", () => {
		expect(escapeHtml(`"hello" 'world'`)).toBe("&quot;hello&quot; &#39;world&#39;");
	});

	it("escapes all five characters in a single string", () => {
		expect(escapeHtml(`<a href="x" data-x='y' />&`)).toBe(
			"&lt;a href=&quot;x&quot; data-x=&#39;y&#39; /&gt;&amp;",
		);
	});

	it("returns empty string for empty input", () => {
		expect(escapeHtml("")).toBe("");
	});

	it("does not double-escape", () => {
		expect(escapeHtml("&amp;")).toBe("&amp;amp;");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/features/proposals/tests/escape.test.ts
```

Expected: FAIL with "Cannot find module '../escape'" (file does not exist yet).

- [ ] **Step 3: Implement escapeHtml**

Create `src/features/proposals/escape.ts`:

```ts
const HTML_ESCAPES: Record<string, string> = {
	"&": "&amp;",
	"<": "&lt;",
	">": "&gt;",
	'"': "&quot;",
	"'": "&#39;",
};

export function escapeHtml(input: string): string {
	return input.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/features/proposals/tests/escape.test.ts
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/escape.ts src/features/proposals/tests/escape.test.ts
git commit -m "feat(proposals): add escapeHtml helper"
```

---

### Task 9: format helpers — TDD

**Files:**
- Create: `src/features/proposals/format.ts`
- Create: `src/features/proposals/tests/format.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/format.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatBRL, formatDateBR } from "../format";

describe("formatBRL", () => {
	it("formats integer as BRL", () => {
		expect(formatBRL(1500)).toBe("R$ 1.500,00");
	});

	it("formats decimal as BRL with 2 places", () => {
		expect(formatBRL(1234.5)).toBe("R$ 1.234,50");
	});

	it("formats zero as BRL", () => {
		expect(formatBRL(0)).toBe("R$ 0,00");
	});

	it("formats large value as BRL with grouping", () => {
		expect(formatBRL(1234567.89)).toBe("R$ 1.234.567,89");
	});

	it("returns empty string for null", () => {
		expect(formatBRL(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(formatBRL(undefined)).toBe("");
	});
});

describe("formatDateBR", () => {
	it("formats Date to dd/MM/yyyy", () => {
		expect(formatDateBR(new Date("2026-05-19T12:00:00Z"))).toBe("19/05/2026");
	});

	it("formats ISO string to dd/MM/yyyy", () => {
		expect(formatDateBR("2026-12-31T23:59:59Z")).toBe("31/12/2026");
	});

	it("returns empty string for null", () => {
		expect(formatDateBR(null)).toBe("");
	});

	it("returns empty string for undefined", () => {
		expect(formatDateBR(undefined)).toBe("");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/features/proposals/tests/format.test.ts
```

Expected: FAIL with "Cannot find module '../format'".

- [ ] **Step 3: Implement format helpers**

Create `src/features/proposals/format.ts`:

```ts
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
	style: "currency",
	currency: "BRL",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

export function formatBRL(value: number | null | undefined): string {
	if (value === null || value === undefined) return "";
	return BRL_FORMATTER.format(value);
}

export function formatDateBR(
	value: Date | string | null | undefined,
): string {
	if (value === null || value === undefined) return "";
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return format(date, "dd/MM/yyyy", { locale: ptBR });
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/features/proposals/tests/format.test.ts
```

Expected: 10 passed.

Note: `Intl.NumberFormat` on Node may produce `"R$ 1.500,00"` (non-breaking space). If the test fails with whitespace diff, update the test expectations to use ` ` instead of regular space:

```ts
expect(formatBRL(1500)).toBe(`R$ 1.500,00`);
```

Apply this substitution to all `formatBRL` assertions if the first run reveals it.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/format.ts src/features/proposals/tests/format.test.ts
git commit -m "feat(proposals): add formatBRL and formatDateBR helpers"
```

---

### Task 10: renderTemplate — TDD

**Files:**
- Create: `src/features/proposals/render.ts`
- Create: `src/features/proposals/tests/render.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/features/proposals/tests/render.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { FieldMetadata } from "../types";
import { getNested, renderField, renderTemplate } from "../render";

describe("getNested", () => {
	it("returns top-level value", () => {
		expect(getNested({ a: 1 }, "a")).toBe(1);
	});

	it("returns nested value", () => {
		expect(getNested({ a: { b: { c: "x" } } }, "a.b.c")).toBe("x");
	});

	it("returns undefined for missing path", () => {
		expect(getNested({ a: 1 }, "b")).toBeUndefined();
		expect(getNested({ a: { b: 1 } }, "a.c")).toBeUndefined();
	});

	it("returns undefined for null intermediate", () => {
		expect(getNested({ a: null }, "a.b")).toBeUndefined();
	});
});

describe("renderField", () => {
	it("renders text with escape", () => {
		expect(renderField("a <b>", "text")).toBe("a &lt;b&gt;");
	});

	it("renders multiline with <br> for newlines", () => {
		expect(renderField("line1\nline2", "multiline")).toBe("line1<br>line2");
	});

	it("renders multiline with escape applied before <br>", () => {
		expect(renderField("<a>\n<b>", "multiline")).toBe("&lt;a&gt;<br>&lt;b&gt;");
	});

	it("renders currency as BRL", () => {
		const output = renderField(1500, "currency");
		expect(output).toMatch(/R\$.*1\.500,00/);
	});

	it("renders date as dd/MM/yyyy", () => {
		expect(renderField(new Date("2026-05-19T12:00:00Z"), "date")).toBe("19/05/2026");
	});

	it("renders list as <ul><li>", () => {
		expect(renderField(["a", "b <c>"], "list")).toBe(
			"<ul><li>a</li><li>b &lt;c&gt;</li></ul>",
		);
	});

	it("renders null/undefined as empty string", () => {
		expect(renderField(null, "text")).toBe("");
		expect(renderField(undefined, "multiline")).toBe("");
		expect(renderField(null, "list")).toBe("");
	});

	it("renders non-array as empty for list kind", () => {
		expect(renderField("not-an-array", "list")).toBe("");
	});
});

describe("renderTemplate", () => {
	const metadata: FieldMetadata = {
		"content.greeting": { kind: "text", label: "Saudação", section: "intro" },
		"content.body": { kind: "multiline", label: "Corpo", section: "intro" },
		"commercial.mainAmount": { kind: "currency", label: "Valor", section: "comercial" },
	};

	it("replaces a single placeholder", () => {
		const html = "<p>{{content.greeting}}</p>";
		const data = {
			content: { greeting: "Olá" },
			commercial: {},
			client: {},
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe("<p>Olá</p>");
	});

	it("replaces multiple placeholders", () => {
		const html =
			"<p>{{content.greeting}}, valor {{commercial.mainAmount}}</p>";
		const data = {
			content: { greeting: "Olá" },
			commercial: { mainAmount: 1500 },
			client: {},
			proposal: {},
		};
		const result = renderTemplate(html, data, metadata);
		expect(result).toContain("<p>Olá, valor R$");
		expect(result).toContain("1.500,00");
	});

	it("escapes user content in text fields", () => {
		const html = "<p>{{content.greeting}}</p>";
		const data = {
			content: { greeting: "<script>x</script>" },
			commercial: {},
			client: {},
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe(
			"<p>&lt;script&gt;x&lt;/script&gt;</p>",
		);
	});

	it("renders multiline with <br>", () => {
		const html = "<p>{{content.body}}</p>";
		const data = {
			content: { body: "linha1\nlinha2" },
			commercial: {},
			client: {},
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe(
			"<p>linha1<br>linha2</p>",
		);
	});

	it("renders empty string for missing data", () => {
		const html = "<p>{{content.greeting}}</p>";
		const data = { content: {}, commercial: {}, client: {}, proposal: {} };
		expect(renderTemplate(html, data, metadata)).toBe("<p></p>");
	});

	it("defaults to text kind when metadata is missing for placeholder", () => {
		const html = "<p>{{client.name}}</p>";
		const data = {
			content: {},
			commercial: {},
			client: { name: "<b>Acme</b>" },
			proposal: {},
		};
		expect(renderTemplate(html, data, metadata)).toBe(
			"<p>&lt;b&gt;Acme&lt;/b&gt;</p>",
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test src/features/proposals/tests/render.test.ts
```

Expected: FAIL with "Cannot find module '../render'".

- [ ] **Step 3: Implement render module**

Create `src/features/proposals/render.ts`:

```ts
import { escapeHtml } from "./escape";
import { formatBRL, formatDateBR } from "./format";
import type { FieldKind, FieldMetadata } from "./types";

export function getNested(obj: unknown, path: string): unknown {
	const keys = path.split(".");
	let current: unknown = obj;
	for (const key of keys) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

export function renderField(value: unknown, kind: FieldKind): string {
	if (value === null || value === undefined) return "";

	switch (kind) {
		case "text":
			return escapeHtml(String(value));
		case "multiline":
			return escapeHtml(String(value)).replace(/\n/g, "<br>");
		case "currency":
			return formatBRL(typeof value === "number" ? value : Number(value));
		case "date":
			return formatDateBR(value as Date | string);
		case "list":
			if (!Array.isArray(value)) return "";
			return `<ul>${value
				.map((item) => `<li>${escapeHtml(String(item))}</li>`)
				.join("")}</ul>`;
	}
}

export function renderTemplate(
	html: string,
	data: Record<string, unknown>,
	metadata: FieldMetadata,
): string {
	return html.replace(/\{\{([\w.]+)\}\}/g, (_match, path: string) => {
		const value = getNested(data, path);
		const kind = metadata[path]?.kind ?? "text";
		return renderField(value, kind);
	});
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test src/features/proposals/tests/render.test.ts
```

Expected: all tests pass (20 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/render.ts src/features/proposals/tests/render.test.ts
git commit -m "feat(proposals): add renderTemplate, renderField, getNested"
```

---

### Task 11: Move and parameterize Desenquadramento HTML

**Files:**
- Move: `docs/propostas/proposta_desenquadramento.html` → `src/features/proposals/templates/desenquadramento/template.html`

- [ ] **Step 1: Move the file**

```bash
mkdir -p src/features/proposals/templates/desenquadramento
git mv docs/propostas/proposta_desenquadramento.html src/features/proposals/templates/desenquadramento/template.html
```

- [ ] **Step 2: Replace hardcoded client/commercial data with placeholders**

Open `src/features/proposals/templates/desenquadramento/template.html` and apply these exact substitutions (use search/replace in your editor; verify each one by reading the surrounding context):

| Hardcoded text → | Replace with placeholder |
| --- | --- |
| `<span>Cristhiellen da Cruz Mourão</span>` (inside `info-row client` for "Contratante") | `<span>{{client.name}}</span>` |
| `<span>48 99184-7252</span>` (inside `info-row client` for "Contato") | `<span>{{client.contact}}</span>` |
| `<span>69.968.113/0001-03</span>` (inside `info-row client` for "CNPJ/CPF") | `<span>{{client.document}}</span>` |
| In `.summary-text`: the entire literal sentence starting with `Esta proposta contempla o desenquadramento do MEI...` and ending `...garantindo total eficiência ao negócio.` | `{{content.summary.text}}` |
| `<span class="num">R$ 500</span>` (first `val-box`) followed by `<div class="desc">Restruturação · Valor único</div>` — the `R$ 500` value | `<span class="num">{{commercial.mainAmount}}</span>` |
| `<span class="num">R$ 400</span>` (second `val-box`) | `<span class="num">{{commercial.recurringAmount}}</span>` |
| `<div class="bp-value">Prestador de Serviço</div>` (Modalidade badge) | `<div class="bp-value">{{content.budget.modality}}</div>` |
| `<div class="bp-value">R$ 30.000,00</div>` (Faturamento Mensal badge) | `<div class="bp-value">{{content.budget.monthlyRevenue}}</div>` |
| `<td>Emissão de até 5 notas fiscais</td>` | `<td>{{content.budget.invoiceLimitDescription}}</td>` |
| In `<tfoot>`: `<td>R$ 400,00</td>` | `<td>{{commercial.recurringAmount}}</td>` |
| In `.extra-section`: `<div class="extra-title">Desenquadramento: MEI para ME</div>` | `<div class="extra-title">{{content.extra.title}}</div>` |
| `<div class="extra-desc" ...>Processo necessário para regularização como Microempresa.</div>` (inner text) | `{{content.extra.description}}` |
| `<div class="ph-value">R$ 1.200,00</div>` (price highlight) | `<div class="ph-value">{{commercial.mainAmount}}</div>` |
| `<div class="pr-value">Á Vista ou em 3 Parcelas</div>` (Forma de Pagamento) | `<div class="pr-value">{{commercial.paymentTerms}}</div>` |
| In Condições Gerais `<ul>`: `<li>Esta proposta tem validade de <strong>15 dias</strong> a partir da data de envio.</li>` | `<li>Esta proposta tem validade de <strong>{{content.terms.validityText}}</strong> a partir da data de envio.</li>` |
| `<li>A mensalidade será cobrada todo dia <strong>15</strong> de cada mês via Pix.</li>` | `<li>A mensalidade será cobrada todo dia <strong>{{content.terms.billingDay}}</strong> de cada mês via Pix.</li>` |
| `<li>Rescisão com aviso prévio de <strong>30 dias</strong> por qualquer das partes.</li>` | `<li>Rescisão com aviso prévio de <strong>{{content.terms.noticePeriod}}</strong> por qualquer das partes.</li>` |

Keep all other hardcoded text as-is (DuoHub CNPJ, DuoHub contact, scope cards, fixed page structure). DuoHub-side data is template-fixed, not per-proposal.

- [ ] **Step 3: Verify the file parses as valid HTML**

```bash
node -e "const fs = require('fs'); const html = fs.readFileSync('src/features/proposals/templates/desenquadramento/template.html', 'utf-8'); console.log('length:', html.length); console.log('placeholders:', [...html.matchAll(/\{\{([\w.]+)\}\}/g)].map(m => m[1]).join(', '));"
```

Expected: prints the file length (>20000 chars) and a comma-separated list of placeholder paths. Verify the list contains exactly these 16 unique paths (some appear twice — `commercial.mainAmount` and `commercial.recurringAmount`):

- `client.name`
- `client.contact`
- `client.document`
- `commercial.mainAmount` (appears 2x)
- `commercial.recurringAmount` (appears 2x)
- `commercial.paymentTerms`
- `content.summary.text`
- `content.budget.modality`
- `content.budget.monthlyRevenue`
- `content.budget.invoiceLimitDescription`
- `content.extra.title`
- `content.extra.description`
- `content.terms.validityText`
- `content.terms.billingDay`
- `content.terms.noticePeriod`

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/templates/desenquadramento/template.html docs/propostas/
git commit -m "feat(proposals): move desenquadramento HTML to features and add placeholders"
```

---

### Task 12: Desenquadramento Zod schema

**Files:**
- Create: `src/features/proposals/templates/desenquadramento/schema.ts`

- [ ] **Step 1: Write the schema**

Create `src/features/proposals/templates/desenquadramento/schema.ts`:

```ts
import { z } from "zod";

export const editableContentSchema = z.object({
	summary: z.object({
		text: z.string().min(20),
	}),
	budget: z.object({
		modality: z.string().min(1),
		monthlyRevenue: z.string().min(1),
		invoiceLimitDescription: z.string().min(1),
	}),
	extra: z.object({
		title: z.string().min(1),
		description: z.string().min(1),
	}),
	terms: z.object({
		validityText: z.string().min(1),
		billingDay: z.string().min(1),
		noticePeriod: z.string().min(1),
	}),
});

export type EditableContent = z.infer<typeof editableContentSchema>;

/** All paths in `content.*` that the template references. Keep in sync with template.html. */
export const SCHEMA_PATHS = [
	"content.summary.text",
	"content.budget.modality",
	"content.budget.monthlyRevenue",
	"content.budget.invoiceLimitDescription",
	"content.extra.title",
	"content.extra.description",
	"content.terms.validityText",
	"content.terms.billingDay",
	"content.terms.noticePeriod",
] as const;
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/templates/desenquadramento/schema.ts
git commit -m "feat(proposals): add desenquadramento Zod schema"
```

---

### Task 13: Desenquadramento metadata

**Files:**
- Create: `src/features/proposals/templates/desenquadramento/metadata.ts`

- [ ] **Step 1: Write the metadata**

Create `src/features/proposals/templates/desenquadramento/metadata.ts`:

```ts
import type { FieldMetadata } from "../../types";

export const metadata: FieldMetadata = {
	"content.summary.text": {
		kind: "multiline",
		label: "Resumo da proposta",
		section: "summary",
		required: true,
	},
	"content.budget.modality": {
		kind: "text",
		label: "Modalidade",
		section: "budget",
		required: true,
	},
	"content.budget.monthlyRevenue": {
		kind: "text",
		label: "Faturamento mensal estimado",
		section: "budget",
		required: true,
	},
	"content.budget.invoiceLimitDescription": {
		kind: "text",
		label: "Descrição do limite de notas fiscais",
		section: "budget",
		required: true,
	},
	"content.extra.title": {
		kind: "text",
		label: "Título do serviço pontual",
		section: "extra",
		required: true,
	},
	"content.extra.description": {
		kind: "multiline",
		label: "Descrição do serviço pontual",
		section: "extra",
		required: true,
	},
	"content.terms.validityText": {
		kind: "text",
		label: "Texto de validade",
		section: "terms",
		required: true,
	},
	"content.terms.billingDay": {
		kind: "text",
		label: "Dia de cobrança",
		section: "terms",
		required: true,
	},
	"content.terms.noticePeriod": {
		kind: "text",
		label: "Aviso prévio de rescisão",
		section: "terms",
		required: true,
	},
};
```

- [ ] **Step 2: Verify it compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/templates/desenquadramento/metadata.ts
git commit -m "feat(proposals): add desenquadramento field metadata"
```

---

### Task 14: Desenquadramento default content

**Files:**
- Create: `src/features/proposals/templates/desenquadramento/default-content.ts`

- [ ] **Step 1: Write defaults**

Create `src/features/proposals/templates/desenquadramento/default-content.ts`:

```ts
import type { EditableContent } from "./schema";

export const defaultContent: EditableContent = {
	summary: {
		text: "Esta proposta contempla o desenquadramento do MEI. O investimento inicial para regularizar a sua empresa é de R$ 1.200,00 (valor único). Após essa etapa, você contratará o serviço de contabilidade por R$ 400,00 mensais, que inclui toda obrigação contábil e fiscal necessária, garantindo total eficiência ao negócio.",
	},
	budget: {
		modality: "Prestador de Serviço",
		monthlyRevenue: "R$ 30.000,00",
		invoiceLimitDescription: "Emissão de até 5 notas fiscais",
	},
	extra: {
		title: "Desenquadramento: MEI para ME",
		description:
			"Processo necessário para regularização como Microempresa. O desenquadramento é pré-requisito para o início dos serviços de contabilidade mensal. Este serviço é realizado uma única vez e garante sua regularização junto aos órgãos competentes.",
	},
	terms: {
		validityText: "15 dias",
		billingDay: "15",
		noticePeriod: "30 dias",
	},
};
```

- [ ] **Step 2: Verify it compiles and the defaults pass strict schema**

Create a quick check inline:

```bash
pnpm tsc --noEmit
```

Expected: no errors. (The type annotation `EditableContent` ensures the shape matches at compile time.)

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/templates/desenquadramento/default-content.ts
git commit -m "feat(proposals): add desenquadramento default content"
```

---

### Task 15: Desenquadramento index + template registry

**Files:**
- Create: `src/features/proposals/templates/desenquadramento/index.ts`
- Create: `src/features/proposals/templates/index.ts`

- [ ] **Step 1: Read the HTML file at module load time**

Create `src/features/proposals/templates/desenquadramento/index.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Template } from "../../types";
import { defaultContent } from "./default-content";
import { metadata } from "./metadata";
import { editableContentSchema } from "./schema";

const html = readFileSync(join(__dirname, "template.html"), "utf-8");

export const desenquadramento: Template<typeof editableContentSchema> = {
	key: "DESENQUADRAMENTO",
	name: "Desenquadramento",
	category: "CONTINUOUS",
	html,
	schema: editableContentSchema,
	metadata,
	defaultContent,
};
```

- [ ] **Step 2: Create the registry**

Create `src/features/proposals/templates/index.ts`:

```ts
import { desenquadramento } from "./desenquadramento";

export const templateRegistry = {
	DESENQUADRAMENTO: desenquadramento,
} as const;

export type RegisteredTemplate =
	(typeof templateRegistry)[keyof typeof templateRegistry];

export const allTemplates = Object.values(templateRegistry);
```

- [ ] **Step 3: Verify compilation**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/templates/desenquadramento/index.ts src/features/proposals/templates/index.ts
git commit -m "feat(proposals): wire desenquadramento into template registry"
```

---

### Task 16: Parity check test

**Files:**
- Create: `src/features/proposals/tests/parity.test.ts`

- [ ] **Step 1: Write the parity check**

Create `src/features/proposals/tests/parity.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { allTemplates } from "../templates";

/** Extracts all `{{path}}` placeholders from an HTML string, deduplicated. */
function extractPlaceholders(html: string): string[] {
	const matches = html.matchAll(/\{\{([\w.]+)\}\}/g);
	const set = new Set<string>();
	for (const m of matches) {
		set.add(m[1]);
	}
	return Array.from(set).sort();
}

/** Walks a Zod object schema and returns all leaf paths, prefixed by `prefix`. */
function flattenZodPaths(schema: z.ZodTypeAny, prefix = "content"): string[] {
	if (schema instanceof z.ZodObject) {
		const shape = schema.shape as Record<string, z.ZodTypeAny>;
		return Object.entries(shape).flatMap(([key, child]) =>
			flattenZodPaths(child, prefix ? `${prefix}.${key}` : key),
		);
	}
	return [prefix];
}

describe("template parity", () => {
	it.each(allTemplates)(
		"$key — placeholders, schema, and metadata stay in sync",
		(template) => {
			const placeholders = extractPlaceholders(template.html);
			const schemaPaths = flattenZodPaths(template.schema).sort();
			const metadataPaths = Object.keys(template.metadata).sort();

			// Schema and metadata must declare exactly the same `content.*` paths
			expect(metadataPaths).toEqual(schemaPaths);

			// Every `content.*` placeholder in HTML must be declared in schema/metadata
			const contentPlaceholders = placeholders
				.filter((p) => p.startsWith("content."))
				.sort();
			expect(contentPlaceholders).toEqual(schemaPaths);

			// Every `content.*` schema path must appear in the HTML
			for (const path of schemaPaths) {
				expect(template.html).toContain(`{{${path}}}`);
			}
		},
	);

	it.each(allTemplates)(
		"$key — defaultContent satisfies the schema",
		(template) => {
			const result = template.schema.safeParse(template.defaultContent);
			if (!result.success) {
				console.error(result.error.flatten());
			}
			expect(result.success).toBe(true);
		},
	);
});
```

- [ ] **Step 2: Run the parity test**

```bash
pnpm test src/features/proposals/tests/parity.test.ts
```

Expected: both tests pass for `DESENQUADRAMENTO`.

If parity fails:
- "Cannot find expected placeholder `content.X.Y`" → the HTML lacks the placeholder; check Task 11 substitutions.
- "Schema/metadata mismatch" → schema (Task 12) and metadata (Task 13) declare different paths; reconcile.
- "defaultContent does not satisfy schema" → defaults (Task 14) miss a field or have wrong type; reconcile.

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/tests/parity.test.ts
git commit -m "test(proposals): add parity check between HTML, schema, and metadata"
```

---

### Task 17: Seed module for proposal templates

**Files:**
- Create: `src/features/proposals/seed.ts`
- Create: `prisma/seed.ts` (entry point composing existing + new seed)

- [ ] **Step 1: Write the proposals seed function**

Create `src/features/proposals/seed.ts`:

```ts
import { z } from "zod";
import type { PrismaClient } from "@/generated/prisma/client";
import { allTemplates } from "./templates";

/**
 * Upserts ProposalTemplate rows and creates initial v1 ProposalTemplateVersion
 * for templates that don't have a version yet. Idempotent.
 */
export async function seedProposalTemplates(opts: {
	db: PrismaClient;
	systemUserId: string;
}): Promise<void> {
	const { db, systemUserId } = opts;

	for (const t of allTemplates) {
		const template = await db.proposalTemplate.upsert({
			where: { key: t.key },
			update: { name: t.name, category: t.category },
			create: {
				key: t.key,
				name: t.name,
				category: t.category,
				isActive: true,
			},
		});

		const existingVersion = await db.proposalTemplateVersion.findFirst({
			where: { templateId: template.id },
			orderBy: { version: "desc" },
		});

		if (existingVersion) {
			console.log(
				`✓ Template ${t.key} already has version ${existingVersion.version}. Skipping.`,
			);
			continue;
		}

		const fieldsSchema = z.toJSONSchema(t.schema);

		const version = await db.proposalTemplateVersion.create({
			data: {
				templateId: template.id,
				version: 1,
				fieldsSchema: fieldsSchema as object,
				defaultContent: t.defaultContent as object,
				createdById: systemUserId,
			},
		});

		await db.proposalTemplate.update({
			where: { id: template.id },
			data: { currentVersionId: version.id },
		});

		console.log(`✓ Seeded template ${t.key} with version 1.`);
	}
}
```

- [ ] **Step 2: Write the seed entry point**

Create `prisma/seed.ts`:

```ts
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { seedProposalTemplates } from "../src/features/proposals/seed";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error(
		"DATABASE_URL is not set. Add it to your .env before running this seed.",
	);
}

const systemUserEmail = process.env.INITIAL_ADMIN_EMAIL;
if (!systemUserEmail) {
	throw new Error(
		"INITIAL_ADMIN_EMAIL is not set. Required to attribute the initial template version.",
	);
}

const adapter = new PrismaNeon({ connectionString });
const db = new PrismaClient({ adapter });

async function main() {
	const admin = await db.user.findUnique({ where: { email: systemUserEmail } });
	if (!admin) {
		throw new Error(
			`Admin user with email ${systemUserEmail} not found. Run pnpm db:seed:admin first.`,
		);
	}

	await seedProposalTemplates({ db, systemUserId: admin.id });

	console.log("✓ Proposals seed complete.");
}

main()
	.catch((err) => {
		console.error("Seed failed:", err);
		process.exit(1);
	})
	.finally(async () => {
		await db.$disconnect();
	});
```

- [ ] **Step 3: Verify the seed script path in package.json**

Open `package.json` and confirm the `db:seed` script:

```json
"db:seed": "npx tsx prisma/seed.ts",
```

If it already points to `prisma/seed.ts`, no change. If it points elsewhere, update it. Run:

```bash
grep '"db:seed"' package.json
```

- [ ] **Step 4: Verify compilation**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/seed.ts prisma/seed.ts package.json
git commit -m "feat(proposals): add idempotent template seed"
```

---

### Task 18: Run the seed and verify

**Files:**
- (no files modified)

- [ ] **Step 1: Run the admin seed first**

If the admin user does not exist locally yet:

```bash
pnpm db:seed:admin
```

Expected: `✓ Admin <email> created.` or `✓ Admin <email> already exists. Skipping.`

- [ ] **Step 2: Run the proposals seed**

```bash
pnpm db:seed
```

Expected output:
```
✓ Seeded template DESENQUADRAMENTO with version 1.
✓ Proposals seed complete.
```

- [ ] **Step 3: Verify in the database**

Run a Prisma query to confirm:

```bash
node --env-file=.env --import tsx -e "
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from './src/generated/prisma/client';
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });
const templates = await db.proposalTemplate.findMany({ include: { currentVersion: true } });
console.log(JSON.stringify(templates, null, 2));
await db.\$disconnect();
"
```

Expected: array with 1 item, `key: 'DESENQUADRAMENTO'`, `isActive: true`, `currentVersion.version: 1`, and `currentVersion.fieldsSchema` containing JSON Schema reflecting the Zod shape.

- [ ] **Step 4: Run seed again to confirm idempotency**

```bash
pnpm db:seed
```

Expected output:
```
✓ Template DESENQUADRAMENTO already has version 1. Skipping.
✓ Proposals seed complete.
```

No duplicate version created.

- [ ] **Step 5: Run the full test suite**

```bash
pnpm test
```

Expected: all tests pass (existing + new proposals tests).

- [ ] **Step 6: Run the linter**

```bash
pnpm lint
```

Expected: no errors. If Biome complains about unused exports or import order, fix and re-run.

- [ ] **Step 7: Final commit (verification record)**

If any lint fixes were applied:

```bash
git add -A
git commit -m "chore(proposals): apply lint fixes after seed verification"
```

If everything was clean, no commit needed — this step is just verification.

---

## Self-Review Checklist

After implementation, verify:

**Spec coverage (against `docs/superpowers/specs/2026-05-18-f2-proposals-design.md`):**
- [x] Enums: `ProposalTemplateKey`, `ProposalTemplateCategory`, `ProposalStatus` — Task 1
- [x] `AuditAction` extensions — Task 2
- [x] `ProposalTemplate` model with `currentVersionId` — Task 3
- [x] `ProposalTemplateVersion` with `fieldsSchema` + `defaultContent` — Task 3
- [x] `Proposal` model with promoted columns (`mainAmount`, `recurringAmount`, `currency`) + 3 indices — Task 4
- [x] `ProposalPublishedVersion` with `snapshot` JSON + `renderedHtml String @db.Text` column (decision 15) — Task 4
- [x] Templates as HTML + `{{placeholders}}` (decision 13) — Task 11
- [x] Field types `text`/`multiline`/`currency`/`date`/`list` (decision 14) — Tasks 9, 10
- [x] Escape uniforme — Task 8
- [x] Parity check no build (decision 13) — Task 16
- [x] Registry + seed idempotente (decision 18) — Tasks 15, 17, 18

**Not covered (intentionally out of scope, see Plan 2/3/4):**
- Server Actions for proposals (Plan 2)
- Admin UI / routes (Plan 2)
- Public link (Plan 4)
- Cron (Plan 4)
- Template editor (Plan 3)
- Second template Reestruturação (small follow-up after Plan 1 lands)

**No placeholders in plan**: every code block contains real code; every step has either a command with expected output or a file edit with exact content. ✓

**Type consistency**:
- `FieldKind` defined in `types.ts` (Task 7), used identically in `render.ts` (Task 10), `metadata.ts` (Task 13).
- `Template<TSchema>` defined in `types.ts`, used in `desenquadramento/index.ts` (Task 15).
- `editableContentSchema` exported from `schema.ts` (Task 12), imported by `metadata.ts` (NOT — metadata is independent), `default-content.ts` (Task 14 imports `EditableContent` type), and `index.ts` (Task 15).
- `allTemplates` exported from `templates/index.ts` (Task 15), used by `seed.ts` (Task 17) and `parity.test.ts` (Task 16).

---

## Notes for the Implementer

- **Worktree**: this plan assumes you're in a dedicated worktree (see `superpowers:using-git-worktrees`). If not, create one before starting Task 1.
- **Linear**: DUO-57 (parent DUO-56). Branch: `feat/DUO-57/proposals-foundation`.
- **Database**: this plan modifies schema. The migration affects only your local Neon dev branch. Production migrations happen via the normal release flow.
- **Subagent dispatch**: each task is sized to be a clean subagent unit. Tasks 1-5 (schema) can be batched into one subagent run if desired; Tasks 8-10 (TDD helpers) can also be batched. Tasks 11-15 (Desenquadramento template) should be sequential — each depends on the previous.
