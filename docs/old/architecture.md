# Arquitetura do Projeto

> Referência técnica para as fases do roadmap (ver `roadmap.md`).
> Decisões aqui foram aprovadas no brainstorm de DUO-25 e valem para todas as
> fases seguintes, salvo revisão explícita.

## Estado atual vs. destino

Hoje a aplicação é uma **landing page institucional estática** em Next.js 16
(App Router, React 19, Tailwind v4, shadcn/ui, Framer Motion, Zustand, Biome,
feature flags PostHog). Sem banco, sem autenticação, sem storage.

A partir da F1, vira **aplicação com estado** com área administrativa interna,
áreas públicas dinâmicas (proposta por link) e, eventualmente, portal do cliente.

## Capacidades que o roadmap exige


| Capacidade                     | Entra em | Observação                                                          |
| ------------------------------ | -------- | ------------------------------------------------------------------- |
| Banco de dados                 | F1a      | Clientes, propostas, leads, portal.                                 |
| Autenticação                   | F1a / F4 | Admin primeiro, cliente depois.                                     |
| E-mail transacional            | F0       | Captura de leads, notificações, alertas de vencimento.              |
| Geração de PDF                 | F2       | Propostas exportáveis.                                              |
| **Cofre de chaves (KMS)**      | **F1b**  | KEK para envelope encryption do certificado digital. **Infisical.** |
| **Storage de arquivos**        | **F1b / F4** | Provedor **único** para toda a aplicação: **Cloudflare R2**. F1b = `.pfx` criptografados via envelope encryption. F4 = documentos gerais (notas, extratos). |


## Stack tecnológica


| Camada                       | Escolha                          | Motivo                                                                     |
| ---------------------------- | -------------------------------- | -------------------------------------------------------------------------- |
| **Banco de dados**           | Postgres via **Neon**            | Serverless, free tier generoso, integrado ao ecossistema Vercel.           |
| **ORM**                      | **Prisma**                       | Convenção do time (migrações `prisma migrate dev` manuais).                |
| **Auth**                     | **Better Auth**                  | Roles nativas, magic link + e-mail/senha, self-hosted, sem vendor lock-in. |
| **E-mail**                   | **Resend**                       | Melhor DX para Next.js, suporte a React Email, free tier decente.          |
| **PDF**                      | **`@react-pdf/renderer`**        | Leve em serverless, template em React, aproveita o HTML existente.         |
| **Cofre de chaves (KMS)**    | **Infisical** (free tier)        | DX simples, free tier generoso (3 usuários, projetos ilimitados, 10k secret ops/mês), self-hostable se precisar. Migrar para AWS KMS só se justificar. |
| **Storage**                  | **Cloudflare R2**                | Provedor primário oficial para F1b e F4. S3-compatible, zero egress, SSE automática. Ver seção abaixo. |
| **Validação**                | **Zod**                          | Padrão Next 16, integra com Server Actions.                                |
| **Env vars**                 | **`@t3-oss/env-nextjs`**         | Separação server/client, validação runtime, impede leak em bundle.         |
| **Rate limiting**            | **Upstash Redis + `ratelimit`**  | Edge-compatible, pay-per-request, essencial em endpoints públicos.         |
| **Observabilidade**          | **Sentry** + Vercel Analytics    | Erros + spikes de 401/403 + performance.                                   |


### Storage: Cloudflare R2 como padrão oficial

**Decisão consolidada:** **Cloudflare R2** é o provedor de storage primário único
da aplicação, atendendo tanto F1b (certificados criptografados) quanto F4
(documentos gerais do cliente). A distinção entre as fases não é de provedor —
é de **camadas aplicadas sobre o R2**.

#### Por que R2

- **S3-compatible** — qualquer SDK compatível com S3 (AWS SDK, `@aws-sdk/client-s3`)
  funciona sem adaptação. Ampla biblioteca de ferramentas e helpers.
- **Zero egress fee** — crítico para F4, onde clientes baixam documentos com
  frequência. Em S3 ou Vercel Blob, esse tráfego seria cobrado.
- **Criptografia em rest** (SSE) automática e obrigatória.
- **Custo previsível** — $0,015/GB/mês armazenado + operações baratas. Orçamento
  limitado da DuoHub é compatível.
- **Presigned URLs** nativas — upload e download diretos sem passar pelo
  servidor Next.
- **Free tier** generoso para começar — 10 GB armazenados + 1M Class A ops/mês.

