# F2 Proposals — Public Link + Cron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the client-facing side of F2: the public proposal link at `/propostas/[token]`, the mobile aviso, the expired/cancelled fallback pages, and the daily Vercel Cron that consolidates `EXPIRED` status. After this plan, a client receives a link, opens it in any browser, sees the proposal inside a DuoHub-branded moldura with a WhatsApp button, and the system tracks viewing without leaking PII or breaking SEO.

**Architecture:**
- Route under the `(public-app)` group: `src/app/(public-app)/propostas/[token]/page.tsx`. Public group is allowed to use `headers()`, `cookies()`, dynamic rendering — unlike `(marketing)`.
- Token validation flow: hash the URL token → look up the matching `Proposal.publicTokenHash` → load the latest `ProposalPublishedVersion` → check `expiresAt` + `status` → render or fallback.
- Document rendering: the `renderedHtml` column (Plan 1 column) is served inside an `<iframe srcDoc={html}>` so the proposal's CSS/HTML doesn't collide with the moldura's Tailwind/shadcn UI.
- Mobile aviso: dismissable banner persisted in `sessionStorage`.
- Rate limit: extend existing `src/lib/ratelimit.ts` with a public-proposal limiter. Throttle anonymous requests per IP + token hash; never put the raw bearer token in Redis keys or analytics.
- Cron: Route Handler at `/api/cron/proposals/expire`, secured by `CRON_SECRET`, registered in `vercel.json`. Marks `PUBLISHED`/`SENT` proposals with `expiresAt <= NOW()` as `EXPIRED`.
- Timezone: reuse `src/features/proposals/tz.ts` from Plan 2. `expiresAt` is already normalized to the end of the selected São Paulo day before publish.

**Tech Stack:**
- Next.js 16 App Router (RSC + Route Handlers, dynamic rendering)
- `date-fns` + `date-fns-tz` (new)
- `@upstash/redis` + `@upstash/ratelimit` (existing F0)
- Vitest

