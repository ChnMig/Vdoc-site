#!/usr/bin/env bash
set -euo pipefail

app_db="${POSTGRES_DB:-${POSTGRES_USER:-postgres}}"
postgres_user="${POSTGRES_USER:-postgres}"
test_db="${VDOC_TEST_POSTGRES_DB:-vdoc_e2e}"

if [[ -z "$test_db" ]]; then
  printf 'VDOC_TEST_POSTGRES_DB must not be empty\n' >&2
  exit 1
fi

if [[ "$test_db" == "$app_db" ]]; then
  printf 'VDOC_TEST_POSTGRES_DB must differ from POSTGRES_DB\n' >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 --username "$postgres_user" --dbname "$app_db" --set=test_db="$test_db" <<'SQL'
SELECT format('CREATE DATABASE %I', :'test_db')
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'test_db')
\gexec
SQL