#### Camadas por tipo de arquivo

| Tipo               | Fase | Provedor | Camadas aplicadas                                                             |
| ------------------ | ---- | -------- | ----------------------------------------------------------------------------- |
| Certificados `.pfx` | F1b  | R2       | **Envelope encryption** (KEK no Infisical + DEK + AES-256-GCM) + SSE do R2 + access control por admin + audit log dedicado |
| Documentos gerais   | F4   | R2       | SSE do R2 + access control por `Client`/`User` + presigned URLs com expiração |

A camada de envelope encryption só se justifica para certificados (sensibilidade
extrema). Para documentos gerais, a SSE do R2 + controle de acesso + audit log
são suficientes.

#### Organização de buckets e prefixos

A decidir no início de cada fase (detalhe operacional, não arquitetural):

- **Opção A** — um bucket único com prefixos (`certificates/`, `documents/`).
- **Opção B** — buckets separados (`duohub-certificates`, `duohub-documents`).

Preferência provável: buckets separados, porque permitem políticas de retenção,
logs e CORS distintos sem interferir entre si.

#### Requisitos operacionais

Válidos para **qualquer** uso de storage na aplicação:

- Bucket com acesso privado por padrão (nunca público).
- Credenciais via IAM do Cloudflare, armazenadas no Infisical (não em `.env`
  direto — passa pelo carregamento de secrets).
- Nomes de arquivo randomizados server-side (nunca confiar no nome original).
- Presigned URLs com **expiração curta** (recomendação: 15 minutos para upload,
  15 minutos para download comum, 1 hora para cenários específicos).
- Log de cada operação sensível (upload, download, delete) em `AuditLog` ou
  `CertificateAccessLog` conforme o tipo de arquivo.
- Backup/versionamento do bucket habilitado (R2 suporta versioning).

#### Quando reavaliar

Trocar de provedor é caro. Revisitar a decisão apenas se:

- Surgir requisito legal ou contratual de **residência estrita** de dados em
  território brasileiro. R2 tem múltiplas regiões mas não garante BR.
- Escala tornar o custo desvantajoso (improvável no médio prazo).
- Cliente ou regulador específico exigir outro provedor.
- Incidente significativo de segurança/disponibilidade no R2.

Nesse caso, **fallback natural é Backblaze B2** (também S3-compatible, perfil
de custo similar).

## Estrutura de rotas (App Router)

Decisões fixadas:

- **Admin** em `/admin`.
- **Portal do cliente** em `/app`.
- **Landing e páginas institucionais** em route group `(marketing)`.
- **Rotas públicas dinâmicas** (link de proposta) em route group `(public-app)`.

```
src/app/
├── (marketing)/                    # Site institucional público (estático/ISR)
│   ├── page.tsx                   # Landing atual
│   ├── imposto-de-renda/          # F0
│   │   └── page.tsx
│   └── ferramentas/               # F3
│       ├── regime-tributario/
│       ├── mei-vs-me/
│       └── pro-labore/
│
├── (public-app)/                  # Rotas públicas dinâmicas (sem header institucional)
│   └── propostas/
│       └── [token]/page.tsx       # F2 — link público temporário
│
├── admin/                         # F1+ — área admin (auth required)
│   ├── layout.tsx                 # Auth guard + sidebar
│   ├── page.tsx                   # Dashboard
│   ├── clientes/
│   ├── propostas/
│   ├── leads/
│   └── faturamento/
│
├── app/                           # F4 — portal do cliente (auth required)
│   ├── layout.tsx
│   ├── dashboard/
│   ├── obrigacoes/
│   ├── documentos/
│   └── comunicacao/
│
└── api/
    ├── auth/[...all]/route.ts     # Better Auth catch-all
    └── webhooks/                   # Resend, Stripe futuro, etc.
```

**Benefícios dos route groups:**

- `(marketing)` e `(public-app)` permitem layouts diferentes sem alterar a URL.
- `/admin` e `/app` têm layouts próprios com auth guard server-side.

## Estrutura de código (feature-first)

O código hoje é organizado por tipo (`components/`, `hooks/`, `stores/`). A partir
da F1 migramos para organização **por feature**, mantendo os tipos transversais.

