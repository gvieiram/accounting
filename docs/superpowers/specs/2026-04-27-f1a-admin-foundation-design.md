# F1a — Admin Foundation Design

**Status:** Brainstorm → Design → Plan
**Data:** 2026-05-02
**Linear:** [DUO-45 — F1a: Admin Foundation](https://linear.app/gvieiram/issue/DUO-45/f1a-admin-foundation) (épica) com sub-issues [DUO-46](https://linear.app/gvieiram/issue/DUO-46) (PR1), [DUO-47](https://linear.app/gvieiram/issue/DUO-47) (PR2), [DUO-48](https://linear.app/gvieiram/issue/DUO-48) (PR3), [DUO-49](https://linear.app/gvieiram/issue/DUO-49) (PR4), [DUO-50](https://linear.app/gvieiram/issue/DUO-50) (PR5)
**Fase do roadmap:** F1a (Fundação do Admin) — pré-requisito de F1b, F2, F3, F4
**Branch base:** `main`

## Sumário

A F1a entrega o **admin interno** do DuoHub: sistema de autenticação por magic link, layout `/admin` com guard server-side, gestão de usuários administradores, e CRUD de clientes (PJ/PF) com hierarquia matriz/filial. É a fundação obrigatória sobre a qual F1b (cofre de certificado), F2 (propostas), F3 (ferramentas SEO) e F4 (portal cliente) vão se apoiar.

A entrega é **incremental em 5 PRs**, cada um mergeable independentemente, agregando valor a cada merge.

## Objetivos

1. **Autenticação interna** — admin entra por email + magic link. Sem registro público.
2. **Cadastro de clientes** — CRUD completo com endereço, regime tributário, contatos, hierarquia matriz/filial.
3. **Auditoria** — toda ação sensível (login, magic link, CRUD de Client/User) grava `AuditLog` com actor, recurso, IP, UA.
4. **Fundação reaproveitável** — schema, helpers e padrões pensados pra serem consumidos por F1b/F2/F3/F4 sem retrabalho de migration.
5. **Segurança em camadas** — rate limit, CSP, revalidação de sessão, anti-enumeration, anti-timing attack, soft-delete preservando audit.

## Não-objetivos (fora do escopo da F1a)

- Email/senha tradicional, reset de senha, 2FA (`project_duohub_auth_backlog`).
- Página de visualização do AuditLog (entra em F2).
- Cofre de certificado digital (F1b).
- Geração de propostas/PDFs (F2).
- Ferramentas SEO públicas (F3).
- Portal cliente (`/app`) (F4).
- Múltiplos endereços por cliente (sede/filial = entidades separadas via `parentClientId`).
- Validação de DV de CPF/CNPJ (só regex de tamanho).
- Paginação real na lista de clientes (limit 100; F2 traz cursor pagination se virar gargalo).
- TanStack Query / axios — análise adiada pra antes de F4 ([DUO-44](https://linear.app/gvieiram/issue/DUO-44/research-avaliar-axios-tanstack-query-como-camada-de-data-fetching)).

## Decisões de produto consolidadas

| # | Decisão | Justificativa |
|---|---|---|
| 1 | **Auth: só magic link** | Email/senha exige reset + 2FA + lockout (cauda longa de segurança). Magic link cobre o caso interno (poucos admins) com segurança equivalente, zero overhead. Backlog em `project_duohub_auth_backlog`. |
| 2 | **Bootstrap: seed inicial + UI `/admin/users`** | Primeiro admin via `pnpm db:seed:admin` (lê `INITIAL_ADMIN_EMAIL`); novos via UI enxuta (list + invite + revoke). |
| 3 | **`Client` balanceado** | Endereço estruturado inline (F2 vai precisar pra propostas) + `additionalContacts: Json` flexível + IE/IM nullable + ViaCEP no MVP. Promove `additionalContacts` pra tabela só se virar gargalo. |
| 4 | **Hierarquia matriz/filial** | `Client.parentClientId` self-reference. Filial é `Client` PJ completo apontando pra matriz. Mesma raiz CNPJ obrigatória. Sub-filial bloqueada. |
| 5 | **Rate limit auth: email + IP** | 3 magic links/email/15min, 10/IP/hora, 100 globais/hora. Reaproveita Upstash da F0. |
| 6 | **AuditLog completo na F1a** | Tabela + helper + instrumentação em auth (5 actions) + Users (2) + Clients (3). Custo ~1h de implementação extra; evita retrabalho na F1b (que exige audit não-negociável). |
| 7 | **UI `/admin/users` enxuta** | Apenas list + invite + revoke. Sem reenviar link, sem editar perfil, sem trocar role. Cobre o caso real. |

## Decisões técnicas consolidadas

| # | Decisão | Justificativa |
|---|---|---|
| 1 | **Abordagem incremental — 5 PRs** | PR único de 3000 linhas é irrevisável. Cada PR ~300-500 linhas, mergeable, valor incremental. |
| 2 | **Layout-coupled em `app/admin/_components/`** | Shell é acoplado à rota `/admin`, não é feature de domínio. `features/<name>/` reservado pra lógica de domínio (schemas, queries, actions). |
| 3 | **Sem wrapper `AdminShell`/`AdminApp`** | `app/admin/layout.tsx` faz tudo direto. Indireção sem propósito real. |
| 4 | **shadcn `<Sidebar>`** | Componente mantido com mobile drawer, collapse, persistência via cookie, dark mode. Não reinventar. |
| 5 | **`react-hook-form` + `zodResolver` + shadcn `<Form>`** | Padrão do projeto (F0 já usa). Validação client-side antes do submit, erros por campo, focus on error. |
| 6 | **Server Components pra leitura, Server Actions pra mutação** | Alinha com `project_duohub_arquitetura`. Sem REST interno. |
| 7 | **Zod obrigatório em toda Server Action, antes de qualquer lógica** | Convenção `project_duohub_convencoes`. Sem exceção. |
| 8 | **Enums do Prisma como fonte de verdade** | `z.nativeEnum(ClientStatus)`, arrays `*_ORDER` em `constants.ts`, labels em `messages/*` com `satisfies Record<Enum, string>`. Compile-time check de cobertura. |
| 9 | **`fetch` nativo em vez de axios** | Built-in, integra com data cache do Next, zero KB. Pesquisa de TanStack Query/axios adiada pra F4 ([DUO-44](https://linear.app/gvieiram/issue/DUO-44)). |
| 10 | **`date-fns` para datas** | Helpers em `lib/date.ts` (pt-BR centralizado). `toLocaleDateString` é frágil (varia por env). |
| 11 | **Zero hardcode de texto** | `common.terms.*`, `common.forms.*`, `messages/admin.enums.*`. Acessado via `useMessages()` do Zustand store. |
| 12 | **Soft-delete em `User` e `Client`** | Hard-delete quebra FKs do AuditLog. `revokedAt`/`archivedAt` preservam histórico. |

## Arquitetura

### Schema (Prisma)

Modelos novos: `User`, `Account`, `Session`, `Verification`, `Client`, `UserClient`, `AuditLog`. Enums novos: `UserRole`, `ClientType`, `TaxRegime`, `ClientStatus`, `UserClientRole`, `AuditAction`.

```prisma
// === Better Auth core ===

model User {
  id            String     @id @default(cuid())
  email         String     @unique
  name          String?
  role          UserRole   @default(ADMIN)
  emailVerified Boolean    @default(false)
  image         String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt
  revokedAt     DateTime?

  accounts      Account[]
  sessions      Session[]
  userClients   UserClient[]
  auditLogs     AuditLog[]

  @@index([email])
  @@index([revokedAt])
}

enum UserRole {
  ADMIN
  CLIENT // reservado para F4
}

model Account {
  id         String   @id @default(cuid())
  userId     String
  providerId String
  accountId  String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
}

model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([identifier])
  @@index([expiresAt])
}

// === Client ===

model Client {
  id              String       @id @default(cuid())

  type            ClientType
  legalName       String
  tradeName       String?
  document        String       @unique // CPF (PF) ou CNPJ (PJ), só dígitos

  taxRegime         TaxRegime?
  stateRegistration String?    // IE
  cityRegistration  String?    // IM

  segment         String?

  primaryEmail    String
  primaryPhone    String       // formato BR (10 ou 11 dígitos)
  contactName     String

  // endereço inline
  zipCode         String?      // CEP, só dígitos
  street          String?
  number          String?
  complement      String?
  neighborhood    String?
  city            String?
  state           String?      // UF

  additionalContacts Json?     // array Zod-validado: [{name, email, phone, role}]

  // hierarquia matriz/filial (apenas PJ)
  parentClientId  String?
  parentClient    Client?      @relation("ClientBranches", fields: [parentClientId], references: [id], onDelete: Restrict)
  branches        Client[]     @relation("ClientBranches")

  status          ClientStatus @default(ACTIVE)
  internalNotes   String?

  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
  archivedAt      DateTime?

  userClients     UserClient[] // F4

  @@index([type])
  @@index([taxRegime])
  @@index([status])
  @@index([archivedAt])
  @@index([legalName])
  @@index([parentClientId])
}

enum ClientType {
  PF
  PJ
}

enum TaxRegime {
  MEI
  SIMPLES_NACIONAL
  LUCRO_PRESUMIDO
  LUCRO_REAL
}

enum ClientStatus {
  ACTIVE
  PROSPECT
  INACTIVE
  CHURNED
}

// === N:N preparado para F4 ===

model UserClient {
  id        String         @id @default(cuid())
  userId    String
  clientId  String
  role      UserClientRole @default(VIEWER)
  createdAt DateTime       @default(now())

  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  client    Client  @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@unique([userId, clientId])
  @@index([userId])
  @@index([clientId])
}

enum UserClientRole {
  OWNER
  VIEWER
}

// === Audit log ===

model AuditLog {
  id           String      @id @default(cuid())

  actorId      String?
  actorEmail   String?

  action       AuditAction
  resourceType String?
  resourceId   String?

  metadata     Json?
  ipAddress    String?
  userAgent    String?

  createdAt    DateTime    @default(now())

  actor        User?       @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([actorId, createdAt])
  @@index([resourceType, resourceId])
  @@index([action, createdAt])
  @@index([createdAt])
}

enum AuditAction {
  USER_LOGIN_SUCCESS
  USER_LOGIN_FAILED
  USER_LOGOUT
  MAGIC_LINK_SENT
  MAGIC_LINK_USED
  USER_INVITED
  USER_REVOKED
  CLIENT_CREATED
  CLIENT_UPDATED
  CLIENT_DELETED
}
```

### Estrutura de pastas

```
src/
├── middleware.ts                       # cookie check restrito a /admin e /app
│
├── app/
│   ├── (public-app)/
│   │   └── admin/
│   │       └── login/
│   │           ├── page.tsx
│   │           ├── login-form.tsx      # client component
│   │           └── verify/page.tsx     # callback do magic link
│   │
│   ├── admin/
│   │   ├── _components/                # shell acoplado à rota
│   │   │   ├── admin-sidebar.tsx
│   │   │   ├── admin-header.tsx
│   │   │   ├── admin-user-menu.tsx
│   │   │   └── nav-items.ts
│   │   ├── layout.tsx                  # guard + sidebar + header
│   │   ├── page.tsx                    # dashboard placeholder
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   ├── _components/
│   │   │   │   ├── users-table.tsx
│   │   │   │   ├── invite-user-dialog.tsx
│   │   │   │   ├── invite-user-form.tsx
│   │   │   │   └── revoke-user-button.tsx
│   │   │   └── error.tsx
│   │   └── clients/
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       ├── [id]/
│   │       │   ├── page.tsx
│   │       │   └── error.tsx
│   │       ├── _components/
│   │       │   ├── clients-table.tsx
│   │       │   ├── clients-filters.tsx
│   │       │   ├── client-form.tsx
│   │       │   ├── client-form-section.tsx
│   │       │   ├── address-fields.tsx
│   │       │   ├── additional-contacts-field.tsx
│   │       │   ├── document-input.tsx
│   │       │   ├── parent-client-combobox.tsx
│   │       │   └── archive-client-button.tsx
│   │       └── error.tsx
│   │
│   └── api/
│       ├── auth/[...all]/route.ts      # Better Auth handler
│       └── viacep/[cep]/route.ts       # proxy ViaCEP autenticado
│
├── emails/
│   └── auth/
│       └── magic-link.tsx              # template React Email
│
├── features/
│   ├── auth/
│   │   ├── emails/dispatch.ts          # sendMagicLinkEmail
│   │   ├── schemas.ts                  # loginSchema
│   │   └── actions.ts                  # sendLoginMagicLinkAction
│   │  # nota: o login-form.tsx mora junto da rota em app/(public-app)/admin/login/
│   │
│   ├── users/
│   │   ├── schemas.ts
│   │   ├── queries.ts                  # listUsers
│   │   ├── actions.ts                  # inviteUser, revokeUser
│   │   └── types.ts
│   │
│   └── clients/
│       ├── schemas.ts                  # clientSchema (Zod completo)
│       ├── queries.ts                  # listClients, getClient
│       ├── actions.ts                  # create/update/archive
│       ├── constants.ts                # CLIENT_STATUS_ORDER, CLIENT_TYPES, etc.
│       ├── utils.ts                    # cpfRoot, formatCpf, normalizeClient, computeDiff
│       └── types.ts
│
├── lib/
│   ├── auth/
│   │   ├── auth.ts                     # instância Better Auth (server)
│   │   ├── auth-client.ts              # Better Auth client SDK
│   │   └── helpers.ts                  # getCurrentUser, requireAdmin
│   ├── audit/
│   │   └── log.ts                      # auditLog.write({...})
│   ├── viacep.ts                       # lookupCep com cache
│   ├── date.ts                         # formatDate, formatDateTime, formatRelative
│   └── utils.ts                        # cn, redactEmail (extensão)
│
├── content/
│   └── messages/
│       ├── common.ts                   # extensão: terms, forms.placeholders, forms.masks, status
│       ├── auth.ts                     # novo
│       └── admin.ts                    # novo: shell, users, clients, enums labels
│
└── prisma/
    ├── schema.prisma                   # extensão (User/Client/etc.)
    └── seed-admin.ts                   # novo: cria primeiro admin
```

### Auth (Better Auth + magic link)

**Configuração** (`lib/auth/auth.ts`):
- `prismaAdapter(db, { provider: "postgresql" })`.
- `emailAndPassword: { enabled: false }` — explicitamente desligado.
- Plugin `magicLink({ expiresIn: 60 * 15 })` — 15min.
- `session.expiresIn`: 7 dias; `updateAge`: 1 dia; `cookieCache`: 5min.
- `trustedOrigins`: lê de `env.NEXT_PUBLIC_SITE_URL`.

**`sendMagicLink`** orquestra em ordem:
1. Lookup do `User` (silencioso se não existe ou revogado — anti-enumeration).
2. Rate limit por email + IP + global (`Upstash slidingWindow`).
3. Sleep aleatório 100-300ms (anti-timing).
4. Envia via `sendMagicLinkEmail` (Resend + React Email).
5. `auditLog.write({ action: MAGIC_LINK_SENT, ... })`.

**Helpers** (`lib/auth/helpers.ts`):
- `getCurrentUser()` — não redireciona.
- `requireAdmin()` — redireciona se não autenticado, e revalida `revokedAt` + `role` no banco a cada request (custo ~5ms; garante revogação imediata).

**Bootstrap**:
- `prisma/seed-admin.ts` lê `INITIAL_ADMIN_EMAIL` (+ opcional `INITIAL_ADMIN_NAME`), cria `User` com `role: ADMIN`, `emailVerified: true`. Idempotente.
- Admin entra em `/admin/login`, recebe magic link, autentica.

### Layout `/admin`

`app/admin/layout.tsx`:
- `requireAdmin()` no topo.
- `metadata.robots = { index: false, follow: false, nocache: true }`.
- `dynamic = "force-dynamic"`.
- Estrutura: `<SidebarProvider> → <AdminSidebar /> → <SidebarInset> → <AdminHeader /> → <main>{children}</main>`.

`AdminSidebar` usa shadcn `<Sidebar>`, `<SidebarMenuButton isActive>` para active state, `usePathname` em Client Component pra detecção de rota.

`AdminHeader` traz `<SidebarTrigger>` (collapse) + `<ThemeToggle>` + `<AdminUserMenu>` (dropdown com email do usuário e botão de logout via `authClient.signOut()`).

### Middleware (`src/middleware.ts`)

```ts
export const config = {
  matcher: ["/admin/((?!login|verify).*)", "/app/:path*"],
};
```

Apenas check de existência do cookie de sessão. Validação real fica no layout (`requireAdmin`). Latência zero em `(marketing)`.

### CSP e headers de segurança

`next.config.ts` adiciona headers para `/admin/:path*` (e `/app/:path*` em F4):
- `Content-Security-Policy` restritivo (script-src, style-src, frame-ancestors 'none').
- `X-Frame-Options: DENY`.
- `X-Content-Type-Options: nosniff`.
- `Referrer-Policy: strict-origin-when-cross-origin`.

### Rate limit (`lib/ratelimit.ts` — extensão)

Três camadas:
- `magicLinkRateLimitByEmail` — slidingWindow(3, "15 m").
- `magicLinkRateLimitByIp` — slidingWindow(10, "1 h").
- `magicLinkRateLimitGlobal` — slidingWindow(100, "1 h") — defesa contra ataque distribuído.

### Audit log (`lib/audit/log.ts`)

```ts
type AuditWriteInput = {
  action: AuditAction;
  actorId?: string;
  actorEmail?: string;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  request?: Request; // para extrair IP + UA
};

export const auditLog = {
  async write(input: AuditWriteInput): Promise<void> { /* ... */ },
};
```

Falha de audit **não bloqueia** a operação principal — log + try/catch silenciosa. Trade-off aceito: audit pode ter eventual consistency em casos extremos; ação de fato sempre persiste.

Eventos instrumentados na F1a:
- **Auth**: `USER_LOGIN_SUCCESS`, `USER_LOGIN_FAILED`, `USER_LOGOUT`, `MAGIC_LINK_SENT`, `MAGIC_LINK_USED`.
- **Users**: `USER_INVITED`, `USER_REVOKED`.
- **Clients**: `CLIENT_CREATED`, `CLIENT_UPDATED` (com diff em `metadata`), `CLIENT_DELETED`.

### Feature: Users (`/admin/users`)

**Queries** (`features/users/queries.ts`):
- `listUsers()` — `select` enxuto, ordena ativos no topo, traz última sessão pra "último acesso".

**Actions** (`features/users/actions.ts`):
- `inviteUserAction` — `requireAdmin` → `inviteUserSchema.safeParse` → check unique email → cria `User` (`emailVerified: true`) → audit `USER_INVITED` → dispara magic link inicial → `revalidatePath`.
- `revokeUserAction` — `requireAdmin` → bloqueia auto-revoke → transação atômica (`update revokedAt` + `deleteMany sessions`) → audit `USER_REVOKED` → `revalidatePath`.

**UI**:
- Tabela com colunas: Usuário (nome + email), Status (Ativo/Revogado), Último acesso, Cadastrado em, Ações.
- Botão "Convidar usuário" abre `<Dialog>` com form `react-hook-form` (email + nome opcional).
- Botão de revogar abre `<AlertDialog>` de confirmação.

### Feature: Clients (`/admin/clients`)

**Schema Zod** (`features/clients/schemas.ts`):
- `clientSchema` com 20+ campos validados.
- `refine`: documento bate com `type` (PF→CPF 11 dígitos, PJ→CNPJ 14 dígitos).
- `refine`: `parentClientId` só faz sentido se `type === PJ`.
- `additionalContacts` array max 10, cada item validado.
- `optional().or(z.literal(""))` em campos que podem chegar como string vazia do form.

**Constants** (`features/clients/constants.ts`):
- Re-exporta `ClientStatus`, `ClientType`, `TaxRegime` do Prisma.
- Arrays ordenados: `CLIENT_STATUS_ORDER`, `CLIENT_TYPES_ORDER`, `TAX_REGIMES_ORDER`.

**Utils** (`features/clients/utils.ts`):
- `stripDocument`, `formatCpf`, `formatCnpj`, `formatDocument`, `formatCep`, `formatPhoneBR`.
- `cnpjRoot` (8 primeiros dígitos), `isMatrizCnpj`, `isBranchCnpj`.
- `normalizeClient` — strip de máscara + trim + `""` → `null`.
- `computeDiff` — para audit log de update (compara via `JSON.stringify`).

**Queries** (`features/clients/queries.ts`):
- `listClients(filters)` — busca em nome/fantasia/email + documento (se input parece dígito); filtros por type/status; soft-deleted ocultos por default; `take: 100`.
- `getClient(id)` — fetch full pra edição.

**Actions** (`features/clients/actions.ts`):
- `createClientAction` — `requireAdmin` → schema parse → normalize → check unique document → check matriz (se filial) → `db.client.create` → audit `CLIENT_CREATED` → `revalidatePath`.
- `updateClientAction` — idem + diff → audit `CLIENT_UPDATED` (só se diff não vazio) → `revalidatePath` em `/admin/clients` e `/admin/clients/[id]`.
- `archiveClientAction` — `requireAdmin` → schema parse → `update archivedAt` → audit `CLIENT_DELETED` → `redirect("/admin/clients")`.

**Validações de matriz/filial** (action-level):
- Matriz não pode estar arquivada.
- Sub-filial bloqueada (`parent.parentClientId` deve ser null).
- Matriz precisa ser PJ.
- Raiz CNPJ (8 primeiros dígitos) precisa bater entre matriz e filial.

**UI**:
- Lista com filtros via URL searchParams (busca debounced via `useDeferredValue`, type, status, archived).
- Tabela com hierarquia visual: matrizes com filiais aninhadas (indent visual).
- Form único compartilhado entre criar/editar, dividido em seções: Identificação, Tributação, Contato principal, Endereço (com ViaCEP `onBlur`), Contatos adicionais (repeater via `useFieldArray`), Status e notas.
- `ParentClientCombobox` (shadcn) — busca PJs ativas que não sejam filial; opção "Nenhuma (esta é matriz/standalone)"; quando seleciona matriz, pré-preenche razão social/regime/segmento na criação.
- `DocumentInput` — máscara dinâmica (CPF/CNPJ) baseada em `type` watched.

### ViaCEP (`lib/viacep.ts` + `app/api/viacep/[cep]/route.ts`)

- `fetch` nativo (não axios).
- Cache em memória (Map) + cache do Next.js (`next: { revalidate: 60*60*24*30 }`).
- `AbortSignal.timeout(3000)`.
- Endpoint `GET /api/viacep/[cep]` autenticado via `requireAdmin` — não vira proxy aberto.

### Conteúdo (zero hardcode)

- `messages/common.ts` (extensão):
  - `terms.*`: cpf, cnpj, cep, ie, im, document, phone, whatsapp, email, address, street, number, complement, neighborhood, city, state, name, legalName, tradeName, contactName, segment, notes, status, type, role, createdAt, updatedAt, lastAccess, actions, optional.
  - `forms.placeholders.*`: cpf, cnpj, cep, phoneBR, email, search.
  - `forms.masks.*`: cpf, cnpj, cep, phoneBR.
  - `forms.submit.*`: saving, sending, processing.
  - `status.*`: active, inactive, revoked, archived, pending.
- `messages/auth.ts`: login (title, email label/placeholder, submit/submitting, success message, rate limited), email (subject, heading, cta, expiry, notRequested).
- `messages/admin.ts`:
  - `nav.*`: dashboard, clients, users.
  - `shell.*`: logout, profile.
  - `dashboard.*`: title, welcome, placeholder.
  - `users.*`: title, subtitle, invite, columns, status, empty, invite_dialog, revoke_dialog, errors.
  - `clients.*`: title, new, filters, columns, form (sections, fields, parent), edit, archive_dialog, errors.
  - `enums.*`: userRole, clientType, clientStatus, taxRegime, taxRegimeShort, auditAction — todos com `satisfies Record<Enum, string>`.

Labels finais (revisão de tradução):
- `ClientStatus.PROSPECT` → **"Em negociação"** (não "Prospect").
- `ClientStatus.INACTIVE` → **"Pausado"** (não "Inativo" — admin contábil entende melhor).
- `ClientStatus.CHURNED` → **"Encerrado"** (não "Saiu").
- `TaxRegime` em forma curta (badges): "MEI", "Simples", "L. Presumido", "L. Real".

### Datas (`lib/date.ts`)

`date-fns` com locale `ptBR`:
- `formatDate(d)` → `dd/MM/yyyy`.
- `formatDateTime(d)` → `dd/MM/yyyy 'às' HH:mm`.
- `formatDateLong(d)` → `dd 'de' MMMM 'de' yyyy`.
- `formatRelative(d)` → "há 3 horas" / "em 2 dias".

## Segurança — vetores cobertos

Análise por vetor de ataque, todos cobertos pelo design:

1. **Brute force / spam de magic link** — rate limit 3-camadas (email, IP, global) + max 254 chars no email.
2. **Roubo de magic link em trânsito** — link expira 15min, single-use, token só dentro do `href`, HTTPS obrigatório (Zod refine), cookie `Secure`.
3. **Session hijacking** — cookie `httpOnly` + `SameSite=Lax` + `Secure` + token hashed no banco + bind opcional por UserAgent (warn-only).
4. **XSS / injection** — React escape automático + Zod refines bloqueando caracteres de controle + CSP estrita em `/admin`.
5. **IDOR** — `Client` único role na F1a; padrão `userClients.userId == session.user.id` documentado pra F4.
6. **Privilege escalation** — `requireAdmin()` revalida `revokedAt` + `role` em cada request; revoke invalida sessões via transação.
7. **CSRF** — `SameSite=Lax` + Server Actions com proteção nativa Next.js + Better Auth CSRF nos endpoints de auth.
8. **Timing attacks** — resposta uniforme em `/admin/login` independente do resultado + sleep aleatório 100-300ms emparelhando com tempo do Resend.
9. **Vazamento via logs** — `redactEmail` helper, `console.error` só com `error.message`, audit nunca grava token.
10. **Open redirect** — `next` param validado com `z.string().startsWith("/")`.

## Variáveis de ambiente novas

Em `lib/env.ts`:

```ts
server: {
  // ... existentes
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url().refine((v) => v.startsWith("https://") || process.env.NODE_ENV === "development", {
    message: "BETTER_AUTH_URL must use https:// in production",
  }),
  INITIAL_ADMIN_EMAIL: z.string().email().optional(),
  INITIAL_ADMIN_NAME: z.string().optional(),
}
```

## Dependências novas

| Pacote | Pra quê |
|---|---|
| `better-auth` | Auth core |
| `@better-auth/prisma` | Adapter Prisma |
| `@hookform/resolvers` | zodResolver (provavelmente já tem) |
| `react-hook-form` | Forms (provavelmente já tem) |
| `date-fns` | Datas |
| `sonner` | Toasts (provavelmente já tem) |

Componentes shadcn novos a instalar: `sidebar`, `dialog`, `alert-dialog`, `table`, `badge`, `radio-group`, `select`, `textarea`, `dropdown-menu`, `avatar`, `form` (provavelmente já tem), `accordion`, `tooltip`, `command` (combobox).

## Plano de entrega — 5 PRs incrementais

**PR 1 — Schema + Audit helper**
- Migration `f1a_admin_foundation` (User, Account, Session, Verification, Client, UserClient, AuditLog + enums).
- `lib/audit/log.ts`.
- Sem auth ainda (não há nada protegido).

**PR 2 — Better Auth + magic link + login page**
- `lib/auth/{auth,auth-client,helpers}.ts`.
- `app/api/auth/[...all]/route.ts`.
- `features/auth/{schemas,actions,emails/dispatch}.ts`.
- `emails/auth/magic-link.tsx`.
- `app/(public-app)/admin/login/{page,login-form,verify/page}.tsx`.
- Rate limit (extensão de `lib/ratelimit.ts`).
- Audit instrumentado nos eventos de auth.
- `prisma/seed-admin.ts`.
- Env vars novas.

**PR 3 — Shell `/admin` + middleware + dashboard placeholder**
- `src/middleware.ts`.
- `app/admin/{layout,page,loading,error}.tsx`.
- `app/admin/_components/*` (sidebar, header, user menu, nav).
- `messages/admin.ts` (shell + nav).
- CSP em `next.config.ts`.

**PR 4 — User management**
- `features/users/*`.
- `app/admin/users/{page,_components/*}`.
- `messages/admin.ts` (extensão: users).
- Audit instrumentado em invite/revoke.

**PR 5 — Client CRUD**
- `features/clients/*` (schemas, queries, actions, constants, utils).
- `app/admin/clients/{page,new,[id],_components/*}`.
- `lib/viacep.ts` + `app/api/viacep/[cep]/route.ts`.
- `lib/date.ts`.
- `messages/common.ts` (extensão completa: terms, placeholders, masks, status).
- `messages/admin.ts` (extensão: clients + enums).
- Audit instrumentado em create/update/archive.

## Métricas de sucesso

- **Fundação**: schema da F1a sustenta F1b, F2, F3, F4 sem nova migration de tabela.
- **Adoção**: primeiros clientes reais migrados pra `/admin/clients` (objetivo F1a do roadmap: "clientes migrados para o sistema").
- **Segurança**: zero incidentes de acesso indevido. AuditLog cobre todos os eventos sensíveis listados.
- **DX**: 5 PRs, cada um <500 linhas de diff, todos passam em `pnpm lint` + `pnpm build` antes de mergear.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Better Auth API mudar de versão durante implementação | Pin de versão exata no `package.json`; consultar `user-Better Auth` MCP antes de codar. |
| ViaCEP indisponível ou lento | Timeout 3s + cache de 30 dias; UX continua funcional sem autocomplete (admin preenche manual). |
| Magic link não chegar (Resend, spam, DNS) | Audit `MAGIC_LINK_SENT` rastreável; admin pode tentar de novo; fallback de cadastro via SQL. |
| `additionalContacts: Json` virar gargalo | Migration controlada pra tabela `ClientContact` quando necessário (F2 ou depois). |
| Bug em revogação de sessão | Transação atômica; testes cobrem o caso happy + auto-revoke bloqueado. |
| Hierarquia matriz/filial confundir admin | Pré-preenchimento ao escolher matriz; lista com indent visual; warning na UI se CNPJ não bater raiz. |

## Continuidade pra fases seguintes

| Fase | Como consome F1a |
|---|---|
| **F1b** | `DigitalCertificate.clientId` → `Client`. AuditLog reaproveita helper, adiciona actions `CERTIFICATE_*`. Sem mudança de schema na F1a. |
| **F2** | `Proposal.clientId` → `Client`; `Proposal.actorId` → `User`. Snapshot de endereço/contato no momento da criação da proposta. Página `/admin/audit` (visualização) entra junto. |
| **F3** | `Contact` (lead) ganha botão "promover a Client" — Server Action lê `Contact`, abre form de Client pré-preenchido. |
| **F4** | `UserClient` (já modelado) ganha UI; cliente vê apenas `Client`s onde `userClients.userId == session.user.id`. CSP estende-se ao `/app`. Reabrir pesquisa de TanStack Query/axios ([DUO-44](https://linear.app/gvieiram/issue/DUO-44)). |

## Trade-offs aceitos

- **Sem páginas de visualização do AuditLog** — consulta via Prisma Studio / SQL na F1a; UI entra em F2.
- **Sem "reenviar magic link" na UI de Users** — admin tenta de novo via `/admin/login`.
- **Sem listar/encerrar sessões granulares** — revoke é all-or-nothing.
- **Sem editar nome do usuário pela UI** — admin edita via banco; F4 traz UI de perfil próprio.
- **Sem busca/filtro na lista de Users** — improvável passar de 30 admins.
- **Sem paginação real em Clients** — `take: 100`; F2 traz cursor pagination.
- **Sem upload de logo do cliente** — F2 traz quando proposta precisar.
- **Sem múltiplos endereços por cliente** — matriz/filial via `parentClientId` cobre o caso real.
- **CPF/CNPJ sem validação de DV** — admin digita do documento físico, regex de tamanho é suficiente.
- **`AdditionalContactsField` não faz drag-to-reorder** — ordem de inserção.
- **Sidebar mobile funcional mas não polida** — admin é uso interno, 99% desktop.

## Notas relacionadas no vault

- `project_duohub_roadmap` — F1a marcada como ⏳ próxima; este spec materializa o escopo.
- `project_duohub_arquitetura` — auth guard pattern, route groups, regras de renderização.
- `project_duohub_seguranca` — IDOR, audit log, rate limit, Zod obrigatório.
- `project_duohub_auth_backlog` — backlog de email/senha + reset + 2FA pra reabrir em F4.
- `project_duohub_data_fetching_research` — análise de TanStack Query/axios adiada pra F4.
- `project_duohub_convencoes` — Biome, content system, Server Actions.
- `project_duohub_email` — Resend + Cloudflare Email Routing (canal do magic link).
- `project_duohub_observabilidade` — PostHog (eventos de auth podem ser instrumentados depois se necessário).
