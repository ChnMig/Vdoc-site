#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
LIST=0
INCLUDE_LIVE=0

# A release gate must inspect the prepared dependency tree, not mutate it.
# pnpm 11 defaults verify-deps-before-run to "install", which can otherwise
# replace node_modules or reach the registry before executing a test script.
export CI=true
export pnpm_config_verify_deps_before_run=false

LABELS=()
WORKDIRS=()
COMMANDS=()

usage() {
  cat <<'USAGE'
Usage: scripts/vdoc-release-dry-run.sh [--list] [--include-live] [--help]

Run the local release closure gate without publishing, deploying, pushing images,
creating git refs, or requiring credentials.

Options:
  --list          Print the command plan in order without executing it.
  --include-live  Add the opt-in live backend E2E command. Requires existing
                  disposable PostgreSQL/RustFS resources and local env setup.
  -h, --help      Show this help.
USAGE
}

die_usage() {
  printf '%s\n\n' "$1" >&2
  usage >&2
  exit 2
}

add_command() {
  LABELS+=("$1")
  WORKDIRS+=("$2")
  COMMANDS+=("$3")
}

relative_dir() {
  local dir="$1"
  if [[ "$dir" == "$ROOT_DIR" ]]; then
    printf '.'
    return
  fi
  printf '%s' "${dir#"$ROOT_DIR"/}"
}

build_plan() {
  add_command '[workspace] Verify repository lock' "$ROOT_DIR" 'scripts/vdoc-workspace-verify.sh'
  add_command '[workspace] Test repository lock tooling' "$ROOT_DIR" 'scripts/test-workspace-lock.sh'
  add_command '[workspace] Verify bootstrap distribution' "$ROOT_DIR" 'scripts/vdoc-workspace-package.sh --check'
  add_command '[workspace] Test bootstrap distribution' "$ROOT_DIR" 'scripts/test-workspace-package.sh'
  add_command '[workspace] Test published-asset verifier' "$ROOT_DIR" 'scripts/test-workspace-release-assets-verify.sh'
  add_command '[workspace] Test Pilot result gate' "$ROOT_DIR" 'scripts/test-pilot-result-verify.sh'
  add_command '[workspace] Verify cross-repository contracts' "$ROOT_DIR" 'scripts/vdoc-workspace-contracts.sh'
  add_command '[workspace] Test release gate' "$ROOT_DIR" 'scripts/test-release-dry-run.sh'
  add_command '[workspace] Compose/bootstrap safety tests' "$ROOT_DIR" 'scripts/test-compose-provisioning.sh && scripts/test-local-bootstrap.sh'
  add_command '[workspace] Compose config validation' "$ROOT_DIR" 'docker compose --env-file .env.example config --quiet'

  add_command '[backend] Go format check' "$ROOT_DIR/Vdoc" 'files="$(git ls-files -z --cached --others --exclude-standard "*.go" | xargs -0 gofmt -l)"; test -z "$files" || { printf "Go files need gofmt:\n%s\n" "$files" >&2; exit 1; }'
  add_command '[backend] Go vet' "$ROOT_DIR/Vdoc" 'GOCACHE=/tmp/vdoc-go-cache go vet ./...'
  add_command '[backend] Layering and prototype audit' "$ROOT_DIR/Vdoc" 'GOCACHE=/tmp/vdoc-go-cache ./scripts/vdoc-prototype-audit.sh'
  add_command '[backend] Go tests' "$ROOT_DIR/Vdoc" 'GOCACHE=/tmp/vdoc-go-cache go test ./...'
  add_command '[backend] In-memory E2E smoke' "$ROOT_DIR/Vdoc" 'GOCACHE=/tmp/vdoc-go-cache ./scripts/vdoc-e2e.sh all'
  add_command '[backend] Build binary' "$ROOT_DIR/Vdoc" 'GOCACHE=/tmp/vdoc-go-cache go build -trimpath -o /tmp/vdoc-ci .'

  add_command '[admin] Format check' "$ROOT_DIR/Vdoc-admin" 'pnpm format:check'
  add_command '[admin] Typecheck' "$ROOT_DIR/Vdoc-admin" 'pnpm exec tsc -b --pretty false'
  add_command '[admin] Lint' "$ROOT_DIR/Vdoc-admin" 'pnpm lint'
  add_command '[admin] Test' "$ROOT_DIR/Vdoc-admin" 'pnpm test'
  add_command '[admin] Build' "$ROOT_DIR/Vdoc-admin" 'pnpm build'
  add_command '[admin] Entrypoint security test' "$ROOT_DIR/Vdoc-admin" 'pnpm test:entrypoint'
  add_command '[admin] Browser tests' "$ROOT_DIR/Vdoc-admin" 'pnpm test:browser'

  add_command '[site] Format check' "$ROOT_DIR/Vdoc-site" 'pnpm format:check'
  add_command '[site] Typecheck' "$ROOT_DIR/Vdoc-site" 'pnpm typecheck'
  add_command '[site] Lint' "$ROOT_DIR/Vdoc-site" 'pnpm lint'
  add_command '[site] Unit tests' "$ROOT_DIR/Vdoc-site" 'pnpm test:unit'
  add_command '[site] Content tests' "$ROOT_DIR/Vdoc-site" 'pnpm test:content'
  add_command '[site] Root build and budget' "$ROOT_DIR/Vdoc-site" 'pnpm build:root && pnpm check:budget'
  add_command '[site] Root browser tests' "$ROOT_DIR/Vdoc-site" 'PLAYWRIGHT_BASE_PATH=/ pnpm test:browser'
  add_command '[site] Root performance tests' "$ROOT_DIR/Vdoc-site" 'PLAYWRIGHT_BASE_PATH=/ pnpm test:performance'
  add_command '[site] Pages build and budget' "$ROOT_DIR/Vdoc-site" 'pnpm build:pages && pnpm check:budget'
  add_command '[site] Pages browser tests' "$ROOT_DIR/Vdoc-site" 'PLAYWRIGHT_BASE_PATH=/Vdoc-site/ pnpm test:browser'
  add_command '[site] Pages performance tests' "$ROOT_DIR/Vdoc-site" 'PLAYWRIGHT_BASE_PATH=/Vdoc-site/ pnpm test:performance'

  add_command '[mcp] Test' "$ROOT_DIR/Vdoc-mcp" 'npm test'
  add_command '[mcp] Package dry-run' "$ROOT_DIR/Vdoc-mcp" 'npm_config_cache=/tmp/vdoc-npm-cache npm pack --dry-run'

  add_command '[skill] Test' "$ROOT_DIR/Vdoc-skill" 'npm test'
  add_command '[skill] Package dry-run' "$ROOT_DIR/Vdoc-skill" 'npm_config_cache=/tmp/vdoc-npm-cache npm pack --dry-run'

  if [[ "$INCLUDE_LIVE" -eq 1 ]]; then
    add_command '[backend] Live E2E (opt-in)' "$ROOT_DIR/Vdoc" './scripts/vdoc-e2e.sh live-compose'
  fi
}