**Linear:** [DUO-60 — F2.4 Public Link + Cron](https://linear.app/gvieiram/issue/DUO-60/f24-link-publico-cron-de-expired) (parent DUO-56). Branch: `feat/DUO-60/proposals-public-link`.

**Depends on:** DUO-57 (Plan 1) + DUO-58 (Plan 2) merged. Reuses `hashToken` (Plan 2), `effectiveStatus` (Plan 2), and the `renderedHtml` column from Plan 1.

**Out of scope:**
- Premium landing UI for the public link — backlog F2+.
- Client accept/decline in the public link — backlog F2+.
- Client PDF download button — backlog F2+ (gatilho pra reabrir server PDF).
- Mobile responsive reflow of the document — by design (decision 4).

---

## File Structure

### Created

```
src/features/proposals/
├── public-queries.ts                                   # findProposalByToken
├── public-actions.ts                                   # recordView
└── components/
    ├── public-frame.tsx
    ├── public-document-iframe.tsx
    ├── public-mobile-notice.tsx
    └── public-expired-page.tsx

src/app/(public-app)/propostas/[token]/
├── page.tsx                                            # main route
└── layout.tsx                                          # public layout (no admin chrome)

src/app/api/cron/proposals/expire/
└── route.ts                                            # daily cron

vercel.json                                             # CREATE if missing, or MODIFY to register cron
```

### Modified
- `src/lib/ratelimit.ts` — add `publicProposalRateLimitByIp`.

---

## Tasks

### Task 1: Verify timezone helper dependency

**Files:** verification only

- [ ] **Step 1: Confirm Plan 2 helper exists**

```bash
test -f src/features/proposals/tz.ts && rg -n "formatExpirationBR|isExpired" src/features/proposals/tz.ts
```

Expected: `formatExpirationBR` and `isExpired` are exported. If missing, stop and finish DUO-58 first; this plan depends on Plan 2's timezone helper.

- [ ] **Step 2: Run helper tests**

```bash
pnpm test src/features/proposals/tests/tz.test.ts
```

Expected: pass.

---

### Task 2: Public queries — findProposalByToken

**Files:**
- Create: `src/features/proposals/public-queries.ts`
- Create: `src/features/proposals/tests/public-queries.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/public-queries.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const proposalFindFirst = vi.fn();
const publishedFindFirst = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
	db: {
		proposal: { findFirst: proposalFindFirst },
		proposalPublishedVersion: { findFirst: publishedFindFirst },
	},
}));

const queries = await import("../public-queries");

beforeEach(() => vi.clearAllMocks());

describe("findProposalByToken", () => {
	it("hashes token and looks up by publicTokenHash", async () => {
		proposalFindFirst.mockResolvedValue({ id: "p1", publishedVersions: [{ id: "v1" }] });
		await queries.findProposalByToken("my-token");
		const call = proposalFindFirst.mock.calls[0][0];
		expect(call.where.publicTokenHash).toMatch(/^[0-9a-f]{64}$/);
	});

	it("returns null when proposal not found", async () => {
		proposalFindFirst.mockResolvedValue(null);
		expect(await queries.findProposalByToken("nope")).toBeNull();
	});

	it("returns null when no published version exists", async () => {
		proposalFindFirst.mockResolvedValue({ id: "p1", publishedVersions: [] });
		expect(await queries.findProposalByToken("my-token")).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/public-queries.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/features/proposals/public-queries.ts`:

```ts
import "server-only";
import { db } from "@/lib/db";
import { hashToken } from "./token";

export async function findProposalByToken(token: string) {
	const hash = hashToken(token);
	const proposal = await db.proposal.findFirst({
		where: { publicTokenHash: hash },
		include: {
			template: true,
			client: { select: { id: true, legalName: true } },
			publishedVersions: {
				orderBy: { version: "desc" },
				take: 1,
			},
		},
	});
	if (!proposal) return null;
	if (proposal.publishedVersions.length === 0) return null;
	return proposal;
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/public-queries.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/public-queries.ts src/features/proposals/tests/public-queries.test.ts
git commit -m "feat(proposals): add findProposalByToken public query"
```

---

### Task 3: recordView action

**Files:**
- Create: `src/features/proposals/public-actions.ts`
- Create: `src/features/proposals/tests/public-actions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/features/proposals/tests/public-actions.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const proposalUpdate = vi.fn();

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
	db: { proposal: { update: proposalUpdate } },
}));

const actions = await import("../public-actions");

beforeEach(() => vi.clearAllMocks());

describe("recordView", () => {
	it("sets firstViewedAt only if null", async () => {
		await actions.recordView("p1", null);
		expect(proposalUpdate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: "p1" },
				data: expect.objectContaining({
					firstViewedAt: expect.any(Date),
					lastViewedAt: expect.any(Date),
				}),
			}),
		);
	});

	it("only updates lastViewedAt if firstViewedAt already set", async () => {
		await actions.recordView("p1", new Date("2026-05-01"));
		expect(proposalUpdate).toHaveBeenCalledWith({
			where: { id: "p1" },
			data: { lastViewedAt: expect.any(Date) },
		});
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/features/proposals/tests/public-actions.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/features/proposals/public-actions.ts`:

```ts
import "server-only";
import { db } from "@/lib/db";

export async function recordView(
	proposalId: string,
	currentFirstViewedAt: Date | null,
): Promise<void> {
	const now = new Date();
	if (currentFirstViewedAt) {
		await db.proposal.update({
			where: { id: proposalId },
			data: { lastViewedAt: now },
		});
	} else {
		await db.proposal.update({
			where: { id: proposalId },
			data: { firstViewedAt: now, lastViewedAt: now },
		});
	}
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/features/proposals/tests/public-actions.test.ts
```

Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add src/features/proposals/public-actions.ts src/features/proposals/tests/public-actions.test.ts
git commit -m "feat(proposals): add recordView server function"
```

---

### Task 4: Public document iframe component

**Files:**
- Create: `src/features/proposals/components/public-document-iframe.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/proposals/components/public-document-iframe.tsx`:

```tsx
"use client";

export function PublicDocumentIframe({ html }: { html: string }) {
	return (
		<iframe
			srcDoc={html}
			title="Proposta DuoHub"
			sandbox=""
			className="h-full w-full border-0 bg-white"
		/>
	);
}
```

The `renderedHtml` from the snapshot column already has `<html>/<head>/<body>` and CSS embedded. `srcDoc` mounts it in an isolated browsing context so the moldura's Tailwind styling doesn't bleed in and the proposal CSS doesn't pollute the parent. `sandbox=""` intentionally blocks scripts and same-origin access; public proposal templates must be static HTML/CSS.

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/components/public-document-iframe.tsx
git commit -m "feat(proposals): add PublicDocumentIframe component"
```

---

### Task 5: Mobile dismissable notice

**Files:**
- Create: `src/features/proposals/components/public-mobile-notice.tsx`

- [ ] **Step 1: Write the component**

Create `src/features/proposals/components/public-mobile-notice.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "duohub-proposal-mobile-notice-dismissed";

export function PublicMobileNotice({ whatsappUrl }: { whatsappUrl: string }) {
	const [dismissed, setDismissed] = useState<boolean | null>(null);

	useEffect(() => {
		setDismissed(sessionStorage.getItem(STORAGE_KEY) === "1");
	}, []);

	if (dismissed === null || dismissed) return null;

	function dismiss() {
		sessionStorage.setItem(STORAGE_KEY, "1");
		setDismissed(true);
	}

	return (
		<div className="md:hidden">
			<div className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-3 text-sm">
				<div className="flex-1">
					Esta proposta foi formatada como documento. Para a melhor leitura, abra em
					uma tela maior ou em PDF.{" "}
					<a href={whatsappUrl} className="underline" target="_blank" rel="noopener">
						Prefere conversar?
					</a>
				</div>
				<button
					type="button"
					onClick={dismiss}
					aria-label="Fechar aviso"
					className="px-1"
				>
					×
				</button>
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
git add src/features/proposals/components/public-mobile-notice.tsx
git commit -m "feat(proposals): add PublicMobileNotice dismissable banner"
```

---

### Task 6: Public moldura (frame) component

**Files:**
- Create: `src/features/proposals/components/public-frame.tsx`

- [ ] **Step 1: Write the moldura**

Create `src/features/proposals/components/public-frame.tsx`:

```tsx
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { formatExpirationBR } from "../tz";
import { PublicDocumentIframe } from "./public-document-iframe";
import { PublicMobileNotice } from "./public-mobile-notice";

export function PublicFrame({
	clientName,
	templateName,
	expiresAt,
	whatsappUrl,
	html,
}: {
	clientName: string;
	templateName: string;
	expiresAt: Date | null;
	whatsappUrl: string;
	html: string;
}) {
	return (
		<div className="flex min-h-screen flex-col bg-muted">
			<header className="no-print flex items-center justify-between border-b bg-background px-4 py-3">
				<div className="flex items-center gap-2 font-semibold">
					<span>DuoHub Gestão Contábil</span>
				</div>
				<div className="hidden text-muted-foreground text-sm md:block">
					{templateName} para <strong>{clientName}</strong>
					{expiresAt && <> · válida até {formatExpirationBR(expiresAt)}</>}
				</div>
				<div className="flex gap-2">
					<a href={whatsappUrl} target="_blank" rel="noopener">
						<Button variant="default" size="sm">
							WhatsApp
						</Button>
					</a>
					<a href="?fullscreen=1" rel="nofollow">
						<Button variant="outline" size="sm">
							Tela cheia
						</Button>
					</a>
				</div>
			</header>

			<PublicMobileNotice whatsappUrl={whatsappUrl} />

			<main className="flex-1">
				<div className="mx-auto h-[calc(100vh-64px)] max-w-5xl">
					<PublicDocumentIframe html={html} />
				</div>
			</main>
		</div>
	);
}
```

Note: the WhatsApp button calls into existing `whatsappUrl()` from `src/content/company.ts` — the page (Task 8) composes the URL with the contextual message and passes it down.

- [ ] **Step 2: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/features/proposals/components/public-frame.tsx
git commit -m "feat(proposals): add PublicFrame moldura"
```

---

### Task 7: Expired/cancelled fallback page component

**Files:**
- Create: `src/features/proposals/components/public-expired-page.tsx`

- [ ] **Step 1: Write the fallback**

Create `src/features/proposals/components/public-expired-page.tsx`:

```tsx
import { Button } from "@/components/ui/button";

export function PublicExpiredPage({
	reason,
	whatsappUrl,
}: {
	reason: "expired" | "cancelled";
	whatsappUrl: string;
}) {
	const messages = {
		expired: {
			title: "Proposta expirada",
			body: "Esta proposta passou da validade. Entre em contato com a DuoHub para receber uma nova.",
		},
		cancelled: {
			title: "Proposta cancelada",
			body: "Esta proposta foi cancelada. Entre em contato com a DuoHub para tirar dúvidas.",
		},
	}[reason];

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted p-6">
			<div className="max-w-md space-y-4 rounded-lg border bg-background p-8 text-center">
				<h1 className="font-semibold text-2xl">{messages.title}</h1>
				<p className="text-muted-foreground">{messages.body}</p>
				<a href={whatsappUrl} target="_blank" rel="noopener" className="inline-block">
					<Button>Falar no WhatsApp</Button>
				</a>
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
git add src/features/proposals/components/public-expired-page.tsx
git commit -m "feat(proposals): add PublicExpiredPage fallback component"
```

---

### Task 8: Public proposal route

**Files:**
- Create: `src/app/(public-app)/propostas/[token]/page.tsx`
- Create: `src/app/(public-app)/propostas/[token]/layout.tsx`
- Modify: `src/proxy.ts`
- Modify: `src/proxy.test.ts`

- [ ] **Step 1: Write the layout**

Create `src/app/(public-app)/propostas/[token]/layout.tsx`:

```tsx
export const metadata = {
	robots: { index: false, follow: false, nocache: true },
};

export default function PropostaLayout({ children }: { children: React.ReactNode }) {
	return children;
}
```

- [ ] **Step 2: Set `Cache-Control: no-store` in proxy**

Modify `src/proxy.ts` so `/propostas/*` stays public but receives no-store headers:

```ts
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

function noStore(response: NextResponse): NextResponse {
	response.headers.set("Cache-Control", "no-store, max-age=0");
	return response;
}

export function proxy(request: NextRequest) {
	if (request.nextUrl.pathname.startsWith("/propostas/")) {
		return noStore(NextResponse.next());
	}

	if (getSessionCookie(request)) {
		return NextResponse.next();
	}

	const loginUrl = new URL("/login", request.url);
	loginUrl.searchParams.set("next", request.nextUrl.pathname);
	return NextResponse.redirect(loginUrl);
}

export const config = {
	matcher: ["/admin", "/admin/:path*", "/app/:path*", "/propostas/:path*"],
};
```

Update `src/proxy.test.ts` so `nextMock` returns headers:

```ts
const nextMock = vi.fn(() => ({ kind: "next", headers: new Headers() }));
```

Then update the matcher expectation and add:

```ts
expect(config.matcher).toEqual([
	"/admin",
	"/admin/:path*",
	"/app/:path*",
	"/propostas/:path*",
]);

it("does not require auth on public proposal links and sets no-store", () => {
	redirectMock.mockClear();
	nextMock.mockClear();
	getSessionCookieMock.mockReturnValueOnce(null);
	const response = proxy(makeRequest("/propostas/public-token")) as {
		headers: Headers;
	};
	expect(redirectMock).not.toHaveBeenCalled();
	expect(nextMock).toHaveBeenCalledTimes(1);
	expect(response.headers.get("Cache-Control")).toBe("no-store, max-age=0");
});
```

- [ ] **Step 3: Write the page**

Create `src/app/(public-app)/propostas/[token]/page.tsx`:

```tsx
import { notFound } from "next/navigation";

import { PublicExpiredPage } from "@/features/proposals/components/public-expired-page";
import { PublicFrame } from "@/features/proposals/components/public-frame";
import { findProposalByToken } from "@/features/proposals/public-queries";
import { recordView } from "@/features/proposals/public-actions";
import { isExpired } from "@/features/proposals/tz";
import { whatsappUrl } from "@/content/company";

export const dynamic = "force-dynamic";

function buildWhatsAppUrl(templateName: string, clientName: string) {
	return whatsappUrl(
		`Olá, recebi a proposta de ${templateName} para ${clientName} e gostaria de falar sobre ela.`,
	);
}

export default async function PropostaPage({
	params,
}: {
	params: Promise<{ token: string }>;
}) {
	const { token } = await params;

	const proposal = await findProposalByToken(token);
	if (!proposal) notFound();

	const latestVersion = proposal.publishedVersions[0];
	const clientName = proposal.client?.legalName ?? "Cliente";
	const templateName = proposal.template.name;
	const wa = buildWhatsAppUrl(templateName, clientName);

	// Cancelled and expired guard
	if (proposal.status === "CANCELLED") {
		return <PublicExpiredPage reason="cancelled" whatsappUrl={wa} />;
	}

	const expiredNow = isExpired(proposal.expiresAt);
	if (proposal.status === "EXPIRED" || expiredNow) {
		return <PublicExpiredPage reason="expired" whatsappUrl={wa} />;
	}

	await recordView(proposal.id, proposal.firstViewedAt);

	const html = latestVersion.renderedHtml;
	if (!html) notFound();

	return (
		<PublicFrame
			clientName={clientName}
			templateName={templateName}
			expiresAt={proposal.expiresAt}
			whatsappUrl={wa}
			html={html}
		/>
	);
}
```

Notes:
- Route is dynamic (`force-dynamic`), reads from the URL token. No static optimization possible.
- The metadata is `noindex` via the layout; HTTP `Cache-Control: no-store` is set in `src/proxy.ts`.
- `recordView` is awaited intentionally. Visualization is an audit signal, so the DB write should not be silently dropped by the serverless runtime.
- `headers()` is used by the rate-limit step to derive the requester IP. Follow the existing `x-real-ip` first, then `x-forwarded-for` fallback pattern from the IRPF feature.

- [ ] **Step 4: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 5: Smoke test**

```bash
pnpm dev
```

1. Use a published proposal (via Plan 2's flow) to obtain the `publicUrl` returned by `publishProposal`.
2. Visit the returned `/propostas/<token>` URL — should render the moldura + iframe document.
3. Manually expire the proposal in DB or via cron — refresh → expired page.
4. Cancel the proposal in DB → refresh → cancelled page.
5. Visit with a bad token → 404.

- [ ] **Step 6: Commit**

```bash
git add src/app/(public-app)/propostas/ src/proxy.ts src/proxy.test.ts
git commit -m "feat(proposals): add public proposal route with moldura and fallbacks"
```

---

### Task 9: Rate limit the public route

**Files:**
- Modify: `src/lib/ratelimit.ts`
- Modify: `src/app/(public-app)/propostas/[token]/page.tsx`

- [ ] **Step 1: Add the public proposal limiter**

In `src/lib/ratelimit.ts`, extend `globalForRatelimit`:

```ts
publicProposalRateLimitByIp: Ratelimit | undefined;
```

Then add the limiter:

```ts
function createPublicProposalRateLimitByIp(): Ratelimit {
	return new Ratelimit({
		redis,
		limiter: Ratelimit.slidingWindow(60, "10 m"),
		analytics: true,
		prefix: "ratelimit:public-proposal:ip",
	});
}

export const publicProposalRateLimitByIp =
	globalForRatelimit.publicProposalRateLimitByIp ??
	createPublicProposalRateLimitByIp();

if (process.env.NODE_ENV !== "production") {
	globalForRatelimit.publicProposalRateLimitByIp = publicProposalRateLimitByIp;
}
```

- [ ] **Step 2: Wrap the page with rate limit check**

In `src/app/(public-app)/propostas/[token]/page.tsx`, add at the top of the `PropostaPage` function (after `const { token } = await params;`):

```tsx
import { publicProposalRateLimitByIp } from "@/lib/ratelimit";
import { hashToken } from "@/features/proposals/token";
import { headers } from "next/headers";

// ...

const requestHeaders = await headers();
const realIp = requestHeaders.get("x-real-ip")?.trim();
const forwardedIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
const ip = realIp || forwardedIp || "anonymous";
const tokenHash = hashToken(token);
const limit = await publicProposalRateLimitByIp.limit(`${ip}:${tokenHash}`);
if (!limit.success) {
	return (
		<div className="flex min-h-screen items-center justify-center p-6">
			<p className="text-muted-foreground text-sm">
				Muitos acessos. Aguarde um instante e tente novamente.
			</p>
		</div>
	);
}
```

Note: never use the raw token in the rate-limit key. The public proposal URL token is a bearer credential; using the SHA-256 hash keeps Redis/analytics from storing the live link secret.

- [ ] **Step 3: Verify compile**

```bash
pnpm tsc --noEmit
```

- [ ] **Step 4: Smoke test**

Hit the URL repeatedly — once the limit is exceeded, the page should switch to the throttle message.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ratelimit.ts src/app/(public-app)/propostas/[token]/page.tsx
git commit -m "feat(proposals): add rate limit to public proposal route"
```

---

### Task 10: Cron endpoint — proposals/expire

**Files:**
- Create: `src/app/api/cron/proposals/expire/route.ts`
- Create: `src/app/api/cron/proposals/expire/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/cron/proposals/expire/route.test.ts`:

```ts
// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.fn();

vi.mock("@/lib/db", () => ({
	db: { proposal: { updateMany } },
}));

vi.stubEnv("CRON_SECRET", "test-secret");

const { GET } = await import("./route");

beforeEach(() => vi.clearAllMocks());

describe("GET /api/cron/proposals/expire", () => {
	it("returns 401 without authorization header", async () => {
		const r = await GET(new Request("http://localhost/api/cron/proposals/expire"));
		expect(r.status).toBe(401);
	});

	it("returns 401 with wrong secret", async () => {
		const r = await GET(
			new Request("http://localhost/api/cron/proposals/expire", {
				headers: { authorization: "Bearer wrong" },
			}),
		);
		expect(r.status).toBe(401);
	});

	it("runs updateMany when secret matches", async () => {
		updateMany.mockResolvedValue({ count: 3 });
		const r = await GET(
			new Request("http://localhost/api/cron/proposals/expire", {
				headers: { authorization: "Bearer test-secret" },
			}),
		);
		expect(r.status).toBe(200);
		expect(updateMany).toHaveBeenCalledWith({
			where: {
				status: { in: ["PUBLISHED", "SENT"] },
				expiresAt: { lte: expect.any(Date) },
			},
			data: { status: "EXPIRED" },
		});
		const body = await r.json();
		expect(body).toEqual({ ok: true, expired: 3 });
	});
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
pnpm test src/app/api/cron/proposals/expire/route.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement**

Create `src/app/api/cron/proposals/expire/route.ts`:

```ts
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
	const expected = process.env.CRON_SECRET;
	const auth = request.headers.get("authorization");
	if (!expected || auth !== `Bearer ${expected}`) {
		return new Response("unauthorized", { status: 401 });
	}

	const result = await db.proposal.updateMany({
		where: {
			status: { in: ["PUBLISHED", "SENT"] },
				expiresAt: { lte: new Date() },
		},
		data: { status: "EXPIRED" },
	});

	return NextResponse.json({ ok: true, expired: result.count });
}
```

- [ ] **Step 4: Run to verify it passes**

```bash
pnpm test src/app/api/cron/proposals/expire/route.test.ts
```

Expected: 3 passed.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/proposals/expire/
git commit -m "feat(proposals): add daily EXPIRED cron endpoint"
```

---

### Task 11: Register cron in vercel.json

**Files:**
- Create or modify: `vercel.json` (project root)

- [ ] **Step 1: Inspect current vercel.json**

```bash
cat vercel.json 2>/dev/null || echo "vercel.json missing"
```

- [ ] **Step 2: Add cron configuration**

If `vercel.json` does not exist, create it with:

```json
{
	"crons": [
		{
			"path": "/api/cron/proposals/expire",
			"schedule": "0 6 * * *"
		}
	]
}
```

If it exists, add the `crons` entry to the existing JSON (merge, do not overwrite other fields).

Schedule `0 6 * * *` = 06:00 UTC daily = 03:00 BRT (per spec).

- [ ] **Step 3: Verify**

```bash
cat vercel.json
```

Expected: valid JSON with the cron entry visible.

- [ ] **Step 4: Add `CRON_SECRET` env to project**

Manually add `CRON_SECRET=<random 32-byte hex>` to Vercel project env vars (production + preview). Generate with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This step is **out of CI** — it must be done by an admin in the Vercel dashboard or via `vercel env add CRON_SECRET production`. Document in PR description.

- [ ] **Step 5: Commit**

```bash
git add vercel.json
git commit -m "feat(proposals): register daily EXPIRED cron in vercel.json"
```

---

### Task 12: Lint, tests, build, manual smoke

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

Expected: all tests pass.

- [ ] **Step 3: TypeScript**

```bash
pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Build**

```bash
pnpm build
```

Expected: build succeeds. Confirm the cron route is built as a Server Route Handler.

- [ ] **Step 5: Manual smoke**

1. Publish a proposal via `/admin/proposals/[id]` → publish action returns/links token.
2. Open `/propostas/<token>` in a private window (no admin session).
3. Verify moldura renders with WhatsApp button + iframe document inside.
4. On mobile width (or DevTools mobile emulation), the mobile aviso shows; dismiss persists across reload (session).
5. Edit DB to set `expiresAt` to past → reload → expired page.
6. Edit DB to `status = CANCELLED` → reload → cancelled page.
7. Hit cron endpoint locally:

```bash
curl -i -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/proposals/expire
```

Expected: 200 with `{"ok": true, "expired": N}`.

8. Verify `firstViewedAt`/`lastViewedAt` updated in DB after each page open.

- [ ] **Step 6: Final commit (if fixes needed)**

```bash
git add -A
git commit -m "chore(proposals): post-verification fixes for public link"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Public route `/propostas/[token]` in `(public-app)` group — Task 8
- [x] Token validated via SHA-256 hash lookup — Task 2
- [x] Moldura: marca, nome cliente, tipo, validade, WhatsApp, fullscreen — Task 6
- [x] Mobile aviso dismissable (sessionStorage) — Task 5
- [x] `noindex` + HTTP `Cache-Control: no-store` — Task 8 layout + proxy
- [x] Cancelled/expired guard with fallback page — Tasks 7, 8
- [x] Visualization tracking (`firstViewedAt` / `lastViewedAt`) — Task 3
- [x] Rate limit per IP/token hash — Task 9
- [x] Cron diário 03:00 BRT (`0 6 * * *` UTC) — Task 11
- [x] Cron protected by `CRON_SECRET` — Task 10
- [x] São Paulo TZ helpers — Task 1 verifies helper from Plan 2
- [x] iframe srcDoc isolates document CSS — Task 4

**Out of scope:**
- Premium landing UI for link — backlog F2+.
- Client accept/decline buttons — backlog F2+.
- Client PDF download — backlog F2+.

**Type consistency**:
- `findProposalByToken` returns `Proposal & { publishedVersions: ProposalPublishedVersion[] }` — consumed by page Task 8.
- `recordView` takes `(proposalId: string, currentFirstViewedAt: Date | null)` — called from page Task 8.
- `isExpired` / `formatExpirationBR` consistent signatures — used in page + moldura.

---

## Notes for the Implementer

- **Worktree**: isolated worktree before starting.
- **Linear**: DUO-60 (parent DUO-56). Branch `feat/DUO-60/proposals-public-link`.
- **Dependencies**: DUO-57 + DUO-58 merged. Reuses `hashToken` from Plan 2's `token.ts` and the `renderedHtml` column from Plan 1.
- **Subagent dispatch**: Tasks 1-3 (timezone verification + query + action) can each run independently. Tasks 4-7 (components) are independent. Task 8 (page/proxy) integrates the UI. Tasks 10-11 (cron) are independent and can run in parallel with the UI work.
- **`CRON_SECRET`**: manual env setup required in Vercel dashboard or via `vercel env add`. Document in PR.
- **Rate limit**: extends the existing Upstash setup in `src/lib/ratelimit.ts`. Don't skip rate-limiting — it's a spec requirement.
- **Public route caching**: `dynamic = "force-dynamic"` ensures every access hits DB. `Cache-Control: no-store` is set in `src/proxy.ts`; metadata alone is not enough for HTTP caching.
- **`recordView`**: awaited in the public route. It is still not a commercial status transition, but it should be reliable enough for basic audit/visibility.
