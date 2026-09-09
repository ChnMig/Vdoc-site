#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/scripts/vdoc-local-bootstrap.sh"

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

assert_contains() {
  local file="$1"
  local needle="$2"
  grep -Fq -- "$needle" "$file" || fail "expected $file to contain $needle"
}

assert_not_contains() {
  local file="$1"
  local needle="$2"
  if grep -Fq -- "$needle" "$file"; then
    fail "expected $file not to contain $needle"
  fi
}

value_for() {
  local key="$1"
  local file="$2"
  awk -F= -v key="$key" '$1 == key {print substr($0, length(key) + 2)}' "$file"
}

assert_secret_quality() {
  local key="$1"
  local file="$2"
  local value
  value="$(value_for "$key" "$file")"
  [[ ${#value} -ge 32 ]] || fail "$key length ${#value}, want >= 32"
  [[ "$value" != *replace-with* ]] || fail "$key still contains replace-with placeholder"
  [[ "$value" != *placeholder* ]] || fail "$key still contains placeholder"
}

assert_build_provenance() {
  local prefix="$1"
  local file="$2"
  local version commit build_time
  version="$(value_for "${prefix}_VERSION" "$file")"
  commit="$(value_for "${prefix}_GIT_COMMIT" "$file")"
  build_time="$(value_for "${prefix}_BUILD_TIME" "$file")"
  [[ -n "$version" && "$version" != dev ]] || fail "$file has invalid ${prefix}_VERSION: $version"
  [[ "$commit" =~ ^[0-9a-f]{40}(-dirty)?$ ]] || fail "$file has invalid ${prefix}_GIT_COMMIT: $commit"
  [[ -n "$build_time" && "$build_time" != unknown ]] || fail "$file has invalid ${prefix}_BUILD_TIME: $build_time"
}

assert_initial_admin_triplet_safe() {
  local file="$1"
  local email name password
  assert_contains "$file" "VDOC_INITIAL_ADMIN_EMAIL="
  assert_contains "$file" "VDOC_INITIAL_ADMIN_NAME="
  assert_contains "$file" "VDOC_INITIAL_ADMIN_PASSWORD="
  email="$(value_for VDOC_INITIAL_ADMIN_EMAIL "$file")"
  name="$(value_for VDOC_INITIAL_ADMIN_NAME "$file")"
  password="$(value_for VDOC_INITIAL_ADMIN_PASSWORD "$file")"
  if [[ -z "$email" && -z "$name" && -z "$password" ]]; then
    return
  fi
  [[ -n "$email" ]] || fail "$file has partial initial admin config: missing VDOC_INITIAL_ADMIN_EMAIL"
  [[ -n "$name" ]] || fail "$file has partial initial admin config: missing VDOC_INITIAL_ADMIN_NAME"
  [[ -n "$password" ]] || fail "$file has partial initial admin config: missing VDOC_INITIAL_ADMIN_PASSWORD"
  case "$password" in
    [[:space:]]*|*[[:space:]]) fail "$file has initial admin password with leading or trailing whitespace" ;;
  esac
  [[ ${#password} -ge 12 ]] || fail "$file has initial admin password length ${#password}, want >= 12"
}

assert_docs_use_quiet_compose_config() {
  local file line
  for file in \
    "$ROOT_DIR/COMPOSE_DEPLOY.md" \
    "$ROOT_DIR/Vdoc-site/docs/en/deployment.md" \
    "$ROOT_DIR/Vdoc-site/docs/deployment.md" \
    "$ROOT_DIR/Vdoc-site/docs/en/release-rollback.md" \
    "$ROOT_DIR/Vdoc-site/docs/release-rollback.md" \
    "$ROOT_DIR/Vdoc-site/docs/en/troubleshooting.md" \
    "$ROOT_DIR/Vdoc-site/docs/troubleshooting.md"; do
    assert_file_exists "$file"
    while IFS= read -r line; do
      case "$line" in
        *"docker compose --env-file .env config"*)
          [[ "$line" == *"--quiet"* ]] || fail "$file contains bare compose config guidance: $line"
          ;;
      esac
    done <"$file"
  done
}

run_test() {
  local name="$1"
  shift
  printf 'test: %s\n' "$name"
  "$@"
}

test_dry_run_does_not_write_file() {
  local tmp out
  tmp="$(mktemp -d)"
  out="$tmp/output.txt"
  "$SCRIPT" --output "$tmp/.env" --dry-run >"$out"
  assert_file_absent "$tmp/.env"
  assert_contains "$out" "Dry run"
  assert_not_contains "$out" "replace-with"
}

test_write_creates_placeholder_free_env() {
  local tmp env out
  tmp="$(mktemp -d)"
  env="$tmp/.env"
  out="$tmp/output.txt"
  "$SCRIPT" --output "$env" >"$out"
  assert_file_exists "$env"
  assert_contains "$out" "docker compose --env-file $env config --quiet"
  assert_contains "$env" "VDOC_BACKEND_PUBLIC_ORIGIN=http://127.0.0.1:8080"
  assert_contains "$env" "VDOC_PUBLISH_ADDRESS=127.0.0.1"
  assert_contains "$env" "VDOC_SERVER_CORS_ALLOWED_ORIGINS=http://127.0.0.1:8081,http://localhost:8081"
  assert_contains "$env" "VDOC_AUTH_ALLOW_REGISTRATION=true"
  assert_contains "$env" "VDOC_AUTH_RATE_LIMIT=2"
  assert_contains "$env" "VDOC_AUTH_RATE_BURST=5"
  assert_contains "$env" "VDOC_TEST_POSTGRES_DB=vdoc_e2e"
  assert_contains "$env" "VDOC_MCP_TOKEN_CIPHER_KEYRING={}"
  assert_build_provenance VDOC_BACKEND "$env"
  assert_build_provenance VDOC_ADMIN "$env"
  for key in VDOC_POSTGRES_PASSWORD VDOC_STORAGE_ACCESS_KEY VDOC_STORAGE_SECRET_KEY VDOC_JWT_KEY VDOC_MCP_TOKEN_CIPHER_KEY; do
    assert_secret_quality "$key" "$env"
    assert_not_contains "$out" "$(value_for "$key" "$env")"
  done
  assert_not_contains "$env" "replace-with"
  assert_not_contains "$env" "VDOC_RUSTFS_CORS_ALLOWED_ORIGINS=*"
  assert_not_contains "$env" "VDOC_RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS=*"
  assert_initial_admin_triplet_safe "$env"
}

test_env_example_initial_admin_defaults_are_safe() {
  assert_file_exists "$ROOT_DIR/.env.example"
  assert_contains "$ROOT_DIR/.env.example" "VDOC_PUBLISH_ADDRESS=127.0.0.1"
  assert_contains "$ROOT_DIR/.env.example" "VDOC_TEST_POSTGRES_DB=vdoc_e2e"
  assert_contains "$ROOT_DIR/.env.example" "VDOC_SERVER_CORS_ALLOWED_ORIGINS=http://127.0.0.1:8081,http://localhost:8081"
  assert_contains "$ROOT_DIR/.env.example" "VDOC_AUTH_ALLOW_REGISTRATION=false"
  assert_contains "$ROOT_DIR/.env.example" "VDOC_AUTH_RATE_LIMIT=2"
  assert_contains "$ROOT_DIR/.env.example" "VDOC_AUTH_RATE_BURST=5"
  assert_contains "$ROOT_DIR/.env.example" "VDOC_MCP_TOKEN_CIPHER_KEYRING={}"
  assert_build_provenance VDOC_BACKEND "$ROOT_DIR/.env.example"
  assert_build_provenance VDOC_ADMIN "$ROOT_DIR/.env.example"
  [[ "$(value_for VDOC_BACKEND_GIT_COMMIT "$ROOT_DIR/.env.example")" == \
     "$(jq -r '.repositories[] | select(.path == "Vdoc") | .commit' "$ROOT_DIR/workspace.lock.json")" ]] || \
    fail '.env.example backend provenance must match workspace.lock.json'
  [[ "$(value_for VDOC_ADMIN_GIT_COMMIT "$ROOT_DIR/.env.example")" == \
     "$(jq -r '.repositories[] | select(.path == "Vdoc-admin") | .commit' "$ROOT_DIR/workspace.lock.json")" ]] || \
    fail '.env.example Admin provenance must match workspace.lock.json'
  assert_not_contains "$ROOT_DIR/.env.example" "VDOC_RUSTFS_CORS_ALLOWED_ORIGINS=*"
  assert_not_contains "$ROOT_DIR/.env.example" "VDOC_RUSTFS_CONSOLE_CORS_ALLOWED_ORIGINS=*"
  assert_initial_admin_triplet_safe "$ROOT_DIR/.env.example"
}

test_compose_dependency_baseline_is_safe() {
  local compose="$ROOT_DIR/docker-compose.yml"
  assert_file_exists "$compose"
  assert_contains "$compose" "image: postgres:18@sha256:06cad38a5d9f5d24b4d83d86def30795d5e4b757fedbf5281172b576dedcd941"
  assert_contains "$compose" "postgres-data:/var/lib/postgresql"
  assert_not_contains "$compose" "postgres-data:/var/lib/postgresql/data"
  assert_contains "$compose" "image: rustfs/rustfs:1.0.0-beta.10@sha256:60f4f2f41ce95216f8cac676e69f9d90c0bfec458a3bc7fd7fb9b7c2452ac57a"
  assert_not_contains "$compose" "rustfs/rustfs:latest"
  assert_contains "$compose" 'VERSION: ${VDOC_BACKEND_VERSION:?set VDOC_BACKEND_VERSION}'
  assert_contains "$compose" 'GIT_COMMIT: ${VDOC_BACKEND_GIT_COMMIT:?set VDOC_BACKEND_GIT_COMMIT}'
  assert_contains "$compose" 'BUILD_TIME: ${VDOC_BACKEND_BUILD_TIME:?set VDOC_BACKEND_BUILD_TIME}'
  assert_contains "$compose" 'VERSION: ${VDOC_ADMIN_VERSION:?set VDOC_ADMIN_VERSION}'
  assert_contains "$ROOT_DIR/Vdoc/Dockerfile" 'golang:1.25.5-alpine@sha256:ac09a5f469f307e5da71e766b0bd59c9c49ea460a528cc3e6686513d64a6f1fb'
  assert_contains "$ROOT_DIR/Vdoc/Dockerfile" 'alpine:3.23@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40'
  assert_contains "$ROOT_DIR/Vdoc-admin/Dockerfile" 'node:22-alpine@sha256:c610fcdfb1d5b4740dd70c284ed3cb16bb857e0f7166196e36a5501df7a3aa32'
  assert_contains "$ROOT_DIR/Vdoc-admin/Dockerfile" 'caddy:2-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648'
}

test_existing_env_requires_force() {
  local tmp env before
  tmp="$(mktemp -d)"
  env="$tmp/.env"
  printf 'KEEP_ME=yes\n' >"$env"
  before="$(cat "$env")"
  if "$SCRIPT" --output "$env" >"$tmp/stdout.txt" 2>"$tmp/stderr.txt"; then
    fail "expected overwrite without --force to fail"
  fi
  [[ "$(cat "$env")" == "$before" ]] || fail "existing env changed without --force"
  assert_contains "$tmp/stderr.txt" "Refusing to overwrite"
}

test_force_overwrites_existing_env() {
  local tmp env
  tmp="$(mktemp -d)"
  env="$tmp/.env"
  printf 'KEEP_ME=yes\n' >"$env"
  "$SCRIPT" --output "$env" --force >"$tmp/stdout.txt"
  assert_file_exists "$env"
  assert_not_contains "$env" "KEEP_ME=yes"
  assert_secret_quality VDOC_JWT_KEY "$env"
}

run_test "dry-run does not write" test_dry_run_does_not_write_file
run_test "write creates placeholder-free env" test_write_creates_placeholder_free_env
run_test "env example initial admin defaults are safe" test_env_example_initial_admin_defaults_are_safe
run_test "compose dependency baseline is safe" test_compose_dependency_baseline_is_safe
run_test "existing env requires force" test_existing_env_requires_force
run_test "force overwrites existing env" test_force_overwrites_existing_env
run_test "docs use quiet compose config" assert_docs_use_quiet_compose_config
printf 'ok\n'