print_live_status() {
  if [[ "$INCLUDE_LIVE" -eq 1 ]]; then
    printf 'Live E2E: enabled (requires existing disposable PostgreSQL/RustFS resources)\n'
    return
  fi
  printf 'Live E2E: not covered by default (pass --include-live to use existing disposable PostgreSQL/RustFS resources)\n'
}

print_plan() {
  local index rel_dir
  printf 'Vdoc release dry-run plan\n'
  print_live_status
  for ((index = 0; index < ${#LABELS[@]}; index++)); do
    rel_dir="$(relative_dir "${WORKDIRS[$index]}")"
    printf '%d. %s\n' "$((index + 1))" "${LABELS[$index]}"
    printf '   cd %s\n' "$rel_dir"
    printf '   %s\n' "${COMMANDS[$index]}"
  done
}

run_plan() {
  local index total rel_dir status
  total="${#LABELS[@]}"
  printf 'Vdoc release dry-run\n'
  print_live_status
  for ((index = 0; index < total; index++)); do
    rel_dir="$(relative_dir "${WORKDIRS[$index]}")"
    printf '\n==> %d/%d %s\n' "$((index + 1))" "$total" "${LABELS[$index]}"
    printf '+ cd %s\n' "$rel_dir"
    printf '+ %s\n' "${COMMANDS[$index]}"
    if (cd "${WORKDIRS[$index]}" && bash -lc "${COMMANDS[$index]}"); then
      printf 'OK: %s\n' "${LABELS[$index]}"
      continue
    else
      status="$?"
    fi
    printf 'FAIL: %s failed with exit code %s\n' "${LABELS[$index]}" "$status" >&2
    exit "$status"
  done
  printf '\nRelease dry-run complete.\n'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)
      LIST=1
      shift
      ;;
    --include-live)
      INCLUDE_LIVE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      die_usage "unknown argument: $1"
      ;;
  esac
done

build_plan

if [[ "$LIST" -eq 1 ]]; then
  print_plan
  exit 0
fi

run_plan
