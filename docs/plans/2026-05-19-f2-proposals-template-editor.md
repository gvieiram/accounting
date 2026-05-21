# F2 Proposals — Template Default-Content Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the admin UI that lets DuoHub edit the default content of each proposal template. Saving creates a new immutable `ProposalTemplateVersion` and flips `currentVersionId`, so new proposals adopt the updated defaults while existing ones stay frozen on their original version.

**Architecture:**
- New routes under `src/app/admin/proposals/templates/` (list + per-template editor).
- One Server Action: `updateTemplateDefaults`. No autosave — saving is intentional and creates a new version, so it's button-driven (different from the proposal editor's per-section autosave).
- The template editor reuses the iframe preview pattern from Plan 2 but works against an in-memory `editableContent` (client-side) rendered through the same `renderTemplate` pipeline.
- Preview updates as the admin types via a debounced server-side render call (or pure client-side merge with dummy data — see Task 5 for the chosen approach).

**Tech Stack:**
- Next.js 16 App Router (RSC + Server Action + Route Handler for preview render)
- Zod 4 (parses the template-specific schema from the registry)
- shadcn/ui (existing `Button`, `Card`, `Input`, `Textarea`, `Label`)
- Vitest with `vi.mock()` for db/auth/audit

**Linear:** [DUO-59 — F2.3 Template Editor](https://linear.app/gvieiram/issue/DUO-59/f23-editor-de-templates-padrao) (parent DUO-56). Branch: `feat/DUO-59/proposals-template-editor`.

**Depends on:** DUO-57 (Plan 1 Foundation) + DUO-58 (Plan 2 Admin CRUD) merged. Reuses helpers and components from Plan 2 (`iframe preview`, `renderTemplate`, schemas, `auditLog`).

**Out of scope (other plans):**
- Proposal creation/editing — Plan 2 (already merged).
- Public link, cron — Plan 4.
- Toggle `isActive` from the admin UI (stays in backlog F2+).
- Badge "template atualizado" in proposal editor (backlog F2+).

---

## File Structure

### Created

```
src/features/proposals/
├── template-actions.ts                                 # updateTemplateDefaults action
├── template-queries.ts                                 # listTemplates, getTemplateForEditor
├── template-schemas.ts                                 # updateTemplateDefaultsSchema
└── components/
    ├── template-list-card.tsx
    └── template-editor-form.tsx

src/app/admin/proposals/templates/
├── page.tsx                                            # list
└── [id]/page.tsx                                       # editor

src/app/api/admin/proposals/render-preview/
└── route.ts                                            # POST → renders template HTML for preview
```

### Modified
- None directly. Imports new files from existing `templateRegistry` and `renderTemplate` (Plan 1) and the iframe preview pattern (Plan 2 component reused).

---

## Tasks

### Task 1: Template editor schemas

**Files:**
- Create: `src/features/proposals/template-schemas.ts`
- Create: `src/features/proposals/tests/template-schemas.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/template-schemas.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { updateTemplateDefaultsSchema } from "../template-schemas";

describe("updateTemplateDefaultsSchema", () => {
	it("accepts valid payload", () => {
		expect(
			updateTemplateDefaultsSchema.safeParse({
				templateId: "cuid-1",
				defaultContent: { summary: { text: "ok" } },
			}).success,
		).toBe(true);
	});

	it("rejects empty templateId", () => {
		expect(
			updateTemplateDefaultsSchema.safeParse({
				templateId: "",
				defaultContent: {},
			}).success,
		).toBe(false);
	});

	it("rejects non-object defaultContent", () => {
		expect(
			updateTemplateDefaultsSchema.safeParse({
				templateId: "cuid-1",
				defaultContent: "string",
			}).success,
		).toBe(false);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/template-schemas.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

Create `src/features/proposals/template-schemas.ts`:

```ts
import { z } from "zod";

export const updateTemplateDefaultsSchema = z.object({
	templateId: z.string().cuid(),
	defaultContent: z.record(z.unknown()),
});

export type UpdateTemplateDefaultsInput = z.infer<typeof updateTemplateDefaultsSchema>;
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/template-schemas.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/template-schemas.ts src/features/proposals/tests/template-schemas.test.ts
git commit -m "feat(proposals): add template-schemas with updateTemplateDefaultsSchema"
```

---

### Task 2: Template queries

**Files:**
- Create: `src/features/proposals/template-queries.ts`
- Create: `src/features/proposals/tests/template-queries.test.ts`

- [ ] **Step 1: Write the queries**

Create `src/features/proposals/template-queries.ts`:

```ts
import "server-only";
import { db } from "@/lib/db";

export async function listAllTemplates() {
	return db.proposalTemplate.findMany({
		include: { currentVersion: true },
		orderBy: { name: "asc" },
	});
}

export async function getTemplateForEditor(templateId: string) {
	return db.proposalTemplate.findUnique({
		where: { id: templateId },
		include: {
			currentVersion: true,
			versions: { orderBy: { version: "desc" }, take: 10 },
		},
	});
}
```

- [ ] **Step 2: Write the tests**

Create `src/features/proposals/tests/template-queries.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
	db: { proposalTemplate: { findMany: findManyMock, findUnique: findUniqueMock } },
}));

