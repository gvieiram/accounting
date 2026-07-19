---
version: 1
name: duohub-admin
description: >-
  Superfície autenticada (admin, app). Profissional, densa, calma. Quatro
  contadoras operam isto o dia inteiro — densidade e atalho valem mais que
  hand-holding, e animação existe a serviço da leitura, nunca atrasando quem
  trabalha. Canvas claro com dado financeiro em figuras tabulares; teal como
  ação, terracota como acento. No escuro os dois trocam de papel.

colors:
  # --- âncoras de marca — valem nos dois temas, não se negociam ---
  brand-teal: "#274f4a"
  brand-terracota: "#d9988a"

  # --- tema claro (padrão) ---
  canvas: "#f5f7f7"
  surface: "#ffffff"
  surface-elevated: "#ffffff"
  field: "#f0f3f3"
  hover: "#f0f3f3"
  ink: "#16211f"
  ink-soft: "#4b5654"
  muted: "#69736f"
  hairline: "#e4e9e8"
  hairline-strong: "#d5dcdb"
  action: "#274f4a"
  action-hover: "#1c3b37"
  on-action: "#ffffff"
  accent: "#d9988a"
  accent-soft: "#f6e2dd"
  accent-ink: "#a85d4d"
  tint: "#e7efed"
  success: "#1f8a54"
  success-soft: "#e3f3ea"
  warning: "#b7791f"
  warning-soft: "#faf0dd"
  danger: "#c94a3d"
  danger-soft: "#f9e5e2"

  # --- tema escuro — chão neutro, cor só nos acentos ---
  dark-canvas: "#0c0c0c"
  dark-surface: "#141414"
  dark-surface-elevated: "#1c1c1c"
  dark-field: "#161616"
  dark-hover: "#1f1f1f"
  dark-ink: "#f2f1ef"
  dark-ink-soft: "#bdbcb9"
  dark-muted: "#918f8b"
  dark-hairline: "#292929"
  dark-hairline-strong: "#383838"
  dark-action: "#cc785c"
  dark-action-hover: "#d9988a"
  dark-on-action: "#1a0f0b"
  dark-accent-teal: "#57b5a8"
  dark-success: "#5db872"
  dark-warning: "#e8a55a"
  dark-danger: "#e0655a"

typography:
  display-lg:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 25px
    fontWeight: 640
    lineHeight: 1.15
    letterSpacing: -0.02em
  display-md:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 22px
    fontWeight: 640
    lineHeight: 1.2
    letterSpacing: -0.02em
  title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 14.5px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: -0.01em
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 13.5px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0
  table-cell:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0
  numeric:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 13px
    fontWeight: 500
    fontVariantNumeric: tabular-nums
    letterSpacing: 0
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 12.5px
    fontWeight: 550
    lineHeight: 1.4
  caption-uppercase:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: 11px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0.06em
    textTransform: uppercase

rounded:
  input: 8px
  button: 10px
  card: 14px
  modal: 20px
  pill: 9999px

spacing:
  density-x: 14px
  density-y: 8px
  density-gap: 8px
  card-padding: 16px
  section-gap: 20px
  control-sm: 32px
  control-md: 40px

motion:
  ease-default: "cubic-bezier(0.4, 0, 0.2, 1)"
  duration-fast: 100ms
  duration-default: 150ms
  duration-slow: 250ms
  duration-slower: 300ms

components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.button}"
    height: "{spacing.control-md}"
    typography: "{typography.label}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline-strong}"
    rounded: "{rounded.button}"
  input:
    backgroundColor: "{colors.field}"
    borderColor: "{colors.hairline-strong}"
    focusBorderColor: "{colors.action}"
    focusRing: "{colors.tint}"
    rounded: "{rounded.input}"
  card:
    backgroundColor: "{colors.surface}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  table-row:
    height: 32px
    paddingX: "{spacing.density-x}"
    paddingY: "{spacing.density-y}"
    borderBottom: "{colors.hairline}"
    hoverBackground: "{colors.hover}"
  table-header:
    typography: "{typography.caption-uppercase}"
    textColor: "{colors.muted}"
    borderBottom: "{colors.hairline}"
  chip-status:
    rounded: "{rounded.pill}"
    typography: "{typography.caption-uppercase}"
---

# Admin — direção visual

Vale para `admin` (as contadoras) e `app` (os clientes). As duas são superfícies de
trabalho; a diferença entre elas é de **clareza**, não de estética — no `app`, mesma
linguagem com menos densidade e mais texto de apoio.

## O que já estava decidido

- **Shell** — sidebar sempre visível no desktop (colapsa pelo trigger interno); sem header
  no topo; pill flutuante no mobile abrindo a sidebar como bottom drawer. Container:
  `gap-6 px-4 pt-6 pb-24 sm:gap-8 sm:px-6 sm:pt-6 sm:pb-12`.
- **Estados** — contrato dos quatro em [`README.md`](./README.md).

> **A sidebar está fora do escopo desta direção.** O `app-sidebar.tsx` existente já atende;
> não é para redesenhá-la.

## Referência

**`turio-ds`** como método estrutural — raio, escala de sombra, densidade e movimento saem
de lá. **Nada de cor ou fonte da Vaas entra**: a paleta é a nossa e a fonte é `Geist`, que
coincide por ser a mesma escolha deles, não por herança.

