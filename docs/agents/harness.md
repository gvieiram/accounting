# O harness — guia do dev

O que está instalado, o que cada peça faz, e o que rodar em cada situação.

As **regras** (fatia, portões, barra de teste) estão em [`workflow.md`](./workflow.md).
Este arquivo é a orientação: como operar.

## As peças

| Peça | Onde | O que faz |
| --- | --- | --- |
| **Skills** | `~/.agents/skills/` (global, 25) | os comandos do fluxo — `/grill-with-docs`, `/implement`, etc. |
| **Linear MCP** | plugin `linear` | criar e ler issues direto do chat |
| **Docs do repo** | `CLAUDE.md`, `docs/` | o que o agente lê antes de agir |
| **Hook de git** | `.claude/` | bloqueia o irreversível: `reset --hard`, `clean -f`, `branch -D`, `checkout .`, `restore .` |

> **Publicar é decisão humana.** `git push`, `gh pr create` e `gh pr merge` **não** estão no
> hook — bloquear por string dava falsa segurança, já que `gh pr create` empurra a branch
> sem casar o padrão. Virou regra de conduta: o agente commita quando o trabalho está
> pronto, mostra o que ficou, e **pergunta antes de publicar**. Autorização vale para o
> pedido daquela vez, não para os seguintes.

As skills são **globais** (`~/.agents/skills`), então valem em qualquer projeto. As docs e o
hook são **versionados**, então valem por branch — worktree cujo branch não os tem, não tem
o harness.

## Duas formas de invocar

Isto confunde e não está escrito em lugar nenhum: **das 25 skills, 11 o agente pode chamar
sozinho e 14 só respondem se você digitar `/nome`.**

As que têm `disable-model-invocation: true` no frontmatter são deliberadamente manuais —
são as que tomam decisão ou consomem muito contexto. **Todo o fluxo principal é manual.**
Você dirige; o agente não decide sozinho começar a fatiar tickets.

**Só via `/`** — `ask-matt` · `grill-me` · `grill-with-docs` · `handoff` · `implement` ·
`improve-codebase-architecture` · `setup-matt-pocock-skills` · `setup-ts-deep-modules` ·
`teach` · `to-spec` · `to-tickets` · `triage` · `wayfinder` · `writing-great-skills`

**O agente chama sozinho** — `code-review` · `codebase-design` · `diagnosing-bugs` ·
`domain-modeling` · `find-skills` · `git-guardrails-claude-code` · `grilling` · `prototype`
· `research` · `resolving-merge-conflicts` · `tdd`

## O que rodar em cada situação

| Situação | Comando |
| --- | --- |
| Ideia nova, ainda difusa | `/grill-with-docs` — entrevista até fechar, e deixa ADR |
| Ideia fechada, virar documento | `/to-spec` |
| Spec pronta, virar tickets | `/to-tickets` |
| Ticket `ready-for-agent` na mão | `/implement` (chama `/tdd` por dentro) |
| Terminou a fatia | `/code-review` |
| Bug difícil, intermitente, regressão | `/diagnosing-bugs` |
| Dúvida de design de módulo | `/codebase-design` |
| Precisa ler doc/API externa | `/research` (roda em background) |
| Não sabe qual usar | `/ask-matt` — é o roteador |
| Conversa ficou longa demais | `/handoff` — compacta e você abre sessão nova |

Duas que **não** são para uso rotineiro: `/wayfinder` (esforço grande demais para uma
sessão — mais lento e denso, guarde para isso) e `/prototype` (código descartável para
responder uma pergunta de design).

## Colisões de nome

Existem skills com o mesmo nome vindas de fontes diferentes. Vale saber qual responde:

- **`code-review`** — o do Matt (eixos Standards + Spec) **substituiu** o nativo do Claude
  Code. É o que queremos. O `/review` (revisar PR do GitHub) continua intacto e é outro.
- **`tdd`** vs **`superpowers:test-driven-development`** — convivem, porque o do superpowers
  tem prefixo. Use `tdd`; o `/implement` já chama esse.
- **`grilling`** vs **`superpowers:brainstorming`** — mesmo papel. Adotamos `grilling`.

Se algo disparar quando você não esperava, provavelmente é colisão. Remover a pasta em
`~/.agents/skills/<nome>` desfaz.

## Fluxo completo, em uma tela

```
ideia
 └─ /grill-with-docs      decide; ADR em docs/adr/ quando couber
     └─ /to-spec          docs/features/<f>/spec.md (teto 1-2 páginas)
         └─ /to-tickets   DUO-xx no Linear, uma fatia vertical cada
             └─ PORTÃO 1  label ready-for-agent — sem ela, ninguém implementa
                 └─ /implement    uma fatia, /tdd por dentro
                     └─ PORTÃO 2  Gustavo confere no navegador
                         └─ /code-review
                             └─ PR
```

Os dois portões são acréscimos nossos ao fluxo original, e cada um existe por um motivo
concreto: o Portão 1 impede que uma lacuna de spec seja preenchida por invenção; o Portão 2
impede que algo vá para a main sem alguém ter olhado a tela.

## Higiene de contexto

Mantenha `/grill-with-docs → /to-spec → /to-tickets` **numa janela só**, sem compactar — os
três constroem em cima do mesmo raciocínio. Cada `/implement` depois começa limpo, lendo o
ticket.

Se a sessão ficar longa antes de `/to-tickets`, não force: `/handoff` e continue em thread
nova. Modelo em contexto saturado raciocina pior, e foi assim que planos gigantes viraram
implementação errada aqui.

## Configuração

| Arquivo | O que guarda |
| --- | --- |
| [`issue-tracker.md`](./issue-tracker.md) | Linear, time DuoHub, como criar e ler issue |
| [`triage-labels.md`](./triage-labels.md) | os cinco papéis e o portão `ready-for-agent` |
| [`domain.md`](./domain.md) | onde ficam `CONTEXT.md` e ADRs |
| [`workflow.md`](./workflow.md) | as regras do fluxo |
| [`../architecture.md`](../architecture.md) | as regras do código |
| [`../design/README.md`](../design/README.md) | contrato dos quatro estados |

Editar esses arquivos é o jeito de mudar o comportamento do harness — eles são lidos, não
são decoração. Trocar de issue tracker é a única mudança que pede rerodar
`/setup-matt-pocock-skills`.
