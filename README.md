<div align="center">

# DuoHub Gestão Contábil

**The digital front door for a new generation of Brazilian accounting.**

Built with Next.js 16 · React 19 · Tailwind CSS v4 · Framer Motion

[![CI](https://github.com/gvieiram/accounting/actions/workflows/ci.yml/badge.svg)](https://github.com/gvieiram/accounting/actions/workflows/ci.yml)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![Biome](https://img.shields.io/badge/Biome-2.4-60a5fa?logo=biome&logoColor=white)
![License](https://img.shields.io/badge/License-Private-red)

</div>

---

## What is this?

Institutional website and future digital platform for **DuoHub Gestão Contábil** — a Brazilian accounting and consulting firm serving micro and small businesses (MEI, ME, EPP), startups, and freelancers.

This is not a template. It is a production system built with intentional architecture, strict content separation, full dark mode, and a design language that refuses to look like every other accounting site on the internet.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **UI Library** | React 19 |
| **Styling** | Tailwind CSS v4 + CSS custom properties |
| **Components** | shadcn/ui (new-york) + Radix UI primitives |
| **Animation** | Framer Motion |
| **State** | Zustand |
| **Linting** | Biome (replaces ESLint + Prettier) |
| **Fonts** | Plus Jakarta Sans · Marcellus · JetBrains Mono · Playfair Display |
| **Deploy** | Dokploy (Nixpacks build, Traefik routing) |
| **CI/CD** | GitHub Actions |

---

## Architecture

```
src/
├── app/                    # Next.js App Router pages & layouts
│   ├── layout.tsx          # Root layout (providers, header, banner)
│   ├── page.tsx            # Landing page composition
│   └── globals.css         # Design tokens (CSS custom properties)
├── components/
│   ├── ui/                 # shadcn/ui primitives only
│   └── *.tsx               # Custom sections & components
├── content/
│   ├── company.ts          # Brand data, contacts, social links
│   └── messages/           # All user-facing text (pt-BR)
│       ├── common.ts       # Shared UI strings
│       ├── home.ts         # Landing page content
│       └── index.ts        # Re-exports
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities (cn, etc.)
└── stores/                 # Zustand stores
```

### Key Decisions

**Content lives outside components.** Every user-facing string — headings, labels, descriptions, CTAs, aria-labels — is stored in `src/content/` and accessed via Zustand. Components never contain hardcoded Portuguese text. This makes future i18n, CMS integration, or A/B testing a configuration change, not a refactor.

**Dark Teal + Terracota.** The design system uses a dual-palette approach defined entirely through CSS custom properties. Dark mode is a first-class citizen, not an afterthought — both palettes were designed independently, not auto-inverted.

**Biome over ESLint.** A single tool handles linting, formatting, import sorting, and accessibility checks. No `.eslintrc`, no `.prettierrc`, no conflicts. One config file, one command.

---

## Getting Started

### Prerequisites

- **Node.js** >= 20.9.0
- **pnpm** (v10+)

### Install & Run

```bash
# Clone
git clone git@github.com:gvieiram/accounting.git
cd accounting

# Install dependencies
pnpm install

# Start dev server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start development server |
| `pnpm build` | Production build |
| `pnpm lint` | Lint & autofix with Biome |
| `pnpm format` | Format with Biome |

---

## Design System

The theme is built on CSS custom properties, enabling full dark mode support without JavaScript class toggling logic.

| Role | Light | Dark |
|---|---|---|
| **Primary** | Dark Teal `hsl(173 34% 23%)` | Teal `hsl(173 40% 40%)` |
| **Accent** | Terracota `hsl(11 51% 69.6%)` | Warm Clay `hsl(11 45% 55%)` |
| **Background** | Near White `hsl(0 0% 99%)` | Deep Teal `hsl(173 30% 4%)` |

Typography pairs **Marcellus** (serif headings) with **Plus Jakarta Sans** (body) for a balance of authority and approachability. **Playfair Display** is used for the brand logotype.

---

## Content System

```tsx
import { useCompany, useMessages } from "@/stores/use-content-store";

function MyComponent() {
  const company = useCompany();
  const messages = useMessages();

  return <h1>{messages.home.hero.title}</h1>;
}
```

| File | Purpose |
|---|---|
| `src/content/company.ts` | Brand name, WhatsApp number, social links, URL helpers |
| `src/content/messages/common.ts` | Shared UI strings (nav, forms, accessibility labels) |
| `src/content/messages/home.ts` | Full landing page content |

Adding a new page? Create a new file in `src/content/messages/` — don't extend existing ones.

---

## CI/CD Pipeline

```
Feature branch → PR → CI (lint + typecheck + build) → Merge → Dev deploy
                                                                  ↓
                                        Release workflow → Tag → GitHub Release → Prod deploy
```

- **CI** runs on every PR and push to `main` — lint, type check, production build
- **Preview deployments** are created automatically for every open PR via Dokploy
- **Releases** are triggered manually via GitHub Actions (patch / minor / major)
- **Branch protection** enforces PR-only merges with required status checks
- **Dependabot** keeps dependencies fresh weekly

---

## Code Conventions

- **Code in English**, content in Portuguese (pt-BR)
- **Biome** enforces: tabs, double quotes, semicolons, kebab-case filenames
- **Conventional commits**: `feat:`, `fix:`, `docs:`, `chore:`
- **Branch naming**: `feat/<TICKET>/<name>`, `fix/<TICKET>/<name>`
- **`cn()`** for all className merging (clsx + tailwind-merge)
- **WCAG 2.1 AA** accessibility target with Biome a11y rules enabled
- **Mobile-first** responsive design throughout

---

## Project Status

> **v0.1.0** — Active development. Institutional landing page is live. Digital platform features are on the roadmap.

---

<div align="center">

**DuoHub Gestão Contábil** — Accounting that actually gets it.

</div>
