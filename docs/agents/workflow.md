# Workflow

Como o trabalho anda no duohub, da ideia ao merge.

```
ideia
 └─ /grill-with-docs      decide por entrevista; ADR em docs/adr/ quando couber
     └─ /to-spec          vira docs/features/<feature>/spec.md
         └─ /to-tickets   fatia em DUO-xx, cada um uma fatia vertical
             └─ PORTÃO 1  ready-for-agent
                 └─ /implement    uma fatia, dirigindo /tdd por dentro
                     └─ PORTÃO 2  Gustavo confere no navegador
                         └─ /code-review   Standards + Spec
                             └─ PR
```

## Fatia vertical

A unidade de trabalho. Uma fatia entrega **uma capacidade que o usuário percebe**,
atravessando todas as camadas: schema → action → UI → teste.

Não se constrói por camada horizontal (todos os helpers, depois todas as actions, depois
a UI). Fatia horizontal só revela problema no fim, quando refazer já dói.

**Piso** — se você não consegue completar *"agora eu consigo ___"*, não é fatia. Ajuste
visual, refactor e bug não são fatias: são `Improvement`, `Task` ou `Bug` no Linear.
`Feature` é o que exige fatia.

**Teto** — dois testes; basta um falhar para dividir:

- **Teste do "e"** — se o título precisa de "e" ligando duas capacidades, são duas fatias.
- **Teste da demo** — se não dá para demonstrar em ~30s abrindo o navegador, é grande demais.

~1000 linhas de diff é **sinal**, não bloqueio: passou disso, pergunte se não são duas
fatias. Contagem de linha é proxy ruim — o teste da demo manda.

**Uma fatia por PR.** Merge antes de começar a próxima.

## Onde cada coisa mora

| | Conteúdo | Tamanho |
| --- | --- | --- |
| **Ticket Linear** `DUO-xx` | o que a fatia entrega, aceite verificável, dependências | cabe na tela |
| `docs/features/<f>/spec.md` | como a feature funciona por inteiro, transversal às fatias | **teto: 1-2 páginas** |
| `docs/features/<f>/assets/` | material de contexto (documentos, imagens, referências) | livre |
| `docs/adr/` | decisão difícil de reverter + a alternativa descartada | curto, um por decisão |
| `CONTEXT.md` | glossário do domínio | — |

> **Ticket** = o que essa fatia entrega e como saber que acabou.
> **Spec** = como a feature funciona por inteiro, independente de fatia.
> **ADR** = por que escolhemos assim, e o que descartamos.
>
> Se você está escrevendo *como implementar*, nenhum dos três é o lugar. Isso se decide na
> hora, com o código na frente.

O teto de 1-2 páginas do `spec.md` não é sugestão. Documento grande não é uma escolha que
alguém faz de propósito — ele cresce um parágrafo por vez. Passou do teto, a feature é
grande demais e vira duas features, não um documento maior.

### Formato do ticket

```markdown
# DUO-81 · Criar rascunho de proposta e vê-lo na lista

O contador escolhe um template, cria um rascunho e o rascunho aparece na
listagem com status "Rascunho".

## Aceite
- [ ] Botão "Nova proposta" abre o seletor de template
- [ ] Criar gera proposta com status DRAFT vinculada ao cliente
- [ ] A nova proposta aparece na listagem sem refresh manual
- [ ] Listagem vazia mostra estado vazio com a ação primária
- [ ] Erro ao criar mostra toast e não limpa o formulário

## Depende de
- DUO-80

## Contexto
docs/features/propostas/spec.md
```

Sem nome de arquivo, sem assinatura de função, sem passo de implementação. O aceite é
comportamento observável — é ele que vira teste no `/tdd` e é ele que se confere na tela.

## Portão 1 — `ready-for-agent`

**Nenhum agente implementa um ticket sem essa label.** Pegou um ticket sem ela: pare e
diga o que falta. Não preencha a lacuna sozinho — preencher lacuna é como spec vaga vira
entrega errada.

Critérios em `triage-labels.md`.

## Portão 2 — conferência no navegador

O agente **não fecha a fatia sozinho**. Ao terminar:

1. roda `pnpm test`
2. sobe `pnpm dev`
3. entrega a lista de aceite do ticket para Gustavo conferir na tela

Só depois da confirmação é que vai para PR.

Não há Playwright nem screenshot automático no fluxo — decisão consciente. O gargalo nunca
foi falta de automação, foi ninguém olhar antes de dar por pronto. Revisar isso quando uma
fatia quebrar algo que já funcionava: aí o problema vira regressão, e E2E passa a valer
para os caminhos críticos.

## Barra de teste

Obrigatório por fatia — três itens, e nada além:

| | O que cobre |
| --- | --- |
| **Schema** | zod aceita o válido, rejeita o inválido, com a mensagem certa |
| **Action** | caminho feliz + permissão negada + erro de domínio |
| **Formulário** (se houver) | erro de validação aparece **no campo certo**; submit desabilita enquanto pendente |

Fora da barra: componente apresentacional, layout, estilo, e os componentes legados. **Sem
meta de cobertura.**

A lista é curta de propósito. Regra que exige teste para tudo é pulada na primeira fatia
apertada, e regra pulada uma vez está morta.

`jsdom` não é navegador: o teste de formulário confirma que a validação dispara e chega no
campo, não que está visível ou que o layout aguenta. Isso é o Portão 2.

## Convenção de branch

`<tipo>/DUO-<n>/<slug-curto>` — ex.: `feat/DUO-81/proposal-draft-create`.
