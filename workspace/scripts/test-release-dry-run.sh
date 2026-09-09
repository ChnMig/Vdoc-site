#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT_DIR/scripts/vdoc-release-dry-run.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_file_exists() {
  [[ -f "$1" ]] || fail "expected file to exist: $1"
}

assert_executable() {
  [[ -x "$1" ]] || fail "expected file to be executable: $1"
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

line_number_for() {
  local file="$1"
  local needle="$2"
  awk -v needle="$needle" 'index($0, needle) {print NR; exit}' "$file"
}

assert_line_before() {
  local file="$1"
  local first="$2"
  local second="$3"
  local first_line second_line
  first_line="$(line_number_for "$file" "$first")"
  second_line="$(line_number_for "$file" "$second")"
  [[ -n "$first_line" ]] || fail "missing line containing $first"
  [[ -n "$second_line" ]] || fail "missing line containing $second"
  [[ "$first_line" -lt "$second_line" ]] || fail "expected $first before $second"
}

assert_no_forbidden_commands() {
  local file="$1"
  local forbidden
  for forbidden in 'npm publish' 'docker push' 'docker compose up' 'docker up' 'git push' 'git tag'; do
    assert_not_contains "$file" "$forbidden"
  done
}

test_list_covers_release_surfaces_without_live() {
  local tmp out
  assert_file_exists "$SCRIPT"
  assert_executable "$SCRIPT"
  tmp="$(mktemp -d)"
  out="$tmp/list.txt"
  "$SCRIPT" --list >"$out"

  assert_contains "$out" 'Live E2E: not covered by default'
  assert_not_contains "$out" 'live-compose'
  assert_contains "$out" '[workspace] Verify repository lock'
  assert_contains "$out" 'scripts/vdoc-workspace-verify.sh'
  assert_contains "$out" '[workspace] Test repository lock tooling'
  assert_contains "$out" '[workspace] Verify bootstrap distribution'
  assert_contains "$out" 'scripts/vdoc-workspace-package.sh --check'
  assert_contains "$out" '[workspace] Test bootstrap distribution'
  assert_contains "$out" 'scripts/test-workspace-package.sh'
  assert_contains "$out" '[workspace] Test published-asset verifier'
  assert_contains "$out" 'scripts/test-workspace-release-assets-verify.sh'
  assert_contains "$out" '[workspace] Test Pilot result gate'
  assert_contains "$out" 'scripts/test-pilot-result-verify.sh'
  assert_contains "$out" '[workspace] Verify cross-repository contracts'
  assert_contains "$out" 'scripts/vdoc-workspace-contracts.sh'
  assert_contains "$out" '[workspace] Test release gate'
  assert_contains "$out" 'scripts/test-compose-provisioning.sh && scripts/test-local-bootstrap.sh'
  assert_contains "$out" '[workspace] Compose config validation'
  assert_contains "$out" 'docker compose --env-file .env.example config --quiet'
  assert_contains "$out" '[backend] Go format check'
  assert_contains "$out" 'git ls-files -z --cached --others --exclude-standard "*.go"'
  assert_contains "$out" '[backend] Go vet'
  assert_contains "$out" '[backend] Layering and prototype audit'
  assert_contains "$out" '[backend] Go tests'
  assert_contains "$out" '[backend] In-memory E2E smoke'
  assert_contains "$out" '[backend] Build binary'
  assert_contains "$out" '[admin] Typecheck'
  assert_contains "$out" '[admin] Browser tests'
  assert_contains "$out" '[site] Root build and budget'
  assert_contains "$out" '[site] Root browser tests'
  assert_contains "$out" '[site] Root performance tests'
  assert_contains "$out" '[site] Pages build and budget'
  assert_contains "$out" '[site] Pages browser tests'
  assert_contains "$out" '[site] Pages performance tests'
  assert_contains "$out" '[mcp] Package dry-run'
  assert_contains "$out" 'npm_config_cache=/tmp/vdoc-npm-cache npm pack --dry-run'
  assert_contains "$out" '[skill] Package dry-run'
  assert_no_forbidden_commands "$out"
}

test_list_preserves_fail_fast_order() {
  local tmp out
  tmp="$(mktemp -d)"
  out="$tmp/list.txt"
  "$SCRIPT" --list >"$out"

  assert_line_before "$out" '[workspace] Verify repository lock' '[backend] Go format check'
  assert_line_before "$out" '[workspace] Test repository lock tooling' '[workspace] Verify bootstrap distribution'
  assert_line_before "$out" '[workspace] Verify bootstrap distribution' '[workspace] Test bootstrap distribution'
  assert_line_before "$out" '[workspace] Test bootstrap distribution' '[workspace] Test published-asset verifier'
  assert_line_before "$out" '[workspace] Test published-asset verifier' '[workspace] Test Pilot result gate'
  assert_line_before "$out" '[workspace] Test Pilot result gate' '[workspace] Verify cross-repository contracts'
  assert_line_before "$out" '[backend] Go format check' '[backend] Go vet'
  assert_line_before "$out" '[backend] Go vet' '[backend] Layering and prototype audit'
  assert_line_before "$out" '[backend] Layering and prototype audit' '[backend] Go tests'
  assert_line_before "$out" '[backend] Go tests' '[backend] In-memory E2E smoke'
  assert_line_before "$out" '[admin] Typecheck' '[admin] Lint'
  assert_line_before "$out" '[admin] Test' '[admin] Build'
  assert_line_before "$out" '[site] Content tests' '[site] Root build and budget'
  assert_line_before "$out" '[site] Root performance tests' '[site] Pages build and budget'
  assert_line_before "$out" '[site] Pages performance tests' '[mcp] Test'
  assert_line_before "$out" '[mcp] Package dry-run' '[skill] Test'
}

test_include_live_adds_only_opt_in_live_command() {
  local tmp default live
  tmp="$(mktemp -d)"
  default="$tmp/default.txt"
  live="$tmp/live.txt"
  "$SCRIPT" --list >"$default"
  "$SCRIPT" --list --include-live >"$live"

  assert_contains "$live" 'Live E2E: enabled (requires existing disposable PostgreSQL/RustFS resources)'
  assert_contains "$live" '[backend] Live E2E (opt-in)'
  assert_contains "$live" './scripts/vdoc-e2e.sh live-compose'
  assert_line_before "$live" '[skill] Package dry-run' '[backend] Live E2E (opt-in)'
  [[ "$(grep -c 'live-compose' "$live")" -eq 1 ]] || fail 'expected one live-compose command in opt-in plan'
  [[ "$(( $(wc -l <"$live") - $(wc -l <"$default") ))" -eq 3 ]] || fail 'opt-in plan should add exactly one three-line command entry'
  assert_no_forbidden_commands "$live"
}

test_unknown_flag_fails_with_usage() {
  local tmp out err
  tmp="$(mktemp -d)"
  out="$tmp/stdout.txt"
  err="$tmp/stderr.txt"
  if "$SCRIPT" --unknown >"$out" 2>"$err"; then
    fail 'expected unknown flag to fail'
  fi
  assert_contains "$err" 'unknown argument: --unknown'
  assert_contains "$err" 'Usage: scripts/vdoc-release-dry-run.sh'
}

test_help_lists_flags() {
  local tmp out
  tmp="$(mktemp -d)"
  out="$tmp/help.txt"
  "$SCRIPT" --help >"$out"
  assert_contains "$out" 'Usage: scripts/vdoc-release-dry-run.sh [--list] [--include-live] [--help]'
  assert_contains "$out" '--list'
  assert_contains "$out" '--include-live'
}

test_execution_uses_non_mutating_ci_environment() {
  assert_contains "$SCRIPT" 'export CI=true'
  assert_contains "$SCRIPT" 'export pnpm_config_verify_deps_before_run=false'
}

test_execution_stops_on_first_failed_gate() {
  local tmp out err status
  tmp="$(mktemp -d)"
  out="$tmp/stdout.txt"
  err="$tmp/stderr.txt"

  set +e
  VDOC_WORKSPACE_LOCK_FILE="$tmp/missing-lock.json" "$SCRIPT" >"$out" 2>"$err"
  status="$?"
  set -e

  [[ "$status" -eq 1 ]] || fail "expected verifier failure exit code 1, got $status"
  assert_contains "$err" 'FAIL: [workspace] Verify repository lock failed with exit code 1'
  assert_not_contains "$out" '[workspace] Test repository lock tooling'
  assert_not_contains "$out" '[backend] Go format check'
}

printf 'test: list covers release surfaces without live\n'
test_list_covers_release_surfaces_without_live
printf 'test: list preserves fail-fast order\n'
test_list_preserves_fail_fast_order
printf 'test: include-live adds only opt-in live command\n'
test_include_live_adds_only_opt_in_live_command
printf 'test: unknown flag fails with usage\n'
test_unknown_flag_fails_with_usage
printf 'test: help lists flags\n'
test_help_lists_flags
printf 'test: execution uses a non-mutating CI environment\n'
test_execution_uses_non_mutating_ci_environment
printf 'test: execution stops on first failed gate\n'
test_execution_stops_on_first_failed_gate
printf 'ok\n'
