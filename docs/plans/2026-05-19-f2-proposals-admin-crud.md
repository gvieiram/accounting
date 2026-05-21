# F2 Proposals — Admin CRUD + Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the full admin workflow for proposals: list, create draft (with prospect dedupe), edit with autosave per section, publish (with snapshot + `renderedHtml` column + token + re-check dedupe in transaction), status transitions (sent/accepted/declined/cancelled), token rotation, PROSPECT→ACTIVE promotion banner, and print-ready routes for the rascunho and historical versions.

**Architecture:**
- Server Actions for all mutations (`src/features/proposals/actions.ts`), Prisma reads in queries (`src/features/proposals/queries.ts`), schemas in `schemas.ts`, helpers split by concern.
- Routes follow App Router under `src/app/admin/proposals/`, with auth enforced inline via `requireAdmin()` (consistent with `src/features/clients/`).
- Editor uses server-action-driven autosave: each section runs `useSectionAutosave` (debounce 800ms → safeParse → call action → state badge).
- **Editor preview** uses `<iframe srcDoc={html}>` to render the proposal HTML in isolation — CSS of the template doesn't leak into the admin app and vice versa.
- **Print routes are Route Handlers** (`route.ts`), not pages. They return raw HTML via `new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } })`. Drafts are rendered on-demand; published versions read the stored `renderedHtml` column directly.
- Publish is a transaction: re-dedupe → upsert PROSPECT → write `snapshot` JSON + `renderedHtml` column → mint token (if first publish) → flip status. Failures abort cleanly.

**Tech Stack:**
- Next.js 16 App Router (RSC + Server Actions + Route Handlers)
- Zod 4 (`safeParse`, `deepPartial`, `discriminatedUnion`)
- `date-fns` + `date-fns-tz` for proposal expiration normalization in `America/Sao_Paulo`
- shadcn/ui + Radix (existing components for list, form, dialog, badge)
- Vitest with `vi.mock()` for db/auth/audit (existing pattern in `src/features/clients/`)
- `crypto` (Node) for token generation + SHA-256 hashing

