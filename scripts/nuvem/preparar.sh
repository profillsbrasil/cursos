#!/usr/bin/env bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

RAIZ="${CLAUDE_PROJECT_DIR:?CLAUDE_PROJECT_DIR não definido}"
PORTA=54322
URL_DE_TESTE="postgresql://postgres:postgres@127.0.0.1:${PORTA}/postgres"

passo="início"
inicio_do_passo=$SECONDS

log() {
  printf 'preparar: %s\n' "$*" >&2
}

trap 'log "falhou no passo \"${passo}\""' ERR

comecar() {
  passo="$1"
  inicio_do_passo=$SECONDS
  log "${passo}..."
}

terminar() {
  log "${passo}: ok em $((SECONDS - inicio_do_passo)) s"
}

exportar() {
  if [ -z "${CLAUDE_ENV_FILE:-}" ]; then
    return 0
  fi
  touch "$CLAUDE_ENV_FILE"
  if ! grep -qxF -- "$1" "$CLAUDE_ENV_FILE"; then
    printf '%s\n' "$1" >>"$CLAUDE_ENV_FILE"
  fi
}

comecar "bun"
versao_do_bun=$(node -p 'require(process.argv[1]).packageManager.split("@")[1]' "$RAIZ/package.json")
if [ "$(bun --version 2>/dev/null || true)" != "$versao_do_bun" ]; then
  bin_global="$(npm prefix -g)/bin"
  if [ "$("${bin_global}/bun" --version 2>/dev/null || true)" != "$versao_do_bun" ]; then
    npm install -g --no-fund --no-audit "bun@${versao_do_bun}" >&2
  fi
  export PATH="${bin_global}:${PATH}"
  exportar "export PATH=\"${bin_global}:\$PATH\""
  hash -r
fi
versao_instalada=$(bun --version)
if [ "$versao_instalada" != "$versao_do_bun" ]; then
  log "bun ${versao_instalada} no PATH, o packageManager pede ${versao_do_bun}"
  false
fi
terminar

comecar "bun install"
(cd "$RAIZ" && bun install --frozen-lockfile >&2)
terminar

comecar "postgres"
versao_do_pg=$(find /usr/lib/postgresql -mindepth 1 -maxdepth 1 -printf '%f\n' | sort -V | tail -n 1)
if [ -z "$versao_do_pg" ]; then
  log "nenhum postgres em /usr/lib/postgresql"
  false
fi
if ! pg_lsclusters -h | awk -v v="$versao_do_pg" '$1 == v && $2 == "main" { achou = 1 } END { exit !achou }'; then
  pg_createcluster "$versao_do_pg" main >&2
fi
pg_conftool "$versao_do_pg" main set port "$PORTA"
if ! pg_isready -q -h 127.0.0.1 -p "$PORTA"; then
  if pg_lsclusters -h | awk -v v="$versao_do_pg" '$1 == v && $2 == "main" && $4 == "online" { achou = 1 } END { exit !achou }'; then
    pg_ctlcluster "$versao_do_pg" main restart
  else
    pg_ctlcluster "$versao_do_pg" main start
  fi
fi
for _ in $(seq 1 30); do
  if pg_isready -q -h 127.0.0.1 -p "$PORTA"; then
    break
  fi
  sleep 1
done
pg_isready -h 127.0.0.1 -p "$PORTA" >&2
runuser -u postgres -- psql -q -p "$PORTA" -c "ALTER USER postgres PASSWORD 'postgres'" >&2
terminar

comecar "migrações"
(cd "$RAIZ/packages/db" && bun run db:migrate:local >&2)
terminar

exportar "export TEST_DATABASE_URL=${URL_DE_TESTE}"
log "pronto: TEST_DATABASE_URL=${URL_DE_TESTE}"
