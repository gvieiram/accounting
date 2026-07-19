#!/bin/bash
# docs-index-check — impede que documentação nasça órfã.
#
# Um doc criado em docs/ que ninguém referencia apodrece sem ser notado. A regra
# aqui é alcançabilidade transitiva: o doc precisa ser alcançável seguindo links
# markdown a partir do CLAUDE.md, em qualquer profundidade. Doc linkado por outro
# doc já alcançável passa — docs/agents/templates/ticket.md chega via
# docs/agents/harness.md, e isso é legítimo.
#
# Isento: docs/specs/**, docs/adr/** — têm ciclo de vida próprio.
#
# Escrito para bash 3.2 (o /bin/bash do macOS): sem array associativo.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')
[ -n "$FILE_PATH" ] || exit 0

ROOT="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Caminho relativo à raiz do repo. Arquivo fora do repo não se aplica.
case "$FILE_PATH" in
  /*)
    REL="${FILE_PATH#"$ROOT"/}"
    [ "$REL" = "$FILE_PATH" ] && exit 0
    ;;
  *) REL="$FILE_PATH" ;;
esac

# Só docs/**/*.md.
case "$REL" in
  docs/*.md) ;;
  *) exit 0 ;;
esac

# Isenções (inclui docs/specs/_archive/** por herança).
case "$REL" in
  docs/specs/*|docs/adr/*) exit 0 ;;
esac

CLAUDE_MD="$ROOT/CLAUDE.md"
[ -f "$CLAUDE_MD" ] || exit 0

# docs/agents/../architecture.md -> docs/architecture.md
normalize() {
  echo "$1" | awk -F/ '{
    n = 0
    for (i = 1; i <= NF; i++) {
      p = $i
      if (p == "" || p == ".") continue
      if (p == "..") { if (n > 0) n--; continue }
      stack[++n] = p
    }
    out = ""
    for (i = 1; i <= n; i++) out = (i == 1 ? stack[i] : out "/" stack[i])
    print out
  }'
}

# Links markdown `](path)` e caminhos citados em crase.
raw_links() {
  {
    grep -oE '\]\([^)]+\)' "$1" 2>/dev/null | sed -E 's/^\]\(//; s/\)$//'
    grep -oE '`[^`]+\.md`' "$1" 2>/dev/null | tr -d '`'
  } | sed -E 's/#.*$//; s/^<//; s/>$//; s/[[:space:]].*$//'
}

# BFS a partir do CLAUDE.md. SEEN e QUEUE são listas separadas por newline.
SEEN="CLAUDE.md"
QUEUE="CLAUDE.md"

while [ -n "$QUEUE" ]; do
  current=$(printf '%s\n' "$QUEUE" | head -1)
  QUEUE=$(printf '%s\n' "$QUEUE" | tail -n +2)
  [ -f "$ROOT/$current" ] || continue
  dir=$(dirname "$current")

  while IFS= read -r link; do
    [ -n "$link" ] || continue
    case "$link" in
      http://*|https://*|mailto:*|\#*) continue ;;
      *.md) ;;
      *) continue ;;
    esac
    # Um link pode ser relativo ao arquivo ou (em crase) relativo à raiz do repo.
    for cand in "$(normalize "$dir/$link")" "$(normalize "$link")"; do
      [ -n "$cand" ] || continue
      printf '%s\n' "$SEEN" | grep -qxF "$cand" && continue
      [ -f "$ROOT/$cand" ] || continue
      SEEN="$SEEN
$cand"
      QUEUE="$QUEUE
$cand"
    done
  done < <(raw_links "$ROOT/$current")
done

printf '%s\n' "$SEEN" | grep -qxF "$REL" && exit 0

# Sugere um ponto de entrada concreto: um doc já alcançável na mesma pasta.
DIR_OF_REL=$(dirname "$REL")
SUGGEST=$(printf '%s\n' "$SEEN" | grep -v '^CLAUDE\.md$' | while IFS= read -r r; do
  [ "$(dirname "$r")" = "$DIR_OF_REL" ] && echo "$r"
done | head -1)

{
  echo "BLOCKED: docs-index-check — '$REL' está órfão."
  echo
  echo "O doc não é alcançável a partir do CLAUDE.md seguindo links markdown"
  echo "(em qualquer profundidade). Doc que ninguém referencia apodrece sem ser notado."
  echo
  # O exemplo precisa ser relativo ao arquivo onde o link será inserido —
  # `./basename` só vale para um doc irmão. A partir do CLAUDE.md (raiz) o
  # caminho é `./<REL>`. Antes o hook sugeria um link morto e ainda o aprovava,
  # porque o caminho em crase já contava como referência.
  echo "Adicione um link para ele em um destes lugares:"
  echo "  - CLAUDE.md (índice de topo)   →  [\`$REL\`](./$REL)"
  [ -n "$SUGGEST" ] && echo "  - $SUGGEST (já alcançável, na mesma pasta)   →  [\`$(basename "$REL")\`](./$(basename "$REL"))"
  echo
  echo "Isentos (não precisam de índice): docs/specs/**, docs/adr/**."
} >&2

exit 2
