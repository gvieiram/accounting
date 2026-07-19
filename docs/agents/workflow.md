# Workflow

Como o trabalho anda no duohub, da ideia ao merge.

```
ideia
 └─ /grill-with-docs      decide por entrevista; ADR em docs/adr/ quando couber
     └─ /to-spec          docs/specs/<f>/spec.md — a feature INTEIRA
         └─ /prototype    protótipo descartável do fluxo completo
             └─ PORTÃO 0  Gustavo olha e diz se gosta da forma
                 └─ /to-tickets   fatia em DUO-xx, cada um uma fatia vertical
                     └─ PORTÃO 1  ready-for-agent
                         └─ /implement    uma fatia, /tdd por dentro
                             └─ PORTÃO 2  Gustavo confere no navegador
                                 └─ /code-review   Standards + Spec
                                     └─ PR
```

## Fatia vertical

A unidade de trabalho. Uma fatia entrega **uma capacidade que o usuário percebe**,
atravessando todas as camadas: schema → action → UI → teste.

Não se constrói por camada horizontal (todos os helpers, depois todas as actions, depois a
UI). Horizontal adia a descoberta do erro para o fim, quando refazer dói mais — e mergeia
backend órfão esperando uma UI que pode nunca vir.

> **Dentro da fatia**, a ordem de implementação é de dentro para fora: schema → action →
> query → UI. Cada parte declara sua camada de teste. Rigor por camada vem de declarar a
> camada, não de separar em PRs diferentes.

**Piso** — se você não consegue completar *"agora eu consigo ___"*, não é fatia. Ajuste
visual, refactor, bug e infra não são fatias: são `Improvement`, `Task` ou `Bug`. `Feature`
é o que exige fatia.

**Teto** — dois testes qualitativos; basta um falhar para dividir:

- **Teste do "e"** — título precisa de "e" ligando duas capacidades? São duas fatias.
- **Teste da demo** — não dá para demonstrar em ~30s no navegador? É grande demais.

E a régua de tamanho, **contando só código de produção — teste não entra na conta**:

| Faixa | Ação |
| --- | --- |
| **≤600 linhas** | passa limpo |
| **600–1000** | justifica, ou aponta onde cortaria |
| **>1000** | divide, sem discussão |

Teste fica fora porque a régua protege a **qualidade da revisão**, e o risco de defeito mora
no código de produção. Acima de ~1000 linhas de diff a detecção de defeito despenca — a
faixa alta não é folga, é o limite do inútil.

Se as fatias passam de 600 com frequência, o problema não é a régua: o `/to-tickets` está
fatiando grosso.

**Uma fatia por PR.** Merge antes de começar a próxima.

**Ordem das fatias:** a primeira é a **mais arriscada ou mais representativa**, nunca a mais
fácil. Se a forma estiver errada, você descobre na fatia 1, não na 5. O instinto de começar
pelo fácil para ganhar tração é o instinto errado.

**Válvula de escape:** fatia que estoure 600 de produção pode dividir BE e FE em dois PRs —
mas o de BE nasce marcado como não-demonstrável e **só mergeia junto com o de FE**. Exceção
declarada, nunca o padrão.

## Portão 0 — protótipo antes de fatiar

Feature com UI relevante passa por um protótipo **descartável** do fluxo completo antes de
ser fatiada: clicável, dado mockado, sem backend. Use `/prototype`.

Existe para responder uma pergunta só: **"eu gosto disso?"** Cada fatia pode passar no seu
aceite e o conjunto montado ficar sem graça — régua de fatia não protege contra isso.

Não gostou? Volta para o spec. Custo: um dia. Sem esta etapa, a mesma descoberta chega
depois de seis fatias construídas.

### Onde vive

```
src/app/(dev)/playground/<feature>/
├── page.dev.tsx          ← rota SÓ em desenvolvimento
├── editor/page.dev.tsx
└── _mock/data.ts
```

Usa os **componentes e o tema de produção** — é a app de verdade, com dado mockado. Sem
chamada de API, sem action, sem banco.

O sufixo `.dev.tsx` é o que mantém isso fora do ar: `pageExtensions` inclui `dev.tsx` só em
desenvolvimento, então em produção **a rota não é compilada**. Não é 404 em runtime — não
existe.

> **Toda rota em `(dev)/` termina em `.dev.tsx`** — `page`, `layout` e `route`. Um
> `page.tsx` sem o sufixo vai ao ar publicamente, **sem autenticação**.
>
> Hoje **não há nenhuma proteção automática**: o `pageExtensions` condicional, o teste de
> guarda e a entrada de `/playground` no matcher do proxy são DUO-65 e ainda não existem. Até
> lá, a regra é a única defesa.

