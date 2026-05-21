# Roadmap do Produto

> Visão estratégica da evolução da DuoHub Gestão Contábil como produto digital.
> Cada fase é um ciclo independente (brainstorm → spec → plan → implementação).
> A ordem leva em conta **janela de tempo**, **dependências técnicas** e **valor operacional**.

## Fases

### F0 — Captura imediata: Página de Imposto de Renda


**Janela:** abril–maio 2026 (temporada de IR 2026 ativa).

Única fase com relógio correndo. Se entregue fora da janela, o ativo perde
a capacidade de capturar a demanda do ano corrente.

**Escopo:**

- Landing dedicada em `/imposto-de-renda`, integrada ao site institucional.
- Conteúdo educacional (IR PF e PJ, quem precisa declarar, prazos, documentos,
  erros comuns).
- CTA claro para contratar a DuoHub.
- Formulário de captura de leads (nome, e-mail, telefone, tipo de declaração).
- Metadata e SEO on-page orientados à intenção de busca.
- Reaproveitamento do banner IR 2026 já presente no site.

**Dependências:** nenhuma. Fase 100% pública e estática.

**Saída:** leads capturados e armazenados (no mínimo por e-mail ao time; idealmente
já em tabela `Lead` do banco, antecipando a fundação da F1).

---

### F1a — Fundação do Admin

**Pré-requisito para tudo que vem depois.** Sem cliente cadastrado, não há proposta,
não há faturamento, não há portal.

**Escopo:**

- **Autenticação admin** (Better Auth, e-mail/senha + magic link, sem registro público,
  convite interno).
- **Banco de dados** (Postgres/Neon + Prisma) provisionado e migrado.
- **Layout do admin** com sidebar, navegação e guard server-side.
- **CRUD de Clientes** — cadastro completo (razão social, CNPJ/CPF, regime tributário,
  contatos, segmento, status, notas internas), busca, filtros.
- **Schema modelado pensando no longo prazo** — tabela `Client` preparada para relação
  N:N com `User` na F4 (sem expor a junção ainda).

**Dependências:** nenhuma.

**Saída:** admin interno funcional com cadastro de clientes. Base para F1b, F2 e F4.

---

### F1b — Cofre de Certificados Digitais

**Por que separado de F1a:** certificado digital A1 (arquivo `.pfx` protegido por senha)
é o dado mais sensível que o escritório manipula — com ele é possível assinar
declarações, emitir NFe e acessar o e-CAC em nome do cliente. Exige infraestrutura
de criptografia dedicada (cofre de chaves + envelope encryption + storage) que não
faz sentido atrasar a F1a por causa disso.

**Escopo (Nível A — cofre digital, sem integração programática com a Receita):**

- **Provisionamento do cofre de chaves** (Infisical, free tier) com KEK da aplicação.
- **Provisionamento do storage** (**Cloudflare R2**, provedor primário oficial
  da aplicação) para arquivos criptografados. Ver `architecture.md`.
- **Upload de certificado pelo admin** — validação do `.pfx`, extração de metadata
  (CN, serial, validade), criptografia do arquivo e da senha via envelope encryption.
- **Download seguro** sob demanda por admins autorizados (para uso local pelo contador
  em ferramentas externas: e-CAC, emissores próprios, etc.).
- **Alerta de vencimento** — notificação automática quando um certificado se aproxima
  da data de expiração (certificados A1 duram 1 ano).
- **Revogação/substituição** — fluxo para trocar o certificado quando renovado.
- **Audit log obrigatório** — cada decriptografia e download é registrado com usuário,
  cliente, finalidade, IP e timestamp.

**Fora do escopo (vai para F5+):** uso programático do certificado pela aplicação
(emissão automática de NFe, transmissão de SPED/ECD/ECF, consulta a webservices da
Receita). Isso é um módulo fiscal completo e é avaliado no futuro.

**Dependências:** F1a (cadastro de Clientes).

**Saída:** DuoHub para de armazenar certificados em pastas compartilhadas/drives
pessoais e passa a ter um cofre auditado. Base para que o cliente também possa subir
seu próprio certificado via portal na F4.

---

### F2 — Produtividade operacional

**Problema de negócio resolvido:** propostas hoje são enviadas como PDF estático
via WhatsApp, com layout pouco profissional. Admin precisa de visibilidade sobre
faturamento.

**Escopo:**

- **Gerador de Propostas** — editor no admin que compõe a proposta a partir de
  dados do Cliente (F1), template reaproveitando o HTML existente.
- **Link público temporário** em `/propostas/[token]` — token de 32 bytes, `noindex`,
  expiração por **7 dias úteis** (fuso `America/Sao_Paulo`, snapshot no momento
  da criação), com possibilidade de renovação e cancelamento pelo admin.
- **Exportação PDF** (via `@react-pdf/renderer` ou impressão do browser).
- **Dashboard de Faturamento interno** — MRR, faturamento mensal, propostas
  enviadas/aceitas, receita por cliente/segmento.

**Dependências:** F1a (autenticação + CRUD de Clientes). F1b não é pré-requisito.

**Saída:** substitui o fluxo de propostas por WhatsApp e dá à gestão visibilidade
financeira do escritório.

---

### F3 — Aquisição orgânica: ferramentas gratuitas

**Por que agora:** com a casa interna em ordem, foca em trazer leads qualificados
via SEO. SEO leva 3–4 meses para render — por isso começa logo após F2.

**Escopo:**

- **Simulador de Regime Tributário** (Simples Nacional × Lucro Presumido × MEI) —
  alta intenção de compra.
