#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}"
LOCK_FILE="$ROOT_DIR/workspace.lock.json"
SCHEMA_FILE="$ROOT_DIR/contracts/pilot-result.schema.json"
CHECKER="$ROOT_DIR/scripts/vdoc-pilot-result-check.mjs"
ALLOW_INCOMPLETE=0
RESULT_FILE=""

usage() {
  cat <<'USAGE'
Usage: scripts/vdoc-pilot-result-verify.sh [--allow-incomplete] RESULT.json

Validate a Vdoc v0.1 Pilot result against the shipped v2 schema. The default
closure gate requires hashed on-disk evidence, target-user participation,
pre-Pilot gate attestations, a currently verified workspace, and two distinct
payload-bound approval records. --allow-incomplete validates a work-in-progress
result and every referenced artifact without claiming product validation.
USAGE
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --allow-incomplete)
      ALLOW_INCOMPLETE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      fail "unknown argument: $1"
      ;;
    *)
      [[ -z "$RESULT_FILE" ]] || fail 'only one Pilot result file may be supplied'
      RESULT_FILE="$1"
      shift
      ;;
  esac
done

[[ -n "$RESULT_FILE" ]] || { usage >&2; exit 2; }
command -v node >/dev/null 2>&1 || fail 'required command not found: node'
[[ -f "$LOCK_FILE" && ! -L "$LOCK_FILE" ]] || fail "workspace lock must be a regular file: $LOCK_FILE"
[[ -f "$SCHEMA_FILE" && ! -L "$SCHEMA_FILE" ]] || fail "Pilot schema must be a regular file: $SCHEMA_FILE"
[[ -f "$CHECKER" && ! -L "$CHECKER" ]] || fail "Pilot checker must be a regular file: $CHECKER"
[[ -f "$RESULT_FILE" && ! -L "$RESULT_FILE" ]] || fail "Pilot result must be a regular file: $RESULT_FILE"

args=(
  --root "$ROOT_DIR"
  --lock "$LOCK_FILE"
  --schema "$SCHEMA_FILE"
)
if [[ "$ALLOW_INCOMPLETE" -eq 1 ]]; then
  args+=(--allow-incomplete)
fi
args+=("$RESULT_FILE")

exec node "$CHECKER" "${args[@]}"
