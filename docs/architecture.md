# Arquitetura

O Next.js é **unopinionated** sobre organização de projeto — a doc oficial diz isso e lista
três estratégias. O duohub usa a primeira: `app/` só para roteamento, o resto em pastas
irmãs. Isso é escolha deliberada, não desvio.

> **Como ler este documento.** Não basta "ler a arquitetura" — leitura vaga perde restrição
> nas fases seguintes. Ao carregar este arquivo, **extraia e liste** como restrições ativas:
> as regras de camada e a direção de dependência, onde cada tipo de arquivo mora, e as
> convenções de nome. Carregue essa lista adiante; ela é o insumo do Architecture Gate.

## As quatro pastas

| Pasta | Papel | Como saber |
| --- | --- | --- |
| `src/app/` | rota: que URL é, quem pode ver | tem `page.tsx`/`route.ts`? é rota |
| `src/features/<x>/` | um domínio: o que ele faz | tem regra de negócio? é feature |
| `src/components/` | UI sem domínio (`ui/` = shadcn, resto compartilhado) | não importa de `features`? é aqui |
| `src/lib/` | infra: db, auth, env, audit, posthog, ratelimit | fala com o mundo externo? é lib |

### O teste de import

Decide entre feature e rota, sem julgamento subjetivo:

> **O componente importa de `@/features/<x>`? Então ele mora na feature.**

Componente que nomeia conceito de domínio quase sempre importa da feature — mas o import é
o critério, não o nome. `document-input.tsx` e `address-fields.tsx` não têm "client" no
nome e pertencem a `clients`.

Fica na rota: shell, gatilho de navegação, glue de URL.

## Anatomia de uma feature

```
src/features/<x>/
├── index.ts          ← porta de entrada: o que sai daqui
├── components/       ← UI de domínio
├── actions.ts        ← Server Actions, via defineAction
├── queries.ts        ← leitura
├── schemas.ts        ← zod
├── types.ts
├── utils.ts
└── *.test.ts         ← colocado ao lado do que testa
```

### Porta de entrada

Só o `index.ts` é público. Tudo o mais é interno.

```ts
// src/features/clients/index.ts
export { ClientsTable, ClientForm } from "./components";
export { createClient, archiveClient } from "./actions";
export type { ClientFormData } from "./types";
// cnpjRoot NÃO sai daqui — é assunto interno de clients
```

De fora, só `import { ClientsTable } from "@/features/clients"`.

O ganho: reorganizar o interior da feature sem tocar em nada fora dela, desde que o
`index.ts` continue exportando o mesmo.

**Enforcement:** `dependency-cruiser` falha o build em import profundo. Sem isso, a porta é
combinado verbal — e combinado verbal já falhou aqui (existia um padrão de action razoável
e ainda assim nasceram dois contratos).

## Contrato de Server Action

Um único contrato, garantido por wrapper:

```ts
// src/lib/action.ts
type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; fieldErrors?: Record<string, string[]> };

export const action = defineAction({ schema, requireRole, audit }, handler);
```

O wrapper resolve num lugar só: sessão e papel, parse do zod (com `fieldErrors` saindo de
graça), normalização de erro do Prisma (`P2002` → mensagem de unicidade) e auditoria. O
handler fica com a regra de negócio e nada mais.

**Escape hatch:** action que precise de algo que o wrapper não prevê pode ser escrita
direto, sem ele. Wrapper que vira camisa de força é wrapper que será contornado em
silêncio — melhor a saída ser explícita.

Por que wrapper e não convenção escrita: convenção não impede nada. O projeto tinha
convenção e mesmo assim nasceram `{ success }` e `{ ok }` em paralelo, com `ActionResult`
duplicado literalmente em dois arquivos.

## Carregamento de dados

**Server Components + Suspense por região.** A página renderiza na hora com shell, título e
ações; cada região dependente de dado fica no seu `<Suspense>` com skeleton da forma do
conteúdo final.

Nunca spinner de página inteira nem `isLoading` no cliente: os dois deixam a tela refém do
dado mais lento e cada tela resolve de um jeito.

**O skeleton mora ao lado do componente que representa**, não em pasta de skeletons. Quem
edita a tabela vê o skeleton na mesma pasta — skeleton desalinhado do layout é pior que
skeleton nenhum.

## Estados

Contrato em [`design/README.md`](./design/README.md). Os quatro estados fazem parte do
aceite da fatia, não são polimento posterior.

## Architecture Gate

Checagem **bloqueante antes de escrever qualquer código**, em toda fatia. Entrada: os
arquivos do campo `Arquivos` do ticket, mais o que a exploração revelou.

1. **Colocação** — cada arquivo cai na pasta certa pelas regras acima?
2. **Direção de dependência** — os imports planejados respeitam a fronteira? Nada de fora
   alcançando o interior de uma feature.
3. **Vocabulário de domínio** — tipos, funções e variáveis novos usam os termos
   estabelecidos? Termo inventado é sinal de que falta entendimento, não de criatividade.
4. **Constraints do ticket** — cada regra do campo `Constraints` está respeitada?
5. **ADRs** — a mudança contradiz algum ADR de `docs/adr/`? Se contradiz, **traga à tona**
   em vez de sobrescrever em silêncio.

**Falhou qualquer item: pare e discuta.** Não prossiga até resolver.

O gate existe porque o `dependency-cruiser` roda no build — depois. A decisão de onde o
arquivo mora é tomada antes, e é aí que custa barato corrigir.

## Legado

`src/features/clients` e `src/features/users` **ainda não seguem** este documento: a UI de
domínio deles vive em `src/app/admin/*/_components`, não há `index.ts`, e as actions não
passam pelo wrapper.

**Isso é legado, não é o padrão.** Não replique ao escrever código novo.

Migração é preguiçosa: uma feature migra quando uma fatia encostar nela. `proposals` nasce
já na regra nova. Big bang de 22 arquivos é risco sem entrega no meio, e contraria a regra
da fatia vertical.
