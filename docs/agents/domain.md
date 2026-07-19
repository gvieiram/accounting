# Domain Docs

Como as skills de engenharia devem consumir a documentação de domínio deste repo.

Layout: **single-context** — um `CONTEXT.md` na raiz e ADRs em `docs/adr/`. Não é
monorepo (sem `pnpm-workspace.yaml`, sem `workspaces`, sem `packages/`).

O projeto usa git worktrees, mas isso é ortogonal: worktree é outra cópia de trabalho do
**mesmo** repo, não um pacote separado. Continua single-context.

## Antes de explorar, leia

- **`CONTEXT.md`** na raiz — o glossário do domínio
- **`docs/adr/`** — leia os ADRs que tocam a área em que você vai mexer

Se algum desses arquivos não existir, **siga em silêncio**. Não sinalize a ausência nem
sugira criá-los preventivamente. A skill `/domain-modeling` (alcançada via
`/grill-with-docs` e `/improve-codebase-architecture`) cria esses arquivos preguiçosamente,
quando um termo ou decisão realmente precisa ser resolvido.

## Estrutura

```
/
├── CONTEXT.md
├── docs/
│   ├── adr/
│   │   ├── 0001-....md
│   │   └── 0002-....md
│   └── agents/          ← esta pasta: configuração das skills
└── src/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (título de issue, proposta de refactor,
hipótese, nome de teste), use o termo como definido em `CONTEXT.md`. Não derive para
sinônimos que o glossário evita explicitamente.

Se o conceito que você precisa ainda não está no glossário, isso é um sinal — ou você está
inventando linguagem que o projeto não usa (reconsidere), ou existe uma lacuna real
(anote para `/domain-modeling`).

Este projeto é bilíngue por natureza: o domínio é contábil/fiscal brasileiro (IRPF,
desenquadramento, propostas), então vários termos de domínio são em português mesmo dentro
de código em inglês. `CONTEXT.md` é o lugar que resolve essa fronteira — quando um termo
fica em português e quando é traduzido.

## Sinalize conflito com ADR

Se sua saída contradiz um ADR existente, traga isso à tona explicitamente em vez de
sobrescrever em silêncio:

> _Contradiz o ADR-0007 (X) — mas vale reabrir porque…_