Nenhuma entrada do catálogo getdesign.md foi adotada: as 328 são análises de landing page e
não descrevem tela autenticada, tabela ou densidade. O polo de densidade que orienta as
decisões abaixo é o **IBM/Carbon** — tile de borda fina, ornamento raro.

## Cor

Dois âncoras, `{colors.brand-teal}` e `{colors.brand-terracota}`, e **eles trocam de papel
entre os temas**. Essa é a decisão central deste documento.

| | Claro | Escuro |
| --- | --- | --- |
| Ação (botão, foco, link) | teal — `{colors.action}` | coral — `{colors.dark-action}` |
| Acento | terracota — `{colors.accent}` | teal clareado — `{colors.dark-accent-teal}` |

O motivo é contraste, não gosto: **teal é uma cor escura** e só funciona como ação sobre
fundo claro; sobre fundo escuro ele afunda. **Terracota é clara e quente** e faz o inverso.
No escuro, `{colors.dark-action}` é a própria terracota saturada — mesma família, então o
âncora continua sendo nosso.

O teal não desaparece no escuro: volta clareado em `{colors.dark-accent-teal}`, no papel de
**ponto de status, link e anel de foco**.

**Cor semântica é separada do acento.** `{colors.success}`, `{colors.warning}` e
`{colors.danger}` comunicam estado e não contam como cor de marca — nunca use teal ou
terracota para dizer "deu certo" ou "deu errado".

### Por que o escuro anterior falhava

Registrado para não regredir. O bloco `.dark` original tingia o **chão** com a marca
(`hsl(173 30% 4%)`, 30% de saturação) e mantinha teal como ação. Quatro efeitos:

1. Croma alto em luminância baixa lê como **lama esverdeada**, não como "tingido".
2. Fundo e card ficavam a 3 pontos de distância — o card não descolava.
3. O teal, sendo escuro, não conseguia ser acento e virava um verde apagado.
4. Texto branco-quente sobre chão frio criava um choque sutil que suja a tela.

A correção **não** é esfriar o texto: é **neutralizar o chão** e deixar a cor viver só nos
acentos. O chão escuro é neutro (`{colors.dark-canvas}` → `{colors.dark-surface}` →
`{colors.dark-surface-elevated}`), com separação real entre os degraus.

Os fundos de chip no escuro são **o próprio acento em ~13% de opacidade**, não um tom
sólido pintado à mão. Tom sólido volta a virar lama.

## Tipografia

**`Geist` faz display e corpo.** Uma família só — o admin é a superfície *quieta*, e o
caráter da marca é gasto no público, não aqui. Legibilidade em jornada de oito horas vale
mais que personalidade tipográfica.

**Figuras tabulares (`font-variant-numeric: tabular-nums`) são obrigatórias em toda coluna
monetária e em qualquer dígito que alinhe verticalmente** — valor, CNPJ, data, contador.
Isto é contabilidade: número que não alinha é número que se lê errado.

Display usa tracking negativo (`-0.02em`); corpo e tabela ficam em zero.

## Tabela

O componente mais importante desta superfície.

- **Linha compacta**, `{components.table-row.height}` — muita linha na dobra.
- **Hairline** separando (`{colors.hairline}`), **sem zebra**. Uma linguagem só de
  separadores, coerente com o card de borda fina.
- Cabeçalho em `{typography.caption-uppercase}`, cor `{colors.muted}`.
- Coluna monetária **alinhada à direita** e em `{typography.numeric}`.
- Estado da linha em chip com forma além de cor — ponto colorido + rótulo, nunca cor
  sozinha.
- Tabela larga rola **dentro do próprio container** (`overflow-x: auto`); a página nunca
  rola na horizontal.

## Profundidade e forma

**Hairline faz a separação; sombra faz a elevação** — e a sombra é suave, na escala do
`turio-ds`. Card é `{rounded.card}`, botão `{rounded.button}`, input `{rounded.input}`.

O canvas claro é off-white (`{colors.canvas}`) com o card em branco puro
(`{colors.surface}`). Isso dá separação sem precisar de sombra forte.

## Movimento

Escala herdada do `turio-ds`, com `{motion.ease-default}`:

| Token | Uso |
| --- | --- |
| `{motion.duration-fast}` | micro — fill de ícone, toggle |
| `{motion.duration-default}` | **o padrão** — cor, transform, accordion, tabs, popover |
| `{motion.duration-slow}` | movimento de layout amplo — **exige justificativa escrita** |
| `{motion.duration-slower}` | excepcional |

A regra que importa: **animação nunca atrasa quem está trabalhando.** Passar de
`{motion.duration-default}` é exceção que se justifica no PR, não default.

Respeitar `prefers-reduced-motion` não é opcional.

## Os dois temas

Claro é o padrão. **Escuro é tema de primeira classe**, não cortesia: toda fatia valida os
quatro estados nos dois temas, e isso faz parte do aceite.

O escuro se define **por token**, nunca por `dark:` espalhado em componente. Se um
componente precisou de `dark:` para ficar certo, o token é que está errado.

## Estados

As quatro situações de [`README.md`](./README.md) fazem parte do aceite da fatia. Elas não
aparecem em nenhuma das 328 análises do catálogo — são decisão nossa, e é por isso que o
contrato vive aqui e não numa referência externa.
