# CI/CD & Deploy

## Visão geral

Modelo gitflow puro com deploy nativo da Vercel. Não há workflow de release: **merge na `main` é o gatilho de produção**.

```
Feature branch → PR → CI (GitHub Actions) + Vercel Preview → Merge em main
                                                                  ↓
                                                Vercel detecta push em main
                                                                  ↓
                                              vercel-build.sh roda na Vercel
                                                  (migrate deploy + next build)
                                                                  ↓
                                                www.duohubcontabil.com.br
```

## Ambientes

| Ambiente     | URL                                       | Gatilho                | Branch              |
| ------------ | ----------------------------------------- | ---------------------- | ------------------- |
| Preview (PR) | `duohub-<hash>-<scope>.vercel.app`        | PR aberta/atualizada   | branches de feature |
| Produção     | `www.duohubcontabil.com.br`               | push/merge em `main`   | `main`              |

> Não há ambiente de staging dedicado. Para revisar uma mudança antes de mergear, use a Preview URL automática que a Vercel cria por PR (comentada pelo bot da Vercel no próprio PR). Se um dia for preciso um domínio fixo de pré-produção, crie uma branch (ex: `staging`), configure-a como ambiente de Preview na Vercel e plugue um domínio nela.

## Pipeline de CI (GitHub Actions)

**Workflow:** `.github/workflows/ci.yml`
**Dispara em:** PRs para `main` e pushes para `main`

Passos:

1. `pnpm install --frozen-lockfile`
2. `pnpm biome check .` — lint
3. `pnpm tsc --noEmit` — verificação de tipos

O job **Lint & Type Check** é status check obrigatório. PRs não podem ser mergeadas se ele falhar.

## Build & deploy (Vercel)

A Vercel é o único responsável pelo build e deploy. Não há mais nenhum workflow do GitHub Actions chamando `vercel deploy` — toda a lógica vive em `scripts/vercel-build.sh`, que é invocado pelo comando `vercel-build` definido em `package.json`.

### `scripts/vercel-build.sh`

```bash
1. pnpm prisma generate                # sempre
2. if VERCEL_ENV == production:
     pnpm prisma migrate deploy        # só em produção
3. pnpm next build
```

Isso garante que migrations rodam **apenas** em deploys de produção, mesmo que `DATABASE_URL` aponte para o mesmo banco em previews. Migrations de PRs não aprovadas nunca tocam o schema de prod.

### Como simular localmente

```bash
VERCEL_ENV=preview    bash scripts/vercel-build.sh   # pula migrations
VERCEL_ENV=production bash scripts/vercel-build.sh   # roda migrations
```

> Para desenvolvimento normal use `pnpm build`, que **não** invoca o script da Vercel — apenas `next build`.

## Banco de dados e migrations (Prisma)

| Contexto                | Migrations? | Como                                                             |
| ----------------------- | ----------- | ---------------------------------------------------------------- |
| Dev local               | Manual      | `pnpm db:migrate` ao alterar o schema                            |
| Preview (PR)            | Não         | `vercel-build.sh` pula porque `VERCEL_ENV != production`         |
| Produção (push em main) | Sim         | `vercel-build.sh` roda `prisma migrate deploy` antes do build    |

### Geração do Prisma Client

- `postinstall` no `package.json` roda `prisma generate` automaticamente após `pnpm install`.
- O `vercel-build.sh` também executa `pnpm prisma generate` explicitamente como defesa em profundidade.

### Por que não rodar migrations em previews

`DATABASE_URL` é o mesmo em Production e Preview na Vercel. Aplicar migrations a cada PR poluiria o schema de produção com mudanças não aprovadas e criaria condições de corrida entre PRs concorrentes. Por isso o gate `VERCEL_ENV == production` no script.

## Proteção da branch `main`

- Push direto bloqueado para todos, **incluindo administradores** (`enforce_admins: true`).
- Status checks obrigatórios:
  - **Lint & Type Check** (GitHub Actions)
  - **Vercel — Preview** (deploy bem-sucedido)