const queries = await import("../template-queries");

beforeEach(() => vi.clearAllMocks());

describe("listAllTemplates", () => {
	it("loads all templates with currentVersion", async () => {
		findManyMock.mockResolvedValue([]);
		await queries.listAllTemplates();
		expect(findManyMock).toHaveBeenCalledWith({
			include: { currentVersion: true },
			orderBy: { name: "asc" },
		});
	});
});

describe("getTemplateForEditor", () => {
	it("loads template with currentVersion and recent versions", async () => {
		findUniqueMock.mockResolvedValue(null);
		await queries.getTemplateForEditor("t-1");
		expect(findUniqueMock).toHaveBeenCalledWith({
			where: { id: "t-1" },
			include: {
				currentVersion: true,
				versions: { orderBy: { version: "desc" }, take: 10 },
			},
		});
	});
});
```

- [ ] **Step 3: Run tests**

```bash
pnpm test src/features/proposals/tests/template-queries.test.ts
```

Expected: 2 passed.

- [ ] **Step 4: Commit**

```bash
git add src/features/proposals/template-queries.ts src/features/proposals/tests/template-queries.test.ts
git commit -m "feat(proposals): add template queries (list, getForEditor)"
```

---

### Task 3: updateTemplateDefaults action — TDD

**Files:**
- Create: `src/features/proposals/template-actions.ts`
- Create: `src/features/proposals/tests/template-actions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/template-actions.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminMock = vi.fn();
const auditWriteMock = vi.fn();
const revalidatePathMock = vi.fn();
const headersMock = vi.fn(async () => new Headers());
const templateFindUnique = vi.fn();
const versionCount = vi.fn();
const versionCreate = vi.fn();
const templateUpdate = vi.fn();
const transactionMock = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: headersMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/auth/helpers", () => ({ requireAdmin: requireAdminMock }));
vi.mock("@/lib/audit/log", () => ({ auditLog: { write: auditWriteMock } }));
vi.mock("@/lib/db", () => ({
	db: {
		proposalTemplate: { findUnique: templateFindUnique, update: templateUpdate },
		proposalTemplateVersion: { count: versionCount, create: versionCreate },
		$transaction: transactionMock,
	},
}));

const actions = await import("../template-actions");

beforeEach(() => {
	vi.clearAllMocks();
	requireAdminMock.mockResolvedValue({ id: "admin-1", email: "a@b.com" });
});

