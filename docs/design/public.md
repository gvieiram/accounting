---
version: draft
name: duohub-public
description: >-
  Superfície pública ((marketing), (public-app)). Moderna, imersiva, elegante,
  com animação como parte da experiência — o primeiro contato do usuário.
  A DEFINIR.
---

# Public — direção visual

> **Vazio por decisão.** A direção estética foi adiada; o harness veio primeiro.

O que já está decidido:

- **Formato** — frontmatter YAML (`colors`, `typography`, `rounded`, `spacing`,
  `components`) + prosa, no padrão DESIGN.md. Token por referência, nunca hex inline.
- **Fundação** — Inter, tokens de `globals.css`, shadcn `new-york`. Ver
  [`README.md`](./README.md).

A preencher: paleta, escala tipográfica, ritmo de seção, profundidade, movimento.

## Referências

Avaliadas e **não escolhidas** — os dois são esteticamente opostos e nenhum foi adotado:

| | Apple | Cursor |
| --- | --- | --- |
| Canvas | preto/branco alternando, edge-to-edge | creme quente `#f7f7f4`, nunca branco puro |
| Voz | fotografia primeiro | editorial de revista |
| Display | SF Pro, tracking negativo | peso 400, nunca bold |
| Acento | Action Blue `#0066cc` | Orange `#f54e00`, escasso |
| Profundidade | uma sombra, sob o produto | hairline pura, zero sombra |

Nota útil independentemente da escolha: o documento do Cursor aponta **Inter com
`letter-spacing: -1.5%`** como substituto open-source do CursorGothic. O projeto já usa
Inter — seria ajuste de tracking, não troca de fonte.

Catálogo de referências: https://getdesign.md/

Cuidado ao usar essas análises: elas capturam só a camada estética. Estado vazio, validação
de formulário e densidade de tabela não aparecem — são análises feitas de fora, olhando um
site público. O próprio documento do Cursor admite: *"Form validation states beyond focus
not visible on captured surfaces."*
