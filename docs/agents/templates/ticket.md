# Template de ticket

Formato do corpo de um ticket `DUO-xx` no Linear. Uma fatia vertical por ticket.

```markdown
# DUO-81 · Criar rascunho de proposta e vê-lo na lista

O contador escolhe um template, cria um rascunho e ele aparece na listagem
com status "Rascunho".

## Aceite
- [ ] **Given** nenhuma proposta cadastrada, **When** abro /admin/proposals,
      **Then** vejo o estado vazio com a ação "Criar primeira proposta"
- [ ] **Given** um template selecionado, **When** submeto o formulário,
      **Then** existe uma Proposal com status DRAFT vinculada ao cliente
      e ela aparece na listagem sem refresh manual
- [ ] **Given** o servidor recusa a criação, **When** submeto,
      **Then** vejo um toast de erro e o formulário mantém o que preenchi

## Arquivos
src/features/proposals/{actions,queries,schemas}.ts
src/features/proposals/components/proposals-table.tsx
src/app/admin/proposals/page.tsx

## Test
schema (unit) · action (unit) · formulário (componente) · smoke manual

## Reference
src/features/clients/actions.ts

## Constraints
- action via `defineAction` _(exemplo — só use como constraint depois do DUO-61)_
- UI de domínio vive na feature, não na rota
- os quatro estados fazem parte do aceite

## Depende de
- DUO-80

## Contexto
docs/specs/propostas/spec.md
```

## Os campos

| Campo | Regra |
| --- | --- |
| **Título** | uma capacidade, em linguagem de produto. Precisou de "e"? são dois tickets |
| **Aceite** | **binário**, em Given/When/Then. É daqui que sai o teste que falha primeiro |
| **Arquivos** | caminhos, **sem lógica de negócio** |
| **Test** | a camada de cada parte. O viés é marcar tudo unit — se toca banco ou rede, está errado |
| **Reference** | arquivo canônico a imitar (padrão, estrutura, nomes, jeito de testar) |
| **Constraints** | regras de ADR/arquitetura que valem **nesta** fatia |
| **Depende de** | vira blocking edge no Linear |
| **Contexto** | caminho do `spec.md` da feature |

## Regras

**Nada de "como implementar".** Sem assinatura de função, sem passo a passo, sem desenho de
solução. O aceite descreve comportamento observável; a implementação se decide na hora, com
o código na frente.

**`Reference` é o jeito mais barato de manter consistência.** Em vez de descrever o padrão
em prosa, aponta o arquivo que já o segue.

**O aceite vira teste antes de virar código.** O `/implement` escreve o teste que falha a
partir do `Given/When/Then` **antes** de planejar a solução. Esboçar a solução primeiro
inverte o TDD e produz teste moldado para a solução imaginada.

**Os quatro estados entram no aceite** quando a fatia tem tela — carregando, vazio (dois
tipos), erro (dois tipos), sem permissão. Ver [`../../design/README.md`](../../design/README.md).