```
src/
├── app/                 # Rotas (acima)
├── components/
│   ├── ui/             # shadcn primitives (não mexer)
│   └── shared/         # Header, Footer, Banner — usados em múltiplos contextos
│
├── features/            # Lógica de domínio por feature
│   ├── clients/
│   │   ├── components/       # ClientForm, ClientTable, etc.
│   │   ├── schemas.ts        # Zod schemas
│   │   ├── queries.ts        # Prisma reads (server)
│   │   ├── actions.ts        # Server Actions (mutations)
│   │   └── types.ts
│   ├── proposals/
│   ├── leads/
│   ├── billing/
│   └── tools/                # Calculadoras/simuladores (F3)
│       ├── regime-tributario/
│       └── mei-vs-me/
│
├── lib/
│   ├── auth/           # Better Auth config (server + client)
│   ├── db/             # Prisma client singleton
│   ├── email/          # Resend + React Email templates
│   ├── storage/        # Cliente R2 (F1b + F4)
│   ├── pdf/            # Componentes @react-pdf (F2)
│   ├── env.ts          # Env vars validados
│   └── utils.ts
│
├── content/             # Content system (mantém como está)
├── stores/              # Zustand (mantém)
└── hooks/               # Hooks globais
```

**Regra de organização:**

- Se é específico de uma feature → `features/<nome>/components/`.
- Se é compartilhado entre features → `components/shared/`.
- Se é primitivo puro (shadcn) → `components/ui/`.

## Padrões transversais

### Data fetching e mutations

- **Queries:** Server Components fazem fetch direto via Prisma. Zero client-side
fetching para dados de admin ou portal.
- **Mutations:** Server Actions (`"use server"`) para admin e portal. Sem API
routes REST para CRUD interno.
- **Route Handlers (`/api`):** só para Better Auth, webhooks, e endpoints
verdadeiramente públicos (ex.: POST de leads vindos de formulário na F0).

### Renderização: marketing estático × admin dinâmico

**Regra inviolável:** marketing permanece estático. Admin e app são sempre
dinâmicos.


| Área           | Estratégia         | Proibido usar em marketing                                                                   |
| -------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| `(marketing)`  | Static / ISR       | `cookies()`, `headers()`, `noStore()`, `fetch({cache:"no-store"})`, Server Actions dinâmicas |
| `(public-app)` | Dynamic            | *(livre)*                                                                                    |
| `admin`, `app` | Dynamic + no-cache | *(livre)*                                                                                    |


Ler cookies no layout de `/admin` e `/app` é intencional — torna a rota dynamic
automaticamente e garante que nunca seja pré-renderizada com dados de outro
usuário.

### Autenticação e autorização

**Modelo:**

- `User` com `role: "admin" | "client"`.
- Tabela `UserClient` (N:N) preparada desde a F1, mas só explorada na F4.
- Na F1, um `User` admin sempre tem acesso total; cliente da F4 só vê recursos
ligados ao próprio `UserClient`.

**Guard — padrão obrigatório:**

Validação de sessão e role **sempre** no server, no layout da área protegida.
Middleware faz apenas o check barato de existência do cookie.

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

**Proibido:** `useSession` + redirect em `useEffect`. Flash de conteúdo protegido
e risco de bypass.

### Middleware com matcher restrito

Middleware **não** roda em rotas de marketing. Latência zero nas páginas públicas.

```ts
// src/middleware.ts
export const config = {
  matcher: ["/admin/:path*", "/app/:path*"],
};
```

O middleware apenas verifica existência do cookie de sessão e redireciona para
`/login` se não houver. Validação real da sessão + role é responsabilidade do
layout (server component).

### Robots, metadata e sitemap


| Área                 | Metadata                                                              | Sitemap                 |
| -------------------- | --------------------------------------------------------------------- | ----------------------- |
| `(marketing)`        | Indexável (padrão atual)                                              | Incluído (`sitemap.ts`) |
| `/admin`, `/app`     | `robots: { index: false, follow: false, nocache: true }`              | Excluído                |
| `/propostas/[token]` | `robots: { index: false, follow: false }` + `Cache-Control: no-store` | Excluído                |


### Feature Flags

Usamos **PostHog Feature Flags** como única fonte de verdade pra config flags
(`logo-text-centered`, `social-proof-type`, `irpf-banner`) e, futuramente,
A/B testing client-side.

**Server (config flags globais):**

