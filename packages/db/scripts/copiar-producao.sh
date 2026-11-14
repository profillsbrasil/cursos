#!/usr/bin/env bash
# Copia o banco de produção para o banco `producao` do Postgres local.
# Só lê a produção (pg_dump) e só escreve no container local.
# Com um caminho, carrega esse dump (o mesmo formato: SQL em gzip e base64).
set -euo pipefail

CONTAINER=cursos-postgres
BANCO=producao
dump="${1:-}"

if ! docker inspect --format '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "O Postgres local não está no ar. Rode: bun run db:start" >&2
  exit 1
fi

if [ -z "$dump" ]; then
  dump="$(mktemp --suffix=.sql.gz.b64)"
  trap 'rm -f "$dump"' EXIT
  echo "Lendo a produção pelo railway ssh..."
  railway ssh --service Postgres --environment production \
    "pg_dump --no-owner --no-privileges | gzip | base64 -w0" >"$dump"
fi

# O pg_dump só escreve esta linha quando termina: sem ela, o dump falhou ou veio
# cortado, e o gzip de uma saída vazia ainda é um gzip válido.
if ! base64 -di "$dump" 2>/dev/null | gunzip 2>/dev/null |
  grep -q "PostgreSQL database dump complete"; then
  echo "O dump veio vazio ou cortado. O banco local '$BANCO' ficou como estava." >&2
  exit 1
fi

# Carrega num banco à parte e só troca no fim: a carga que falha no meio não
# deixa o '$BANCO' pela metade.
NOVO="${BANCO}_nova"
docker exec "$CONTAINER" psql -U postgres -q -v ON_ERROR_STOP=1 \
  -c "drop database if exists $NOVO with (force)" \
  -c "create database $NOVO" 2>/dev/null
if ! base64 -di "$dump" | gunzip |
  docker exec -i "$CONTAINER" psql -U postgres -d "$NOVO" -q -v ON_ERROR_STOP=1 >/dev/null; then
  docker exec "$CONTAINER" psql -U postgres -q -c "drop database if exists $NOVO with (force)"
  echo "A carga falhou. O banco local '$BANCO' ficou como estava." >&2
  exit 1
fi
docker exec "$CONTAINER" psql -U postgres -q -v ON_ERROR_STOP=1 \
  -c "drop database if exists $BANCO with (force)" \
  -c "alter database $NOVO rename to $BANCO" 2>/dev/null

tabelas="$(docker exec "$CONTAINER" psql -U postgres -d "$BANCO" -At \
  -c "select count(*) from information_schema.tables where table_schema = 'public'")"
echo "Banco local '$BANCO' pronto, com $tabelas tabelas."
echo "App contra ele: bun run --cwd apps/web dev:producao-local"