**Linear:** [DUO-58 — F2.2 Admin CRUD + Editor](https://linear.app/gvieiram/issue/DUO-58/f22-admin-crud-editor-de-propostas) (parent DUO-56). Branch: `feat/DUO-58/proposals-admin-crud`.

**Depends on:** DUO-57 (Plan 1 Foundation) merged.

**Out of scope (other plans):**
- Template default-content editor — Plan 3 (DUO-59).
- Public link rendering, mobile aviso, cron — Plan 4 (DUO-60).

---

## File Structure

### Created

```
src/features/proposals/
├── token.ts                                            # generateToken, hashToken
├── effective-status.ts                                 # effectiveStatus pure function
├── tz.ts                                               # São Paulo end-of-day expiration helpers
├── normalize-document.ts                               # CPF/CNPJ normalization
├── render-proposal.ts                                  # combines Proposal + Client → RenderData
├── schemas.ts                                          # createProposalSchema, prospectData, publish gate
├── queries.ts                                          # getActiveTemplates, listProposals, getProposalById, getProposalPublishedVersion, findClientByDocument
├── actions.ts                                          # all Server Actions
├── components/
│   ├── proposal-list-table.tsx
│   ├── template-picker.tsx
│   ├── client-prospect-picker.tsx
│   ├── new-proposal-form.tsx
│   ├── proposal-editor-shell.tsx
│   ├── section-form.tsx
│   ├── proposal-preview-iframe.tsx
│   ├── proposal-action-bar.tsx
│   ├── publish-dialog.tsx
│   ├── promote-prospect-banner.tsx
│   └── status-badge.tsx
├── hooks/
│   └── use-section-autosave.ts
└── tests/
    ├── token.test.ts
    ├── effective-status.test.ts
    ├── normalize-document.test.ts
    ├── render-proposal.test.ts
    ├── schemas.test.ts
    ├── actions.test.ts
    └── queries.test.ts

src/app/admin/proposals/
├── page.tsx                                            # list
├── new/page.tsx                                        # create draft
├── [id]/page.tsx                                       # editor / detail
├── [id]/print/route.ts                                 # Route Handler, draft HTML
└── [id]/versions/[versionId]/print/route.ts            # Route Handler, snapshot HTML

src/app/api/admin/proposals/
└── lookup-client/route.ts                              # POST debounced dedupe lookup; document stays out of URL/query strings
```

---

## Tasks

### Task 1: Token helpers — TDD

**Files:**
- Create: `src/features/proposals/token.ts`
- Create: `src/features/proposals/tests/token.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/token.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "../token";

describe("generateToken", () => {
	it("returns a 43-char base64url string (32 bytes encoded)", () => {
		const token = generateToken();
		expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	it("returns different values on each call", () => {
		expect(generateToken()).not.toBe(generateToken());
	});
});

describe("hashToken", () => {
	it("returns a 64-char hex string", () => {
		expect(hashToken("abc")).toMatch(/^[0-9a-f]{64}$/);
	});

	it("is deterministic", () => {
		expect(hashToken("same")).toBe(hashToken("same"));
	});

	it("produces different hashes for different inputs", () => {
		expect(hashToken("a")).not.toBe(hashToken("b"));
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/token.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

Create `src/features/proposals/token.ts`:

```ts
import { createHash, randomBytes } from "node:crypto";

export function generateToken(): string {
	return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
	return createHash("sha256").update(token).digest("hex");
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/token.test.ts
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/token.ts src/features/proposals/tests/token.test.ts
git commit -m "feat(proposals): add token generation and hashing helpers"
```

---

### Task 2: effectiveStatus — TDD

**Files:**
- Create: `src/features/proposals/effective-status.ts`
- Create: `src/features/proposals/tests/effective-status.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/effective-status.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { effectiveStatus } from "../effective-status";

const now = new Date("2026-06-01T12:00:00Z");
const past = new Date("2026-05-01T12:00:00Z");
const future = new Date("2026-07-01T12:00:00Z");

describe("effectiveStatus", () => {
	it("returns terminal ACCEPTED as-is", () => {
		expect(effectiveStatus({ status: "ACCEPTED", expiresAt: past }, now)).toBe("ACCEPTED");
	});
	it("returns terminal DECLINED as-is", () => {
		expect(effectiveStatus({ status: "DECLINED", expiresAt: past }, now)).toBe("DECLINED");
	});
	it("returns terminal CANCELLED as-is", () => {
		expect(effectiveStatus({ status: "CANCELLED", expiresAt: past }, now)).toBe("CANCELLED");
	});
	it("returns EXPIRED as-is", () => {
		expect(effectiveStatus({ status: "EXPIRED", expiresAt: past }, now)).toBe("EXPIRED");
	});
	it("returns EXPIRED_PENDING when PUBLISHED but expiresAt passed", () => {
		expect(effectiveStatus({ status: "PUBLISHED", expiresAt: past }, now)).toBe("EXPIRED_PENDING");
	});
	it("returns EXPIRED_PENDING when SENT but expiresAt passed", () => {
		expect(effectiveStatus({ status: "SENT", expiresAt: past }, now)).toBe("EXPIRED_PENDING");
	});
	it("returns original when expiresAt is null", () => {
		expect(effectiveStatus({ status: "DRAFT", expiresAt: null }, now)).toBe("DRAFT");
	});
	it("returns original when expiresAt is future", () => {
		expect(effectiveStatus({ status: "PUBLISHED", expiresAt: future }, now)).toBe("PUBLISHED");
	});
	it("returns DRAFT as-is regardless of expiresAt", () => {
		expect(effectiveStatus({ status: "DRAFT", expiresAt: past }, now)).toBe("DRAFT");
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/effective-status.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/features/proposals/effective-status.ts`:

```ts
import type { ProposalStatus } from "@/generated/prisma/enums";

export type EffectiveStatus = ProposalStatus | "EXPIRED_PENDING";

const TERMINAL: ProposalStatus[] = ["ACCEPTED", "DECLINED", "CANCELLED", "EXPIRED"];
const EXPIRABLE: ProposalStatus[] = ["PUBLISHED", "SENT"];

export function effectiveStatus(
	p: { status: ProposalStatus; expiresAt: Date | null },
	now: Date = new Date(),
): EffectiveStatus {
	if (TERMINAL.includes(p.status)) return p.status;
	if (!EXPIRABLE.includes(p.status)) return p.status;
	if (p.expiresAt && p.expiresAt <= now) return "EXPIRED_PENDING";
	return p.status;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/effective-status.test.ts
```

Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/effective-status.ts src/features/proposals/tests/effective-status.test.ts
git commit -m "feat(proposals): add effectiveStatus helper"
```

---

### Task 3: normalizeDocument — TDD

**Files:**
- Create: `src/features/proposals/normalize-document.ts`
- Create: `src/features/proposals/tests/normalize-document.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/normalize-document.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeDocument } from "../normalize-document";

describe("normalizeDocument", () => {
	it("strips CPF separators", () => {
		expect(normalizeDocument("123.456.789-09")).toBe("12345678909");
	});
	it("strips CNPJ separators", () => {
		expect(normalizeDocument("12.345.678/0001-90")).toBe("12345678000190");
	});
	it("leaves digits-only unchanged", () => {
		expect(normalizeDocument("12345678909")).toBe("12345678909");
	});
	it("strips spaces", () => {
		expect(normalizeDocument(" 12 . 345 ")).toBe("12345");
	});
	it("returns empty for empty input", () => {
		expect(normalizeDocument("")).toBe("");
	});
	it("strips any non-digit", () => {
		expect(normalizeDocument("abc123")).toBe("123");
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/normalize-document.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/features/proposals/normalize-document.ts`:

```ts
export function normalizeDocument(document: string): string {
	return document.replace(/\D/g, "");
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/normalize-document.test.ts
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/normalize-document.ts src/features/proposals/tests/normalize-document.test.ts
git commit -m "feat(proposals): add normalizeDocument helper"
```

---

### Task 3.5: São Paulo expiration helpers — TDD

**Files:**
- Create: `src/features/proposals/tz.ts`
- Create: `src/features/proposals/tests/tz.test.ts`

- [ ] **Step 1: Install dependency if needed**

```bash
pnpm list date-fns-tz || pnpm add date-fns-tz
```

Expected: `date-fns-tz` is available before implementing the helper.

- [ ] **Step 2: Write the failing test**

Create `src/features/proposals/tests/tz.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatExpirationBR, isExpired, toEndOfSaoPauloDay } from "../tz";

describe("toEndOfSaoPauloDay", () => {
	it("returns end of the selected São Paulo calendar day", () => {
		const eod = toEndOfSaoPauloDay("2026-06-15");
		expect(eod.toISOString()).toBe("2026-06-16T02:59:59.999Z");
	});
});

describe("isExpired", () => {
	it("uses <= so the exact expiration instant is already expired", () => {
		const now = new Date("2026-06-16T02:59:59.999Z");
		expect(isExpired(now, now)).toBe(true);
	});
});

describe("formatExpirationBR", () => {
	it("formats the stored UTC instant as São Paulo date", () => {
		expect(formatExpirationBR(new Date("2026-06-16T02:59:59.999Z"))).toBe(
			"15/06/2026",
		);
	});
});
```

- [ ] **Step 3: Implement**

Create `src/features/proposals/tz.ts`:

```ts
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

const TZ = "America/Sao_Paulo";

export function toEndOfSaoPauloDay(date: string | Date): Date {
	if (typeof date === "string") {
		return fromZonedTime(`${date}T23:59:59.999`, TZ);
	}

	const zoned = toZonedTime(date, TZ);

	const eodZoned = new Date(
		zoned.getFullYear(),
		zoned.getMonth(),
		zoned.getDate(),
		23,
		59,
		59,
		999,
	);

	return fromZonedTime(eodZoned, TZ);
}

export function isExpired(
	expiresAt: Date | null,
	now: Date = new Date(),
): boolean {
	if (!expiresAt) return false;
	return expiresAt <= now;
}

export function formatExpirationBR(expiresAt: Date | null): string {
	if (!expiresAt) return "";
	const zoned = toZonedTime(expiresAt, TZ);
	return format(zoned, "dd/MM/yyyy", { locale: ptBR });
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/tz.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml src/features/proposals/tz.ts src/features/proposals/tests/tz.test.ts
git commit -m "feat(proposals): add São Paulo expiration helpers"
```

---

### Task 4: Schemas — TDD

**Files:**
- Create: `src/features/proposals/schemas.ts`
- Create: `src/features/proposals/tests/schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
	createProposalDraftSchema,
	prospectDataSchema,
	publishProposalCommercialSchema,
	saveProposalSectionSchema,
} from "../schemas";

describe("prospectDataSchema", () => {
	it("accepts valid PF", () => {
		expect(
			prospectDataSchema.safeParse({ type: "PF", name: "Maria", document: "12345678909" }).success,
		).toBe(true);
	});
	it("accepts valid PJ", () => {
		expect(
			prospectDataSchema.safeParse({
				type: "PJ",
				legalName: "Acme",
				document: "12345678000190",
				taxRegime: "SIMPLES_NACIONAL",
			}).success,
		).toBe(true);
	});
	it("rejects PJ without taxRegime", () => {
		expect(
			prospectDataSchema.safeParse({ type: "PJ", legalName: "Acme", document: "12345678000190" }).success,
		).toBe(false);
	});
	it("rejects unknown type", () => {
		expect(prospectDataSchema.safeParse({ type: "X" }).success).toBe(false);
	});
});

describe("createProposalDraftSchema", () => {
	it("accepts with clientId only", () => {
		expect(
			createProposalDraftSchema.safeParse({ templateKey: "DESENQUADRAMENTO", clientId: "cuid-1" }).success,
		).toBe(true);
	});
	it("accepts with prospectData only", () => {
		expect(
			createProposalDraftSchema.safeParse({
				templateKey: "DESENQUADRAMENTO",
				prospectData: { type: "PF", name: "Maria", document: "12345678909" },
			}).success,
		).toBe(true);
	});
	it("rejects with both", () => {
		expect(
			createProposalDraftSchema.safeParse({
				templateKey: "DESENQUADRAMENTO",
				clientId: "cuid-1",
				prospectData: { type: "PF", name: "x", document: "12345678909" },
			}).success,
		).toBe(false);
	});
	it("rejects with neither", () => {
		expect(createProposalDraftSchema.safeParse({ templateKey: "DESENQUADRAMENTO" }).success).toBe(false);
	});
});

describe("saveProposalSectionSchema", () => {
	it("accepts", () => {
		expect(
			saveProposalSectionSchema.safeParse({
				proposalId: "cuid-1",
				sectionKey: "summary",
				sectionData: { text: "x" },
			}).success,
		).toBe(true);
	});
	it("rejects empty sectionKey", () => {
		expect(
			saveProposalSectionSchema.safeParse({
				proposalId: "cuid-1",
				sectionKey: "",
				sectionData: {},
			}).success,
		).toBe(false);
	});
});

describe("publishProposalCommercialSchema", () => {
	it("requires mainAmount for ONE_OFF", () => {
		expect(
			publishProposalCommercialSchema.safeParse({
				category: "ONE_OFF",
				currency: "BRL",
				expiresAt: "2026-06-15",
			}).success,
		).toBe(false);
	});
	it("requires recurringAmount for CONTINUOUS", () => {
		expect(
			publishProposalCommercialSchema.safeParse({
				category: "CONTINUOUS",
				mainAmount: 100,
				currency: "BRL",
				expiresAt: "2026-06-15",
			}).success,
		).toBe(false);
	});
	it("accepts ONE_OFF + mainAmount", () => {
		expect(
			publishProposalCommercialSchema.safeParse({
				category: "ONE_OFF",
				mainAmount: 500,
				currency: "BRL",
				expiresAt: "2026-06-15",
			}).success,
		).toBe(true);
	});
	it("accepts CONTINUOUS + recurringAmount", () => {
		expect(
			publishProposalCommercialSchema.safeParse({
				category: "CONTINUOUS",
				recurringAmount: 400,
				currency: "BRL",
				expiresAt: "2026-06-15",
			}).success,
		).toBe(true);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/schemas.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/features/proposals/schemas.ts`:

```ts
import { z } from "zod";
import { ProposalTemplateKey, TaxRegime } from "@/generated/prisma/enums";

export const prospectDataSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("PF"),
		name: z.string().min(2),
		document: z.string().min(11),
		email: z.string().email().optional(),
		phone: z.string().optional(),
	}),
	z.object({
		type: z.literal("PJ"),
		legalName: z.string().min(2),
		document: z.string().min(14),
		taxRegime: z.nativeEnum(TaxRegime),
		segment: z.string().optional(),
		contactName: z.string().optional(),
		email: z.string().email().optional(),
		phone: z.string().optional(),
	}),
]);
export type ProspectData = z.infer<typeof prospectDataSchema>;

export const createProposalDraftSchema = z
	.object({
		templateKey: z.nativeEnum(ProposalTemplateKey),
		clientId: z.string().cuid().optional(),
		prospectData: prospectDataSchema.optional(),
	})
	.refine(
		(d) => (d.clientId && !d.prospectData) || (!d.clientId && d.prospectData),
		{ message: "Provide either clientId or prospectData" },
	);

export const saveProposalSectionSchema = z.object({
	proposalId: z.string().cuid(),
	sectionKey: z.string().min(1),
	sectionData: z.record(z.unknown()),
});

export const publishProposalCommercialSchema = z
	.object({
		category: z.enum(["CONTINUOUS", "ONE_OFF"]),
		mainAmount: z.number().positive().optional(),
		recurringAmount: z.number().positive().optional(),
		currency: z.string().min(3),
		expiresAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
	})
	.refine(
		(d) => (d.category === "ONE_OFF" ? d.mainAmount !== undefined : true),
		{ message: "mainAmount required for ONE_OFF", path: ["mainAmount"] },
	)
	.refine(
		(d) => (d.category === "CONTINUOUS" ? d.recurringAmount !== undefined : true),
		{ message: "recurringAmount required for CONTINUOUS", path: ["recurringAmount"] },
	);

export const cancelProposalSchema = z.object({
	proposalId: z.string().cuid(),
	reason: z.string().max(500).optional(),
});

export const proposalIdSchema = z.object({
	proposalId: z.string().cuid(),
});
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/schemas.test.ts
```

Expected: 13 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/schemas.ts src/features/proposals/tests/schemas.test.ts
git commit -m "feat(proposals): add proposal schemas (draft, section, publish gate)"
```

---

### Task 5: buildRenderData — TDD

**Files:**
- Create: `src/features/proposals/render-proposal.ts`
- Create: `src/features/proposals/tests/render-proposal.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/render-proposal.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildRenderData } from "../render-proposal";

describe("buildRenderData", () => {
	it("uses client when proposal has clientId", () => {
		const data = buildRenderData({
			client: {
				legalName: "Acme",
				document: "12345678000190",
				primaryPhone: "48 99999",
				primaryEmail: "x@y.com",
			},
			prospectData: null,
			editableContent: { summary: { text: "olá" } },
			mainAmount: 500,
			recurringAmount: 400,
			currency: "BRL",
			commercialData: { paymentTerms: "PIX" },
			expiresAt: new Date("2026-06-01"),
		});
		expect(data.client.name).toBe("Acme");
		expect(data.client.document).toBe("12.345.678/0001-90");
		expect(data.commercial.mainAmount).toBe(500);
		expect(data.content).toEqual({ summary: { text: "olá" } });
	});

	it("uses prospectData PF when client is null", () => {
		const data = buildRenderData({
			client: null,
			prospectData: { type: "PF", name: "Maria", document: "12345678909" },
			editableContent: {},
			mainAmount: null,
			recurringAmount: null,
			currency: "BRL",
			commercialData: {},
			expiresAt: null,
		});
		expect(data.client.name).toBe("Maria");
		expect(data.client.document).toBe("123.456.789-09");
	});

	it("formats CNPJ for PJ prospect", () => {
		const data = buildRenderData({
			client: null,
			prospectData: { type: "PJ", legalName: "Foo SA", document: "11222333000181" },
			editableContent: {},
			mainAmount: null,
			recurringAmount: null,
			currency: "BRL",
			commercialData: {},
			expiresAt: null,
		});
		expect(data.client.name).toBe("Foo SA");
		expect(data.client.document).toBe("11.222.333/0001-81");
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/render-proposal.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/features/proposals/render-proposal.ts`:

```ts
import type { RenderData } from "./types";

type RenderInput = {
	client: {
		legalName: string;
		document: string;
		primaryPhone?: string | null;
		primaryEmail?: string | null;
	} | null;
	prospectData:
		| { type: "PF"; name: string; document: string; phone?: string; email?: string }
		| { type: "PJ"; legalName: string; document: string; phone?: string; email?: string; contactName?: string }
		| null;
	editableContent: Record<string, unknown>;
	mainAmount: number | null;
	recurringAmount: number | null;
	currency: string;
	commercialData: Record<string, unknown>;
	expiresAt: Date | null;
};

function formatDocument(raw: string): string {
	const digits = raw.replace(/\D/g, "");
	if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
	if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
	return raw;
}

export function buildRenderData(input: RenderInput): RenderData {
	let name = "";
	let document = "";
	let phone: string | undefined;
	let email: string | undefined;

	if (input.client) {
		name = input.client.legalName;
		document = formatDocument(input.client.document);
		phone = input.client.primaryPhone ?? undefined;
		email = input.client.primaryEmail ?? undefined;
	} else if (input.prospectData) {
		const p = input.prospectData;
		name = p.type === "PF" ? p.name : p.legalName;
		document = formatDocument(p.document);
		phone = p.phone;
		email = p.email;
	}

	return {
		client: { name, document, contact: phone, email, phone },
		commercial: {
			mainAmount: input.mainAmount ?? undefined,
			recurringAmount: input.recurringAmount ?? undefined,
			currency: input.currency,
			...input.commercialData,
		},
		content: input.editableContent,
		proposal: { expiresAt: input.expiresAt ?? undefined },
	};
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/render-proposal.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/render-proposal.ts src/features/proposals/tests/render-proposal.test.ts
git commit -m "feat(proposals): add buildRenderData helper"
```

---

### Task 6: Queries module

**Files:**
- Create: `src/features/proposals/queries.ts`
- Create: `src/features/proposals/tests/queries.test.ts`

- [ ] **Step 1: Write queries**

Create `src/features/proposals/queries.ts`:

```ts
import "server-only";
import { db } from "@/lib/db";
import { normalizeDocument } from "./normalize-document";

export async function getActiveTemplates() {
	return db.proposalTemplate.findMany({
		where: { isActive: true },
		include: { currentVersion: true },
		orderBy: { name: "asc" },
	});
}

export async function listProposals(opts: { limit?: number; offset?: number } = {}) {
	const { limit = 50, offset = 0 } = opts;
	return db.proposal.findMany({
		include: {
			template: true,
			client: { select: { id: true, legalName: true, document: true } },
		},
		orderBy: { createdAt: "desc" },
		take: limit,
		skip: offset,
	});
}

export async function getProposalById(id: string) {
	return db.proposal.findUnique({
		where: { id },
		include: {
			template: { include: { currentVersion: true } },
			templateVersion: true,
			client: true,
			publishedVersions: { orderBy: { version: "desc" } },
		},
	});
}

export async function getProposalPublishedVersion(proposalId: string, versionId: string) {
	return db.proposalPublishedVersion.findFirst({
		where: { id: versionId, proposalId },
	});
}

export async function findClientByDocument(document: string) {
	const normalized = normalizeDocument(document);
	if (!normalized) return null;
	return db.client.findUnique({
		where: { document: normalized },
		select: { id: true, legalName: true, status: true, document: true },
	});
}
```

- [ ] **Step 2: Write tests**

Create `src/features/proposals/tests/queries.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyTemplate = vi.fn();
const findManyProposal = vi.fn();
const findUniqueProposal = vi.fn();
const findFirstPublished = vi.fn();
const findUniqueClient = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
	db: {
		proposalTemplate: { findMany: findManyTemplate },
		proposal: { findMany: findManyProposal, findUnique: findUniqueProposal },
		proposalPublishedVersion: { findFirst: findFirstPublished },
		client: { findUnique: findUniqueClient },
	},
}));

const queries = await import("../queries");

beforeEach(() => vi.clearAllMocks());

describe("getActiveTemplates", () => {
	it("filters by isActive=true", async () => {
		findManyTemplate.mockResolvedValue([]);
		await queries.getActiveTemplates();
		expect(findManyTemplate).toHaveBeenCalledWith({
			where: { isActive: true },
			include: { currentVersion: true },
			orderBy: { name: "asc" },
		});
	});
});

describe("findClientByDocument", () => {
	it("normalizes before lookup", async () => {
		findUniqueClient.mockResolvedValue(null);
		await queries.findClientByDocument("123.456.789-09");
		expect(findUniqueClient).toHaveBeenCalledWith({
			where: { document: "12345678909" },
			select: { id: true, legalName: true, status: true, document: true },
		});
	});
	it("returns null for empty input", async () => {
		expect(await queries.findClientByDocument("")).toBeNull();
		expect(findUniqueClient).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/features/proposals/tests/queries.test.ts
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/queries.ts src/features/proposals/tests/queries.test.ts
git commit -m "feat(proposals): add queries module"
```

---

### Task 7: Action — createProposalDraft

**Files:**
- Create: `src/features/proposals/actions.ts`
- Create: `src/features/proposals/tests/actions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/actions.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const auditWriteMock = vi.fn();
const revalidatePathMock = vi.fn();
const headersMock = vi.fn(async () => new Headers());
const templateFindUnique = vi.fn();
const proposalCreate = vi.fn();
const proposalFindUnique = vi.fn();
const proposalUpdateMock = vi.fn();
const clientFindUnique = vi.fn();
const clientUpdateMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/auth/helpers", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/audit/log", () => ({ auditLog: { write: auditWriteMock } }));
vi.mock("@/lib/site-url", () => ({ getSiteUrl: () => "http://localhost:3000" }));
vi.mock("@/lib/db", () => ({
	db: {
		proposalTemplate: { findUnique: templateFindUnique },
		proposal: {
			create: proposalCreate,
			findUnique: proposalFindUnique,
			update: proposalUpdateMock,
		},
		client: { findUnique: clientFindUnique, update: clientUpdateMock },
		$transaction: transactionMock,
	},
}));

const actions = await import("../actions");

beforeEach(() => {
	vi.clearAllMocks();
	requireAdminMock.mockResolvedValue({ id: "admin-1", email: "a@b.com" });
});

describe("createProposalDraft", () => {
	it("creates DRAFT with template defaultContent", async () => {
		templateFindUnique.mockResolvedValue({
			id: "tmpl-1",
			key: "DESENQUADRAMENTO",
			category: "CONTINUOUS",
			isActive: true,
			currentVersionId: "ver-1",
			currentVersion: { id: "ver-1", defaultContent: { summary: { text: "ok" } } },
		});
		proposalCreate.mockResolvedValue({ id: "prop-1" });

		const r = await actions.createProposalDraft({
			templateKey: "DESENQUADRAMENTO",
			clientId: "client-1",
		});

		expect(r.success).toBe(true);
		expect(proposalCreate).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					templateId: "tmpl-1",
					clientId: "client-1",
					status: "DRAFT",
					editableContent: { summary: { text: "ok" } },
					createdById: "admin-1",
				}),
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "PROPOSAL_CREATED",
				resourceType: "Proposal",
				resourceId: "prop-1",
			}),
		);
	});

	it("rejects inactive template", async () => {
		templateFindUnique.mockResolvedValue({
			id: "t",
			isActive: false,
			currentVersion: { id: "v", defaultContent: {} },
		});
		const r = await actions.createProposalDraft({
			templateKey: "DESENQUADRAMENTO",
			clientId: "c",
		});
		expect(r.success).toBe(false);
	});

	it("rejects both clientId and prospectData", async () => {
		const r = await actions.createProposalDraft({
			templateKey: "DESENQUADRAMENTO",
			clientId: "c",
			prospectData: { type: "PF", name: "M", document: "12345678909" },
		});
		expect(r.success).toBe(false);
	});
});
```

- [ ] **Step 2: Implement**

Create `src/features/proposals/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { auditLog } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { getSiteUrl } from "@/lib/site-url";
import type { ProposalStatus } from "@/generated/prisma/enums";

import { normalizeDocument } from "./normalize-document";
import { buildRenderData } from "./render-proposal";
import { renderTemplate } from "./render";
import {
	cancelProposalSchema,
	createProposalDraftSchema,
	proposalIdSchema,
	publishProposalCommercialSchema,
	saveProposalSectionSchema,
} from "./schemas";
import { templateRegistry } from "./templates";
import { generateToken, hashToken } from "./token";
import { toEndOfSaoPauloDay } from "./tz";

export type ActionResult<T = void> =
	| ({ success: true } & (T extends void ? object : { data: T }))
	| { success: false; error: string };

export async function createProposalDraft(
	input: z.infer<typeof createProposalDraftSchema>,
): Promise<ActionResult<{ proposalId: string }>> {
	const admin = await requireAdmin();
	const parsed = createProposalDraftSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };

	const template = await db.proposalTemplate.findUnique({
		where: { key: parsed.data.templateKey },
		include: { currentVersion: true },
	});

	if (!template || !template.isActive || !template.currentVersion) {
		return { success: false, error: "Template não disponível" };
	}

	const proposal = await db.proposal.create({
		data: {
			templateId: template.id,
			templateVersionId: template.currentVersion.id,
			clientId: parsed.data.clientId ?? null,
			prospectData: parsed.data.prospectData
				? { ...parsed.data.prospectData, document: normalizeDocument(parsed.data.prospectData.document) }
				: null,
			editableContent: template.currentVersion.defaultContent ?? {},
			status: "DRAFT",
			currency: "BRL",
			createdById: admin.id,
		},
	});

	await auditLog.write({
		action: "PROPOSAL_CREATED",
		actorId: admin.id,
		actorEmail: admin.email,
		resourceType: "Proposal",
		resourceId: proposal.id,
		headers: await headers(),
	});

	revalidatePath("/admin/proposals");

	return { success: true, data: { proposalId: proposal.id } };
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/features/proposals/tests/actions.test.ts
```

Expected: 3 passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/actions.ts src/features/proposals/tests/actions.test.ts
git commit -m "feat(proposals): add createProposalDraft action"
```

---

### Task 8: Action — saveProposalSection (autosave)

**Files:**
- Modify: `src/features/proposals/actions.ts`
- Modify: `src/features/proposals/tests/actions.test.ts`

- [ ] **Step 1: Append failing test**

Append to `src/features/proposals/tests/actions.test.ts`:

```ts
describe("saveProposalSection", () => {
	beforeEach(() => {
		proposalFindUnique.mockReset();
		proposalUpdateMock.mockReset();
		proposalFindUnique.mockResolvedValue({
			id: "p1",
			status: "DRAFT",
			editableContent: { existing: { ok: true } },
		});
	});

	it("merges into editableContent without audit", async () => {
		const r = await actions.saveProposalSection({
			proposalId: "p1",
			sectionKey: "summary",
			sectionData: { text: "novo" },
		});
		expect(r.success).toBe(true);
		expect(proposalUpdateMock).toHaveBeenCalledWith({
			where: { id: "p1" },
			data: { editableContent: { existing: { ok: true }, summary: { text: "novo" } } },
		});
		expect(auditWriteMock).not.toHaveBeenCalled();
	});

	it("rejects when not DRAFT", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p1", status: "PUBLISHED", editableContent: {} });
		const r = await actions.saveProposalSection({
			proposalId: "p1",
			sectionKey: "summary",
			sectionData: { text: "x" },
		});
		expect(r.success).toBe(false);
	});

	it("rejects empty sectionKey", async () => {
		const r = await actions.saveProposalSection({
			proposalId: "p1",
			sectionKey: "",
			sectionData: {},
		});
		expect(r.success).toBe(false);
	});
});
```

- [ ] **Step 2: Append action**

Append to `src/features/proposals/actions.ts`:

```ts
export async function saveProposalSection(
	input: z.infer<typeof saveProposalSectionSchema>,
): Promise<ActionResult> {
	await requireAdmin();
	const parsed = saveProposalSectionSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };

	const proposal = await db.proposal.findUnique({
		where: { id: parsed.data.proposalId },
		select: { id: true, status: true, editableContent: true },
	});
	if (!proposal) return { success: false, error: "Proposta não encontrada" };
	if (proposal.status !== "DRAFT")
		return { success: false, error: "Apenas rascunhos podem ser editados" };

	const current = (proposal.editableContent as Record<string, unknown>) ?? {};
	await db.proposal.update({
		where: { id: parsed.data.proposalId },
		data: {
			editableContent: { ...current, [parsed.data.sectionKey]: parsed.data.sectionData },
		},
	});
	return { success: true };
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/features/proposals/tests/actions.test.ts
```

Expected: 6 passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/actions.ts src/features/proposals/tests/actions.test.ts
git commit -m "feat(proposals): add saveProposalSection autosave action"
```

---

### Task 9: Action — publishProposal (transaction)

**Files:**
- Modify: `src/features/proposals/actions.ts`
- Modify: `src/features/proposals/tests/actions.test.ts`

- [ ] **Step 1: Append failing test**

Append to `src/features/proposals/tests/actions.test.ts`:

```ts
describe("publishProposal", () => {
	beforeEach(() => {
		proposalFindUnique.mockReset();
		transactionMock.mockReset();
		clientFindUnique.mockReset();
	});

	it("publishes DRAFT, creates snapshot + renderedHtml + token", async () => {
		proposalFindUnique.mockResolvedValue({
			id: "p1",
			status: "DRAFT",
			clientId: "c1",
			prospectData: null,
			editableContent: { summary: { text: "ok" } },
			mainAmount: 500,
			recurringAmount: 400,
			currency: "BRL",
			commercialData: {},
			expiresAt: new Date("2026-07-01"),
			publicTokenHash: null,
			template: {
				key: "DESENQUADRAMENTO",
				category: "CONTINUOUS",
				currentVersion: { version: 1 },
			},
			templateVersion: { version: 1 },
			client: { id: "c1", legalName: "Acme", document: "12345678000190" },
		});

		const createPV = vi.fn().mockResolvedValue({ id: "pv-1", version: 1 });
		transactionMock.mockImplementation(async (fn) => {
			return fn({
				proposal: { findUnique: proposalFindUnique, update: proposalUpdateMock },
				proposalPublishedVersion: {
					count: vi.fn().mockResolvedValue(0),
					create: createPV,
				},
				client: { findUnique: clientFindUnique, create: vi.fn() },
			});
		});

		const r = await actions.publishProposal({
			proposalId: "p1",
			commercial: {
				category: "CONTINUOUS",
				recurringAmount: 400,
				currency: "BRL",
				expiresAt: "2026-07-01",
			},
		});
		expect(r.success).toBe(true);
		if (r.success) {
			expect(r.data.publicUrl).toMatch(/^http:\/\/localhost:3000\/propostas\//);
		}
		expect(createPV).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					proposalId: "p1",
					version: 1,
					renderedHtml: expect.any(String),
					snapshot: expect.objectContaining({
						editableContent: expect.any(Object),
					}),
				}),
			}),
		);
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({ action: "PROPOSAL_PUBLISHED" }),
		);
	});

	it("rejects publish on non-DRAFT", async () => {
		proposalFindUnique.mockResolvedValue({
			id: "p1",
			status: "PUBLISHED",
			template: { category: "CONTINUOUS" },
			templateVersion: { version: 1 },
		});
			const r = await actions.publishProposal({
				proposalId: "p1",
				commercial: {
					category: "CONTINUOUS",
					recurringAmount: 400,
					currency: "BRL",
					expiresAt: "2026-07-01",
				},
			});
			expect(r.success).toBe(false);
	});
});
```

- [ ] **Step 2: Append publishProposal**

Append to `src/features/proposals/actions.ts`:

```ts
export async function publishProposal(
	input: {
		proposalId: string;
		commercial: z.infer<typeof publishProposalCommercialSchema>;
	},
): Promise<ActionResult<{ versionId: string; version: number; publicUrl: string | null }>> {
	const admin = await requireAdmin();
	const idCheck = proposalIdSchema.safeParse({ proposalId: input.proposalId });
	if (!idCheck.success) return { success: false, error: "Dados inválidos" };
	const commercialCheck = publishProposalCommercialSchema.safeParse(input.commercial);
	if (!commercialCheck.success) {
		return { success: false, error: "Campos comerciais inválidos" };
	}
	const normalizedExpiresAt = toEndOfSaoPauloDay(commercialCheck.data.expiresAt);

	const proposal = await db.proposal.findUnique({
		where: { id: idCheck.data.proposalId },
		include: {
			template: { include: { currentVersion: true } },
			templateVersion: true,
			client: true,
		},
	});

	if (!proposal) return { success: false, error: "Proposta não encontrada" };
	if (proposal.status !== "DRAFT")
		return { success: false, error: "Apenas rascunhos podem ser publicados" };

	if (commercialCheck.data.category !== proposal.template.category) {
		return { success: false, error: "Categoria comercial incompatível com o template" };
	}

	const registered = templateRegistry[proposal.template.key];
	if (!registered) return { success: false, error: "Template não registrado em código" };

	const contentCheck = registered.schema.safeParse(proposal.editableContent);
	if (!contentCheck.success) return { success: false, error: "Conteúdo incompleto" };

	const result = await db.$transaction(async (tx) => {
		let clientId = proposal.clientId;

		if (!clientId && proposal.prospectData) {
			const prospect = proposal.prospectData as {
				type: "PF" | "PJ";
				document: string;
				name?: string;
				legalName?: string;
				taxRegime?: string;
				email?: string;
				phone?: string;
				segment?: string;
				contactName?: string;
			};
			const normalized = normalizeDocument(prospect.document);
			const existing = await tx.client.findUnique({ where: { document: normalized } });
			if (existing) {
				clientId = existing.id;
			} else {
				const created = await tx.client.create({
					data: {
						type: prospect.type,
						legalName: prospect.legalName ?? prospect.name ?? "Sem nome",
						document: normalized,
						primaryEmail: prospect.email ?? "",
						primaryPhone: prospect.phone ?? "",
						contactName: prospect.contactName ?? prospect.name ?? "",
						taxRegime: prospect.type === "PJ" ? (prospect.taxRegime as never) : null,
						segment: prospect.type === "PJ" ? prospect.segment : null,
						status: "PROSPECT",
					},
				});
				clientId = created.id;
			}
		}

		const clientRecord = clientId
			? await tx.client.findUnique({ where: { id: clientId } })
			: null;

		const data = buildRenderData({
				client: clientRecord,
				prospectData: clientRecord ? null : (proposal.prospectData as never),
				editableContent: contentCheck.data,
				mainAmount: commercialCheck.data.mainAmount ?? null,
				recurringAmount: commercialCheck.data.recurringAmount ?? null,
				currency: commercialCheck.data.currency,
				commercialData: (proposal.commercialData as object) ?? {},
				expiresAt: normalizedExpiresAt,
		});

		const html = renderTemplate(
			registered.html,
			data as unknown as Record<string, unknown>,
			registered.metadata,
		);

		const count = await tx.proposalPublishedVersion.count({ where: { proposalId: proposal.id } });
		const version = count + 1;

		const published = await tx.proposalPublishedVersion.create({
			data: {
				proposalId: proposal.id,
				version,
				templateKey: proposal.template.key,
				templateVersion: proposal.templateVersion.version,
				snapshot: {
						editableContent: contentCheck.data,
						commercialData: proposal.commercialData,
						mainAmount: commercialCheck.data.mainAmount ?? null,
						recurringAmount: commercialCheck.data.recurringAmount ?? null,
						currency: commercialCheck.data.currency,
						client: clientRecord,
						expiresAt: normalizedExpiresAt,
					} as never,
				renderedHtml: html,
				publishedById: admin.id,
			},
		});

		const newToken = proposal.publicTokenHash ? null : generateToken();
		const tokenHash = newToken ? hashToken(newToken) : proposal.publicTokenHash;

		await tx.proposal.update({
			where: { id: proposal.id },
			data: {
					status: "PUBLISHED",
					clientId,
					prospectData: clientId ? null : proposal.prospectData,
					mainAmount: commercialCheck.data.mainAmount ?? null,
					recurringAmount: commercialCheck.data.recurringAmount ?? null,
					currency: commercialCheck.data.currency,
					expiresAt: normalizedExpiresAt,
					publicTokenHash: tokenHash,
				},
			});

			return {
				published,
				publicUrl: newToken ? `${getSiteUrl()}/propostas/${newToken}` : null,
			};
		});

	await auditLog.write({
		action: "PROPOSAL_PUBLISHED",
		actorId: admin.id,
		actorEmail: admin.email,
		resourceType: "Proposal",
		resourceId: proposal.id,
		metadata: { version: result.published.version },
		headers: await headers(),
	});

	revalidatePath("/admin/proposals");
	revalidatePath(`/admin/proposals/${proposal.id}`);

	return {
		success: true,
		data: {
			versionId: result.published.id,
			version: result.published.version,
			publicUrl: result.publicUrl,
		},
	};
}
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/features/proposals/tests/actions.test.ts
```

Expected: 8 passed.

Note: `publicUrl` is returned only when a token is first minted. Republish keeps the same token hash and does not expose the bearer token again. If the admin loses the first link before sending it, use `rotateToken` to generate a new public URL.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/actions.ts src/features/proposals/tests/actions.test.ts
git commit -m "feat(proposals): add publishProposal with snapshot + renderedHtml column"
```

---

### Task 10: Status transition actions

**Files:**
- Modify: `src/features/proposals/actions.ts`
- Modify: `src/features/proposals/tests/actions.test.ts`

- [ ] **Step 1: Append transitions**

Append to `src/features/proposals/actions.ts`:

```ts
const ALLOWED_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
	DRAFT: ["PUBLISHED", "CANCELLED"],
	PUBLISHED: ["SENT", "CANCELLED"],
	SENT: ["ACCEPTED", "DECLINED", "CANCELLED"],
	ACCEPTED: [],
	DECLINED: [],
	CANCELLED: [],
	EXPIRED: [],
};

async function transitionProposal(
	proposalId: string,
	to: ProposalStatus,
	auditAction:
		| "PROPOSAL_MARKED_SENT"
		| "PROPOSAL_ACCEPTED"
		| "PROPOSAL_DECLINED"
		| "PROPOSAL_CANCELLED",
	extraData: Record<string, unknown> = {},
	auditMetadata: Record<string, unknown> = {},
): Promise<ActionResult> {
	const admin = await requireAdmin();
	const proposal = await db.proposal.findUnique({
		where: { id: proposalId },
		select: { id: true, status: true },
	});
	if (!proposal) return { success: false, error: "Proposta não encontrada" };
	if (!ALLOWED_TRANSITIONS[proposal.status].includes(to)) {
		return { success: false, error: `Transição inválida: ${proposal.status} → ${to}` };
	}

	await db.proposal.update({
		where: { id: proposalId },
		data: {
			status: to,
			cancelledAt: to === "CANCELLED" ? new Date() : undefined,
			...extraData,
		},
	});

	await auditLog.write({
		action: auditAction,
		actorId: admin.id,
		actorEmail: admin.email,
		resourceType: "Proposal",
		resourceId: proposalId,
		metadata: auditMetadata,
		headers: await headers(),
	});

	revalidatePath(`/admin/proposals/${proposalId}`);
	revalidatePath("/admin/proposals");
	return { success: true };
}

export async function markProposalSent(input: { proposalId: string }) {
	const parsed = proposalIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };
	return transitionProposal(parsed.data.proposalId, "SENT", "PROPOSAL_MARKED_SENT");
}

export async function acceptProposal(input: { proposalId: string }) {
	const parsed = proposalIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };
	return transitionProposal(parsed.data.proposalId, "ACCEPTED", "PROPOSAL_ACCEPTED");
}

export async function declineProposal(input: { proposalId: string }) {
	const parsed = proposalIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };
	return transitionProposal(parsed.data.proposalId, "DECLINED", "PROPOSAL_DECLINED");
}

export async function cancelProposal(input: z.infer<typeof cancelProposalSchema>) {
	const parsed = cancelProposalSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };
	return transitionProposal(
		parsed.data.proposalId,
			"CANCELLED",
			"PROPOSAL_CANCELLED",
			{},
			parsed.data.reason ? { reason: parsed.data.reason } : {},
		);
}
```

- [ ] **Step 2: Append tests**

Append to `src/features/proposals/tests/actions.test.ts`:

```ts
describe("transitions", () => {
	beforeEach(() => {
		proposalFindUnique.mockReset();
		proposalUpdateMock.mockReset();
	});

	it("markProposalSent PUBLISHED→SENT", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "PUBLISHED" });
		const r = await actions.markProposalSent({ proposalId: "p" });
		expect(r.success).toBe(true);
		expect(proposalUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ status: "SENT" }) }),
		);
	});

	it("rejects markProposalSent on DRAFT", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "DRAFT" });
		expect((await actions.markProposalSent({ proposalId: "p" })).success).toBe(false);
	});

	it("cancelProposal sets cancelledAt", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "PUBLISHED" });
		await actions.cancelProposal({ proposalId: "p", reason: "dup" });
		expect(proposalUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: "CANCELLED", cancelledAt: expect.any(Date) }),
			}),
		);
	});

	it("acceptProposal SENT→ACCEPTED", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "SENT" });
		expect((await actions.acceptProposal({ proposalId: "p" })).success).toBe(true);
	});

	it("declineProposal SENT→DECLINED", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "SENT" });
		expect((await actions.declineProposal({ proposalId: "p" })).success).toBe(true);
	});
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/features/proposals/tests/actions.test.ts
```

Expected: 13 passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/actions.ts src/features/proposals/tests/actions.test.ts
git commit -m "feat(proposals): add status transition actions"
```

---

### Task 11: Action — rotateToken

**Files:**
- Modify: `src/features/proposals/actions.ts`
- Modify: `src/features/proposals/tests/actions.test.ts`

- [ ] **Step 1: Append action**

Append to `src/features/proposals/actions.ts`:

```ts
export async function rotateToken(
	input: { proposalId: string },
): Promise<ActionResult<{ publicUrl: string }>> {
	const admin = await requireAdmin();
	const parsed = proposalIdSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };

	const proposal = await db.proposal.findUnique({
		where: { id: parsed.data.proposalId },
		select: { id: true, status: true },
	});
	if (!proposal) return { success: false, error: "Proposta não encontrada" };
	if (proposal.status === "DRAFT" || proposal.status === "CANCELLED") {
		return { success: false, error: "Não há token para rotacionar neste estado" };
	}

	const newToken = generateToken();
	await db.proposal.update({
		where: { id: parsed.data.proposalId },
		data: { publicTokenHash: hashToken(newToken) },
	});

	await auditLog.write({
		action: "PROPOSAL_TOKEN_ROTATED",
		actorId: admin.id,
		actorEmail: admin.email,
		resourceType: "Proposal",
		resourceId: parsed.data.proposalId,
		headers: await headers(),
	});

	revalidatePath(`/admin/proposals/${parsed.data.proposalId}`);
	return {
		success: true,
		data: { publicUrl: `${getSiteUrl()}/propostas/${newToken}` },
	};
}
```

- [ ] **Step 2: Append test**

Append to `src/features/proposals/tests/actions.test.ts`:

```ts
describe("rotateToken", () => {
	beforeEach(() => {
		proposalFindUnique.mockReset();
		proposalUpdateMock.mockReset();
	});

		it("rotates for PUBLISHED", async () => {
			proposalFindUnique.mockResolvedValue({ id: "p", status: "PUBLISHED" });
			const r = await actions.rotateToken({ proposalId: "p" });
			expect(r.success).toBe(true);
			if (r.success) {
				expect(r.data.publicUrl).toMatch(/^http:\/\/localhost:3000\/propostas\//);
			}
			expect(proposalUpdateMock).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					publicTokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
				}),
			}),
		);
	});

	it("rejects rotate on DRAFT", async () => {
		proposalFindUnique.mockResolvedValue({ id: "p", status: "DRAFT" });
		expect((await actions.rotateToken({ proposalId: "p" })).success).toBe(false);
	});
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/features/proposals/tests/actions.test.ts
```

Expected: 15 passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/actions.ts src/features/proposals/tests/actions.test.ts
git commit -m "feat(proposals): add rotateToken action"
```

