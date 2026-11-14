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

if ! base64 -di "$dump" | gunzip -t 2>/dev/null; then
  echo "O dump veio vazio ou cortado. O banco local '$BANCO' ficou como estava." >&2
  exit 1
fi

docker exec "$CONTAINER" psql -U postgres -q -v ON_ERROR_STOP=1 \
  -c "drop database if exists $BANCO with (force)" \
  -c "create database $BANCO"
base64 -di "$dump" | gunzip |
  docker exec -i "$CONTAINER" psql -U postgres -d "$BANCO" -q -v ON_ERROR_STOP=1 >/dev/null

tabelas="$(docker exec "$CONTAINER" psql -U postgres -d "$BANCO" -At \
  -c "select count(*) from information_schema.tables where table_schema = 'public'")"
echo "Banco local '$BANCO' pronto, com $tabelas tabelas."
echo "App contra ele: bun run --cwd apps/web dev:producao-local"
