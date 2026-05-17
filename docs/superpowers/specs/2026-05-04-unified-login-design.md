# Design — Login unificado em `/login` com role-based redirect

**Data:** 2026-05-04
**Status:** Implementado em DUO-48 (revisado em 2026-05-05 após smoke test — ver §17)
**Linear:** Implementado dentro do escopo de [DUO-48](https://linear.app/duohub/issue/DUO-48)
**Fase do roadmap:** F1a (Fundação do Admin) — refator dentro da PR3 (DUO-48)
**Branch base:** `feat/DUO-48/f1a-pr3-shell`
**Escopo:** Mover o login interno de `/admin/login` para `/login`, com decisão de destino baseada em `role` (admin → `/admin`, cliente → `/app`). Roteamento role-aware ocorre num trampolim server-side em `/post-login`, garantindo que `/app` (F4) já seja o destino correto para CLIENT desde a primeira request — quando F4 entrar, nenhuma mudança em auth é necessária.

---

## 1. Contexto e motivação

### 1.1 Estado atual

A F1a entregou autenticação por magic link com a página de login em `/admin/login` (route group `(public-app)`). O fluxo, hoje, presume implicitamente que **todo usuário autenticado é admin**:

| Componente | Comportamento atual |
|---|---|
| `src/app/(public-app)/admin/login/page.tsx` | Página de login pública. Pré-chama `getSession()` e, se logado, redireciona via `safeNext`. |
| `src/lib/auth/safe-redirect.ts` | `safeNext(next)` aceita paths sob `/admin/*` e `/app/*`. Fallback hardcoded `/admin`. Sem awareness de role. |
| `src/lib/auth/helpers.ts` | `requireAdmin()` redireciona para `/admin/login` em três casos: sem sessão, sessão órfã/revogada, role ≠ ADMIN. |
| `src/features/auth/actions.ts` | `sendLoginMagicLinkAction` passa `callbackURL: parsed.data.next ?? "/admin"` e `errorCallbackURL: "/admin/login"` ao Better Auth. |
| `src/proxy.ts` (Edge middleware) | Matcher: `["/admin", "/admin/((?!login).*)", "/app/:path*"]`. Redireciona ausência de cookie para `/admin/login?next=…`. |
| `src/components/nav-user.tsx` | Logout faz `router.push("/admin/login")`. |
| `src/components/login-form.tsx` | Default do hidden field `next` é `/admin`. |
| `prisma/seed-admin.ts` | Mensagem de console aponta para `/admin/login`. |

### 1.2 Por que migrar agora

1. **Decisão arquitetural confirmada:** [`feedback_duohub_admin_app_separados_decisao_mantida`](../../../../cofre/ai-zepapagaio/claude-memory/feedback_duohub_admin_app_separados_decisao_mantida.md) — `/admin` e `/app` continuam como árvores de rota separadas (segurança em camadas via `layout.tsx` guard). A consequência é que **o `/login` precisa ser agnóstico de role**, não acoplado a `/admin`.
2. **Custo só sobe com o tempo:** F1b, F2 e F4 vão adicionar mais entry-points e mais lugares que disparam redirects de login. Mover agora afeta ~10 arquivos; mover depois da F4 afeta o dobro e quebra usuários reais (clientes que receberam convite).
3. **UX correta desde o início:** o usuário não precisa saber se é "admin" ou "cliente" — ele só faz login. A URL `/admin/login` é uma vazamento de detalhe técnico que sugere que apenas admins entram pelo sistema.
4. **Open-redirect endurecido:** a refator é a oportunidade certa de adicionar **role-aware path validation** ao `safeNext`, fechando o cenário "cliente com `?next=/admin/clientes` é redirecionado para área proibida e só é barrado pelo `requireAdmin` no destino" (defesa em profundidade).

### 1.3 Restrição arquitetural preservada

`docs/architecture.md` define que `/admin` e `/app` são as únicas árvores autenticadas e que sessão + role são validadas no **layout.tsx** server-side (não no middleware). Esta refator **não altera** essa regra — apenas centraliza o ponto de entrada (`/login`) e mantém os guards no destino.

A regra de `(marketing)` permanecer estaticamente renderizável **continua válida**. `/login` mora em `(public-app)` (mesma decisão de hoje) e é `dynamic = "force-dynamic"` por causa de `getSession()`.

---

## 2. Decisão arquitetural

### 2.1 Estratégia

**`/login` único, public, agnóstico de role**, com responsabilidade de:

1. Renderizar o formulário de magic link (igual hoje).
2. Se já houver sessão válida, calcular destino com base em `role` e redirecionar.
3. Aceitar `?next=` mas **validar contra a role** — admin não pode ir para `/app/*`, cliente não pode para `/admin/*`. Falha de validação cai no destino default da role.
4. Surfacing de erros de auth (`?error=…`) via toast, igual hoje.

A página antiga `/admin/login` é **deletada** (não há tráfego em produção; aplicação ainda não foi lançada).

### 2.2 Decisões consolidadas (tomadas em `AskQuestion`)

| # | Decisão | Justificativa |
|---|---|---|
| 1 | **Role-based redirect**: ADMIN → `/admin`, CLIENT → `/app`, sem role válida → `/login?error=forbidden` | Cobre admin (presente) e cliente (F4) sem precisar de novo refator. Defesa em profundidade contra cross-role redirect. |
| 2 | **Deletar `/admin/login`** (sem 308 permanente) | App não está em produção pública. Manter alias confunde código e SEO. URL antiga vira 404 (Next padrão). |
| 3 | **Logado visitando `/login` → redireciona** para destino default da role | Mantém comportamento atual (`safeNext` no pre-check). Usuário que quer trocar de conta faz logout primeiro. Decisão revisitável se virar dor real. |
| 4 | **Não criar `requireClient()` ainda** | F4 não chegou. Quando chegar, espelha `requireAdmin()` apontando para `/login`. |
| 5 | **`callbackURL` do Better Auth continua `/admin` por enquanto** | A action de login não conhece a role do email (anti-enumeration). O destino é decidido no layout do destino — `requireAdmin()` que jogue para `/login?error=forbidden` se não bater. F4 considera rota intermediária `/post-login` se necessário. |
| 6 | **Não criar middleware para `/login`** | Página é estática + Server Component que faz pre-check. Middleware aqui só adiciona latência. |

### 2.3 Por que não as alternativas

| Alternativa | Por que não |
|---|---|
| Manter `/admin/login` e adicionar `/login` como alias | Duplica código, dobra superfície de ataque (dois entry-points para auditar), mantém vazamento de detalhe técnico na URL antiga. |
| Criar rota intermediária `/post-login` agora | Over-engineering para 1 role. Avaliar quando F4 introduzir a segunda role. |
| Mover lógica de role-based redirect para middleware | Quebra a regra de "role validation no layout". Middleware roda no Edge e não conhece o cookie cache nem deve fazer DB lookup. |
| Manter `safeNext` sem awareness de role | Cliente com URL maliciosa `?next=/admin/clientes` seria barrado só pelo `requireAdmin` no destino. Funciona, mas é defesa rasa. Adicionar role no `safeNext` é defesa em profundidade barata. |

---

## 3. Estrutura de arquivos

### 3.1 Arquivos novos

- `src/app/(public-app)/login/page.tsx` — página de login agnóstica de role.

### 3.2 Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `src/lib/auth/safe-redirect.ts` | Assinatura passa a ser `safeNext(next, role)`. Fallback dinâmico (`/admin` ou `/app`) por role. Cross-role rejection adicionada. |
| `src/lib/auth/helpers.ts` | Novo helper `defaultDestinationForRole(role)`. `requireAdmin()` redireciona para `/login` (não `/admin/login`) preservando `?next` e `?error`. |
| `src/features/auth/actions.ts` | `errorCallbackURL: "/login"` (era `/admin/login`). `callbackURL` default permanece `"/admin"` (ver §2.2 #5). |
| `src/proxy.ts` | Matcher: `["/admin", "/admin/:path*", "/app/:path*"]` (não precisa mais excluir `/login` porque ele não está sob `/admin`). Redirect aponta para `/login`. Defensiva `if (pathname.startsWith("/admin/login"))` removida. |
| `src/components/nav-user.tsx` | Logout faz `router.push("/login")`. |
| `src/components/login-form.tsx` | Default do hidden field `next` deixa de ser hardcoded `/admin` — fica `undefined` quando o usuário chega sem `?next=`. Server resolve via `safeNext(next, role)`. |
| `prisma/seed-admin.ts` | Mensagem do console: `→ Visit /login and request a magic link to sign in.` |
| `src/lib/auth/safe-redirect.test.ts` | Casos atualizados para nova assinatura + casos novos cobrindo cross-role rejection. |
| `src/lib/auth/helpers.test.ts` | Asserções de redirect trocadas para `/login*`. |
| `src/features/auth/actions.test.ts` | Asserção de `errorCallbackURL` trocada para `/login`. |
| `src/proxy.test.ts` | Asserções de redirect trocadas para `/login*`. |

### 3.3 Arquivos deletados

- `src/app/(public-app)/admin/login/page.tsx`
- Pasta `src/app/(public-app)/admin/login/` (vazia após o delete).
- Pasta `src/app/(public-app)/admin/` (vazia após o delete).

### 3.4 Arquivos preservados

- `src/lib/auth/auth.ts` — config Better Auth não muda; URLs são consumidas pelos callers.
- `src/lib/auth/auth-client.ts` — client SDK não muda.
- `src/components/login-form.tsx` (estrutura visual e de form) — só muda o default do `next`.
- `src/content/messages/auth.ts` (e `messages/admin.ts`) — copy não menciona URLs.

### 3.5 Documentação a atualizar

- `docs/architecture.md` §"Auth Guard Pattern" — atualizar exemplo `redirect("/login?next=/admin")` (já está assim no doc; confirmar que continua coerente).
- Não há outras menções a `/admin/login` em `docs/` que precisem mudar — planos antigos (`docs/superpowers/plans/`) são histórico imutável.

---

## 4. API de redirecionamento

### 4.1 Helper `defaultDestinationForRole`

```ts
// src/lib/auth/helpers.ts
import type { UserRole } from "@prisma/client";

const ROLE_DESTINATION: Record<UserRole, string> = {
	ADMIN: "/admin",
	CLIENT: "/app",
};

export function defaultDestinationForRole(role: UserRole): string {
	return ROLE_DESTINATION[role];
}
```

**Por que `Record` em vez de `switch`:** quando uma `UserRole` nova entrar (improvável; roles são fechadas no schema), o TS força mapeamento aqui. Falha de cobertura é compile-time, não runtime.

### 4.2 `safeNext` — nova assinatura

```ts
// src/lib/auth/safe-redirect.ts
import type { UserRole } from "@prisma/client";

import { defaultDestinationForRole } from "./helpers";

/**
 * Resolves a user-supplied `next` query param into a safe internal path
 * for post-login redirection — role-aware.
 *
 * Anti open-redirect (mantém defesas existentes):
 *  - Absolute URLs (`https://evil.com`)
 *  - Protocol-relative URLs (`//evil.com`)
 *  - Backslash tricks (`/\\evil.com`)
 *  - Dot-segment traversal (`/admin/..//evil.com`, `/admin/%2E%2E/evil`)
 *  - Paths fora das áreas autenticadas (`/`, `/imposto-de-renda`)
 *
 * Cross-role rejection (novo):
 *  - role=ADMIN  + next sob `/app/*`   → fallback `/admin`
 *  - role=CLIENT + next sob `/admin/*` → fallback `/app`
 *
 * Pure function — no I/O.
 */
export function safeNext(
	next: string | undefined | null,
	role: UserRole,
): string {
	const fallback = defaultDestinationForRole(role);
	if (!next) return fallback;

	if (next.includes("://") || next.startsWith("//")) return fallback;
	if (next.includes("\\")) return fallback;

	const SENTINEL_ORIGIN = "https://internal.invalid";
	let resolved: URL;
	try {
		resolved = new URL(next, SENTINEL_ORIGIN);
	} catch {
		return fallback;
	}
	if (resolved.origin !== SENTINEL_ORIGIN) return fallback;

	const path = resolved.pathname;
	const isAdminPath = path === "/admin" || path.startsWith("/admin/");
	const isAppPath = path === "/app" || path.startsWith("/app/");

	if (!isAdminPath && !isAppPath) return fallback;

	// Cross-role rejection: role determines which subtree is allowed.
	if (role === "ADMIN" && !isAdminPath) return fallback;
	if (role === "CLIENT" && !isAppPath) return fallback;

	return path + resolved.search;
}
```

### 4.3 Diferenças em relação ao atual

| Aspecto | Atual | Novo |
|---|---|---|
| Assinatura | `safeNext(next)` | `safeNext(next, role)` |
| Fallback | Hardcoded `/admin` | Dinâmico via `defaultDestinationForRole(role)` |
| Cross-role | Não validado (defesa rasa) | Rejeitado (defesa em profundidade) |
| Normalização anti-traversal | URL constructor + sentinel | **Mantida idêntica** |
| Pureza | Sim, sem I/O | Sim, sem I/O |

### 4.4 Implicações no `requireAdmin`

```ts
// src/lib/auth/helpers.ts (trecho)
import { headers } from "next/headers";

export const requireAdmin = cache(async () => {
	const session = await auth.api.getSession({ headers: await headers() });

	if (!session) {
		// Preserva ?next se o request original veio de uma URL admin protegida.
		// O proxy.ts já injeta `?next` quando redireciona; aqui não há request
		// path acessível (estamos em RSC), então só direcionamos para /login.
		// O proxy continua o caminho do `?next` para casos de cookie ausente.
		redirect("/login");
	}

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		select: { role: true, revokedAt: true },
	});

	if (!user || user.revokedAt) {
		redirect("/login?error=session_invalidated");
	}

	if (user.role !== "ADMIN") {
		redirect("/login?error=forbidden");
	}

	return session;
});
```

**Decisão sobre preservar `?next` no `requireAdmin`:** o helper roda dentro de RSC (Server Component) e não tem acesso ao path original do request de forma trivial sem ler `headers()` extras. O `proxy.ts` já injeta `?next` quando a sessão sequer tem cookie. Quando o cookie existe mas a sessão é inválida (caso do helper), redirecionar sem `?next` para `/login` é aceitável — o usuário re-loga e cai no destino default da role. Tentar resgatar o path original aqui é complexidade desnecessária.

---

## 5. A página `/login`

### 5.1 Implementação

```tsx
// src/app/(public-app)/login/page.tsx
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/helpers";
import { safeNext } from "@/lib/auth/safe-redirect";
import { resolveAll } from "@/lib/posthog/flags";

