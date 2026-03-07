# Feature Sections — Zig-Zag Layout

## Contexto

Próxima seção da landing page após Hero + Logo Cloud. Três seções alternadas (zig-zag) cobrindo: áreas de atuação, diferenciais e benefícios.

## Layout

Padrão alternado com split 50/50 (imagem | conteúdo):

1. **Seção 1** — Imagem esquerda | Conteúdo direita
2. **Seção 2** — Conteúdo esquerda | Imagem direita (invertido)
3. **Seção 3** — Imagem esquerda | Conteúdo direita

Mobile: sempre empilha vertical (imagem em cima, conteúdo embaixo).

## Seções

### Seção 1 — "O que fazemos" (Áreas de atuação)

- **Imagem**: `/1.png`
- **Badge**: "Nossos serviços"
- **Título**: "Serviços contábeis completos para o seu negócio"
- **Parágrafo**: Texto breve sobre a atuação geral da Effer
- **Bullets** (check terracota/highlight):
  - Gestão fiscal e tributária
  - Escrituração contábil
  - Abertura e regularização de empresas
  - Folha de pagamento e DP
- **CTA**: "Conheça nossos serviços" →

### Seção 2 — "Por que a Effer" (Diferenciais)

- **Imagem**: `/2.png`
- **Badge**: "Por que nos escolher"
- **Título**: "Tecnologia e proximidade em cada detalhe"
- **Parágrafo**: Diferencial da Effer — plataforma digital + atendimento humano
- **Bullets** (check terracota/highlight):
  - Plataforma 100% digital — acompanhe tudo online
  - Atendimento personalizado com especialistas
  - Processos ágeis e sem burocracia
- **CTA**: "Fale com um especialista" (secondary/outline)

### Seção 3 — "Benefícios para você" (Resultados)

- **Imagem**: `/3.png`
- **Badge**: "Resultados reais"
- **Título**: "Foque no que importa, a gente cuida do resto"
- **Parágrafo**: Liberar o empreendedor para focar no negócio
- **Bullets** (check terracota/highlight):
  - Economia de tempo — sem dor de cabeça com burocracia
  - Conformidade garantida — sempre em dia com o fisco
  - Decisões estratégicas baseadas em dados financeiros claros
- **CTA**: "Começar agora" (primary, forte — CTA final)

## Arquitetura de componentes

- `FeatureSection` — componente reutilizável com props: `badge`, `title`, `description`, `bullets`, `image`, `cta`, `reversed`
- Usa `next/image` para as imagens
- Animações: `fade-in` + `slide-in` via tw-animate-css
- Grid: `md:grid-cols-2`, empilha em mobile
- Espaçamento: `py-16 md:py-24`, contido em `max-w-5xl`
- Ícone check na cor `highlight` (terracota)
