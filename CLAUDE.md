# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

Institutional site and future digital platform for **DuoHub Empresarial**, a Brazilian accounting/consulting firm serving micro and small businesses (MEI, ME, EPP), startups, and freelancers.

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Production build
pnpm lint      # Biome check with safe autofixes
pnpm format    # Biome format
```

No test runner is configured. If one is added, use **Jest** with tests co-located next to the source file (e.g., `provider.tsx` → `provider.test.tsx` in the same directory).

## Tech Stack

- **Next.js 16** (App Router), **React 19**, Node >=20.9.0
- **Tailwind CSS v4** with CSS variables for theming
- **shadcn/ui** (new-york style) + **Radix UI** primitives
- **Framer Motion** for animations
- **Zustand** for client state
- **Biome** for linting and formatting (source of truth — not ESLint/Prettier)
- Deployed on **Vercel**

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

### Page Structure

`src/app/layout.tsx` renders: `<Providers>` (next-themes ThemeProvider) → `<Header>` → `{children}` → `<Banner>` (dismissible IR 2026 alert).

`src/app/page.tsx` composes the landing page by importing section components in order: HeroSection → LogosSection → StackedFeatures → AboutSection → TestimonialsSection → FaqSection → CtaSection → Footer.

### Theming

Design system: **Dark Teal** (primary) + **Terracota** (accent). Defined as CSS custom properties in `src/app/globals.css`. Dark mode via `.dark` class (next-themes manages toggling). Fonts: Plus Jakarta Sans (body), Marcellus (headings), JetBrains Mono (mono) — loaded in layout and exposed as CSS variables.

### Components

`src/components/ui/` — shadcn/ui primitives only (accordion, avatar, button, card, input…). Do not add custom components here.

`src/components/` (root) — custom components and page-level sections (hero, header, footer, about-section, faq-section, etc.).

### Hooks

`src/hooks/use-scroll.tsx` — detects `scrollY > threshold`, used in the header for sticky styling.

### Accessibility & SEO

- Target: WCAG 2.1 AA
- Biome a11y recommended rules are enabled
- Mobile-first responsive design

## Security & Configuration

- Do not commit secrets. `.env*` files are ignored by default (see `.gitignore`).