export const metadata: Metadata = {
	title: "Entrar — DuoHub",
	robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string; error?: string }>;
}) {
	const params = await searchParams;

	// Skip the "already-logged-in" pre-check when an `?error=…` is present:
	// the user must see the toast (e.g. EXPIRED_TOKEN, session_invalidated)
	// and request a fresh magic link, otherwise we'd bounce them straight
	// back into a protected area before the error is ever rendered.
	if (!params.error) {
		const session = await getSession();
		if (session) {
			// Look up role here — `getSession()` returns the Better Auth
			// session shape which doesn't include our app-level `role`.
			// This is the only DB hit on the happy path (logged-in user
			// hitting /login by mistake) and is acceptable.
			const user = await db.user.findUnique({
				where: { id: session.user.id },
				select: { role: true, revokedAt: true },
			});

			if (user && !user.revokedAt) {
				redirect(safeNext(params.next, user.role));
			}
			// If the session is orphan/revoked, fall through to the form.
			// The user will receive a fresh magic link; subsequent
			// requireAdmin() calls also catch this state.
		}
	}

	const flags = await resolveAll();

	return (
		// `theme-admin` swaps the brand palette for the stock shadcn neutral
		// palette so the login screen feels like a tool rather than a brand
		// expression. See `src/app/globals.css`. Will revisit when /app (F4)
		// joins — clients may want the brand palette on their entry point.
		<div className="theme-admin flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
			<div className="flex w-full max-w-sm flex-col gap-6">
				<a href="/" className="flex items-center gap-2 self-center font-medium">
					<Logo animated={false} />
				</a>
				<LoginForm
					showProviderChooser={flags.isAdminLoginExtraProvidersEnabled}
					searchParamsPromise={searchParams}
				/>
			</div>
		</div>
	);
}
```

### 5.2 Diferenças vs. `/admin/login` atual

| Aspecto | `/admin/login` atual | `/login` novo |
|---|---|---|
| Pre-check de sessão | Usa `safeNext(params.next)` | Usa `safeNext(params.next, user.role)` |
| Lookup de role no pre-check | Não faz | Faz (1 query, só no happy path "logado por engano") |
| Tratamento de sessão órfã/revogada | Redirecionaria para destino padrão | Cai no form (UX correta — usuário vê o login) |
| Theme | `theme-admin` | `theme-admin` (mantido; reavaliar quando F4 chegar) |
| Flag PostHog usada | `isAdminLoginExtraProvidersEnabled` | **Mantida igual** (não vamos renomear flag agora — ver §10) |

### 5.3 Por que aceitar 1 query a mais no pre-check

O pre-check só roda quando o usuário **já está logado e visita `/login` manualmente** (caso raro: link bookmarkado, troca de aba). O custo de 1 `findUnique` por essa visita é desprezível, e evita acoplar a session do Better Auth a campos custom — a separação `Session` (auth) × `User.role` (app) é arquiteturalmente correta.

Alternativa avaliada: estender a session do Better Auth com `role` via plugin de "additional fields". Decisão: **não** nesta migração — adiciona complexidade Better Auth para ganho marginal. Avaliar se a F4 fizer N lookups parecidos por request.

---

## 6. Action de login (`sendLoginMagicLinkAction`)

> **Atualização (2026-05-05):** as seções §6.1/§6.2 originais documentavam a "Opção A" (`callbackURL: "/admin"` fixo), aceitando que CLIENT passasse por `/admin` antes de ser bouncado pelo `requireAdmin`. Smoke test em CLIENT real revelou inconsistência: se a refator é "login unificado preparado para o futuro", o roteamento role-aware tinha que estar acoplado ao login, não embutido no guard de admin. Migramos para a "Opção B" (trampolim `/post-login`) descrita originalmente como "futuro" — agora implementada. As subseções abaixo refletem a implementação final; o histórico da Opção A está preservado em §17.

### 6.1 Implementação final

```ts
// src/features/auth/actions.ts (trecho)
function buildPostLoginCallbackUrl(next: string | undefined): string {
	if (!next) return "/post-login";
	const params = new URLSearchParams({ next });
	return `/post-login?${params.toString()}`;
}

