# Triage Labels

As skills falam em cinco papéis canônicos de triage. Neste repo, três viraram labels do
Linear e dois foram absorvidos por statuses que o board já tinha — criar label duplicada
para eles só polui o workspace.

| Papel na skill | Aqui | Significado |
| --- | --- | --- |
| `needs-triage` | status **Backlog** | Ainda não avaliado |
| `needs-info` | label `needs-info` | Travado esperando decisão ou informação humana |
| `ready-for-agent` | label `ready-for-agent` | Spec fechada, pronto para um agente |
| `ready-for-human` | label `ready-for-human` | Especificado, mas exige mão humana |
| `wontfix` | status **Canceled** | Não será feito |

Quando uma skill mencionar um papel ("aplique a label de pronto-para-agente"), traduza
pela tabela: se a linha aponta para um **status**, mude o status; se aponta para uma
**label**, aplique a label.

## Quem aplica — e quem NÃO aplica

> **`/to-tickets` e `/to-spec` NÃO devem aplicar `ready-for-agent` neste repo.**
>
> As duas skills carimbam essa label por padrão ("apply the `ready-for-agent` triage label
> unless instructed otherwise"). Esta é a instrução em contrário: **crie os tickets sem
> label de prontidão**. Quem promove para `ready-for-agent` é o Gustavo, depois de revisar.
>
> Sem isso, todo ticket nasce carimbado e o portão vira no-op — nenhum agente jamais para
> para perguntar, que é exatamente o que ele existe para provocar.

## O portão `ready-for-agent`

Esta é a label que mais importa, e existe por um motivo específico: separar "o ticket
existe" de "o ticket está implementável".

**Nenhum agente começa a implementar um ticket sem `ready-for-agent`.** Se você é um
agente e pegou um ticket sem essa label, pare e diga o que falta — não preencha as
lacunas por conta própria. Preencher lacuna sozinho é exatamente como uma spec vaga vira
entrega errada.

Um ticket só recebe `ready-for-agent` quando:

- O comportamento esperado está descrito de forma verificável (dá pra escrever um teste
  que falha antes e passa depois)
- As decisões de produto já estão tomadas — não sobrou "ver depois" no corpo
- O critério de pronto está explícito
- As dependências (`blocking edges`) para outros tickets estão declaradas

Se qualquer um desses falhar, o ticket é `needs-info`, não `ready-for-agent`.

## `ready-for-human`

Use quando a spec está fechada mas a execução não é para agente: julgamento visual fino,
acesso a serviço externo que o agente não tem, ou decisão que precisa de contexto de
negócio ao vivo.
