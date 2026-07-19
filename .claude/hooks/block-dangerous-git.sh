#!/bin/bash

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

# `git push` saiu daqui de propósito: bloquear por string dava falsa sensação de
# segurança (gh pr create empurra sem casar o padrão). Virou regra explícita —
# não dar push sem perguntar. O que sobra aqui é destrutivo e irreversível.
#
# Padrões são regex, não literais: casar string exata deixava passar variantes
# equivalentes (`git clean -xfd`, `-df`, `--force`, `git checkout -- .`).
DANGEROUS_PATTERNS=(
  # reset --hard, em qualquer ordem de flags
  "git +reset +.*--hard"
  "reset +--hard"
  # clean com -f em qualquer combinação de flags curtas (-f, -fd, -xfd, -df...)
  "git +clean +.*-[a-zA-Z]*f"
  "git +clean +.*--force"
  # branch -D / --delete --force
  "git +branch +.*-D"
  "git +branch +.*--delete +.*--force"
  # descartar working tree inteiro, com ou sem `--`
  "git +checkout +(-- +)?\."
  "git +restore +(-- +)?\."
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. The user has prevented you from doing this." >&2
    exit 2
  fi
done

exit 0
