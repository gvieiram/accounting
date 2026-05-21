# UTM Tracking

Guia de convenção para montar URLs com UTM (Urchin Tracking Module) das campanhas que levam ao site. A atribuição é **capturada e armazenada pelo PostHog**, não persistida no banco da aplicação.

## Como funciona hoje

- O PostHog (via `posthog-js`) é carregado em todas as páginas públicas e faz **first-touch attribution** automaticamente: ao primeiro acesso em uma sessão de cookie, ele persiste `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `fbclid` e o referrer original.
- Quando um visitante submete o formulário de IRPF, o front chama `posthog.identify(email, { service: "IRPF", ... })` + `posthog.capture("irpf_contact_submitted", {...})`. Isso liga o anônimo ao contato e preserva todo o histórico de atribuição — mesmo que o usuário tenha navegado por várias páginas antes do submit.
- A tabela `Contact` no banco **não armazena UTMs**. Ela serve apenas para o controle operacional (WhatsApp, e-mail, qualificação). Toda análise de origem/conversão acontece no PostHog.
- Os eventos trafegam por um **reverse proxy same-origin** em `/ingest` (configurado em [`next.config.ts`](../next.config.ts)), não diretamente para `us.i.posthog.com`. Isso reduz drasticamente perdas para ad blockers que incluem o domínio do PostHog em suas listas.

Resultado prático: a limitação antiga de "UTMs se perdem em navegação interna" **deixou de existir**. Qualquer URL com UTM que seja a **primeira página aberta na sessão do visitante** vai ser creditada, não importa por quantas páginas ele passe antes de submeter o formulário.

## Regras básicas

- Sempre **`snake_case` minúsculo** (`instagram`, nunca `Instagram`)
- Nunca espaços — use `-` ou `_` (`ir-2026`, nunca `ir 2026`)
- Sem acentos (`whatsapp`, nunca `whatsápp`)
- **Consistência absoluta** — se hoje é `instagram_bio` e amanhã `instagram-bio`, o relatório vira dois itens diferentes

## Parâmetros usados pelo site

| Parâmetro | O que é | Responde | Obrigatório |
| --- | --- | --- | --- |
| `utm_source` | **Origem** — plataforma de onde veio o clique | "De onde veio?" | Sim |
| `utm_medium` | **Meio/Canal** — tipo de tráfego | "Como chegou?" | Sim |
| `utm_campaign` | **Campanha** — iniciativa específica | "Por quê?" | Sim |

> `utm_term` e `utm_content` são capturados pelo PostHog se presentes, mas não exigimos. Úteis no dia em que rodarmos Google Ads com match de palavra-chave ou teste A/B de criativo.

## Convenção de valores — dicionário oficial

Fixe e **nunca** invente variações em runtime. Atualize este documento sempre que uma nova fonte for oficializada.

### `utm_source` — onde o link foi publicado

| Valor | Uso |
| --- | --- |
| `instagram` | Qualquer link saindo do Instagram (bio, story, post, reels, DM) |
| `whatsapp` | Mensagens diretas ou grupos no WhatsApp |
| `linkedin` | LinkedIn orgânico ou DM |
| `google` | Google Meu Negócio, busca orgânica, Search Console |
| `meta` | Anúncios pagos Meta Ads (Instagram + Facebook) |
| `google-ads` | Anúncios pagos Google Ads |
| `email` | Newsletter ou e-mail transacional com CTA |
| `indicacao` | QR code em material físico, cartão, parceiro |

### `utm_medium` — tipo de posição/formato

| Valor | Uso |
| --- | --- |
| `bio` | Link da bio (posição permanente) |
| `story` | Story com link swipe-up/sticker |
| `post` | Link em legenda de feed |
| `reels` | Link associado a um Reels |
| `direct` | Mensagem direta (DM, WhatsApp pessoal) |
| `cpc` | Anúncio pago (cost-per-click) |
| `organic` | Tráfego orgânico (SEO, posts não patrocinados) |
| `email` | Link dentro de um e-mail |
| `qr` | QR code físico |

### `utm_campaign` — qual ação/iniciativa

| Valor | Uso |
| --- | --- |
| `ir-2026` | Toda comunicação sobre Imposto de Renda 2026 |
| `abertura-mei` | Campanha sobre abertura de MEI |
| `sempre` | Tráfego perene, sem campanha (ex: link permanente da bio do Instagram) |

Nomeação de campanhas futuras: `<tema>-<ano>` ou `<tema>-<mes-ano>`. Exemplo: `simples-nacional-mai-2026`.

## Anatomia da URL

```
https://www.duohubcontabil.com.br/imposto-de-renda?utm_source=instagram&utm_medium=bio&utm_campaign=ir-2026
└──────────────── base ──────────────────────────┘│└─────────┬───────┘└──────┬─────┘└────────┬────────┘
                                                  │          1               2                3
                                                  └─ separador da primeira query (?)