await auth.api.signInMagicLink({
	body: {
		email: parsed.data.email,
		callbackURL: buildPostLoginCallbackUrl(parsed.data.next),
		// Sem errorCallbackURL, Better Auth anexa ?error=… ao callbackURL.
		// Como o trampolim espera uma sessão recém-criada, mandar a flow de
		// erro pra ele iria desviar para /login de qualquer jeito. Mais
		// honesto pular direto: errorCallbackURL aponta para /login, onde
		// o form surface o toast e oferece novo link.
		errorCallbackURL: "/login",
		metadata: { ipAddress, userAgent },
	},
	headers: reqHeaders,
});
```

O `next` original do form é preservado via query string. O `/post-login` consome via `searchParams` e passa por `safeNext(next, role)` (que já bloqueia open-redirect, dot-segment traversal e cross-role).

### 6.2 Trampolim `/post-login`

Server Component em `src/app/(public-app)/post-login/page.tsx`. Responsabilidade única: ler `user.role` do banco (canônico, não do payload da session) e redirecionar.

```tsx
// src/app/(public-app)/post-login/page.tsx
export const dynamic = "force-dynamic";
export const metadata = {
	robots: { index: false, follow: false, nocache: true },
};

export default async function PostLoginPage({
	searchParams,
}: {
	searchParams: Promise<{ next?: string }>;
}) {
	const params = await searchParams;
	const session = await getSession();

	if (!session) redirect("/login");

	const user = await db.user.findUnique({
		where: { id: session.user.id },
		select: { role: true, revokedAt: true },
	});

	if (!user || user.revokedAt) {
		redirect("/login?error=session_invalidated");
	}

	redirect(safeNext(params.next, user.role));
}
```

**Modelo de segurança:**

- 100% server-rendered. Zero client JS, zero HTML emitido — só um header `Location: 307`. Nada que o browser possa manipular.
- `user.role` é lido do banco, não do cookie. Better Auth não armazena role no token de session (token é opaco; role é dado de aplicação).
- `?next=` é sanitizado por `safeNext(next, role)` que já cobre absolute URLs, protocol-relative, backslash tricks, dot-segments traversal e cross-role rejection.
- `requireAdmin()` no `/admin/layout.tsx` continua como **segunda camada**. Se algo escapar do trampolim (manipulação direta de URL, cookie roubado), o layout ainda barra. Defesa em profundidade — duas camadas independentes.

**Por que isso é mais seguro que a Opção A:**

| Aspecto | Opção A (descartada) | Opção B (atual) |
|---|---|---|
| CLIENT toca `/admin` antes de ser bouncado? | Sim — flicker visível | Não — vai direto para `/app` |
| Lógica de roteamento role-aware | Espalhada (`actions.ts` + `requireAdmin` + cada layout futuro) | Centralizada em 1 arquivo de 30 linhas |
| Quando F4 entrar | Refatorar `actions.ts` + criar `/app` + criar `requireClient` | Apenas criar `/app` + `requireClient`. Auth intacto. |
| Audit trail de role mismatch | Apenas redirect (sem registro) | `USER_ACCESS_DENIED` no `AuditLog` quando `requireAdmin` é alcançado por bypass |

### 6.3 `/app` ainda não existe — comportamento na transição

Hoje (F1a) a única role criada na app é `ADMIN`. CLIENT só existe se um admin explicitamente alterar a coluna no banco para teste. Nesse cenário:

1. CLIENT entra em `/login`, recebe magic link.
2. Magic link verify → `callbackURL: /post-login`.
3. `/post-login` lê `user.role = "CLIENT"` do banco.
4. Faz `redirect(safeNext(undefined, "CLIENT"))` → `/app`.
5. Browser segue 307 → **404** (rota não existe).

Isso é **honest signal**: "essa parte não existe ainda" em vez de "você não tem permissão" (que seria mentira — o cliente *teria* permissão se F4 estivesse lá). Quando F4 entrar, o destino simplesmente passa a responder. Zero refator.

### 6.4 Defesa em profundidade no `requireAdmin`

Mesmo com `/post-login` roteando corretamente, o `requireAdmin()` precisa lidar com o cenário em que algum CLIENT chega em `/admin` por outro caminho (URL manipulation, cookie roubado de cross-tab, bug de roteamento futuro). Quando isso acontece, o guard:

1. Escreve `USER_ACCESS_DENIED` no `AuditLog` com `actorId`, `actorEmail`, IP, UA e metadata `{ area: "admin", role: <role atual> }`. Evidência regulatória.
2. Invalida a session via `auth.api.signOut()` (best-effort — se falhar, o redirect ainda acontece).
3. Redireciona para `/login?error=forbidden`.

Audit + signOut rodam **só na branch de role mismatch**. Happy-path admins pagam zero overhead.

---

## 7. Middleware (`src/proxy.ts`)

### 7.1 Mudança

```ts
// src/proxy.ts
import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "better-auth.session_token";