---

### Task 12: Action — promoteProspectToActive

**Files:**
- Modify: `src/features/proposals/actions.ts`
- Modify: `src/features/proposals/tests/actions.test.ts`

- [ ] **Step 1: Append action**

Append to `src/features/proposals/actions.ts`:

```ts
export async function promoteProspectToActive(input: { clientId: string }): Promise<ActionResult> {
	const admin = await requireAdmin();
	const schema = z.object({ clientId: z.string().cuid() });
	const parsed = schema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };

	const client = await db.client.findUnique({
		where: { id: parsed.data.clientId },
		select: { id: true, status: true, legalName: true },
	});
	if (!client) return { success: false, error: "Cliente não encontrado" };
	if (client.status !== "PROSPECT") return { success: false, error: "Cliente já está ativo" };

	await db.client.update({
		where: { id: parsed.data.clientId },
		data: { status: "ACTIVE" },
	});

	await auditLog.write({
		action: "CLIENT_UPDATED",
		actorId: admin.id,
		actorEmail: admin.email,
		resourceType: "Client",
		resourceId: parsed.data.clientId,
		metadata: { promotedFrom: "PROSPECT" },
		headers: await headers(),
	});

	revalidatePath(`/admin/clients/${parsed.data.clientId}`);
	return { success: true };
}
```