describe("updateTemplateDefaults", () => {
	it("creates a new version and updates currentVersionId", async () => {
		templateFindUnique.mockResolvedValue({
			id: "t1",
			key: "DESENQUADRAMENTO",
			currentVersionId: "v0",
		});

		const newVersion = { id: "v1", version: 2 };
		transactionMock.mockImplementation(async (fn) => {
			return fn({
				proposalTemplateVersion: {
					count: vi.fn().mockResolvedValue(1),
					create: vi.fn().mockResolvedValue(newVersion),
				},
				proposalTemplate: { update: templateUpdate },
			});
		});

		const r = await actions.updateTemplateDefaults({
			templateId: "t1",
			defaultContent: { summary: { text: "updated" } },
		});

		expect(r.success).toBe(true);
		expect(templateUpdate).toHaveBeenCalledWith({
			where: { id: "t1" },
			data: { currentVersionId: "v1" },
		});
		expect(auditWriteMock).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "PROPOSAL_TEMPLATE_UPDATED",
				resourceType: "ProposalTemplate",
				resourceId: "t1",
			}),
		);
	});

	it("rejects when template not in registry", async () => {
		templateFindUnique.mockResolvedValue({
			id: "t1",
			key: "UNKNOWN_KEY",
			currentVersionId: "v0",
		});
		const r = await actions.updateTemplateDefaults({
			templateId: "t1",
			defaultContent: {},
		});
		expect(r.success).toBe(false);
	});

	it("rejects when content does not pass template schema", async () => {
		templateFindUnique.mockResolvedValue({
			id: "t1",
			key: "DESENQUADRAMENTO",
			currentVersionId: "v0",
		});
		const r = await actions.updateTemplateDefaults({
			templateId: "t1",
			defaultContent: { summary: { text: "" } }, // too short for min(20)
		});
		expect(r.success).toBe(false);
	});

	it("rejects when template not found", async () => {
		templateFindUnique.mockResolvedValue(null);
		const r = await actions.updateTemplateDefaults({
			templateId: "t1",
			defaultContent: {},
		});
		expect(r.success).toBe(false);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/template-actions.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement**

Create `src/features/proposals/template-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { auditLog } from "@/lib/audit/log";
import { requireAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";

import { templateRegistry } from "./templates";
import { updateTemplateDefaultsSchema } from "./template-schemas";

type ActionResult<T = void> =
	| ({ success: true } & (T extends void ? object : { data: T }))
	| { success: false; error: string };

export async function updateTemplateDefaults(
	input: { templateId: string; defaultContent: Record<string, unknown> },
): Promise<ActionResult<{ versionId: string; version: number }>> {
	const admin = await requireAdmin();

	const parsed = updateTemplateDefaultsSchema.safeParse(input);
	if (!parsed.success) return { success: false, error: "Dados inválidos" };

	const template = await db.proposalTemplate.findUnique({
		where: { id: parsed.data.templateId },
	});
	if (!template) return { success: false, error: "Template não encontrado" };

	const registered = templateRegistry[template.key];
	if (!registered) {
		return { success: false, error: "Template não registrado em código" };
	}

	const contentCheck = registered.schema.safeParse(parsed.data.defaultContent);
	if (!contentCheck.success) {
		return { success: false, error: "Conteúdo padrão inválido" };
	}

	const fieldsSchema = z.toJSONSchema(registered.schema);

	const result = await db.$transaction(async (tx) => {
		const count = await tx.proposalTemplateVersion.count({
			where: { templateId: template.id },
		});
		const version = count + 1;

		const created = await tx.proposalTemplateVersion.create({
			data: {
				templateId: template.id,
				version,
				fieldsSchema: fieldsSchema as object,
				defaultContent: contentCheck.data as object,
				createdById: admin.id,
			},
		});

		await tx.proposalTemplate.update({
			where: { id: template.id },
			data: { currentVersionId: created.id },
		});

		return created;
	});

	await auditLog.write({
		action: "PROPOSAL_TEMPLATE_UPDATED",
		actorId: admin.id,
		actorEmail: admin.email,
		resourceType: "ProposalTemplate",
		resourceId: template.id,
		metadata: { version: result.version },
		headers: await headers(),
	});

	revalidatePath("/admin/proposals/templates");
	revalidatePath(`/admin/proposals/templates/${template.id}`);

	return { success: true, data: { versionId: result.id, version: result.version } };
}
```

Note: Plan 1 standardized on Zod 4's built-in `z.toJSONSchema()`. Do not add an external JSON Schema conversion package; the dependency is intentionally unnecessary.

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/template-actions.test.ts
```

Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/template-actions.ts src/features/proposals/tests/template-actions.test.ts
git commit -m "feat(proposals): add updateTemplateDefaults action"
```

---

### Task 4: Render preview Route Handler

**Files:**
- Create: `src/app/api/admin/proposals/render-preview/route.ts`

- [ ] **Step 1: Write the route**

Create `src/app/api/admin/proposals/render-preview/route.ts`:

```ts
import { NextResponse } from "next/server";
import { z } from "zod";

import { renderTemplate } from "@/features/proposals/render";
import { templateRegistry } from "@/features/proposals/templates";
import { requireAdmin } from "@/lib/auth/helpers";

const bodySchema = z.object({
	templateKey: z.string(),
	editableContent: z.record(z.unknown()),
});

const DUMMY_DATA = {
	client: {
		name: "Cliente Exemplo LTDA",
		document: "12.345.678/0001-90",
		contact: "(48) 99999-9999",
		email: "exemplo@cliente.com",
		phone: "(48) 99999-9999",
	},
	commercial: {
		mainAmount: 1200,
		recurringAmount: 400,
		currency: "BRL",
		paymentTerms: "À vista ou em 3 parcelas",
	},
	proposal: { expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
};

export async function POST(request: Request) {
	await requireAdmin();
	const body = await request.json();
	const parsed = bodySchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "invalid_body" }, { status: 400 });
	}

	const registered = templateRegistry[parsed.data.templateKey as never];
	if (!registered) {
		return NextResponse.json({ error: "template_not_registered" }, { status: 404 });
	}

	const data = {
		...DUMMY_DATA,
		content: parsed.data.editableContent,
	};

	const html = renderTemplate(
		registered.html,
		data as unknown as Record<string, unknown>,
		registered.metadata,
	);

	return new Response(html, {
		headers: {
			"Content-Type": "text/html; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
}
```

This endpoint takes the in-progress `editableContent` (client-side state from the editor form) plus the template key, renders the proposal with dummy client/commercial data, and returns the HTML — the template editor iframe consumes this directly.

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/proposals/render-preview/route.ts
git commit -m "feat(proposals): add render-preview Route Handler for template editor"
```

---

### Task 5: Template list page

**Files:**
- Create: `src/app/admin/proposals/templates/page.tsx`
- Create: `src/features/proposals/components/template-list-card.tsx`

- [ ] **Step 1: Write the list card**

Create `src/features/proposals/components/template-list-card.tsx`:

```tsx
import Link from "next/link";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type TemplateRow = {
	id: string;
	name: string;
	key: string;
	category: "CONTINUOUS" | "ONE_OFF";
	isActive: boolean;
	currentVersion: { version: number; createdAt: Date } | null;
};

export function TemplateListCard({ template }: { template: TemplateRow }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{template.name}</CardTitle>
				<p className="text-muted-foreground text-sm">
					{template.category === "CONTINUOUS" ? "Serviço contínuo" : "Serviço pontual"}
					{template.isActive ? "" : " · inativo"}
				</p>
			</CardHeader>
			<CardContent className="text-muted-foreground text-sm">
				{template.currentVersion
					? `Versão atual: v${template.currentVersion.version} · ${new Intl.DateTimeFormat("pt-BR").format(template.currentVersion.createdAt)}`
					: "Sem versão"}
			</CardContent>
			<CardFooter>
				<Link href={`/admin/proposals/templates/${template.id}`} className="text-primary underline">
					Editar
				</Link>
			</CardFooter>
		</Card>
	);
}
```

- [ ] **Step 2: Write the list page**

Create `src/app/admin/proposals/templates/page.tsx`:

```tsx
import { TemplateListCard } from "@/features/proposals/components/template-list-card";
import { listAllTemplates } from "@/features/proposals/template-queries";

export const metadata = {
	title: "Templates de proposta — Admin DuoHub",
	robots: { index: false, follow: false, nocache: true },
};

export default async function TemplatesListPage() {
	const templates = await listAllTemplates();
	return (
		<div className="space-y-6 p-6">
			<h1 className="font-semibold text-2xl">Templates de proposta</h1>
			<div className="grid gap-4 md:grid-cols-2">
				{templates.map((t) => (
					<TemplateListCard
						key={t.id}
						template={{
							id: t.id,
							name: t.name,
							key: t.key,
							category: t.category,
							isActive: t.isActive,
							currentVersion: t.currentVersion
								? { version: t.currentVersion.version, createdAt: t.currentVersion.createdAt }
								: null,
						}}
					/>
				))}
			</div>
		</div>
	);
}
```

- [ ] **Step 3: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Smoke test**

```bash
pnpm dev
```

Open `/admin/proposals/templates`. Should show one card per template seeded (Desenquadramento + Reestruturação if both are in registry).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/proposals/templates/page.tsx src/features/proposals/components/template-list-card.tsx
git commit -m "feat(proposals): add /admin/proposals/templates list page"
```

---

### Task 6: Template editor form

**Files:**
- Create: `src/features/proposals/components/template-editor-form.tsx`

- [ ] **Step 1: Write the form**

Create `src/features/proposals/components/template-editor-form.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ProposalPreviewIframe } from "./proposal-preview-iframe";
import { updateTemplateDefaults } from "../template-actions";

type FieldDef = {
	path: string;
	label: string;
	kind: "text" | "multiline" | "currency" | "date" | "list";
	section: string;
};

export function TemplateEditorForm({
	templateId,
	templateKey,
	templateName,
	fields,
	initialContent,
}: {
	templateId: string;
	templateKey: string;
	templateName: string;
	fields: FieldDef[];
	initialContent: Record<string, unknown>;
}) {
	const [content, setContent] = useState<Record<string, unknown>>(initialContent);
	const [previewHtml, setPreviewHtml] = useState<string>("");
	const [activeSection, setActiveSection] = useState<string>(fields[0]?.section ?? "");
	const [saving, setSaving] = useState(false);
	const [saveResult, setSaveResult] = useState<string | null>(null);

	const sections = useMemo(() => {
		const map = new Map<string, FieldDef[]>();
		for (const f of fields) {
			if (!map.has(f.section)) map.set(f.section, []);
			map.get(f.section)!.push(f);
		}
		return Array.from(map.entries()).map(([key, fs]) => ({ key, fields: fs }));
	}, [fields]);

	// Debounced preview refresh
	useEffect(() => {
		const timer = setTimeout(async () => {
			const r = await fetch("/api/admin/proposals/render-preview", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ templateKey, editableContent: content }),
			});
			if (r.ok) setPreviewHtml(await r.text());
		}, 400);
		return () => clearTimeout(timer);
	}, [content, templateKey]);

	function setField(sectionKey: string, fieldKey: string, value: unknown) {
		setContent((prev) => ({
			...prev,
			[sectionKey]: {
				...(prev[sectionKey] as Record<string, unknown> | undefined),
				[fieldKey]: value,
			},
		}));
	}

	async function onSave() {
		setSaving(true);
		setSaveResult(null);
		const r = await updateTemplateDefaults({ templateId, defaultContent: content });
		setSaving(false);
		if (r.success) {
			setSaveResult(`Salvo como versão v${r.data.version}.`);
		} else {
			setSaveResult(`Erro: ${r.error}`);
		}
	}

	return (
		<div className="space-y-4">
			<header className="flex items-center justify-between">
				<h1 className="font-semibold text-xl">{templateName} — textos padrão</h1>
				<div className="flex items-center gap-3">
					{saveResult && <span className="text-sm text-muted-foreground">{saveResult}</span>}
					<Button onClick={onSave} disabled={saving}>
						{saving ? "Salvando..." : "Salvar nova versão"}
					</Button>
				</div>
			</header>

			<div className="grid h-[calc(100vh-200px)] grid-cols-12 gap-4">
				<aside className="col-span-2 space-y-1 border-r pr-3">
					{sections.map((s) => (
						<button
							type="button"
							key={s.key}
							onClick={() => setActiveSection(s.key)}
							className={`block w-full rounded px-2 py-1 text-left text-sm ${
								s.key === activeSection ? "bg-muted font-semibold" : ""
							}`}
						>
							{s.key}
						</button>
					))}
				</aside>

				<section className="col-span-5 space-y-3 overflow-auto">
					{sections
						.find((s) => s.key === activeSection)
						?.fields.map((f) => {
							const sectionData = (content[f.section] as Record<string, unknown> | undefined) ?? {};
							const fieldKey = f.path.split(".").slice(-1)[0];
							const value = sectionData[fieldKey] ?? "";
							if (f.kind === "multiline") {
								return (
									<div key={f.path} className="space-y-1">
										<Label>{f.label}</Label>
										<Textarea
											value={String(value)}
											onChange={(e) => setField(f.section, fieldKey, e.target.value)}
											rows={4}
										/>
									</div>
								);
							}
							return (
								<div key={f.path} className="space-y-1">
									<Label>{f.label}</Label>
									<Input
										value={String(value)}
										onChange={(e) => setField(f.section, fieldKey, e.target.value)}
									/>
								</div>
							);
						})}
				</section>

				<section className="col-span-5">
					<ProposalPreviewIframe html={previewHtml} />
				</section>
			</div>
		</div>
	);
}
```

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/components/template-editor-form.tsx
git commit -m "feat(proposals): add TemplateEditorForm with debounced preview"
```

---

### Task 7: Template editor page

**Files:**
- Create: `src/app/admin/proposals/templates/[id]/page.tsx`

- [ ] **Step 1: Write the page**

Create `src/app/admin/proposals/templates/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { TemplateEditorForm } from "@/features/proposals/components/template-editor-form";
import { templateRegistry } from "@/features/proposals/templates";
import { getTemplateForEditor } from "@/features/proposals/template-queries";

export const metadata = {
	robots: { index: false, follow: false, nocache: true },
};

export default async function TemplateEditorPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const template = await getTemplateForEditor(id);
	if (!template) notFound();

	const registered = templateRegistry[template.key];
	if (!registered) {
		throw new Error(`Template ${template.key} not in registry`);
	}

	const fields = Object.entries(registered.metadata).map(([path, meta]) => ({
		path,
		label: meta.label,
		kind: meta.kind,
		section: meta.section,
	}));

	const initial =
		(template.currentVersion?.defaultContent as Record<string, unknown>) ??
		(registered.defaultContent as Record<string, unknown>);

	return (
		<div className="p-6">
			<TemplateEditorForm
				templateId={template.id}
				templateKey={template.key}
				templateName={template.name}
				fields={fields}
				initialContent={initial}
			/>
		</div>
	);
}
```

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Smoke test**

```bash
pnpm dev
```

1. Open `/admin/proposals/templates` → click "Editar" on Desenquadramento.
2. Editor opens with sidebar (sections), form fields populated, iframe preview.
3. Type in a field → preview updates after ~400ms.
4. Click "Salvar nova versão" → success message shows `Salvo como versão v2`.
5. Reload page → form shows v2's defaults.
6. Check DB: `ProposalTemplate.currentVersionId` points to v2's row.

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/proposals/templates/[id]/page.tsx
git commit -m "feat(proposals): add template editor page"
```