export function proxy(request: NextRequest) {
	if (request.cookies.has(SESSION_COOKIE_NAME)) {
		return NextResponse.next();
	}

	const loginUrl = new URL("/login", request.url);
	loginUrl.searchParams.set("next", request.nextUrl.pathname);
	return NextResponse.redirect(loginUrl);
}

export const config = {
	matcher: ["/admin", "/admin/:path*", "/app/:path*"],
};
```

### 7.2 Diferenças vs. atual

- Matcher: `/admin/((?!login).*)` deixa de fazer sentido (`/login` não está mais sob `/admin/`). Vira `/admin/:path*`.
- A defensiva `if (pathname.startsWith("/admin/login"))` desaparece — não há mais tal path interno.
- Redirect aponta para `/login`, preservando `?next` igual antes.

### 7.3 O que o middleware **não** faz (regra mantida)

- Não consulta DB.
- Não decodifica/valida o cookie de sessão.
- Não decide role.

A validação real continua no `layout.tsx` via `requireAdmin()` (regra de `docs/architecture.md`).

---

## 8. Componentes client

### 8.1 `nav-user.tsx`

```tsx
// trecho
async function handleLogout() {
	try {
		await logoutAction();
		await authClient.signOut();
		router.push("/login");
	} catch {
		toast.error(messages.admin.errors.logoutFailed, { ... });
	}
}
```

### 8.2 `login-form.tsx`

```tsx
// trecho — defaultValues
defaultValues: {
	email: "",
	// Antes: "/admin" hardcoded. Agora: undefined quando o usuário não veio
	// com ?next=. O servidor (LoginPage + safeNext) resolve o destino real
	// baseado em role no momento do redirect pós-verify.
	next: params.next?.startsWith("/") ? params.next : undefined,
},
```

A função `backToChooser()` recebe o mesmo tratamento.

**Cuidado:** o schema `loginSchema` em `src/features/auth/schemas.ts` já tem `next` como `.optional()` — sem mudança. Só a UI deixa de "preencher" um valor quando o usuário não pediu.

---

## 9. Testes

### 9.1 `safe-redirect.test.ts`

- Atualizar todos os casos para passar role como segundo argumento.
- Adicionar grupo "cross-role rejection":
	- `safeNext("/admin/clientes", "CLIENT") === "/app"` (cliente tentando ir para admin → fallback para `/app`)
	- `safeNext("/app/dashboard", "ADMIN") === "/admin"` (admin com next de cliente → fallback `/admin`)
	- `safeNext("/admin/clientes", "ADMIN") === "/admin/clientes"` (allow-list normal)
	- `safeNext("/app/dashboard", "CLIENT") === "/app/dashboard"` (allow-list normal)
	- `safeNext(undefined, "ADMIN") === "/admin"` (default por role)
	- `safeNext(undefined, "CLIENT") === "/app"` (default por role)
- Manter todos os casos existentes de anti-traversal e open-redirect (são ortogonais à role).

### 9.2 `helpers.test.ts`

- `redirects to /login when no session` — destino muda de `/admin/login` para `/login`.
- `session_invalidated` → `/login?error=session_invalidated`.
- `forbidden` → `/login?error=forbidden`.
- Adicionar caso unitário pra `defaultDestinationForRole("ADMIN")` e `defaultDestinationForRole("CLIENT")`.

### 9.3 `actions.test.ts`

- `errorCallbackURL` esperado: `"/login"` (era `"/admin/login"`).
- `callbackURL` esperado: continua `"/admin"` por default.

### 9.4 `proxy.test.ts`

- `redirects to /login when no cookie on /admin` — destino muda.
- `redirects to /login when no cookie on /app` — destino muda.
- Caso `does not redirect /admin/login itself` — **deletar** (rota não existe mais).
- Caso novo: `does not match /login` (matcher novo já cuida disso, mas vale teste explícito de que `proxy` não roda em `/login`).

### 9.5 Cobertura E2E (Robot Framework)

A suite Robot vive em [DUO-51](https://linear.app/gvieiram/issue/DUO-51) (chore separado, ainda não implementado). Quando entrar, ela testa o fluxo de auth — atualizar URLs lá também. **Esta refator não bloqueia a chore Robot**: as suites não rodam ainda.

---

## 10. Conteúdo (`src/content/messages/`)

### 10.1 Verificação

A copy de auth (`src/content/messages/auth.ts`, se existir, ou inline em `admin.ts`) **não menciona URLs**. Frases como "Entre com seu e-mail" são neutras. Sem mudança necessária.

A página de login mantém "Entrar — DuoHub" como title (não diz "Admin").

### 10.2 Flag PostHog `isAdminLoginExtraProvidersEnabled`

A flag tem prefixo `Admin` no nome porque foi criada quando o login estava em `/admin/login`. Renomear a flag no PostHog implica:

- Mudar `key` no PostHog UI.
- Atualizar `src/lib/posthog/flags/config.ts`.
- Coordenar deploy para evitar janela em que o site lê uma key inexistente.

**Decisão:** **não renomear** nesta refator. A flag atende admin **e** futuro cliente igual (toggle de "mostrar Apple/Google buttons além de magic link"). O nome atual é histórico, não semântico. Se a flag virar role-specific no futuro (ex.: mostrar Apple só para CLIENT), aí cria-se uma flag nova com nome próprio.

---

## 11. Rota antiga `/admin/login`

### 11.1 Deletar tudo

- `src/app/(public-app)/admin/login/page.tsx` — delete.
- `src/app/(public-app)/admin/login/` — delete (diretório vazio).
- `src/app/(public-app)/admin/` — delete (diretório vazio).

### 11.2 Sem redirect 308

Sem tráfego em produção. Manter alias mantém código duplicado e confunde devs novos. Quem bater `/admin/login` recebe 404 do Next — comportamento aceitável para deploy interno.

### 11.3 Validação manual após delete

```bash
# Pós-deploy local
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/login
# Esperado: 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login
# Esperado: 200
```

---

## 12. Plano de migração (alto nível)

Detalhamento step-by-step será produzido pela skill `writing-plans`. Visão geral:

1. **Branch:** continuar em `feat/DUO-48/f1a-pr3-shell` se a PR3 ainda não mergeou; senão criar `feat/<DUO-XX>/unify-login`.
2. **Atualizar `safe-redirect.ts`** (assinatura nova) + `safe-redirect.test.ts` (TDD).
3. **Adicionar `defaultDestinationForRole`** em `helpers.ts` + teste unitário.
4. **Atualizar `requireAdmin`** para redirecionar a `/login` + `helpers.test.ts`.
5. **Atualizar `actions.ts`** (`errorCallbackURL: "/login"`) + `actions.test.ts`.
6. **Atualizar `proxy.ts`** (matcher + redirect) + `proxy.test.ts`.
7. **Criar `src/app/(public-app)/login/page.tsx`** copiando da página antiga + adaptações da §5.1.
8. **Atualizar `nav-user.tsx`** e `login-form.tsx` (defaults).
9. **Atualizar `prisma/seed-admin.ts`** (mensagem do console).
10. **Smoke test local**: login → `/admin`; logout → `/login`; visitar `/login` logado → `/admin`; visitar `/admin/login` → 404; magic link com erro → `/login?error=…`.
11. **Deletar** `src/app/(public-app)/admin/login/` e diretório pai vazio.
12. **`pnpm test` + `pnpm lint` + `pnpm build`** — todos verdes.
13. **PR** + Level 2 review (rule `review-before-completion`).
14. **Atualizar `docs/architecture.md`** se algum trecho precisar de ajuste fino (o pattern já cita `/login`, mas confirmar).

---

## 13. Riscos e mitigações

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Magic link em produção apontando para `/admin/login` (links em emails já enviados) | Inexistente | App não está em produção pública. Nenhum email histórico vivo. |
| Esquecer um lugar que ainda referencia `/admin/login` | Média | `Grep` final por `"/admin/login"` no projeto antes do PR. Falha do build/teste captura o resto. |
| Cliente (F4) chega num cenário em que `safeNext("/admin/...", "CLIENT")` cai no fallback `/app`, e o `/app` nem existe ainda | Baixa | F4 ainda não está em código. `safeNext` retorna `/app` mas o middleware (matcher) e o destino ainda não respondem. Comportamento esperado: 404. Não é regressão — F4 simplesmente não está implementada. |
| `requireAdmin` perde info de `?next` original ao redirecionar para `/login` | Baixa | Por design (ver §4.4). O proxy.ts é quem injeta `?next` no caso primário (cookie ausente). Casos secundários (sessão revogada) re-logam e caem no default. |
| `callbackURL: "/admin"` causa flicker para CLIENT (F4) por 1 frame antes do redirect | Baixa | Aceito. Se virar dor real, criar `/post-login` na F4. |
| Cross-role rejection no `safeNext` quebra cenário legítimo de admin com `?next=/app/foo` | Baixíssima | Nenhum fluxo atual gera essa URL. Se entrar legitimamente (F4: admin testando portal), o admin precisa ter dual-role e refazer o helper — fora do escopo desta refator. |
| Better Auth muda comportamento de `errorCallbackURL` em update | Baixa | Cobertura por teste em `actions.test.ts`. Snapshot do shape do body. |

---

## 14. Critérios de sucesso

- ✅ Login funciona end-to-end via `/login` (magic link → click → autenticado em `/admin`).
- ✅ Logout devolve usuário para `/login`.
- ✅ `/admin/login` retorna 404.
- ✅ `/admin` sem sessão redireciona para `/login?next=/admin` (proxy).
- ✅ `/admin` com sessão CLIENT (futuro F4) redireciona para `/login?error=forbidden` (`requireAdmin`).
- ✅ `safeNext("/admin/x", "CLIENT") === "/app"` e `safeNext("/app/x", "ADMIN") === "/admin"` (cross-role rejection).
- ✅ Todos os testes existentes que mencionam `/admin/login` foram atualizados e passam.
- ✅ Novos testes de role-awareness em `safe-redirect.test.ts` adicionados e passam.
- ✅ `pnpm build`, `pnpm lint`, `pnpm test` verdes.
- ✅ Bundle size sem regressão (a mudança é de caminho/lógica, não de dependências).
- ✅ Zero referências a `/admin/login` no código (verificável por `Grep`); referências em `docs/superpowers/plans/*.md` são histórico imutável e podem permanecer.

---

## 15. Fora do escopo

- **Criar `requireClient()` ou rota `/app`.** F4 não está aberta. O `/post-login` já manda CLIENT para `/app`; quando F4 entrar, basta criar a rota e o helper.
- **Renomear flag PostHog `isAdminLoginExtraProvidersEnabled` para algo neutro.** Ver §10.2.
- **Estender session do Better Auth com `role` para evitar lookup extra no `/post-login`.** Avaliar se a F4 fizer N lookups parecidos por request.
- **Suite E2E Robot Framework para o novo fluxo.** Vive em DUO-51, fora desta refator.
- **Tematização do `/login` quando F4 chegar (dual-tema admin/cliente?).** Decisão de UX deixada para a fase F4.

---

## 16. Checklist pré-implementação

- [x] Issue Linear: incorporada ao escopo de [DUO-48](https://linear.app/duohub/issue/DUO-48).
- [x] Branch: `feat/DUO-48/f1a-pr3-shell`.
- [x] Tráfego em `/admin/login`: zero (app pre-produção).
- [x] Spec aprovado.
- [x] Implementado e revisto após smoke test (ver §17).

---

## 17. Changelog (post-implementation)

### 2026-05-05 — Migração da Opção A para Opção B (`/post-login`)

**Trigger:** smoke test em CLIENT real (admin manual alterado para `role: CLIENT` no banco) revelou que a Opção A original tinha uma inconsistência grave com o objetivo declarado da refator.

**Inconsistência:** o spec original (§6.2 "Por que `callbackURL` permanece `/admin`") mantinha `callbackURL: "/admin"` hardcoded e empurrava a decisão de roteamento role-aware para o `requireAdmin()`. Resultado:
- CLIENT logando passava por `/admin` antes de ser bouncado pelo guard.
- A "preparação para F4" era apenas nominal — quando F4 entrasse, `actions.ts` precisaria refatorar de novo.
- A lógica de "qual o destino do usuário" ficava espalhada (`actions.ts` + `requireAdmin` + cada layout futuro).

**Decisão:** implementar a Opção B (rotulada originalmente como "futuro/over-engineering") agora.

**Mudanças no código:**

- **Novo:** `src/app/(public-app)/post-login/page.tsx` — Server Component trampolim que faz session lookup pós-verify e redireciona via `safeNext(next, role)`.
- **Novo:** `src/app/(public-app)/post-login/page.test.tsx` — 11 casos cobrindo session ausente, órfã/revogada, role mismatch via `next`, open-redirect, e o invariante "DB role wins over session payload role".
- **`src/features/auth/actions.ts`:** `callbackURL` agora aponta para `/post-login?next=<encoded>` via helper `buildPostLoginCallbackUrl`. `errorCallbackURL` continua `/login`.
- **`src/lib/auth/helpers.ts` (`requireAdmin`):** virou segunda camada de defesa. No mismatch de role, escreve `USER_ACCESS_DENIED` no `AuditLog`, faz best-effort `signOut`, redireciona para `/login?error=forbidden`. Audit + signOut só rodam na branch de mismatch — happy-path inalterado.
- **`prisma/schema.prisma`:** adicionada action `USER_ACCESS_DENIED` no enum `AuditAction` (migration `20260505203916_add_user_access_denied_audit_action`).

**Mudanças no spec:**

- §6.2 reescrita inteira: documenta o trampolim, o modelo de segurança e a comparação Opção A vs B.
- §6.3 nova: comportamento na transição (CLIENT → 404 em `/app` honesto até F4 entrar).
- §6.4 nova: defesa em profundidade no `requireAdmin` com audit + signOut.
- §15: removido item "Rota `/post-login` intermediária para multi-role routing" (agora implementado) e item "Mudar `callbackURL`..." (agora implementado).

**Riscos validados:**

- ✅ Cross-role redirect: `safeNext("/admin/x", "CLIENT")` → `/app`, coberto por testes.
- ✅ Session manipulation: `user.role` lido do banco, não do payload da session — coberto por teste explícito (`looks up role from the database, not from the session payload`).
- ✅ Open-redirect: `?next=https://evil.com` rejeitado pelo `safeNext` — coberto por teste no `/post-login`.
- ✅ Defesa em profundidade: `requireAdmin` ainda rejeita CLIENT que chegue em `/admin` por bypass do trampolim.

**Crédito:** correção identificada pelo usuário em revisão pós-smoke test, antes do merge da PR3. Lição: spec pode estar internamente consistente e ainda assim contradizer o objetivo declarado — é preciso revisitar premissas, não apenas validar coerência.

### 2026-05-05 — Ajustes pós-segundo smoke test

**Trigger:** segundo smoke test pelo usuário identificou três pontos UX/segurança que o spec original cobria parcialmente ou nada:

1. **Header de marketing visível em `/login` e `/post-login`.** O `Header` (montado no `app/layout.tsx` raiz) já tinha lógica de auto-hide para `/admin` e `/app`, mas faltava cobrir as rotas de auth-flow.
2. **Cross-role acessível com sessão válida.** ADMIN logado conseguia abrir `/app` (não existia ainda) — sem regra explícita pra barrar; CLIENT logado caía em `/login?error=forbidden` ao tentar `/admin` — UX hostil pra um cenário que é "errou a URL".
3. **`/app` ainda não existia em código** — `safeNext` mandava CLIENT pra lá, mas o destino era 404.

**Decisão final (após confirmação do usuário):**

- **Cross-role com sessão válida = redirect silencioso pro destino correto.** Sem `auditLog`, sem `signOut`, sem toast. Tratado como "wrong door" UX, não como tentativa de bypass. A sessão continua válida, só o destino muda.
- **`/app` placeholder agora.** Layout com `requireClient()` + page "em construção" + botão de logout. F4 substitui o conteúdo, o guard fica.

**Mudanças no código:**

- **`src/components/header.tsx`** + **`src/components/banner.tsx`:** lista `HIDDEN_PATH_PREFIXES` agora inclui `/login` e `/post-login`. Header e banner somem nas rotas de auth-flow.
- **`src/lib/auth/helpers.ts`:** `requireAdmin` refatorado via `makeRoleGuard(role)` (factory privado). Comportamento de role mismatch passou de `audit + signOut + redirect /login?error=forbidden` para **redirect silencioso ao destino correto** (CLIENT em `/admin` → `/app`). `revokedAt` continua bouncing pra `/login?error=session_invalidated` — esse caso é estado inválido real, não wrong-door.
- **Novo: `requireClient`** (espelho de `requireAdmin`). ADMIN visitando `/app` → redirect silencioso pra `/admin`.
- **Novo: `src/app/app/layout.tsx`** chamando `requireClient()`, com metadata `noindex/nocache`.
- **Novo: `src/app/app/page.tsx`** placeholder "em construção" com logo + texto + `AppLogoutButton`.
- **Novo: `src/app/app/_components/app-logout-button.tsx`** (Client Component): reusa `logoutAction` + `authClient.signOut` + redirect pra `/login`. Evolui pra um menu completo na F4.
- **Novo: `src/content/messages/app.ts`** com `metadata` + `placeholder` (eyebrow, title, description, logout label) — sem hardcode.
- **`src/lib/auth/helpers.test.ts`:** removidos os testes de `audit/signOut` no role mismatch (comportamento não existe mais). Adicionado bloco de testes pra `requireClient` (mirror coverage). Total: 6 → 11 casos cobrindo ambos os guards.

**Mudanças no spec:**

- §6.4 (defesa em profundidade): atualizar pra refletir que `requireAdmin` ficou silencioso e o `requireClient` segue o mesmo padrão. O `auditLog` USER_ACCESS_DENIED não é mais escrito por bypass de role — fica disponível pra cenários genuinamente suspeitos no futuro (ex: tentativa de elevação de privilégio que não passa pelo trampolim, ainda a ser definido caso a caso).
- §15 (fora do escopo): item "Criar `requireClient()` ou rota `/app`" → MOVIDO PRA DENTRO DO ESCOPO. Implementado como placeholder; F4 substitui conteúdo.

**Decisão consciente — por que não auditar cross-role:**

- Role mismatch no layout não é evidência de abuso. Um CLIENT chegando em `/admin` continua sendo CLIENT — não ganha nenhuma capability nova; só vê a tela errada por meio segundo antes do redirect.
- O caso real de "elevação de privilégio" é alguém com cookie/token de admin acessando `/admin` direto (passando pelo `requireAdmin` happy-path). Esse caso não deixa rastro de cross-role porque não é cross-role — é acesso legítimo do ponto de vista do guard.
- Auditar todo wrong-door inundaria o `AuditLog` com noise (bookmarks antigos, links compartilhados, refreshes de aba) e ofuscaria sinais reais.
- Se no futuro surgir um vetor de ataque que efetivamente abuse de cross-role (não consigo enxergar um agora), reativamos audit nessa branch — fica como ponto de revisita.

**Riscos validados:**

- ✅ Header oculto em `/login`, `/post-login`, `/admin/*`, `/app/*` — verificado por `pnpm build`.
- ✅ `/app` placeholder responde 200 pra CLIENT autenticado e redireciona ADMIN pra `/admin`.
- ✅ `/login` continua redirecionando logged-in users via `safeNext` (item 2a do feedback) — comportamento herdado da implementação anterior, sem regressão.
- ✅ Testes: 199/199 verdes, lint clean, build clean.

**Crédito:** segundo smoke test do usuário; o ponto 2 ("CLIENT não pode acessar /admin, ADMIN não pode /app") só ficou visível na prática quando o guard antigo foi exercitado num cenário de role mismatch real. Bons feedbacks pós-smoke test continuam sendo o melhor sinal.