- [ ] **Step 2: Append test**

Append to `src/features/proposals/tests/actions.test.ts`:

```ts
describe("promoteProspectToActive", () => {
	beforeEach(() => {
		clientFindUnique.mockReset();
		clientUpdateMock.mockReset();
	});

	it("promotes PROSPECT→ACTIVE", async () => {
		clientFindUnique.mockResolvedValue({ id: "c1", status: "PROSPECT", legalName: "A" });
		const r = await actions.promoteProspectToActive({ clientId: "c1" });
		expect(r.success).toBe(true);
		expect(clientUpdateMock).toHaveBeenCalledWith({ where: { id: "c1" }, data: { status: "ACTIVE" } });
	});

	it("rejects when already ACTIVE", async () => {
		clientFindUnique.mockResolvedValue({ id: "c1", status: "ACTIVE" });
		expect((await actions.promoteProspectToActive({ clientId: "c1" })).success).toBe(false);
	});
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/features/proposals/tests/actions.test.ts
```

Expected: 17 passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/actions.ts src/features/proposals/tests/actions.test.ts
git commit -m "feat(proposals): add promoteProspectToActive action"
```

---

### Task 13: Status badge component

**Files:**
- Create: `src/features/proposals/components/status-badge.tsx`

- [ ] **Step 1: Write component**

Create `src/features/proposals/components/status-badge.tsx`:

```tsx
import { Badge } from "@/components/ui/badge";
import type { EffectiveStatus } from "../effective-status";