---

### Task 8: Lint, tests, build, manual smoke

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

Expected: all tests pass (existing proposals tests + new template editor tests).

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

- [ ] **Step 5: End-to-end manual smoke**

1. `/admin/proposals/templates` → list shows templates.
2. Click "Editar" Desenquadramento → editor opens.
3. Edit `summary.text` → preview updates after debounce.
4. Edit `terms.validityText` → preview updates.
5. Click "Salvar nova versão" → success → reload → defaults persist.
6. Go to `/admin/proposals/new` → create a new proposal with Desenquadramento → editor shows the new defaults.
7. Existing proposals (created before this edit) still show their original `editableContent` (frozen).
8. Check audit log: `PROPOSAL_TEMPLATE_UPDATED` entry with `resourceType: "ProposalTemplate"`.

- [ ] **Step 6: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "chore(proposals): post-verification fixes for template editor"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Template editor reuses sidebar/form/preview layout (from Plan 2 components) — Task 6
- [x] Uses dummy data instead of real client — Task 4 (render-preview endpoint)
- [x] Saving creates new `ProposalTemplateVersion` immediately active — Task 3
- [x] Registers `PROPOSAL_TEMPLATE_UPDATED` with correct `resourceType` — Task 3
- [x] Affects only new proposals (existing ones reference frozen `templateVersionId`) — guaranteed by Plan 1 schema design
- [x] Toggle `isActive` deferred to backlog — not implemented

**Out of scope:**
- Badge "template atualizado" in proposal editor — backlog F2+
- Toggle `isActive` from admin UI — backlog F2+

**Type consistency**:
- `UpdateTemplateDefaultsInput` exported from `template-schemas.ts`.
- `TemplateRow` type defined inline in `template-list-card.tsx`.
- `FieldDef` shape consistent with the one used in Plan 2's `SectionForm`.

---

## Notes for the Implementer

- **Worktree**: isolated worktree before starting.
- **Linear**: DUO-59 (parent DUO-56). Branch `feat/DUO-59/proposals-template-editor`.
- **Dependency**: DUO-57 (Plan 1) + DUO-58 (Plan 2) merged. Reuses `ProposalPreviewIframe` and `templateRegistry`/`renderTemplate` from those.
- **Subagent dispatch**: Tasks 1-4 can each be a single subagent. Task 5 (list page) and Task 6 (editor form) are sequential — the editor reuses the iframe component.
- **JSON Schema generation**: Plan 1 standardized on Zod 4's built-in `z.toJSONSchema()`; reuse it here to keep `fieldsSchema` shape identical and avoid adding an external conversion package.
- **Preview refresh**: 400ms debounce on the editor's preview iframe; admin sees changes nearly live without spamming the server.
