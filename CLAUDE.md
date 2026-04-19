# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Institutional site and future digital platform for **DuoHub Gestão Contábil**, a Brazilian accounting/consulting firm serving micro and small businesses (MEI, ME, EPP), startups, and freelancers.

Product direction and technical decisions live alongside the code:

- [`docs/roadmap.md`](./docs/roadmap.md) — product phases (F0 IR page → F1 admin foundation → F2 proposals → F3 free tools → F4 client portal).
- [`docs/architecture.md`](./docs/architecture.md) — full technical reference (stack, route structure, security). Always consult this before introducing a new capability.
- [`docs/ci-cd.md`](./docs/ci-cd.md) — deployment pipeline.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Production build
pnpm lint      # Biome check with safe autofixes
pnpm format    # Biome format
```

No test runner is configured. If one is added, use **Jest** with tests co-located next to the source file (e.g., `provider.tsx` → `provider.test.tsx` in the same directory).

## Tech Stack

**In use today:**

- **Next.js 16** (App Router), **React 19**, Node >=20.9.0
- **Tailwind CSS v4** with CSS variables for theming
- **shadcn/ui** (new-york style) + **Radix UI** primitives
- **Framer Motion** for animations
- **Zustand** for client state
- **Biome** for linting and formatting (source of truth — not ESLint/Prettier)
- Deployed on **Vercel**

**Planned for F1+** (do not introduce before the phase lands — see `docs/architecture.md`):

- **Postgres** via Neon + **Prisma** (ORM) — F1a
- **Better Auth** (auth, admin + client roles) — F1a
- **Resend** (transactional email) — F0
- **Infisical** (KMS / key vault, envelope encryption for digital certificates) — F1b
- **Cloudflare R2** as the primary storage provider — F1b (encrypted certificates) and F4 (general client documents)
- **`@react-pdf/renderer`** (PDF generation) — F2
- **Zod** + **`@t3-oss/env-nextjs`** (validation, env vars) — F1a
- **Upstash Redis** + `@upstash/ratelimit` (rate limiting) — F0

## Code Conventions

- **Biome** enforces: tabs (width 2), line width 80, double quotes, semicolons, LF endings, kebab-case filenames, camelCase/PascalCase identifiers
- **Code in English**, **content in Portuguese (pt-BR)**
- Path alias: `@/*` → `./src/*`
- Use `cn()` from `@/lib/utils` for all className merging (combines clsx + tailwind-merge)
- Biome's `useSortedClasses` applies to: `cn()`, `cva()`, `clsx()`, `tw*` functions
- Conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Branch naming convention: `feat/<DUO-01>/<feature-name>` or `fix/<DUO-01>/<bug-name>` or `chore/<DUO-01>/<task-name>`

## Architecture

### Content System

All user-facing text lives in `src/content/` — **never hardcode content in components**. For new pages or distinct contexts, create a dedicated file (e.g., `src/content/messages/about.ts`) rather than extending existing ones:

- `src/content/company.ts` — brand name, WhatsApp number, social links, `whatsappUrl(text)` helper
- `src/content/messages/common.ts` — shared UI strings (nav, forms, a11y labels)
- `src/content/messages/home.ts` — full landing page content (hero, features, about, testimonials, FAQ, CTA, footer)
- `src/content/messages/index.ts` — re-exports combined messages object

Access content in components via the Zustand store:

```ts
import { useCompany, useMessages } from "@/stores/use-content-store";
const company = useCompany();
const messages = useMessages();
```

### Route Structure (App Router)

Routes are organised by audience using route groups and fixed top-level segments:

```
src/app/
├── (marketing)/           # Public institutional site — STATIC / ISR
├── (public-app)/          # Public dynamic routes (proposal link, etc.)
├── admin/                 # Admin area — auth required, always dynamic
├── app/                   # Client portal (F4) — auth required, always dynamic
└── api/                   # Better Auth + webhooks
```

**Rendering rules (inviolable):**

| Area              | Strategy        | Forbidden in this area                                             |
| ----------------- | --------------- | ------------------------------------------------------------------ |
| `(marketing)`     | Static / ISR    | `cookies()`, `headers()`, `noStore()`, `fetch({ cache: "no-store" })`, dynamic Server Actions |
| `(public-app)`    | Dynamic         | *(free)*                                                           |
| `admin`, `app`    | Dynamic, no-cache | *(free)*                                                         |

Marketing must remain statically renderable. Reading cookies/headers anywhere under `(marketing)` silently breaks static generation — treat it as a bug.

### Feature-First Code Organisation

New domain code goes under `src/features/<feature>/`:

```
src/
├── app/                 # Routes
├── components/
│   ├── ui/             # shadcn primitives ONLY — do not add custom components here
│   └── shared/         # Components used across features (Header, Footer, Banner, …)
│
├── features/            # Domain logic grouped by feature
│   └── <feature>/
│       ├── components/      # Feature-specific React components
│       ├── schemas.ts       # Zod schemas
│       ├── queries.ts       # Prisma reads (server)
│       ├── actions.ts       # Server Actions (mutations)
│       └── types.ts
│
├── lib/                 # Auth, db client, email, storage, pdf, env, utils
├── content/             # pt-BR content (see Content System)
├── stores/              # Zustand stores
└── hooks/               # Cross-feature React hooks
```

**Placement rules:**

- Component used by a single feature → `features/<name>/components/`.
- Component shared across features → `components/shared/`.
- Raw shadcn primitive → `components/ui/`.

Existing top-level section components (`hero.tsx`, `about-section.tsx`, etc.) are treated as shared marketing composition and may remain under `src/components/` until a migration pass moves them to `features/marketing/`.

### Data Fetching & Mutations

- **Queries:** Server Components fetch directly via Prisma. No client-side fetching for admin or portal data.
- **Mutations:** Server Actions (`"use server"`) for admin and portal. Do not add REST API routes for internal CRUD.
- **Route Handlers (`/api`):** only for Better Auth, webhooks, and truly public endpoints (e.g., lead submission from a static form in F0).
- **Validation:** every Server Action parses input with Zod *before* any logic. No exceptions.

### Auth Guard Pattern (F1+)

Sessions are validated on the server, inside protected layouts. The middleware only performs a cheap cookie existence check.

```ts
// src/app/admin/layout.tsx
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || session.user.role !== "admin") {
    redirect("/login?next=/admin");
  }

  return <AdminShell user={session.user}>{children}</AdminShell>;
}
```

**Forbidden:** `useSession` + redirect in `useEffect`. Flashes protected content and is bypassable.

**Middleware** must keep its matcher restricted so marketing never pays the latency cost:

```ts
// src/middleware.ts
export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};
```

### Robots, Metadata, Sitemap

| Area                  | `metadata.robots`                                     | In sitemap? |
| --------------------- | ----------------------------------------------------- | ----------- |
| `(marketing)`         | indexable (default)                                   | yes         |
| `/admin`, `/app`      | `{ index: false, follow: false, nocache: true }`      | no          |
| `/propostas/[token]`  | `{ index: false, follow: false }` + `Cache-Control: no-store` | no |

### Page Structure

`src/app/layout.tsx` renders: `<Providers>` (next-themes ThemeProvider) → `<Header>` → `{children}` → `<Banner>` (dismissible IR 2026 alert).

`src/app/page.tsx` composes the landing page by importing section components in order: HeroSection → LogosSection → StackedFeatures → AboutSection → TestimonialsSection → FaqSection → CtaSection → Footer.

### Theming

Design system: **Dark Teal** (primary) + **Terracota** (accent). Defined as CSS custom properties in `src/app/globals.css`. Dark mode via `.dark` class (next-themes manages toggling). Fonts: Plus Jakarta Sans (body), Marcellus (headings), JetBrains Mono (mono) — loaded in layout and exposed as CSS variables.

### Hooks

`src/hooks/use-scroll.tsx` — detects `scrollY > threshold`, used in the header for sticky styling.

### Accessibility & SEO

- Target: WCAG 2.1 AA
- Biome a11y recommended rules are enabled
- Mobile-first responsive design

## Security & Configuration

For the full security model see `docs/architecture.md#segurança`. Non-negotiables any change must respect:

- **Never commit secrets.** `.env*` is ignored by default; commit only `.env.example` with empty/dummy values.
- **Validate env vars** with `@t3-oss/env-nextjs` (introduced in F1a). Separate `server` and `client` schemas to prevent bundle leaks.
- **IDOR protection:** every query/mutation on a client-owned resource must verify ownership against `session.user.id` (or `UserClient`) before reading or writing. Never trust an ID from the client.
- **No personal data in logs** (CPF, CNPJ, email, phone). Never include personal data in URLs or query strings.
- **Audit log:** every sensitive action (create client, send proposal, login, etc.) writes to the `AuditLog` table. Required for accounting context and incident review.
- **Rate limit** all public endpoints: `/api/auth/*`, lead submissions, public proposal links, free tools.
- **Digital certificates (F1b+):** `.pfx` files and passwords use envelope encryption with a KEK stored in **Infisical**. Never store them in plaintext, never log them, never cache decrypted content on disk. Every access writes to `CertificateAccessLog`. See `docs/architecture.md#certificado-digital-f1b--f4`.