const LABELS: Record<EffectiveStatus, string> = {
	DRAFT: "Rascunho",
	PUBLISHED: "Publicada",
	SENT: "Enviada",
	ACCEPTED: "Aceita",
	DECLINED: "Recusada",
	CANCELLED: "Cancelada",
	EXPIRED: "Expirada",
	EXPIRED_PENDING: "Vencida",
};

const VARIANTS: Record<EffectiveStatus, "default" | "secondary" | "destructive" | "outline"> = {
	DRAFT: "outline",
	PUBLISHED: "default",
	SENT: "default",
	ACCEPTED: "default",
	DECLINED: "destructive",
	CANCELLED: "destructive",
	EXPIRED: "secondary",
	EXPIRED_PENDING: "secondary",
};

export function ProposalStatusBadge({ status }: { status: EffectiveStatus }) {
	return <Badge variant={VARIANTS[status]}>{LABELS[status]}</Badge>;
}
```

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

If `Badge` variants differ from project, open `src/components/ui/badge.tsx` and reconcile.

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/components/status-badge.tsx
git commit -m "feat(proposals): add ProposalStatusBadge component"
```

---

### Task 14: Proposal list page + table

**Files:**
- Create: `src/app/admin/proposals/page.tsx`
- Create: `src/features/proposals/components/proposal-list-table.tsx`

- [ ] **Step 1: Write the table**

Create `src/features/proposals/components/proposal-list-table.tsx`:

```tsx
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { effectiveStatus } from "../effective-status";
import { ProposalStatusBadge } from "./status-badge";

type ProposalRow = {
	id: string;
	template: { name: string };
	client: { legalName: string; document: string } | null;
	prospectData: { name?: string; legalName?: string } | null;
	mainAmount: number | null;
	recurringAmount: number | null;
	status: never;
	expiresAt: Date | null;
	createdAt: Date;
};

const fmtBRL = (v: number | null) =>
	v === null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const fmtDate = (v: Date | null) => (v ? new Intl.DateTimeFormat("pt-BR").format(v) : "—");

function clientLabel(row: ProposalRow) {
	if (row.client) return row.client.legalName;
	if (row.prospectData) {
		const p = row.prospectData;
		return p.legalName ?? p.name ?? "Prospect";
	}
	return "—";
}

export function ProposalListTable({ rows }: { rows: ProposalRow[] }) {
	const now = new Date();
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Cliente / Prospect</TableHead>
					<TableHead>Template</TableHead>
					<TableHead>Valor principal</TableHead>
					<TableHead>Mensalidade</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Validade</TableHead>
					<TableHead>Criado em</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{rows.map((row) => (
					<TableRow key={row.id}>
						<TableCell>
							<Link href={`/admin/proposals/${row.id}`} className="hover:underline">
								{clientLabel(row)}
							</Link>
						</TableCell>
						<TableCell>{row.template.name}</TableCell>
						<TableCell>{fmtBRL(row.mainAmount)}</TableCell>
						<TableCell>{fmtBRL(row.recurringAmount)}</TableCell>
						<TableCell>
							<ProposalStatusBadge
								status={effectiveStatus({ status: row.status, expiresAt: row.expiresAt }, now)}
							/>
						</TableCell>
						<TableCell>{fmtDate(row.expiresAt)}</TableCell>
						<TableCell>{fmtDate(row.createdAt)}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
```

- [ ] **Step 2: Write the page**

Create `src/app/admin/proposals/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProposalListTable } from "@/features/proposals/components/proposal-list-table";
import { listProposals } from "@/features/proposals/queries";

export const metadata = {
	title: "Propostas — Admin DuoHub",
	robots: { index: false, follow: false, nocache: true },
};

export default async function ProposalsPage() {
	const proposals = await listProposals({});
	return (
		<div className="space-y-6 p-6">
			<div className="flex items-center justify-between">
				<h1 className="font-semibold text-2xl">Propostas</h1>
				<Button asChild>
					<Link href="/admin/proposals/new">Nova proposta</Link>
				</Button>
			</div>
			<ProposalListTable
				rows={proposals.map((p) => ({
					id: p.id,
					template: { name: p.template.name },
					client: p.client,
					prospectData: p.prospectData as never,
					mainAmount: p.mainAmount ? Number(p.mainAmount) : null,
					recurringAmount: p.recurringAmount ? Number(p.recurringAmount) : null,
					status: p.status as never,
					expiresAt: p.expiresAt,
					createdAt: p.createdAt,
				}))}
			/>
		</div>
	);
}
```

- [ ] **Step 3: Verify compile + smoke test**

```bash
pnpm tsc --noEmit
pnpm dev
```

Open `/admin/proposals`. Should render with empty state.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/proposals/page.tsx src/features/proposals/components/proposal-list-table.tsx
git commit -m "feat(proposals): add /admin/proposals list page"
```

---

### Task 15: New proposal page with pickers + lookup route

**Files:**
- Create: `src/app/admin/proposals/new/page.tsx`
- Create: `src/features/proposals/components/template-picker.tsx`
- Create: `src/features/proposals/components/client-prospect-picker.tsx`
- Create: `src/features/proposals/components/new-proposal-form.tsx`
- Create: `src/app/api/admin/proposals/lookup-client/route.ts`

- [ ] **Step 1: Lookup Route Handler**

Create `src/app/api/admin/proposals/lookup-client/route.ts`:

```ts
import { NextResponse } from "next/server";
import { findClientByDocument } from "@/features/proposals/queries";
import { requireAdmin } from "@/lib/auth/helpers";

	export async function POST(request: Request) {
		await requireAdmin();
		const body = (await request.json()) as { document?: string };
		const document = body.document ?? "";
		const match = await findClientByDocument(document);
		return NextResponse.json(match);
	}
```

- [ ] **Step 2: TemplatePicker**

Create `src/features/proposals/components/template-picker.tsx`:

```tsx
"use client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Template = { key: string; name: string; category: "CONTINUOUS" | "ONE_OFF" };

export function TemplatePicker({
	templates,
	value,
	onChange,
}: {
	templates: Template[];
	value: string | null;
	onChange: (key: string) => void;
}) {
	return (
		<div className="grid gap-3 md:grid-cols-2">
			{templates.map((t) => (
				<button
					type="button"
					key={t.key}
					onClick={() => onChange(t.key)}
					className={`text-left ${value === t.key ? "ring-2 ring-primary" : ""}`}
				>
					<Card>
						<CardHeader className="font-semibold">{t.name}</CardHeader>
						<CardContent className="text-muted-foreground text-sm">
							{t.category === "CONTINUOUS" ? "Serviço contínuo" : "Serviço pontual"}
						</CardContent>
					</Card>
				</button>
			))}
		</div>
	);
}
```

- [ ] **Step 3: ClientProspectPicker**

Create `src/features/proposals/components/client-prospect-picker.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProspectData } from "../schemas";