- Sem bypass actors. Toda mudança passa por PR + status checks.
- "Allow auto-merge" habilitado em Settings → General — permite mergear hot-fixes assim que os checks passarem, sem precisar voltar manualmente ao botão "Merge".
- Branches de feature são apagadas automaticamente após o merge.

## Variáveis de ambiente

Todas as variáveis de runtime ficam **exclusivamente na Vercel** (Project Settings → Environment Variables). Não há mais sincronização com GitHub Secrets — o GitHub Actions só roda lint/typecheck e não acessa banco/secrets.

| Variável                        | Production | Preview | Sensitive |
| ------------------------------- | ---------- | ------- | --------- |
| `DATABASE_URL`                  | ✓          | ✓       | ✓         |
| `DIRECT_URL`                    | ✓          | ✓       | ✓         |
| `RESEND_API_KEY`                | ✓          | ✓       | ✓         |
| `UPSTASH_REDIS_REST_URL`        | ✓          | ✓       | ✓         |
| `UPSTASH_REDIS_REST_TOKEN`      | ✓          | ✓       | ✓         |
| `NEXT_PUBLIC_POSTHOG_TOKEN`     | ✓          | ✓       |           |
| `NEXT_PUBLIC_POSTHOG_HOST`      | ✓          | ✓       |           |

> Marcar como **Sensitive** impede leitura via `vercel pull` ou API — só são injetadas no runtime do build na Vercel. Como o build agora acontece dentro da Vercel (não mais no GitHub Actions), não temos mais o problema de variáveis sensitivas indisponíveis no CI.

### Rotação de credenciais

Para rotacionar `DATABASE_URL`, `DIRECT_URL` ou qualquer outra credencial: atualize **apenas na Vercel** e aguarde o próximo deploy de produção (ou clique em "Redeploy" no dashboard). Não há mais duplicação em GitHub Secrets.

## Configuração na Vercel

**Project Settings → Environments → Production:**

- **Branch Tracking:** `main`
- **Automatically promote successful deployments:** Enabled (sem isso, o push em `main` builda mas não vira o deploy ativo)

**Project Settings → Environments → Preview:**

- **Branch Tracking:** `All unassigned git branches`

**Project Settings → Git → Connected Git Repository:**

- **Pull Request Comments:** Enabled
- **deployment_status Events:** Enabled

**Project Settings → Build & Development Settings:**

- **Framework Preset:** Next.js
- **Build Command:** *(default — Vercel chama `pnpm vercel-build`, que aciona `scripts/vercel-build.sh`)*
- **Output Directory:** *(default)*
- **Install Command:** *(default — `pnpm install`)*

**Project Settings → Domains:**

- `www.duohubcontabil.com.br` → Production (`main`)
- `duohubcontabil.com.br` → Redirect 307 → `www.duohubcontabil.com.br`

> O domínio `duohub-dev.vercel.app` foi removido. Cada PR já recebe uma Preview URL única gerada automaticamente pela Vercel (e comentada no próprio PR pelo bot da Vercel) — esse é o canal padrão para revisar mudanças antes do merge.

## Dependabot

**Configuração:** `.github/dependabot.yml`

- Atualiza dependências **npm** e **GitHub Actions** semanalmente (segundas-feiras).
- Minor e patch agrupados numa única PR (ecossistema npm).
- Labels: `dependencies`, `ci`.
- Prefixos de commit: `chore(deps):`, `chore(ci):`.

## Histórico

Antes deste setup, o projeto usava um workflow `release.yml` com versionamento manual (semver), tags, GitHub Releases e deploy via `vercel deploy --prod` rodando dentro do GitHub Actions. Esse modelo foi descontinuado em DUO-36 porque:

- **Variáveis Sensitive da Vercel** não eram baixadas pelo `vercel pull` no CI, exigindo duplicação em GitHub Secrets — toda env nova virava bola de neve.
- **Versionamento formal** não tinha valor prático para um site institucional sem consumidores externos do `package.json`.
- **Branch fantasma `release`** + dispatch manual adicionavam fricção sem benefício real.

O modelo atual aposta na proteção da branch (`enforce_admins`, status checks, sem bypass) como única trava de produção, mantendo deploys instantâneos e mínima ferramenta.
