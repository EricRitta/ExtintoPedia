#!/usr/bin/env bash
# Restaura o banco a partir de db/backup/extintopedia.sql.gz (container extintopedia-db precisa estar no ar).
# Recria o database do zero. O grep remove opções de coluna "pg_attver" que o dump antigo trazia e o Postgres recusa.
set -euo pipefail
cd "$(dirname "$0")/.."
PSQL="docker exec -i extintopedia-db psql -q -U extinto"
$PSQL -d postgres -c "DROP DATABASE IF EXISTS extintopedia" -c "CREATE DATABASE extintopedia OWNER extinto"
gunzip -c db/backup/extintopedia.sql.gz | grep -v "SET (pg_attver=" | $PSQL -v ON_ERROR_STOP=1 -d extintopedia >/dev/null
$PSQL -d extintopedia -tAc "SELECT count(*) || ' espécies restauradas' FROM especie"