type Mode = "client" | "prospect";
type Match = { id: string; legalName: string; status: string };

async function lookup(doc: string): Promise<Match | null> {
	const r = await fetch("/api/admin/proposals/lookup-client", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ document: doc }),
	});
	if (!r.ok) return null;
	return r.json();
}

export function ClientProspectPicker({
	mode,
	onModeChange,
	onClientSelected,
	prospectData,
	onProspectDataChange,
}: {
	mode: Mode;
	onModeChange: (m: Mode) => void;
	onClientSelected: (id: string | null) => void;
	prospectData: ProspectData;
	onProspectDataChange: (data: ProspectData) => void;
}) {
	const [doc, setDoc] = useState("");
	const [match, setMatch] = useState<Match | null>(null);

	useEffect(() => {
			const normalized = doc.replace(/\D/g, "");
			if (normalized.length < 11) {
				setMatch(null);
			return;
		}
		const t = setTimeout(async () => setMatch(await lookup(normalized)), 500);
		return () => clearTimeout(t);
	}, [doc, mode]);

	function update(field: string, value: string) {
		onProspectDataChange({ ...prospectData, [field]: value } as ProspectData);
	}

	return (
		<div className="space-y-4">
			<div className="flex gap-2">
				<button
					type="button"
					className={mode === "client" ? "font-bold" : ""}
					onClick={() => onModeChange("client")}
				>
					Cliente existente
				</button>
				<button
					type="button"
					className={mode === "prospect" ? "font-bold" : ""}
					onClick={() => onModeChange("prospect")}
				>
					Novo prospect
				</button>
			</div>

			<div className="space-y-2">
				<Label>CPF / CNPJ</Label>
				<Input
					value={doc}
					onChange={(e) => {
						setDoc(e.target.value);
						update("document", e.target.value.replace(/\D/g, ""));
					}}
				/>
				{match && (
					<div className="rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
						Encontramos cliente com este documento: <strong>{match.legalName}</strong> ({match.status}).
						<button
							type="button"
							className="ml-2 text-primary underline"
							onClick={() => {
								onClientSelected(match.id);
								onModeChange("client");
							}}
						>
							Usar este cliente
						</button>
					</div>
				)}
			</div>

			{mode === "prospect" && (
				<div className="grid gap-3 md:grid-cols-2">
					<div className="space-y-1">
						<Label>Tipo</Label>
						<select
							value={prospectData.type}
							onChange={(e) => {
								const type = e.target.value as "PF" | "PJ";
								onProspectDataChange(
									type === "PF"
										? { type, name: "", document: prospectData.document }
										: {
												type,
												legalName: "",
												document: prospectData.document,
												taxRegime: "SIMPLES_NACIONAL",
											},
								);
							}}
							className="h-10 rounded-md border bg-background px-3 text-sm"
						>
							<option value="PF">Pessoa física</option>
							<option value="PJ">Pessoa jurídica</option>
						</select>
					</div>
					<div className="space-y-1">
						<Label>{prospectData.type === "PF" ? "Nome" : "Razão social"}</Label>
						<Input
							value={prospectData.type === "PF" ? prospectData.name : prospectData.legalName}
							onChange={(e) =>
								update(prospectData.type === "PF" ? "name" : "legalName", e.target.value)
							}
						/>
					</div>
					{prospectData.type === "PJ" && (
						<div className="space-y-1">
							<Label>Regime tributário</Label>
							<select
								value={prospectData.taxRegime}
								onChange={(e) => update("taxRegime", e.target.value)}
								className="h-10 rounded-md border bg-background px-3 text-sm"
							>
								<option value="MEI">MEI</option>
								<option value="SIMPLES_NACIONAL">Simples Nacional</option>
								<option value="LUCRO_PRESUMIDO">Lucro Presumido</option>
								<option value="LUCRO_REAL">Lucro Real</option>
							</select>
						</div>
					)}
					<div className="space-y-1">
						<Label>Email</Label>
						<Input value={prospectData.email ?? ""} onChange={(e) => update("email", e.target.value)} />
					</div>
					<div className="space-y-1">
						<Label>Telefone</Label>
						<Input value={prospectData.phone ?? ""} onChange={(e) => update("phone", e.target.value)} />
					</div>
				</div>
			)}
		</div>
	);
}
```

- [ ] **Step 4: NewProposalForm**

Create `src/features/proposals/components/new-proposal-form.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createProposalDraft } from "../actions";
import type { ProspectData } from "../schemas";
import { ClientProspectPicker } from "./client-prospect-picker";
import { TemplatePicker } from "./template-picker";

type Template = { key: string; name: string; category: "CONTINUOUS" | "ONE_OFF" };

export function NewProposalForm({ templates }: { templates: Template[] }) {
	const router = useRouter();
	const [templateKey, setTemplateKey] = useState<string | null>(null);
	const [mode, setMode] = useState<"client" | "prospect">("client");
	const [clientId, setClientId] = useState<string | null>(null);
	const [prospectData, setProspectData] = useState<ProspectData>({
		type: "PJ",
		legalName: "",
		document: "",
		taxRegime: "SIMPLES_NACIONAL",
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit() {
		setError(null);
		if (!templateKey) return setError("Selecione um template.");
		if (mode === "client" && !clientId) return setError("Selecione um cliente.");

		setSubmitting(true);
			const r = await createProposalDraft({
				templateKey: templateKey as never,
				clientId: mode === "client" ? clientId! : undefined,
				prospectData: mode === "prospect" ? prospectData : undefined,
			});
		setSubmitting(false);
		if (!r.success) return setError(r.error);
		router.push(`/admin/proposals/${r.data.proposalId}`);
	}

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<h2 className="font-semibold text-lg">1. Escolha o template</h2>
				<TemplatePicker templates={templates} value={templateKey} onChange={setTemplateKey} />
			</section>
			<section className="space-y-3">
				<h2 className="font-semibold text-lg">2. Cliente ou prospect</h2>
				<ClientProspectPicker
						mode={mode}
						onModeChange={setMode}
						onClientSelected={setClientId}
						prospectData={prospectData}
						onProspectDataChange={setProspectData}
					/>
			</section>
			{error && <div className="text-destructive text-sm">{error}</div>}
			<Button onClick={onSubmit} disabled={submitting}>
				{submitting ? "Criando..." : "Criar rascunho"}
			</Button>
		</div>
	);
}
```

V1 supports both existing clients and new prospects. A proposal created from prospect data stores `prospectData` in the draft; the publish transaction re-checks document dedupe and creates/links the `Client` as `PROSPECT`.

- [ ] **Step 5: Page**

Create `src/app/admin/proposals/new/page.tsx`:

```tsx
import { NewProposalForm } from "@/features/proposals/components/new-proposal-form";
import { getActiveTemplates } from "@/features/proposals/queries";

export const metadata = {
	title: "Nova proposta — Admin DuoHub",
	robots: { index: false, follow: false, nocache: true },
};

export default async function NewProposalPage() {
	const templates = await getActiveTemplates();
	return (
		<div className="space-y-6 p-6">
			<h1 className="font-semibold text-2xl">Nova proposta</h1>
			<NewProposalForm
				templates={templates.map((t) => ({
					key: t.key,
					name: t.name,
					category: t.category,
				}))}
			/>
		</div>
	);
}
```

- [ ] **Step 6: Verify + smoke test**

```bash
pnpm tsc --noEmit
pnpm dev
```

Open `/admin/proposals/new`, pick template + client, click Criar rascunho.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/proposals/new/ src/features/proposals/components/template-picker.tsx src/features/proposals/components/client-prospect-picker.tsx src/features/proposals/components/new-proposal-form.tsx src/app/api/admin/proposals/lookup-client/
git commit -m "feat(proposals): add new proposal page with pickers"
```

---

### Task 16: useSectionAutosave hook

**Files:**
- Create: `src/features/proposals/hooks/use-section-autosave.ts`

- [ ] **Step 1: Write the hook**

Create `src/features/proposals/hooks/use-section-autosave.ts`:

```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveProposalSection } from "../actions";

export type SaveState = "idle" | "saving" | "saved" | "error";

export function useSectionAutosave(opts: {
	proposalId: string;
	sectionKey: string;
	debounceMs?: number;
}) {
	const { proposalId, sectionKey, debounceMs = 800 } = opts;
	const [state, setState] = useState<SaveState>("idle");
	const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
	const [error, setError] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lastPayload = useRef<unknown>(null);

	const queueSave = useCallback(
		(data: unknown) => {
			lastPayload.current = data;
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(async () => {
				setState("saving");
				setError(null);
				const r = await saveProposalSection({
					proposalId,
					sectionKey,
					sectionData: data as never,
				});
				if (r.success) {
					setState("saved");
					setLastSavedAt(new Date());
				} else {
					setState("error");
					setError(r.error);
				}
			}, debounceMs);
		},
		[proposalId, sectionKey, debounceMs],
	);

	const retry = useCallback(() => {
		if (lastPayload.current !== null) queueSave(lastPayload.current);
	}, [queueSave]);

	useEffect(() => () => {
		if (timer.current) clearTimeout(timer.current);
	}, []);

	return { state, lastSavedAt, error, queueSave, retry };
}
```

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/hooks/use-section-autosave.ts
git commit -m "feat(proposals): add useSectionAutosave hook"
```

---

### Task 17: Editor shell + section form + iframe preview

**Files:**
- Create: `src/features/proposals/components/proposal-preview-iframe.tsx`
- Create: `src/features/proposals/components/section-form.tsx`
- Create: `src/features/proposals/components/proposal-editor-shell.tsx`
- Create: `src/app/admin/proposals/[id]/page.tsx`

- [ ] **Step 1: iframe preview component**

Create `src/features/proposals/components/proposal-preview-iframe.tsx`:

```tsx
"use client";

export function ProposalPreviewIframe({ html }: { html: string }) {
	return (
		<iframe
				srcDoc={html}
				title="Preview da proposta"
				sandbox=""
				className="h-full w-full rounded-md border bg-white"
			/>
	);
}
```

The HTML is server-rendered by `renderTemplate` with all dynamic fields escaped per Plan 1. `srcDoc` parses the HTML in an isolated browsing context — template CSS doesn't leak into the admin shell, and the admin shell doesn't leak into the template. `sandbox=""` intentionally does not grant script or same-origin privileges; proposal templates must not depend on JavaScript.

- [ ] **Step 2: SectionForm**

Create `src/features/proposals/components/section-form.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSectionAutosave } from "../hooks/use-section-autosave";

type FieldDef = {
	path: string;
	label: string;
	kind: "text" | "multiline" | "currency" | "date" | "list";
};

export function SectionForm({
	proposalId,
	sectionKey,
	fields,
	initial,
}: {
	proposalId: string;
	sectionKey: string;
	fields: FieldDef[];
	initial: Record<string, unknown>;
}) {
	const { state, lastSavedAt, error, queueSave, retry } = useSectionAutosave({ proposalId, sectionKey });
	const [values, setValues] = useState(initial);

	function setField(key: string, value: unknown) {
		const next = { ...values, [key]: value };
		setValues(next);
		queueSave(next);
	}

	return (
		<div className="space-y-4">
			<div className="text-muted-foreground text-xs">
				{state === "saving" && "Salvando..."}
				{state === "saved" && lastSavedAt && <>Salvo às {lastSavedAt.toLocaleTimeString("pt-BR")}</>}
				{state === "error" && (
					<>
						<span className="text-destructive">Erro: {error}</span>
						<button type="button" onClick={retry} className="ml-2 underline">
							Tentar novamente
						</button>
					</>
				)}
			</div>

			{fields.map((f) => {
				const key = f.path.split(".").slice(-1)[0];
				const v = values[key] ?? "";
				if (f.kind === "multiline") {
					return (
						<div key={f.path} className="space-y-1">
							<Label>{f.label}</Label>
							<Textarea value={String(v)} onChange={(e) => setField(key, e.target.value)} rows={4} />
						</div>
					);
				}
				return (
					<div key={f.path} className="space-y-1">
						<Label>{f.label}</Label>
						<Input value={String(v)} onChange={(e) => setField(key, e.target.value)} />
					</div>
				);
			})}
		</div>
	);
}
```

- [ ] **Step 3: Editor shell**

Create `src/features/proposals/components/proposal-editor-shell.tsx`:

```tsx
"use client";
import { useState } from "react";
import { ProposalPreviewIframe } from "./proposal-preview-iframe";
import { SectionForm } from "./section-form";