- `posthog-node` em `src/lib/posthog/server.ts` (singleton, modo remote evaluation).
- `resolveAll()` em `src/lib/posthog/flags/resolve.ts` busca todas as flags com
  `getAllFlagsAndPayloads("anonymous-marketing-visitor")`, validando cada valor
  com Zod (`.safeParse`) e caindo no `defaultValue` em caso de falha.
- O fetch é envolvido em `unstable_cache(revalidate: 60, tags: ["posthog-flags"])`,
  o que mantém a landing pública estática (ISR) e limita o tráfego ao PostHog
  a no máximo uma chamada por minuto.

**Client (preparação pra A/B testing futuro):**

- `<PostHogProvider>` em `src/components/providers.tsx` envolve a árvore.
- Hooks de `@posthog/react` (`useFeatureFlagVariantKey`, etc.) ficam disponíveis
  pra qualquer client component.
- Ainda não há experiment flags em uso — a infra existe, mas a primeira flag
  desse tipo só será criada quando houver um teste real planejado.

**Validação de payloads:**

- Toda flag declara um schema Zod em `src/lib/posthog/flags/config.ts`.
- O schema do banner (`src/lib/posthog/flags/schemas/banner.ts`) inclui um
  `.transform()` que absorve a janela de datas (BRT). Ativação on/off é
  controlada exclusivamente pelo toggle `enabled` da flag no PostHog — quando
  desligada, `posthog-node` não retorna payload e `resolveAll()` cai no
  default `null`. O consumidor recebe `BannerConfig | null` direto.

**Flags futuras planejadas (F0+):**

- `irPageEnabled` (F0)
- `adminEnabled` (F1)
- `toolsEnabled` (F3)
- `appEnabled` (F4)

Permite soft launch em produção.

**Por que não Vercel Flags / Feature Flags SDK:**

- O time já paga por PostHog (analytics + session replay); ter dois sistemas
  de flags era desnecessário.
- O setup customizado anterior (Zustand pra hidratar flags no cliente) era
  legal-mas-frágil: agora todo state vive no server e só o que vira variante
  visual é passado como prop.

## Segurança

Tópicos a endereçar em toda implementação que toque as respectivas camadas.

### Cabeçalhos HTTP globais

Adicionados via `next.config.ts`:

