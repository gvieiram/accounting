# Template de spec

`docs/specs/<feature>/spec.md`. **Sem teto de páginas** — o que segura o inchaço é a regra
de conteúdo: sem caminho de arquivo, sem trecho de código, sem passo a passo. Se a lista de
user stories passar de ~15, a feature é grande demais e vira duas.

```markdown
---
feature: propostas
---

# Propostas

## O problema
Que dor isso resolve, para quem. Duas ou três frases.

## Como funciona
A feature por inteiro, em linguagem de domínio. O fluxo do usuário de ponta a
ponta, as regras que valem, os estados que uma proposta pode assumir.

Não descreve implementação — nem arquivo, nem função, nem passo. Se você está
escrevendo isso, saiu do lugar.

## Regras de domínio
- Proposta publicada não pode ser editada; edição gera nova versão
- Link público expira em 30 dias
- ...

## Decisões
Escolhas técnicas que valem para a feature inteira, não para uma fatia.

- Editor salva por seção, não o documento inteiro
- Proposta publicada guarda snapshot do HTML renderizado

## Nunca
- Não alterar `renderedHtml` de uma versão já publicada
- Não expor rascunho por link público

## Fora de escopo
O que explicitamente NÃO entra, para não virar discussão depois.

## Protótipo
`src/app/(dev)/playground/propostas/` — `pnpm dev` e abra /playground/propostas
Snapshot aprovado: `prototype/` (prints do Portão 0)

## Contexto
- `assets/Planejamento_Propostas.md` — material de referência
- ADR-0003 — versionamento de proposta publicada

## Fatias
- [DUO-81](https://linear.app/gvieiram/issue/DUO-81) · Criar rascunho e vê-lo na lista
- [DUO-82](https://linear.app/gvieiram/issue/DUO-82) · Editar seção e ver o preview
- [DUO-83](https://linear.app/gvieiram/issue/DUO-83) · Publicar e abrir o link público
```

## Regras

**A spec descreve a feature, o ticket descreve a fatia.** O que é transversal fica aqui;
repetir em seis tickets é como planos v1/v2/v3 nascem.

**A lista de fatias é uma linha cada**, com identificador e link. Sem duplicar campo do
ticket — nada que possa derivar. Serve para saber o que existe e em que ordem sem depender
do MCP do Linear.

**`assets/`** guarda material de contexto: documentos, imagens, referências. Alimenta tanto
o planejamento quanto a implementação.

**`Decisões` é para o que atravessa fatias mas não merece ADR.** "O editor salva por seção"
não é regra de domínio, não é difícil de reverter, e vale para a feature toda — sem essa
seção, cada fatia redecide e saem três abordagens para o mesmo problema. Decisão difícil de
reverter continua indo para `docs/adr/`.

**`Nunca` é a lista curta de proibições da feature.** Três ou quatro linhas, no máximo. É o
que mais rende com agente: uma proibição explícita vale mais que três parágrafos de
orientação.

Se `Decisões` começar a descrever *como implementar* — assinatura, arquivo, passo a passo —
saiu do lugar. Isso se decide na hora, com o código na frente.

## Um arquivo, não três

A Vaas separa `research.md`, `requirements.md` e `design.md`. Aqui é um só, de propósito:

- **research** — lá é contexto cross-repo, caro de remontar. Aqui é ler o código do próprio
  repo, coisa que o agente faz de qualquer jeito. Não vira artefato.
- **requirements** — lá carrega IDs para rastrear entre time e tracker. Aqui o aceite mora
  no ticket, que já é a unidade rastreável.
- **design** — o que ele traz de *implementation guidance* já é global e vive em
  `docs/architecture.md`; *public interfaces* a gente proíbe de propósito.

Um arquivo mantém a regra de conteúdo em um lugar só. Com três, "onde isso vai?" vira
pergunta a cada parágrafo, e a resposta errada é sempre o arquivo que ninguém lê.

Revisitar se as specs ficarem difíceis de navegar — aí separar passa a valer.

## Evoluir: delta spec

Regra e justificativa em [`../workflow.md`](../workflow.md). O formato:

```markdown
# Propostas v2

> Evolui `docs/specs/propostas/spec.md`.

## ADDED
- Duplicar proposta a partir de uma existente

## MODIFIED
- Link público passa a expirar em 90 dias (era 30)

## REMOVED
- ---
```

## Arquivar

Todas as fatias `Done` e mergeadas → mova a pasta para `docs/specs/_archive/<feature>/` e
apague o protótipo de `src/app/(dev)/playground/<feature>/`. Motivo e detalhe em
[`../workflow.md`](../workflow.md).