type Section = {
	key: string;
	label: string;
	fields: { path: string; label: string; kind: "text" | "multiline" | "currency" | "date" | "list" }[];
	initial: Record<string, unknown>;
};

export function ProposalEditorShell({
	proposalId,
	sections,
	previewHtml,
}: {
	proposalId: string;
	sections: Section[];
	previewHtml: string;
}) {
	const [activeKey, setActiveKey] = useState(sections[0]?.key ?? null);
	const active = sections.find((s) => s.key === activeKey);

	return (
		<div className="grid h-[calc(100vh-160px)] grid-cols-12 gap-4">
			<aside className="col-span-2 space-y-1 border-r pr-3">
				{sections.map((s) => (
					<button
						type="button"
						key={s.key}
						onClick={() => setActiveKey(s.key)}
						className={`block w-full rounded px-2 py-1 text-left text-sm ${
							s.key === activeKey ? "bg-muted font-semibold" : ""
						}`}
					>
						{s.label}
					</button>
				))}
			</aside>
			<section className="col-span-5 overflow-auto">
				{active && (
					<SectionForm
						proposalId={proposalId}
						sectionKey={active.key}
						fields={active.fields}
						initial={active.initial}
					/>
				)}
			</section>
			<section className="col-span-5">
				<ProposalPreviewIframe html={previewHtml} />
			</section>
		</div>
	);
}
```

- [ ] **Step 4: Editor page**

Create `src/app/admin/proposals/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { ProposalActionBar } from "@/features/proposals/components/proposal-action-bar";
import { ProposalEditorShell } from "@/features/proposals/components/proposal-editor-shell";
import { PromoteProspectBanner } from "@/features/proposals/components/promote-prospect-banner";
import { ProposalStatusBadge } from "@/features/proposals/components/status-badge";
import { effectiveStatus } from "@/features/proposals/effective-status";
import { getProposalById } from "@/features/proposals/queries";
import { renderTemplate } from "@/features/proposals/render";
import { buildRenderData } from "@/features/proposals/render-proposal";
import { templateRegistry } from "@/features/proposals/templates";

export const metadata = { robots: { index: false, follow: false, nocache: true } };

export default async function ProposalEditorPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const proposal = await getProposalById(id);
	if (!proposal) notFound();

	const registered = templateRegistry[proposal.template.key];
	if (!registered) throw new Error(`Template ${proposal.template.key} not in registry`);

	const data = buildRenderData({
		client: proposal.client,
		prospectData: proposal.prospectData as never,
		editableContent: (proposal.editableContent as Record<string, unknown>) ?? {},
		mainAmount: proposal.mainAmount ? Number(proposal.mainAmount) : null,
		recurringAmount: proposal.recurringAmount ? Number(proposal.recurringAmount) : null,
		currency: proposal.currency,
		commercialData: (proposal.commercialData as Record<string, unknown>) ?? {},
		expiresAt: proposal.expiresAt,
	});

	const previewHtml = renderTemplate(
		registered.html,
		data as unknown as Record<string, unknown>,
		registered.metadata,
	);

	type FieldDef = {
		path: string;
		label: string;
		kind: "text" | "multiline" | "currency" | "date" | "list";
	};
	const sectionMap = new Map<
		string,
		{ key: string; label: string; fields: FieldDef[]; initial: Record<string, unknown> }
	>();
	for (const [path, meta] of Object.entries(registered.metadata)) {
		const sk = meta.section;
		if (!sectionMap.has(sk)) {
			sectionMap.set(sk, {
				key: sk,
				label: sk,
				fields: [],
				initial:
					((proposal.editableContent as Record<string, unknown>)?.[sk] as Record<string, unknown>) ?? {},
			});
		}
		sectionMap.get(sk)!.fields.push({ path, label: meta.label, kind: meta.kind });
	}

	return (
		<div className="space-y-4 p-6">
			<header className="flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-xl">
						{proposal.template.name} — {proposal.client?.legalName ?? "Prospect"}
					</h1>
				</div>
				<div className="flex items-center gap-3">
					<ProposalStatusBadge
						status={effectiveStatus(
							{ status: proposal.status, expiresAt: proposal.expiresAt },
							new Date(),
						)}
					/>
						<ProposalActionBar
							proposalId={proposal.id}
							status={proposal.status}
							category={proposal.template.category}
							versionsCount={proposal.publishedVersions.length}
						/>
				</div>
			</header>

			{proposal.status === "ACCEPTED" &&
				proposal.client &&
				proposal.client.status === "PROSPECT" && (
					<PromoteProspectBanner
						clientId={proposal.client.id}
						clientName={proposal.client.legalName}
					/>
				)}

			<ProposalEditorShell
				proposalId={proposal.id}
				sections={Array.from(sectionMap.values())}
				previewHtml={previewHtml}
			/>

			{proposal.publishedVersions.length > 0 && (
				<section className="space-y-2">
					<h2 className="font-semibold text-lg">Versões anteriores</h2>
					<ul className="space-y-1">
						{proposal.publishedVersions.map((v) => (
							<li key={v.id} className="flex items-center justify-between rounded border p-2">
								<div>
									<strong>v{v.version}</strong> · {new Intl.DateTimeFormat("pt-BR").format(v.publishedAt)}
								</div>
								<a
									href={`/admin/proposals/${proposal.id}/versions/${v.id}/print?autoprint=1`}
									target="_blank"
									rel="noopener"
									className="text-primary underline"
								>
									Imprimir / Salvar PDF
								</a>
							</li>
						))}
					</ul>
				</section>
			)}
		</div>
	);
}
```

- [ ] **Step 5: Note**

`ProposalActionBar` and `PromoteProspectBanner` come in Tasks 18 and 19. Compile will fail until those land. **Skip the `pnpm tsc --noEmit` check here**; the editor page compiles after Task 19.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/proposals/[id]/page.tsx src/features/proposals/components/proposal-editor-shell.tsx src/features/proposals/components/section-form.tsx src/features/proposals/components/proposal-preview-iframe.tsx
git commit -m "feat(proposals): add proposal editor with iframe preview and autosave"
```

---

### Task 18: Publish dialog + action bar

**Files:**
- Create: `src/features/proposals/components/publish-dialog.tsx`
- Create: `src/features/proposals/components/proposal-action-bar.tsx`

- [ ] **Step 1: Publish dialog**

Create `src/features/proposals/components/publish-dialog.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { publishProposal } from "../actions";

export function PublishDialog({
	proposalId,
	category,
	open,
	onOpenChange,
	onPublished,
}: {
	proposalId: string;
	category: "CONTINUOUS" | "ONE_OFF";
	open: boolean;
	onOpenChange: (o: boolean) => void;
	onPublished: () => void;
}) {
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [publicUrl, setPublicUrl] = useState<string | null>(null);
	const [mainAmount, setMainAmount] = useState("");
	const [recurringAmount, setRecurringAmount] = useState("");
	const [expiresAt, setExpiresAt] = useState(() => {
		const d = new Date();
		d.setDate(d.getDate() + 7);
		return d.toISOString().slice(0, 10);
	});

	async function onConfirm() {
		setSubmitting(true);
		setError(null);
		const r = await publishProposal({
			proposalId,
			commercial: {
				category,
				mainAmount: mainAmount ? Number(mainAmount) : undefined,
				recurringAmount: recurringAmount ? Number(recurringAmount) : undefined,
				currency: "BRL",
				expiresAt,
			},
		});
		setSubmitting(false);
		if (!r.success) return setError(r.error);
		setPublicUrl(r.data.publicUrl);
		onPublished();
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Publicar proposta</DialogTitle>
					<DialogDescription>
						A proposta será gerada como versão imutável e o link público ficará ativo.
					</DialogDescription>
				</DialogHeader>
					{error && (
						<div className="text-destructive text-sm" role="alert">
							{error}
						</div>
					)}
					<div className="grid gap-3">
						<div className="grid gap-1">
							<Label htmlFor="proposal-main-amount">Valor principal</Label>
							<Input
								id="proposal-main-amount"
								inputMode="decimal"
								value={mainAmount}
								onChange={(e) => setMainAmount(e.target.value)}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="proposal-recurring-amount">Mensalidade</Label>
							<Input
								id="proposal-recurring-amount"
								inputMode="decimal"
								value={recurringAmount}
								onChange={(e) => setRecurringAmount(e.target.value)}
								disabled={category === "ONE_OFF"}
							/>
						</div>
						<div className="grid gap-1">
							<Label htmlFor="proposal-expires-at">Validade</Label>
							<Input
								id="proposal-expires-at"
								type="date"
								value={expiresAt}
								onChange={(e) => setExpiresAt(e.target.value)}
							/>
						</div>
						{publicUrl && (
							<div className="rounded-md border p-3 text-sm">
								<p className="font-medium">Link público gerado</p>
								<a href={publicUrl} target="_blank" rel="noopener" className="break-all text-primary underline">
									{publicUrl}
								</a>
							</div>
						)}
					</div>
					<DialogFooter>
						<Button variant="ghost" onClick={() => onOpenChange(false)}>
							{publicUrl ? "Fechar" : "Cancelar"}
						</Button>
					<Button onClick={onConfirm} disabled={submitting}>
						{submitting ? "Publicando..." : "Publicar"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
```

- [ ] **Step 2: Action bar**

Create `src/features/proposals/components/proposal-action-bar.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	acceptProposal,
	cancelProposal,
	declineProposal,
	markProposalSent,
	rotateToken,
} from "../actions";
import { PublishDialog } from "./publish-dialog";

export function ProposalActionBar({
	proposalId,
	status,
	category,
	versionsCount,
}: {
	proposalId: string;
	status: string;
	category: "CONTINUOUS" | "ONE_OFF";
	versionsCount: number;
}) {
	const [publishOpen, setPublishOpen] = useState(false);
	const [busy, setBusy] = useState(false);

	async function call(
		fn: () => Promise<{ success: boolean; error?: string; data?: { publicUrl?: string } }>,
	) {
		setBusy(true);
		const r = await fn();
		setBusy(false);
		if (!r.success) alert(r.error);
		else if (r.data?.publicUrl) alert(`Novo link público: ${r.data.publicUrl}`);
		else window.location.reload();
	}

	return (
		<div className="flex flex-wrap gap-2">
			{status === "DRAFT" && (
				<Button onClick={() => setPublishOpen(true)}>Publicar</Button>
			)}
			{versionsCount > 0 && (
				<a
					href={`/admin/proposals/${proposalId}/print?autoprint=1`}
					target="_blank"
					rel="noopener"
				>
					<Button variant="outline">Imprimir / Salvar PDF</Button>
				</a>
			)}
			{status === "PUBLISHED" && (
				<Button
					variant="outline"
					disabled={busy}
					onClick={() => call(() => markProposalSent({ proposalId }))}
				>
					Marcar enviada
				</Button>
			)}
				{status === "SENT" && (
					<>
						<Button variant="outline" disabled={busy} onClick={() => call(() => acceptProposal({ proposalId }))}>
							Aceitar
					</Button>
						<Button variant="outline" disabled={busy} onClick={() => call(() => declineProposal({ proposalId }))}>
							Recusar
						</Button>
					</>
				)}
				{(status === "PUBLISHED" || status === "SENT") && (
					<>
						<Button variant="outline" disabled={busy} onClick={() => call(() => rotateToken({ proposalId }))}>
							Renovar token
						</Button>
				</>
			)}
			{status !== "CANCELLED" && status !== "ACCEPTED" && status !== "DECLINED" && (
				<Button
					variant="destructive"
					disabled={busy}
					onClick={() => {
						if (confirm("Cancelar proposta?")) call(() => cancelProposal({ proposalId }));
					}}
				>
					Cancelar
				</Button>
			)}
				<PublishDialog
					proposalId={proposalId}
					category={category}
					open={publishOpen}
					onOpenChange={setPublishOpen}
					onPublished={() => window.location.reload()}
				/>
		</div>
	);
}
```