- `Strict-Transport-Security` (HSTS, inclua `preload` quando confirmado)
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` restritiva (camera/microphone/geolocation desabilitados)
- `Content-Security-Policy` — inicialmente em modo **report-only**, com endurecimento
após coleta de dados em produção.

### Cookies de sessão

Better Auth configurado **explicitamente** (não apenas default):

- `httpOnly: true`
- `secure: true` (em produção)
- `sameSite: "lax"`
- Expiração de sessão configurável por role.

### Rate limiting

Upstash Redis + `@upstash/ratelimit` obrigatório em:

- `/api/auth/`* — brute force.
- Formulário de leads (F0) — spam.
- Endpoint público de proposta (F2) — enumeration.
- Ferramentas públicas (F3) — abuso de cálculo.

### Validação com Zod

Toda Server Action parseia o input com Zod **antes** de qualquer lógica. Sem
exceção. Nunca confiar no cliente.

### IDOR (Insecure Direct Object Reference)

Toda query/mutation que envolve um recurso do cliente:

1. Recebe o ID do recurso.
2. Verifica ownership contra `session.user.id` (ou `UserClient`) **antes** de
  retornar ou modificar.
3. Nunca assume que o ID veio de um lugar confiável.

Anti-padrão (nunca fazer):

```ts
// ❌ IDOR — retorna qualquer client se o usuário souber o ID
const client = await prisma.client.findUnique({ where: { id } });
```

Correto:

```ts
// ✅ Valida ownership
const client = await prisma.client.findFirst({
  where: {
    id,
    users: { some: { userId: session.user.id } },
  },
});
if (!client) notFound();
```

### SQL injection

Prisma parametriza tudo por padrão. Proibir `$queryRaw` sem template literal
seguro. Qualquer uso exige revisão manual.

### CSRF

- Server Actions do Next 16 têm token CSRF built-in.
- Better Auth protege `/api/auth/*`.
- Endpoints públicos (F0 leads) exigem token de formulário ou rate limit + origin
check.

### LGPD

Dados pessoais sensíveis (CPF/CNPJ, e-mail, telefone):

- Armazenados no banco (protegido pelo provedor) — criptografia em coluna só
quando necessário.
- **Nunca** logados em console, Sentry ou URL/query string.
- `deletedAt` para soft delete (retenção legal).
- Campos de audit obrigatórios em toda tabela: `createdAt`, `updatedAt`,
`createdBy` (quando aplicável).
- Política de privacidade e termos de uso publicados antes de abrir qualquer
formulário público.
- Direito de exportar e excluir dados exposto no portal (F4).

### Audit log

Tabela `AuditLog` alimentada por toda ação sensível:

```
AuditLog {
  id          String
  userId      String
  action      String   // "client.create", "proposal.send", "user.login", ...
  resourceType String
  resourceId  String
  ip          String
  userAgent   String
  metadata    Json?
  createdAt   DateTime
}
```

Crítico para contexto contábil (requisito regulatório) e para investigar incidentes.

### Certificado digital (F1b + F4)

**O dado mais sensível que a aplicação manipula.** Um certificado A1 (`.pfx`)
protegido por senha é a identidade digital da empresa perante a Receita Federal
— com ele é possível assinar declarações, emitir NFe/NFSe, transmitir SPED e
acessar o e-CAC. Vazamento configura fraude fiscal. Recebe tratamento dedicado,
diferente de todos os outros dados.

#### Escopo atual (Nível A — cofre digital)

A aplicação **armazena** o certificado com segurança e permite **download seguro**
por admins autorizados (F1b) e pelo próprio cliente (F4). O uso prático do
certificado é feito **localmente pelo contador** em ferramentas externas (e-CAC,
emissores próprios de NFe).

#### Escopo futuro (Nível B — uso programático)

A aplicação usar o certificado diretamente (emitir NFe automaticamente, assinar
XMLs de SPED/ECD/ECF, consultar webservices da Receita) é um módulo fiscal
completo por si só. Documentado como plano futuro em `roadmap.md#f5--backlog`.
Não está no escopo da F1b nem da F4.

#### Envelope encryption

Três camadas com chaves independentes. Um vazamento isolado de qualquer camada
é insuficiente para decriptar o certificado.

```
┌─────────────────────────────────────────────────────┐
│  Storage (Cloudflare R2)                            │
│  └── certificado.pfx.enc  — arquivo criptografado   │
│      com a DEK                                      │
└─────────────────────────────────────────────────────┘
                      ▲
                      │ decripta sob demanda
┌─────────────────────────────────────────────────────┐
│  Banco (Postgres/Neon)                              │
│  └── DigitalCertificate                             │
│      ├── encryptedDek       — DEK criptografada     │
│      │                        com a KEK             │
│      ├── encryptedPassword  — senha criptografada   │
│      │                        com a DEK             │
│      ├── iv, algorithm, kekId                       │
└─────────────────────────────────────────────────────┘
                      ▲
                      │ decripta a DEK
┌─────────────────────────────────────────────────────┐
│  Cofre (Infisical)                                  │
│  └── KEK — Key Encryption Key                       │
│      • nunca sai do cofre                           │
│      • rotacionável sem reencriptar payloads        │
└─────────────────────────────────────────────────────┘
```

- **KEK** (Key Encryption Key): mestra, vive no Infisical. Nunca em código,
  env var local, nem commitada. Rotacionável; cada DigitalCertificate guarda
  `kekId` da chave usada na criação.
- **DEK** (Data Encryption Key): uma por certificado, aleatória, criptografada
  pela KEK e persistida no DB.
- **Payload**: arquivo `.pfx` e senha, criptografados pela DEK, com algoritmo
  `AES-256-GCM` e IVs distintos.

#### Schema (indicativo, refinado na implementação)

```prisma
model DigitalCertificate {
  id                String    @id @default(cuid())
  clientId          String
  client            Client    @relation(fields: [clientId], references: [id])

  // Metadata extraída no upload (não-sensível)
  type              String    // "A1" | "A3"
  subjectCn         String    // CN do titular
  serialNumber      String    // serial do certificado
  issuedAt          DateTime
  expiresAt         DateTime  // usado em alertas de vencimento

  // Payload
  storageKey        String    // path do .pfx.enc no storage
  encryptedPassword Bytes     // senha cifrada com DEK
  encryptedDek      Bytes     // DEK cifrada com KEK
  kekId             String    // identifica KEK usada (rotação)
  iv                Bytes
  algorithm         String    // "aes-256-gcm"

  // Ciclo de vida
  uploadedBy        String    // userId
  uploadedAt        DateTime  @default(now())
  revokedAt         DateTime?
  lastUsedAt        DateTime?

  @@index([clientId])
  @@index([expiresAt])
}

model CertificateAccessLog {
  id              String   @id @default(cuid())
  certificateId   String
  userId          String
  action          String   // "upload" | "decrypt" | "download" | "revoke"
  purpose         String?  // motivo informado pelo operador
  ip              String
  userAgent       String
  createdAt       DateTime @default(now())

  @@index([certificateId])
}
```

#### Fluxos

**Upload (admin na F1b; cliente na F4):**

1. Operador envia o `.pfx` + senha.
2. Servidor valida: é `.pfx`/`.p12`? Senha decripta o arquivo? Certificado é válido?
3. Servidor extrai metadata (CN, serial, validade) — parte não-sensível.
4. Gera DEK aleatória. Criptografa arquivo e senha com a DEK (AES-256-GCM, IVs
   distintos).
5. Busca KEK no Infisical, criptografa a DEK com ela.
6. Persiste arquivo criptografado no storage e metadata + DEK criptografada +
   senha criptografada no DB.
7. Escreve `CertificateAccessLog` (action=`upload`).

**Uso (download por contador autorizado):**

1. Contador solicita download; servidor valida papel e ownership.
2. Busca KEK do Infisical, decripta a DEK.
3. Gera presigned URL de download do arquivo criptografado do storage OU
   decripta em memória e serve diretamente (preferível; arquivo decriptado
   nunca toca disco da aplicação).
4. Senha é mostrada/retornada apenas após confirmação explícita do contador.
5. Escreve `CertificateAccessLog` (action=`download` ou `decrypt`) com
   `purpose` informado.

#### Controles adicionais

- **Audit log obrigatório** em toda operação (upload, download, decrypt,
  revogação). Complementa o `AuditLog` geral.
- **Rate limit agressivo** em todos os endpoints de certificado.
- **Alerta de vencimento** por e-mail/sistema 30/15/7 dias antes de `expiresAt`.
- **Acesso restrito** a roles específicas do admin (não qualquer usuário).
- **Nunca** logar senha, `encryptedPassword`, `encryptedDek` ou conteúdo
  decriptado.
- **Memória transitória** — conteúdo decriptado nunca é persistido em disco
  da aplicação nem em cache.
- **Rotação de KEK** — procedimento documentado para regenerar a KEK e
  reencriptar todas as DEKs sem tocar nos payloads.

#### Decisões pendentes para o brainstorm da F1b

- Download direto (servidor decripta e serve) vs presigned URL + decrypt no
  cliente (mais complexo, expõe DEK temporariamente).
- MFA obrigatório no momento do download.
- Tempo máximo de validade da URL de download.
- Política de backup da KEK (Infisical tem recovery; confirmar SLA).

### Upload seguro (F4)

- Validação server-side de MIME type e tamanho.
- Presigned URLs — upload direto para o storage, sem passar pelo servidor Next.
- Nomes de arquivo randomizados (nunca confiar no nome original).
- URLs com expiração curta (ex.: 15 minutos).
- Log de cada acesso.

### Token de proposta pública (F2)

Requisito de negócio: proposta válida por **7 dias úteis**.

- 32 bytes aleatórios via `crypto.randomBytes`, encodados em base64url.
- Expiração calculada por **dias úteis** em `America/Sao_Paulo`, com **snapshot**
no momento da criação (não recalcula com mudanças de calendário).
- Lista de feriados versionada no repositório (determinística, sem dependência
de rede em runtime).
- Admin pode **renovar** (gerando novo token ou estendendo o atual) e **cancelar**
antecipadamente.
- Rate limit por IP no endpoint público.
- Log de cada acesso para audit.

**Detalhes a resolver no brainstorm da F2:** feriados nacionais vs estaduais,
início da contagem (dia do envio vs próximo dia útil), hora exata de expiração.

### Env vars

- `.env` nunca commitado.
- `.env.example` commitado com todas as chaves (valores vazios ou dummy).
- Validação via `@t3-oss/env-nextjs` com separação server/client para impedir
leak no bundle.

### Dependências

- Dependabot weekly já ativo.
- Adicionar `pnpm audit` no pipeline de CI.

### Backups

- Neon: point-in-time restore nos planos pagos.
- Anotar como requisito antes de guardar dados reais em produção.

## Status

> **Abril 2026** — arquitetura aprovada. Primeira implementação: F0 (página IR).

