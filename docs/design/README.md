# Design

O duohub tem **duas linguagens visuais**, e metade das regras é oposta entre elas:

| | Superfície | Caráter |
| --- | --- | --- |
| [`public.md`](./public.md) | `(marketing)`, `(public-app)` | imersivo, espaçoso, animação **é** a experiência |
| [`admin.md`](./admin.md) | `admin`, `app` | profissional, denso, animação a serviço da leitura |

Este arquivo guarda o que vale para as duas. Formato dos dois documentos de superfície:
frontmatter YAML com tokens (`colors`, `typography`, `rounded`, `spacing`, `components`) +
seções em prosa. **Sempre referência de token (`{colors.primary}`), nunca hex inline.**

> **Estado:** `admin.md` e `public.md` estão vazios por decisão — a direção estética foi
> adiada. O contrato de estados abaixo já vale.

## Fundação

Já existe e não se joga fora: **146 custom properties** em `src/app/globals.css`, 30
primitivos shadcn (`new-york`, base `slate`), Inter via `next/font/google`, e composições
resolvidas (`responsive-dialog`, `scrollable-dialog`, `responsive-sheet`).

Tokens e primitivos são infraestrutura. O que falhou antes foi a **composição** — como as
telas eram montadas, decidida caso a caso.

## Contrato dos quatro estados

**Toda tela tem os quatro. Eles entram no aceite da fatia**, não são polimento posterior.

### 1. Carregando

Server Components + Suspense por região + skeleton com a forma do conteúdo final. Detalhe
em [`../architecture.md`](../architecture.md).

### 2. Vazio — são dois

| Situação | O que mostrar |
| --- | --- |
| **Nunca teve dado** | explicação do que é isso + **a ação primária**. É onboarding: *"Você ainda não tem propostas. Crie a primeira."* |
| **Filtro sem resultado** | *"Nenhum resultado para X"* + **limpar filtro**. O dado existe, a busca é que não achou |

Tratar os dois como "Nenhum registro encontrado" é o erro clássico: o usuário novo fica sem
saber o que fazer, e o que está filtrando acha que perdeu os dados.

O segundo só é obrigatório **quando a tela tem filtro**.

### 3. Erro — são dois, com comportamentos opostos

| Tipo | Onde aparece | Por quê |
| --- | --- | --- |
| **Falha ao carregar** | `error.tsx` da rota, com tentar novamente | não há tela para mostrar; a região falhou inteira |
| **Falha numa ação** | toast + erro no campo, **tela intacta** | o usuário digitou algo; perder o que ele preencheu é inaceitável |

Ação que falha **nunca** derruba a tela nem limpa o formulário. O `fieldErrors` do
`defineAction` (DUO-61) existirá para isso.

### 4. Sem permissão

**Redirect**, não página de 403. `requireAdmin` já faz isso — é padrão, não decisão por
tela.

## Custo

Isso encarece toda fatia: uma listagem deixa de ser "tabela + query" e passa a ser tabela +
skeleton + dois vazios + erro. É a diferença entre tela de produto e tela de demo, e é
barato comparado a descobrir em produção.