- [ ] **Step 3: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/components/publish-dialog.tsx src/features/proposals/components/proposal-action-bar.tsx
git commit -m "feat(proposals): add publish dialog and action bar"
```

---

### Task 19: PROSPECT promotion banner

**Files:**
- Create: `src/features/proposals/components/promote-prospect-banner.tsx`

- [ ] **Step 1: Write the banner**

Create `src/features/proposals/components/promote-prospect-banner.tsx`:

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { promoteProspectToActive } from "../actions";

export function PromoteProspectBanner({
	clientId,
	clientName,
}: {
	clientId: string;
	clientName: string;
}) {
	const [submitting, setSubmitting] = useState(false);
	const [hidden, setHidden] = useState(false);
	if (hidden) return null;

	async function onPromote() {
		setSubmitting(true);
		const r = await promoteProspectToActive({ clientId });
		setSubmitting(false);
		if (r.success) {
			setHidden(true);
			window.location.reload();
		} else {
			alert(r.error);
		}
	}

	return (
		<div className="rounded-md border border-yellow-300 bg-yellow-50 p-4">
			<p className="text-sm">
				Proposta aceita! Promover <strong>{clientName}</strong> para cliente ativo?
			</p>
			<div className="mt-2 flex gap-2">
				<Button onClick={onPromote} disabled={submitting}>
					{submitting ? "Promovendo..." : "Promover"}
				</Button>
				<Button variant="ghost" onClick={() => setHidden(true)}>
					Depois
				</Button>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify the full editor compiles**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Full smoke test**

```bash
pnpm dev
```

1. Open a draft.
2. Edit fields, observe autosave indicator.
3. Click Publicar → confirm → reloads with Publicada badge.
4. Mark enviada → Aceitar → if client is PROSPECT, banner appears.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/components/promote-prospect-banner.tsx
git commit -m "feat(proposals): add PROSPECT promotion banner"
```

---

### Task 20: Draft print Route Handler

**Files:**
- Create: `src/app/admin/proposals/[id]/print/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/admin/proposals/[id]/print/route.ts`:

```ts
import { getProposalById } from "@/features/proposals/queries";
import { renderTemplate } from "@/features/proposals/render";
import { buildRenderData } from "@/features/proposals/render-proposal";
import { templateRegistry } from "@/features/proposals/templates";
import { requireAdmin } from "@/lib/auth/helpers";

const PRINT_CSS = `<style>
@page { size: A4; margin: 0; }
body { margin: 0; background: white; }
@media print { body { background: white; } .no-print { display: none !important; } }
.page { page-break-inside: avoid; }
</style>`;

const AUTOPRINT_SCRIPT = `<script>window.addEventListener("load", () => setTimeout(() => window.print(), 100));</script>`;

export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	await requireAdmin();
	const { id } = await params;
	const url = new URL(request.url);
	const autoprint = url.searchParams.get("autoprint") === "1";

	const proposal = await getProposalById(id);
	if (!proposal) return new Response("Not found", { status: 404 });

	const registered = templateRegistry[proposal.template.key];
	if (!registered) return new Response("Template not registered", { status: 500 });

	const data = buildRenderData({
		client: proposal.client,
		prospectData: proposal.prospectData as never,
		editableContent: (proposal.editableContent as Record<string, unknown>) ?? {},
		mainAmount: proposal.mainAmount ? Number(proposal.mainAmount) : null,
		recurringAmount: proposal.recurringAmount ? Number(proposal.recurringAmount) : null,
		currency: proposal.currency,
		commercialData: (proposal.commercialData as Record<string, unknown>) ?? {},
		expiresAt: proposal.expiresAt,
	});

	const baseHtml = renderTemplate(
		registered.html,
		data as unknown as Record<string, unknown>,
		registered.metadata,
	);

	const injected = injectIntoHead(
		baseHtml,
		PRINT_CSS + (autoprint ? AUTOPRINT_SCRIPT : ""),
	);

	return new Response(injected, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}

function injectIntoHead(html: string, extra: string): string {
	if (html.includes("</head>")) return html.replace("</head>", `${extra}</head>`);
	return extra + html;
}
```

The Route Handler returns raw HTML directly to the browser — no React wrapping, no client-side hydration. The template HTML already has its own `<html>`, `<head>`, `<body>`. We inject the print CSS and (optionally) the autoprint script into `<head>` before responding.

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Smoke test**

Open `/admin/proposals/[id]/print` in Chrome. Document renders A4 cleanly with no admin chrome. Add `?autoprint=1` to trigger print dialog automatically.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/proposals/[id]/print/route.ts
git commit -m "feat(proposals): add draft /print Route Handler returning raw HTML"
```

---

### Task 21: Published version print Route Handler

**Files:**
- Create: `src/app/admin/proposals/[id]/versions/[versionId]/print/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/admin/proposals/[id]/versions/[versionId]/print/route.ts`:

```ts
import { getProposalPublishedVersion } from "@/features/proposals/queries";
import { requireAdmin } from "@/lib/auth/helpers";

const PRINT_CSS = `<style>
@page { size: A4; margin: 0; }
body { margin: 0; background: white; }
@media print { body { background: white; } .no-print { display: none !important; } }
.page { page-break-inside: avoid; }
</style>`;

const AUTOPRINT_SCRIPT = `<script>window.addEventListener("load", () => setTimeout(() => window.print(), 100));</script>`;

export const dynamic = "force-dynamic";

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ id: string; versionId: string }> },
) {
	await requireAdmin();
	const { id, versionId } = await params;
	const url = new URL(request.url);
	const autoprint = url.searchParams.get("autoprint") === "1";

	const version = await getProposalPublishedVersion(id, versionId);
	if (!version || !version.renderedHtml) {
		return new Response("Not found", { status: 404 });
	}

	const injected = injectIntoHead(
		version.renderedHtml,
		PRINT_CSS + (autoprint ? AUTOPRINT_SCRIPT : ""),
	);

	return new Response(injected, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}

function injectIntoHead(html: string, extra: string): string {
	if (html.includes("</head>")) return html.replace("</head>", `${extra}</head>`);
	return extra + html;
}
```

Reads from the `renderedHtml` column directly — no rendering, no template lookup. The HTML is exactly what was generated at publish time (decision 15 of the spec).

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Smoke test**

Publish a proposal, then visit `/admin/proposals/[id]/versions/[versionId]/print?autoprint=1`. Should render the frozen snapshot HTML and trigger the print dialog.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/proposals/[id]/versions/
git commit -m "feat(proposals): add version /print Route Handler serving renderedHtml column"
```

---

### Task 22: Lint, full test suite, build, manual smoke

**Files:** (verification only)

- [ ] **Step 1: Lint**

```bash
pnpm lint
```

Expected: no errors.

- [ ] **Step 2: Test suite**

```bash
pnpm test
```

Expected: all proposals + existing tests pass.

- [ ] **Step 3: TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Build**

```bash
pnpm build
```

Expected: build succeeds.

- [ ] **Step 5: End-to-end manual**

In Chrome:

1. `/admin/proposals` → "Nova proposta".
2. Pick Desenquadramento + client → "Criar rascunho".
3. Editor opens with iframe preview on right and section form on left.
4. Edit fields → observe `Salvando...` → `Salvo às HH:mm`.
5. Click Publicar → confirm.
6. Page reloads with "Publicada" badge.
7. Click "Imprimir / Salvar PDF" → opens `/print` route → print dialog auto-triggers → PDF preview is the A4 document.
8. "Marcar enviada" → status "Enviada".
9. "Aceitar" → status "Aceita"; if client was PROSPECT, banner shows.
10. "Promover" in banner → client → ACTIVE.
11. "Renovar token" succeeds (no visible UI change, audit logged).
12. Create another draft, "Cancelar" with confirmation.

- [ ] **Step 6: Final commit (if fixes were needed)**

```bash
git add -A
git commit -m "chore(proposals): post-verification fixes"
```

---

## Self-Review Checklist

**Spec coverage (against the updated F2 spec):**
- [x] `effectiveStatus` — Task 2
- [x] Token gen + SHA-256 hash — Task 1
- [x] Document normalize — Task 3
- [x] Dedupe 2 moments (creation debounce + publish re-check in tx) — Tasks 15, 9
- [x] PF/PJ discriminated union — Task 4
- [x] DRAFT permissivo / publish strict — Tasks 8, 9
- [x] Autosave by section, debounce 800ms — Tasks 8, 16
- [x] Publish writes `snapshot` JSON + `renderedHtml` column (decision 15) — Task 9
- [x] Status transitions enforce graph — Task 10
- [x] Token rotation — Task 11
- [x] PROSPECT → ACTIVE manual banner — Tasks 12, 19
- [x] Print routes (Route Handlers returning raw HTML, no React wrapper) — Tasks 20, 21
- [x] Audit log with correct `resourceType` — Tasks 7, 9, 10, 11, 12
- [x] iframe preview isolates template CSS — Task 17

**Out of scope (other plans):**
- Template default-content editor — Plan 3.
- Public link, mobile aviso, cron — Plan 4.

**Type consistency**:
- `ActionResult<T>` defined in `actions.ts` Task 7, used uniformly.
- `ProspectData` exported from `schemas.ts` Task 4.
- `SaveState` from hook Task 16, used in form Task 17.
- `EffectiveStatus` from helper Task 2.

---

## Notes for the Implementer

- **Worktree**: isolated worktree before starting.
- **Linear**: DUO-58 (parent DUO-56). Branch `feat/DUO-58/proposals-admin-crud`.
- **Dependency**: DUO-57 (Plan 1 Foundation) merged.
- **Subagent dispatch**: Tasks 1-5 (pure helpers) can each be a separate subagent run. Tasks 6-12 (queries + actions) are sequential — they share the `actions.ts` file. Tasks 13-21 (UI) follow dependency order.
- **shadcn components needed**: `Dialog`, `Card`, `Table`, `Textarea`, `Badge`, `Input`, `Label`, `Button`. If missing, run `pnpm dlx shadcn@latest add dialog card table textarea badge input label` before Task 13.
- **Prospect creation UI**: Task 15 ships the PF/PJ prospect fields in V1. The action layer (`createProposalDraft`) accepts `prospectData`; publish re-checks document dedupe inside the transaction before creating/linking a `PROSPECT` client.
- **iframe preview**: `srcDoc` parses the HTML as a complete document in its own browsing context. Use `sandbox=""`; templates must not run JavaScript, and dynamic admin text is escaped before render.
- **Print Route Handlers**: returning raw HTML keeps the printed document identical to the publish-time snapshot. No React, no hydration, no styling leakage.