- **Calculadora MEI vs. ME** — ponto de virada de faturamento.
- **Simulador de Pró-labore ideal** — ataca diretamente o nicho de prestadores
  de serviço já posicionado.

**Integração:** leads capturados nas ferramentas entram como `Lead` no sistema
(mesma tabela da F0) e podem ser promovidos a `Client` no CRUD da F1a.

**Dependências:** F1a (tabela `Lead`).

**Saída:** páginas indexáveis com intenção de busca alta e funil orgânico
alimentando o CRM interno.

---

### F4 — Portal do Cliente (`/app`)

**Por que depois:** só vale o investimento quando há clientes ativos suficientes
para justificar o esforço, e a fundação admin precisa estar madura.

**Escopo:**

- **Autenticação cliente** por convite (Better Auth, role `client`).
- **Dashboard do cliente** — próximas obrigações fiscais (DAS, DASN, DCTF),
  documentos recentes, resumo do mês.
- **Upload de documentos** (notas fiscais, extratos bancários) organizados por
  competência, com storage seguro.
- **Upload do próprio certificado digital pelo cliente** — reaproveita a infra
  do cofre construída em F1b, com audit log dedicado.
- **Timeline de comunicação** com o contador responsável (substitui WhatsApp
  desorganizado).
- **Relatórios** — DRE simplificada, evolução de faturamento, impostos do mês.

**Dependências:** F1a (auth + Client model), F1b (cofre de certificados), F2
(Cliente ativo).

**Storage:** reaproveita o **Cloudflare R2** consolidado na F1b como provedor
primário oficial da aplicação. Documentos gerais usam SSE + access control por
cliente + presigned URLs; sem envelope encryption (reservado só para
certificados). Ver `architecture.md#storage-cloudflare-r2-como-padrão-oficial`.

**Saída:** DuoHub deixa de ser "site institucional" e passa a ser "aplicação
com produto real de valor contínuo ao cliente".

---

### F5+ — Backlog

Ideias exploradas durante o brainstorm que foram descartadas por timing ou escopo
mas ficam anotadas para revisão futura:

- **Uso programático do certificado digital (Nível B)** — evolução natural do
  cofre construído em F1b. A aplicação passa a usar o certificado diretamente
  para:
  - Emitir NFe/NFSe automaticamente (integração com SEFAZ de cada estado).
  - Assinar XMLs de declarações (SPED, ECD, ECF).
  - Transmitir declarações diretamente à Receita.
  - Consultar situação fiscal e regularidade via webservices.

  Escopo de produto completo por si só: exige expertise fiscal por estado,
  contingência, geração de XML assinado, regras por tipo de nota, etc. Avaliar
  quando a operação da DuoHub justificar — provavelmente após F4.

- **Conteúdo & blog** — posts com foco em nichos (dev freelancer, consultor PJ,
  loja física virando e-commerce) + newsletter mensal.
- **Agendamento online** (Cal.com) quando volume de leads justificar.
- **Features de IA** sobre o portal do cliente — classificador automático de
  despesas (OCR em NF), assistente conversacional, alerta de economia tributária.
- **Verticalização por nicho** — landings dedicadas para DuoHub Tech,
  DuoHub Saúde, DuoHub Creators, DuoHub E-commerce.
- **Comunidade** (Discord/Circle/WhatsApp Community) para clientes.
- **Parcerias integradas** — bancos digitais, ferramentas de cobrança, ERPs.

---

## Encadeamento e paralelismo

```
F0 (IR)                        ──►  urgente, trilha pública, sem deps
                                           ↓
F1a (Admin + Clientes)         ──►  fundação
                       ↓                   ↓
F1b (Cofre de certificados)    F2 (Propostas + faturamento)
                       ↓                   ↓
                       └──────────┬────────┘
                                  ↓
F3 (Ferramentas)               ──►  consome Lead (F1a)
                                  ↓
F4 (Portal cliente)            ──►  consome F1a + F1b + F2
```

**Paralelismo possível:**

- **F1b pode andar em paralelo com F2** — F2 depende apenas de F1a (cliente
  cadastrado), não do cofre.
- **F3 (ferramentas) é bastante independente** e pode caminhar junto com F2 se
  houver capacidade de execução para duas frentes.

---

## Continuidade de dados

O schema modelado na F1a é o alicerce que evita retrabalho:

- **`Client`** — usado por Propostas (F2), Faturamento (F2), Leads promovidos (F3),
  Certificados (F1b), Portal (F4).
- **`Lead`** — usado por formulário IR (F0), Ferramentas (F3), pipeline de conversão.
- **`User`** — admin na F1a, ganha role `client` na F4 com relação N:N para `Client`.
- **`DigitalCertificate`** (F1b) — referencia `Client`, reutilizado no upload
  pelo cliente na F4.

Toda decisão de schema na F1a deve ser tomada pensando nas fases seguintes.

---

## Métricas de sucesso por fase

| Fase | Métrica principal                                    |
| ---- | ---------------------------------------------------- |
| F0   | Leads capturados durante a temporada de IR           |
| F1a  | Clientes migrados para o sistema                     |
| F1b  | % de certificados migrados para o cofre · zero incidentes de vazamento |
| F2   | % de propostas enviadas pelo sistema (vs. WhatsApp) · ticket aceito |
| F3   | Tráfego orgânico + leads convertidos por ferramenta  |
| F4   | Adoção por clientes ativos · NPS · tickets reduzidos |

---

## Status

> **Abril 2026** — roadmap aprovado. F0 em brainstorm detalhado.