Separador entre params: & (e comercial)
```

Regras:

- Primeira query param começa com `?`
- Parâmetros subsequentes separados por `&`
- Nunca espaço, nunca quebra de linha

## Exemplos práticos

### 1. Link da bio do Instagram (perene, sem campanha específica)

```
https://www.duohubcontabil.com.br/?utm_source=instagram&utm_medium=bio&utm_campaign=sempre
```

### 2. Story de IR com sticker de link

```
https://www.duohubcontabil.com.br/imposto-de-renda?utm_source=instagram&utm_medium=story&utm_campaign=ir-2026
```

Mesma origem da bio, meio diferente — permite descobrir se story converte mais que bio (ou vice-versa).

### 3. WhatsApp direto (mensagem pra contato ou grupo)

```
https://www.duohubcontabil.com.br/imposto-de-renda?utm_source=whatsapp&utm_medium=direct&utm_campaign=ir-2026
```

### 4. Google Meu Negócio

```
https://www.duohubcontabil.com.br/imposto-de-renda?utm_source=google&utm_medium=gmb&utm_campaign=organico
```

### 5. Campanha paga Meta Ads

```
https://www.duohubcontabil.com.br/imposto-de-renda?utm_source=meta&utm_medium=cpc&utm_campaign=ir-2026-retargeting
```

### 6. E-mail marketing

```
https://www.duohubcontabil.com.br/imposto-de-renda?utm_source=resend&utm_medium=email&utm_campaign=newsletter-abril
```

## Ferramentas para gerar URLs

**Não monte na mão** — é fácil errar um `&` ou esquecer um `=`. Use um gerador:

- **Google Campaign URL Builder** (oficial, gratuito, sem login): https://ga-dev-tools.google/campaign-url-builder/
- **UTM.io** (salva links e permite encurtar): https://utm.io/

Cole a URL base, preencha os 3 campos (`source`, `medium`, `campaign`) e copie o resultado.

## Como validar

1. Abra a URL com os UTMs em **aba anônima** (pra forçar nova sessão PostHog)
2. Navegue pelo site livremente (pode pular de `/` para `/imposto-de-renda`)
3. Submeta o formulário de IRPF
4. Abra o PostHog → **Persons** e procure pelo e-mail usado
5. Abra a pessoa, aba **Events**, localize o evento `irpf_contact_submitted` — as propriedades `$initial_utm_*` devem refletir a origem

Se os valores vierem vazios:

- A URL de entrada tinha os UTMs? (cole ela no navegador, sem editar)
- Era aba **anônima**? Em uma aba não-anônima, se já existisse cookie PostHog de sessão anterior (sem UTM), o first-touch seria "direct" e não Instagram.
- Abra DevTools → Network e filtre por `/ingest`. Os requests `/ingest/e/` (eventos) e `/ingest/static/` (SDK bundle) devem retornar 200. Se tiver algum `blocked` ou `failed`, é ad blocker ignorando o proxy — avise-nos.

## Checklist antes de publicar uma URL com UTM

- [ ] Gerado via ferramenta confiável (Google URL Builder ou UTM.io)
- [ ] Todos os valores em minúsculo e sem acento
- [ ] Valores seguem o dicionário desta documentação
- [ ] Testado em aba anônima — evento aparece no PostHog com propriedades `$initial_utm_*` populadas

## Ver também

- [`instrumentation-client.ts`](../instrumentation-client.ts) — inicialização do `posthog-js` no boot do cliente
- [`next.config.ts`](../next.config.ts) — rewrites do reverse proxy `/ingest` → `us.i.posthog.com`
- [`src/app/(marketing)/imposto-de-renda/components/irpf-modal/index.tsx`](../src/app/(marketing)/imposto-de-renda/components/irpf-modal/index.tsx) — chamada de `identify` + `capture` no submit
