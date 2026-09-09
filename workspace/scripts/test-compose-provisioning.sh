#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
INIT_SCRIPT="$ROOT_DIR/scripts/postgres-init-e2e-db.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_file_exists() {
  [[ -f "$1" ]] || fail "expected file to exist: $1"
}

assert_file_absent() {
  [[ ! -e "$1" ]] || fail "expected path to be absent: $1"
}

assert_executable() {
  [[ -x "$1" ]] || fail "expected file to be executable: $1"
}

assert_contains() {
  local file="$1"
  local needle="$2"
  grep -Fq -- "$needle" "$file" || fail "expected $file to contain $needle"
}

assert_contains_ci() {
  local file="$1"
  local needle="$2"
  grep -Fiq -- "$needle" "$file" || fail "expected $file to contain $needle"
}

assert_not_contains() {
  local file="$1"
  local needle="$2"
  if grep -Fq -- "$needle" "$file"; then
    fail "expected $file not to contain $needle"
  fi
}

run_test() {
  local name="$1"
  shift
  printf 'test: %s\n' "$name"
  "$@"
}

write_service_block() {
  local service="$1"
  local out="$2"
  awk -v service="$service" '
    $0 ~ "^  " service ":" {in_block = 1; print; next}
    in_block && $0 ~ "^  [[:alnum:]_-]+:" {exit}
    in_block {print}
  ' "$COMPOSE_FILE" >"$out"
  [[ -s "$out" ]] || fail "expected docker-compose.yml service block: $service"
}

write_fake_psql() {
  local path="$1"
  cat >"$path" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
{
  printf 'args:'
  for arg in "$@"; do
    printf ' <%s>' "$arg"
  done
  printf '\nstdin:\n'
  cat
} >>"$PSQL_LOG"
EOF
  chmod +x "$path"
}

write_forbidden_psql() {
  local path="$1"
  cat >"$path" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
: >"$PSQL_CALLED"
printf 'psql should not be called when test and app DB names match\n' >&2
exit 42
EOF
  chmod +x "$path"
}

test_postgres_service_exposes_test_db_env() {
  local tmp block
  assert_file_exists "$COMPOSE_FILE"
  tmp="$(mktemp -d)"
  block="$tmp/postgres-service.yml"

  write_service_block postgres "$block"
  assert_contains "$block" 'VDOC_TEST_POSTGRES_DB: ${VDOC_TEST_POSTGRES_DB:-vdoc_e2e}'
}

test_postgres_service_mounts_init_script() {
  local tmp block
  tmp="$(mktemp -d)"
  block="$tmp/postgres-service.yml"

  write_service_block postgres "$block"
  assert_contains "$block" 'scripts/postgres-init-e2e-db.sh'
  assert_contains "$block" '/docker-entrypoint-initdb.d/'
}

test_backend_disables_supervisor_pid_file() {
  local tmp block
  tmp="$(mktemp -d)"
  block="$tmp/backend-service.yml"

  write_service_block backend "$block"
  assert_contains "$block" 'VDOC_SERVER_PID_FILE: ""'
  assert_contains "$ROOT_DIR/Vdoc/Dockerfile" 'VDOC_SERVER_PID_FILE=""'
}

test_init_script_refuses_app_database_name() {
  local tmp bin out err
  assert_file_exists "$INIT_SCRIPT"
  assert_executable "$INIT_SCRIPT"
  tmp="$(mktemp -d)"
  bin="$tmp/bin"
  out="$tmp/stdout.txt"
  err="$tmp/stderr.txt"
  mkdir -p "$bin"
  write_forbidden_psql "$bin/psql"

  if PATH="$bin:$PATH" PSQL_CALLED="$tmp/psql-called" POSTGRES_DB=vdoc VDOC_TEST_POSTGRES_DB=vdoc "$INIT_SCRIPT" >"$out" 2>"$err"; then
    fail 'expected init script to refuse matching POSTGRES_DB and VDOC_TEST_POSTGRES_DB'
  fi
  assert_file_absent "$tmp/psql-called"
}

test_init_script_creates_disposable_database() {
  local tmp bin log out err
  assert_file_exists "$INIT_SCRIPT"
  assert_executable "$INIT_SCRIPT"
  tmp="$(mktemp -d)"
  bin="$tmp/bin"
  log="$tmp/psql.log"
  out="$tmp/stdout.txt"
  err="$tmp/stderr.txt"
  mkdir -p "$bin"
  write_fake_psql "$bin/psql"

  PATH="$bin:$PATH" \
    PSQL_LOG="$log" \
    POSTGRES_DB=vdoc \
    POSTGRES_USER=vdoc \
    POSTGRES_PASSWORD=unit-test-password \
    VDOC_TEST_POSTGRES_DB=vdoc_e2e \
    "$INIT_SCRIPT" >"$out" 2>"$err"

  assert_file_exists "$log"
  assert_contains "$log" 'vdoc_e2e'
  assert_contains_ci "$log" 'create database'
  assert_not_contains "$log" 'unit-test-password'
  assert_not_contains "$out" 'unit-test-password'
  assert_not_contains "$err" 'unit-test-password'
}

run_test 'postgres service exposes disposable test DB env' test_postgres_service_exposes_test_db_env
run_test 'postgres service mounts init script' test_postgres_service_mounts_init_script
run_test 'backend disables supervisor-managed PID file' test_backend_disables_supervisor_pid_file
run_test 'init script refuses app database name' test_init_script_refuses_app_database_name
run_test 'init script creates disposable database' test_init_script_creates_disposable_database
printf 'ok\n'