### O snapshot

Ao aprovar no Portão 0, **cada tela vira print em desktop e mobile**, guardados em
`docs/specs/<feature>/prototype/`. Os prints são o **snapshot congelado**; o `.dev.tsx`
segue vivo e pode derivar.

Existe porque o protótipo importa componentes de produção: uma fatia que mexe num componente
compartilhado **muda o protótipo junto**, e você perde a referência bem na hora em que está
implementando contra ela.

Durante as fatias, `Reference:` aponta para o print. Se o protótipo vivo divergir do print,
isso é sinal — ou o componente melhorou e o print merece atualização (decisão consciente),
ou algo quebrou.

Os dois viewports são obrigatórios: o admin muda de comportamento no mobile (sidebar vira
bottom drawer, pill flutuante), e é justamente essa metade que costuma sair torta. Escolher
"só onde o layout muda" exigiria julgar tela a tela, e esse julgamento se perde.

**Quem tira:** o agente navega o protótipo, captura, **mostra o conjunto e pergunta se é
esse que salva**. Só então grava. Sem essa confirmação, o snapshot pode registrar um estado
que o humano não viu — outro viewport, outro mock — e deixa de ser "o que foi aprovado".

Se a ferramenta de browser não estiver disponível, Gustavo tira na mão. O snapshot é
obrigatório; quem aperta o botão não é.

### Ao arquivar

**Apague o protótipo** de `src/app/(dev)/`; os prints ficam com a spec no `_archive/`.

Não é só higiene: `page.dev.tsx` não vira rota em produção, mas **continua sendo
type-checked** no `next build`. Protótipo esquecido que importa um componente deletado
quebra o build de produção por causa de código que nem é publicado.

## Onde cada coisa mora

| | Conteúdo | Tamanho |
| --- | --- | --- |
| **Ticket Linear** `DUO-xx` | a fatia: aceite binário, arquivos, referência, restrições | cabe na tela |
| `docs/specs/<f>/spec.md` | como a feature funciona por inteiro | sem teto — ver abaixo |
| `docs/specs/<f>/assets/` | material de contexto (documentos, imagens, referências) | livre |
| `docs/adr/` | decisão difícil de reverter + a alternativa descartada | curto, um por decisão |
| `CONTEXT.md` | glossário do domínio | — |

> **Ticket** = o que essa fatia entrega e como saber que acabou.
> **Spec** = como a feature funciona por inteiro, independente de fatia.
> **ADR** = por que escolhemos assim, e o que descartamos.
>
> Se você está escrevendo *como implementar*, nenhum dos três é o lugar. Isso se decide na
> hora, com o código na frente.

Templates: [`templates/spec.md`](./templates/spec.md) ·
[`templates/ticket.md`](./templates/ticket.md).

### Tamanho da spec

**A spec não tem teto de páginas.** Descrever bem o domínio, os estados e os casos de borda
pode legitimamente ocupar espaço, e uma lista extensa de user stories é *desejável* — é dela
que saem as fatias. Truncar para caber numa página mata o insumo do `/to-tickets`.

O que segura o inchaço é a **regra de conteúdo**, que é checável:

> Sem caminho de arquivo, sem trecho de código, sem passo a passo de implementação.

Foi isso que causou o estrago antes — planos de 1.000 a 3.500 linhas descrevendo *como*
implementar, escritos antes de olhar o código. Spec extensa descrevendo *o quê* nunca foi o
problema.

**O sinal é sobre a feature, não sobre o documento:** se a lista de user stories passar de
~15, a feature é grande demais e vira duas features. É a heurística de Minimum Viable Slice
— uma capacidade demonstrável, ~15 tasks ou menos.

O teto rígido continua valendo no **ticket**: esse tem que caber na tela.

### O spec lista as fatias

Ao criar os tickets, o `/to-tickets` deixa no fim do `spec.md` uma linha por fatia com
identificador e link:

```markdown
## Fatias

- [DUO-81](https://linear.app/gvieiram/issue/DUO-81) · Criar rascunho e vê-lo na lista
- [DUO-82](https://linear.app/gvieiram/issue/DUO-82) · Editar seção e ver o preview
```

Uma linha, sem duplicar campo — nada que possa derivar. Serve para saber **o que existe e em
que ordem** sem o MCP do Linear, e para o agente achar o ticket certo quando precisar do
detalhe.

### Evoluir uma feature: delta spec

