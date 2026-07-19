# duohub

Sistema de um **escritório de contabilidade brasileiro**. Não é SaaS multi-tenant: existe
um escritório, e `Client` é cliente **dele**.

> **Consequência direta:** não há escopo de tenant. Query não precisa filtrar por
> organização, e não invente esse filtro "por segurança" — ele não existe no modelo.

Quatro superfícies no mesmo app Next.js:

| Superfície | Quem usa | Escala |
| --- | --- | --- |
| `admin` | as contadoras do escritório | ~4 pessoas, uso diário e intenso |
| `app` | os clientes do escritório | 15 hoje, **vai escalar muito** com o lançamento da plataforma |
| `(marketing)` | público, inclui a landing de imposto de renda | — |
| `(public-app)` | login, convite, pós-login | — |

Essa assimetria muda decisão: no `admin`, densidade e atalho valem mais que hand-holding —
são quatro usuárias experientes, todo dia. No `app`, clareza vale mais que densidade, e
paginação e performance de listagem importam de verdade, porque é o lado que cresce.

## Regulatório

LGPD se aplica, e legislação contábil também.

- `AuditLog` é **obrigação**, não zelo. Não remova nem contorne a trilha de auditoria.
- Dado pessoal de cliente (CPF/CNPJ, endereço, contato, informação financeira) é sensível:
  não mande para PostHog, não coloque em log, não exponha em URL.
- Retenção e prazos específicos ainda **não estão confirmados** — ao mexer em exclusão de
  dado ou em export, pergunte antes de assumir.

Domínio central, pelo schema Prisma: `Client`, `User`/`UserClient`, `Contact`,
`Proposal` (com `ProposalTemplate`, `ProposalTemplateVersion`,
`ProposalPublishedVersion`) e `AuditLog`. Conceitos fiscais aparecem como enums —
`TaxRegime`, `IrpfSituation`, `IrpfComplexity`, `IrpfMoment`.

## Stack

| Camada | Escolha |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19 |
| Dados | Prisma 7 + Neon (Postgres serverless) |
| Auth | better-auth |
| UI | shadcn/ui (`new-york`, base `slate`), Tailwind 4, Radix |
| Estado | zustand |
| Forms | react-hook-form + zod 4 |
| Email | React Email + Resend |
| Rate limit | Upstash Redis |
| Lint/format | Biome |
| Testes | Vitest + Testing Library |
| Deploy | Vercel |

Gerenciador de pacotes: **pnpm** (10.14.0). Node >= 20.9.

## Comandos

```bash
pnpm dev                # next dev
pnpm build              # next build
pnpm test               # vitest run
pnpm test:watch
pnpm test:coverage
pnpm lint               # biome check --write
pnpm format             # biome format --write

pnpm db:migrate         # prisma migrate dev
pnpm db:push
pnpm db:seed
pnpm db:studio
pnpm db:reset

pnpm email:dev          # preview de emails na :3333
```

## Organização

```
src/
├── app/          rotas (App Router), agrupadas por superfície
├── features/     auth · clients · irpf · proposals · users
├── components/   ui/ = shadcn; o resto é compartilhado
├── lib/          infra: auth, db, audit, posthog, env, ratelimit
├── emails/       templates React Email
├── stores/       zustand
└── content/      mensagens
```

## Padrões de código

Detalhe em **[`docs/architecture.md`](./docs/architecture.md)**. O essencial:

**Quatro pastas, uma regra cada.** `app/` rota · `features/<x>/` domínio ·
`components/` UI sem domínio · `lib/` infra.

**Teste de import** decide entre feature e rota: o componente importa de
`@/features/<x>`? Então mora na feature. O critério é o import, não o nome.

**Porta de entrada.** Só `features/<x>/index.ts` é público; o resto é interno. De fora,
`import { X } from "@/features/<x>"` — nunca caminho profundo. `dependency-cruiser`
falha o build se alguém tentar.

**Contrato único de Server Action** via `defineAction` (sessão, zod com `fieldErrors`,
erro do Prisma, auditoria). Escape hatch existe e é explícito.

**Carregamento** — Server Components + Suspense por região + skeleton ao lado do
componente que ele representa. Nunca spinner de página inteira.

**Estados** — as quatro situações de [`docs/design/README.md`](./docs/design/README.md)
fazem parte do aceite da fatia.

### Legado

`src/features/clients` e `src/features/users` **ainda não seguem** o padrão: UI de domínio
em `src/app/admin/*/_components`, sem `index.ts`, actions sem wrapper. Além disso convivem
dois contratos de retorno antigos (`{ success }` e `{ ok }`).

**Não replique isso.** Migração é preguiçosa — uma feature migra quando uma fatia encostar
nela.

## Como o trabalho anda

Regras do fluxo em **[`docs/agents/workflow.md`](./docs/agents/workflow.md)**; como operar
o harness (skills, comandos, colisões) em
**[`docs/agents/harness.md`](./docs/agents/harness.md)**. O essencial:

**Fatia vertical** é a unidade — uma capacidade que o usuário percebe, atravessando schema
→ action → UI → teste. Uma fatia por PR. Se você não consegue completar *"agora eu consigo
___"*, não é fatia.

**Dois portões inegociáveis:**

1. `ready-for-agent` no ticket — sem a label, ninguém implementa. Faltou informação? Pare e
   diga o que falta; **não preencha a lacuna sozinho**.
2. Conferência humana no navegador — o agente roda `pnpm test`, sobe `pnpm dev` e entrega a
   lista de aceite para Gustavo conferir. Só então vai para PR.

**Barra de teste** — schema, action, e formulário (erro no campo + submit pendente). Nada
além. Sem meta de cobertura.

**Nunca escreva *como implementar* em ticket, spec ou ADR.** Isso se decide na hora, com o
código na frente. Planos gigantes escritos antes de olhar o código são a causa raiz que
este harness existe para evitar.

## Worktrees

O projeto é trabalhado em **git worktrees**, gerenciados pelo Orca. O repo principal fica
em `~/projects/duohub` (branch `main`); cada worktree vive em
`~/orca/workspaces/duohub/<nome>` com sua própria branch.

Isso não faz do projeto um monorepo — é o mesmo repo, várias cópias de trabalho.

O que muda na prática:

- O diretório de trabalho **não é** o repo principal. Não assuma caminho absoluto.
- Branch nova sai de `main`, não da branch do worktree vizinho.
- `CLAUDE.md`, `docs/` e `.claude/` são versionados, logo **valem por branch**. Um worktree
  cujo branch não tem esses arquivos não tem o harness — nem o hook de git.

## Agent skills

### Issue tracker

Issues vivem no Linear, time DuoHub (prefixo `DUO`), acessadas via MCP.
Veja `docs/agents/issue-tracker.md`.

### Triage labels

Três labels no Linear (`needs-info`, `ready-for-agent`, `ready-for-human`) mais dois
papéis absorvidos por status (`Backlog`, `Canceled`).
Veja `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` na raiz e ADRs em `docs/adr/`.
Veja `docs/agents/domain.md`.
