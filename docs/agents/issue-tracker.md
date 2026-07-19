# Issue Tracker

As issues deste repo vivem no **Linear**, time **DuoHub** (prefixo `DUO`).

O acesso é via **MCP do Linear** (`plugin:linear:linear`), já autenticado. Não use `gh issue`
para rastrear trabalho — o GitHub aqui é só código, PRs e CI.

- Team ID: `000ed879-eb77-4a96-8154-893ff30dea87`
- Identificadores: `DUO-<n>` (ex.: `DUO-57`)

## Como agir

| Ação | Ferramenta |
| --- | --- |
| Criar / atualizar issue | `save_issue` |
| Ler uma issue | `get_issue` |
| Listar / filtrar | `list_issues` |
| Comentar | `save_comment` |
| Ver status disponíveis | `list_issue_statuses` |
| Ver labels | `list_issue_labels` |

Ao referenciar uma issue em prosa, spec ou mensagem de commit, use o identificador
`DUO-<n>` — nunca o UUID.

## A spec é arquivo, não issue

> **`/to-spec` NÃO publica a spec no Linear neste repo.**
>
> A skill descreve a si mesma como *"publish it to the project issue tracker"*. Aqui a spec
> é **arquivo versionado** em `docs/specs/<feature>/spec.md`, seguindo
> [`templates/spec.md`](./templates/spec.md).
>
> Motivo: a spec precisa conviver com `assets/`, com os prints do protótipo e com o
> histórico do git, e precisa ser lida durante a implementação sem depender do MCP.
>
> O que vai para o Linear é **um ticket por fatia**, criado pelo `/to-tickets`, no formato de
> [`templates/ticket.md`](./templates/ticket.md).

## Statuses

O board usa o fluxo padrão do Linear:

`Backlog` → `Todo` → `In Progress` → `In Review` → `Done`

Mais `Canceled` e `Duplicate` como saídas.

Statuses dizem **onde** o trabalho está. Eles não dizem se a spec está pronta — isso é
papel das labels de triage (ver `triage-labels.md`). Os dois eixos são independentes: um
ticket em `Todo` pode estar `needs-info` (travado) ou `ready-for-agent` (livre pra pegar).

## Labels de tipo

O time já usa `Feature`, `Improvement`, `Task` e `Bug`. Esse é um terceiro eixo, ortogonal
a status e a triage. Preserve o que já estiver aplicado; não troque tipo por prontidão.

## Convenção de branch

`<tipo>/DUO-<n>/<slug-curto>` — ex.: `feat/DUO-57/proposals-foundation`,
`chore/DUO-45/...`, `docs/DUO-XX/...`.

Use `DUO-XX` apenas quando o trabalho genuinamente não tiver ticket (raro — prefira criar
um).

## PRs como superfície de entrada

**Desligado.** PRs externos não entram na fila de triage. Este é um repo privado de um
time pequeno; a entrada de trabalho é o Linear.
