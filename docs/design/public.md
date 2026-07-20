---
version: 1
name: duohub-public
description: >-
  Superfície pública ((marketing), (public-app)). Moderna, imersiva, elegante,
  com animação como parte da experiência — é o primeiro contato do usuário.
  Voz serifa (Marcellus) sobre canvas claro, teal como ação e terracota como
  acento. É aqui que a marca gasta caráter; o admin é a superfície quieta.

colors:
  # --- âncoras de marca — os mesmos do admin ---
  brand-teal: "#274f4a"
  brand-terracota: "#d9988a"

  canvas: "#ffffff"
  canvas-alt: "#f5f7f7"
  ink: "#16211f"
  ink-soft: "#41504d"
  muted: "#6b7573"
  hairline: "#e4e9e8"
  action: "#274f4a"
  action-hover: "#1c3b37"
  on-action: "#ffffff"
  accent: "#d9988a"
  accent-soft: "#f6e2dd"
  accent-ink: "#a85d4d"
  tint: "#e7efed"

  # --- escuro — mesma lógica do admin: chão neutro, cor nos acentos ---
  dark-canvas: "#0c0c0c"
  dark-surface: "#141414"
  dark-surface-elevated: "#1c1c1c"
  dark-ink: "#f2f1ef"
  dark-ink-soft: "#bdbcb9"
  dark-muted: "#918f8b"
  dark-hairline: "#292929"
  dark-action: "#cc785c"
  dark-accent-teal: "#57b5a8"

typography:
  display-xl:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: 54px
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: -0.005em
  display-lg:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: 38px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.005em
  display-md:
    fontFamily: "Marcellus, Georgia, serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
  quote:
    fontFamily: "Playfair Display, Georgia, serif"
    fontSize: 30px
    fontStyle: italic
    fontWeight: 400
    lineHeight: 1.4
  lede:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  eyebrow:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 600
    letterSpacing: 0.09em
    textTransform: uppercase
  button:
    fontFamily: "Plus Jakarta Sans, system-ui, sans-serif"
    fontSize: 14.5px
    fontWeight: 600
    lineHeight: 1

rounded:
  button: 10px
  card: 14px
  card-lg: 16px
  pill: 9999px

spacing:
  section: 70px
  section-lg: 96px
  container: 1120px
  gutter: 24px

motion:
  ease-default: "cubic-bezier(0.4, 0, 0.2, 1)"
  ease-entrance: "cubic-bezier(0.22, 0.61, 0.36, 1)"
  duration-reveal: 700ms
  stagger: 80ms

components:
  button-primary:
    backgroundColor: "{colors.action}"
    textColor: "{colors.on-action}"
    rounded: "{rounded.button}"
    typography: "{typography.button}"
    padding: 12px 20px
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.button}"
    typography: "{typography.button}"
  eyebrow-pill:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    typography: "{typography.eyebrow}"
  feature-card:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.card}"
    padding: 24px
  quote-band:
    backgroundColor: "{colors.canvas-alt}"
    typography: "{typography.quote}"
    paddingY: "{spacing.section}"
---

# Public — direção visual

Vale para `(marketing)` — incluindo a landing de imposto de renda — e `(public-app)`
(login, convite, pós-login).

## Referência

**Nenhuma referência externa foi adotada.** Apple e Cursor foram avaliados e rejeitados; o
catálogo getdesign.md serviu de leitura, não de modelo.

O motivo é que esta superfície **já tem voz própria e no ar**: Marcellus nos títulos de
todas as seções, Playfair itálico nas citações, teal e terracota na paleta. A direção aqui
é preservar e sistematizar o que existe, não substituir.

## Tipografia — a decisão que separa as duas superfícies

**A voz do público é serifa.** `{typography.display-xl}` em Marcellus nos títulos,
`{typography.quote}` em Playfair itálico nas citações, corpo em Plus Jakarta Sans.

Isso diverge do admin de propósito, e o `README.md` já declarava duas linguagens visuais.
A lógica:

- **Contabilidade brasileira online é um mar de landing azul com sans geométrica.** A
  serifa posiciona o duohub como escritório com nome e rosto — que é exatamente o que o
  texto das páginas promete.
- **O caráter da marca se gasta aqui.** O admin usa Geist e é deliberadamente quieto; a
  ousadia vive num lugar só, e é este.

Tracking do display fica em `-0.005em` — Marcellus já tem contraste alto e não pede aperto.

> **Não unifique as duas superfícies numa fonte só** sem reabrir esta decisão. Unificar em
> Geist descartaria Marcellus e Playfair e obrigaria a refazer a landing de IRPF e o
> social-proof, que estão em produção.

## Cor

Mesmos âncoras do admin: `{colors.brand-teal}` como ação e `{colors.brand-terracota}` como
acento. Isso não é escolha nova — a superfície já usa `text-primary` e `text-highlight`.

Canvas é claro. O ritmo de seção alterna `{colors.canvas}` e `{colors.canvas-alt}`; o
`{components.quote-band}` usa o alternado para dar respiro entre blocos.

> **O escuro do público está desligado** (`forcedTheme="light"` fora de `/admin`). Uma
> validação em tela achou três lacunas que os tokens sozinhos não resolvem: a logo usa uma
> variante que some no fundo escuro, os cards empilhados ficam da mesma cor do fundo, e a
> banda de CTA em terracota sólida briga com o botão verde do WhatsApp. É **DUO-67**.

Quando voltar, valem as mesmas regras do [`admin.md`](./admin.md): **chão neutro, cor só
nos acentos**, coral como ação e teal clareado em status. A justificativa completa está lá
e não se repete aqui. Mas os três pontos acima mostram que o escuro do público **não é só
questão de token** — logo, profundidade de card e banda cromática precisam de decisão
própria.

## Ritmo e espaço

Esta superfície é **espaçosa** — o oposto do admin. `{spacing.section}` entre blocos,
container em `{spacing.container}`, e texto corrido nunca passa de ~65 caracteres de
largura.

## Movimento

Aqui **animação é a experiência**, não serviço. É a única superfície onde movimento pode
chamar atenção para si.

- Entrada de seção com reveal (`{motion.duration-reveal}`, `{motion.ease-entrance}`) e
  stagger de `{motion.stagger}` entre irmãos.
- Um momento orquestrado vale mais que efeito espalhado. Se tudo se move, nada se destaca.
- `prefers-reduced-motion` desliga tudo — sem exceção.

## `(public-app)` — a exceção dentro da exceção

Login, convite e pós-login são **UI, não peça de marca**. Herdam a paleta e o espaço desta
superfície, mas:

- Sem animação de entrada elaborada — o usuário veio para entrar, não para ser encantado.
- Formulário segue as regras de campo e erro do [`admin.md`](./admin.md), incluindo o
  contrato de que **ação que falha nunca limpa o que foi digitado**.

## Estados

Valem os quatro de [`README.md`](./README.md). Na landing, o que mais aparece é **erro de
ação** (formulário de contato, captura de lead): toast mais erro no campo, com a tela e o
preenchimento intactos.