Feature existente **não** ganha spec reescrita do zero. Cria-se `docs/specs/<f>-v2/` que
referencia a original e descreve **só o que mudou**:

```markdown
# Propostas v2

> Evolui `docs/specs/propostas/spec.md`.

## ADDED
## MODIFIED
## REMOVED
```

Reescrever a spec inteira é como nascem v1 de 3.400 linhas, v2 e v3 do mesmo trabalho — cada
uma contaminada pelo que a anterior deixou meio feito. Um delta tem ~50 linhas.

### Arquivar

Quando **todas as fatias da feature estiverem `Done` no Linear e mergeadas**, mova a pasta:

```
docs/specs/
├── propostas/          ← ativa
└── _archive/
    └── irpf-2026/      ← entregue (spec + assets, nada apagado)
```

Nada é excluído; `assets/` vai junto. A separação é **estrutural de propósito**: agente que
procura em `docs/specs/*/` não enxerga `_archive/`. Marcar status no frontmatter exigiria
ler cada spec para descobrir que devia ignorá-la — e depender de toda skill lembrar de
filtrar.

Links de tickets fechados para a spec movida quebram. Dano aceito: quando a spec é
arquivada, os tickets dela já estão fechados.

## Portão 1 — `ready-for-agent`

**Nenhum agente implementa um ticket sem essa label.** Pegou um ticket sem ela: pare e diga
o que falta.

Critérios, mapeamento e a instrução que impede o `/to-tickets` de carimbar a label sozinho
estão em [`triage-labels.md`](./triage-labels.md) — que é o arquivo que as skills leem.

## Portão 2 — conferência no navegador

O agente **não fecha a fatia sozinho**. Ao terminar:

1. roda `pnpm test`
2. sobe `pnpm dev`
3. entrega a lista de aceite do ticket para Gustavo conferir na tela

Só depois da confirmação é que vai para PR.

Não há Playwright nem screenshot automático — decisão consciente. O gargalo nunca foi falta
de automação, foi ninguém olhar antes de dar por pronto. Revisar quando uma fatia quebrar
algo que já funcionava: aí o problema vira regressão, e E2E passa a valer para os caminhos
críticos.

## Barra de teste

Obrigatório por fatia — três itens, e nada além:

| | O que cobre |
| --- | --- |
| **Schema** | zod aceita o válido, rejeita o inválido, com a mensagem certa |
| **Action** | caminho feliz + permissão negada + erro de domínio |
| **Formulário** (se houver) | erro de validação aparece **no campo certo**; submit desabilita enquanto pendente |

Fora da barra: componente apresentacional, layout, estilo, e código legado. **Sem meta de
cobertura.**

A lista é curta de propósito. Regra que exige teste para tudo é pulada na primeira fatia
apertada, e regra pulada uma vez está morta.

**Declare a camada.** Cada item do `Test:` no ticket diz em que nível é testado. O viés
conhecido de agente é marcar tudo como unit — se um item toca banco, rede ou outro processo,
a camada está errada.

`jsdom` não é navegador: o teste de formulário confirma que a validação dispara e chega no
campo, não que está visível ou que o layout aguenta. Isso é o Portão 2.

## Invariantes da implementação

Valem em toda fatia, sem exceção:

- **Green-state** — o repo fica sempre em estado passando. Falha sem conserto? **reverte
  todas as mudanças daquela fatia** antes de parar. Nada meio-implementado.
- **Uma fatia por vez** — trabalho descoberto vai para o **resumo**, não para o diff.
- **Não gold-plate** — resolve o `Done when:` e nada mais.
- **Ambiguidade = perguntar** — nunca preencher lacuna com palpite. Requisito, critério ou
  decisão de design pouco claros sobem para o humano.
- **Retry diagnóstico: máximo 2 ciclos** — analisar o erro, classificar (bug de teste, bug
  de implementação, erro de config, ambiente, teste instável, ou **falha de design**),
  corrigir com intenção. Design errado escala na hora — não se contorna design quebrado.
- **Vocabulário de domínio** — usar os termos estabelecidos; termo inventado vai sinalizado
  no resumo, não silenciosamente no código.
- **Comentário** — nada por padrão. Só o *porquê* não-óbvio (restrição escondida, workaround,
  decisão contraintuitiva). Nunca repetir o que o código já diz, nunca referenciar
  task, PR ou commit.

Antes de escrever código, a fatia passa pelo **Architecture Gate** —
ver [`../architecture.md`](../architecture.md).

## Convenção de branch

`<tipo>/DUO-<n>/<slug-curto>` — ex.: `feat/DUO-81/proposal-draft-create`.
