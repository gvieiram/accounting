# Design: Landing Page Completa — Effer Contabilidade

**Data:** 2026-03-07
**Status:** Aprovado

## Contexto

O site da Effer Contabilidade tem atualmente: Header, Hero, Logo Cloud e StackedFeatures (serviços/diferenciais). Faltam as seções restantes para completar a landing page, inspirada no template Minsk mas adaptada ao contexto da Effer.

## Decisões tomadas

| Decisão | Escolha |
|---|---|
| Seção de serviços | Manter StackedFeatures existente |
| Seção "Sobre" | Foco nas duas sócias (foto + bio) |
| Depoimentos | Implementar com placeholder (conteúdo real depois) |
| Blog/Artigos | Substituir por seção de campanha sazonal |
| FAQ | Implementar com perguntas reais |
| CTA Final | WhatsApp (principal) + formulário de lead (secundário) |
| Footer | Minimalista (logo, links, redes sociais) |
| Imagens | Mix — placeholder onde precisa de foto, design gráfico onde possível |
| Abordagem | Incremental por seção |

## Ordem das seções na landing page

| # | Seção | Status | Arquivo |
|---|---|---|---|
| 1 | Header | Existente | `header.tsx` |
| 2 | Hero | Existente | `hero.tsx` |
| 3 | Logo Cloud | Existente | `hero.tsx` (LogosSection) |
| 4 | StackedFeatures | Existente | `feature-section.tsx` |
| 5 | Sobre as Sócias | **Novo** | `about-section.tsx` |
| 6 | Depoimentos | **Novo** | `testimonials-section.tsx` |
| 7 | Campanha Sazonal | **Novo** | `campaign-section.tsx` |
| 8 | FAQ | **Novo** | `faq-section.tsx` |
| 9 | CTA (WhatsApp + Form) | **Novo** | `cta-section.tsx` |
| 10 | Footer | **Novo** | `footer.tsx` |

## Design por seção

### 5. Sobre as Sócias (`about-section.tsx`)

**Layout:**
- Título com destaque: "Conheça quem cuida do seu negócio"
- Duas colunas lado a lado (desktop), empilhadas em mobile
- Cada coluna: foto circular/arredondada (placeholder) + nome + cargo/especialidade + bio curta (2-3 linhas)
- Abaixo: parágrafo sobre a visão da empresa (contabilidade contínua + consultoria sob demanda)

**Visual:**
- Fundo neutro (background padrão)
- Fotos com borda sutil ou sombra leve
- Nomes em fonte heading (Marcellus), cargos em cor highlight (terracota)
- Bio em texto muted

**Componentes:** Nenhuma dependência nova.

### 6. Depoimentos (`testimonials-section.tsx`)

**Layout inspirado no 21st.dev testimonial-v2:**
- Título centralizado: "O que nossos clientes dizem"
- Grid bento 4 colunas (desktop):
  - 1 card grande (2 colunas, 2 linhas) — depoimento destaque
  - 2 cards médios (2 colunas, 1 linha)
  - 2 cards pequenos (1 coluna cada)
- Mobile: empilhado verticalmente
- Cada card: blockquote + avatar + nome + empresa
- Card destaque com ícone de aspas decorativo

**Visual:**
- Cards com componente `Card` existente
- Avatares com `Avatar` do Radix (nova dependência)
- Animações de entrada staggered com Framer Motion
- Conteúdo placeholder — texto real vem depois

**Componentes novos:**
- `avatar.tsx` (shadcn/ui, `@radix-ui/react-avatar`)

### 7. Campanha Sazonal (`campaign-section.tsx`)

**Conceito:** Seção de destaque rotativa para campanha vigente. Início: IR 2026.

**Layout:**
- Fundo com destaque visual (cor accent/highlight ou gradiente sutil)
- Duas colunas (desktop): texto à esquerda + ilustração/ícone à direita
  - Badge ou tag com "Campanha" ou validade
  - Título forte: "Imposto de Renda 2026"
  - Subtítulo: prazo, informações relevantes
  - 2-3 bullet points com benefícios
  - CTA: "Declarar com a Effer" → WhatsApp
- Mobile: empilhado verticalmente

**Visual:**
- Cores de destaque (terracota/highlight) para urgência sazonal
- Ícone temático (Lucide `FileText`, `Calculator` como placeholder)

**Componentes:** Props configuráveis para facilitar troca de campanha.

### 8. FAQ (`faq-section.tsx`)

**Layout inspirado no 21st.dev Faqs 1:**
- Coluna única centralizada (`max-w-3xl`)
- Título + parágrafo explicativo no topo
- Accordion agrupado em card com fundo sutil (`bg-card`), cantos arredondados
- Chevron que rotaciona ao abrir
- Ao final: texto com link "Fale com nosso time" → WhatsApp

**Conteúdo (5-6 perguntas):**
1. Como funciona a contabilidade digital da Effer?
2. Quais documentos preciso para abrir minha empresa?
3. Qual o prazo para regularizar minha situação fiscal?
4. Vocês atendem MEI?
5. Como funciona o atendimento por WhatsApp?
6. Quanto custa o serviço de contabilidade?

**Componentes novos:**
- `accordion.tsx` (shadcn/ui, `@radix-ui/react-accordion`)

### 9. CTA Final (`cta-section.tsx`)

**Layout:**
- Fundo escuro (primary/teal) com texto claro
- Duas colunas (desktop):
  - Esquerda: título "Pronto para simplificar sua contabilidade?", subtítulo, botão WhatsApp (verde, CTA principal) + botão "Agendar consulta"
  - Direita: formulário curto — nome, e-mail, telefone, mensagem (opcional) + botão "Enviar"
- Mobile: empilhado — WhatsApp primeiro, formulário abaixo

**Visual:**
- Fundo primary/teal com texto claro — contraste forte
- Botão WhatsApp com ícone — destaque verde
- Formulário com campos semi-transparentes, bordas sutis

**Nota:** Formulário é visual por enquanto (sem backend). WhatsApp é a ação principal.

**Componentes:** Usa `Input`, `Textarea`, `Button` existentes.

### 10. Footer (`footer.tsx`)

**Layout:**
- 3 áreas: Logo (esquerda) | Links (centro) | Redes sociais (direita)
- Abaixo: separador + "© 2026 Effer Contabilidade"
- Mobile: empilhado verticalmente, centralizado

**Conteúdo:**
- Logo: wordmark da Effer (já existe no header)
- Links: Serviços, Planos, Sobre, Contato
- Redes sociais: Instagram, LinkedIn, WhatsApp (ícones Lucide)

**Componentes:** Usa `Separator` existente.

## Dependências novas

| Pacote | Motivo |
|---|---|
| `@radix-ui/react-avatar` | Componente Avatar para depoimentos e sócias |
| `@radix-ui/react-accordion` | Componente Accordion para FAQ |

## Ordem de implementação

1. Footer (mais simples, dá esqueleto à página)
2. Sobre as Sócias
3. Depoimentos (bento grid)
4. Campanha Sazonal (IR 2026)
5. FAQ (accordion)
6. CTA (WhatsApp + formulário)

Cada seção é um commit isolado, revisável e testável individualmente.
