#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
LOCK_FILE="$ROOT_DIR/workspace.lock.json"
VERIFY_SCRIPT="$ROOT_DIR/scripts/vdoc-pilot-result-verify.sh"
REPLACE=0
RESULT_FILE=""
GATE=""

usage() {
  cat <<'USAGE'
Usage: scripts/vdoc-gate-attest.sh [--replace] RESULT.json GATE

Run one fixed Vdoc Pilot gate and attach a hashed attestation to RESULT.json.
GATE must be release_dry_run or live_persistence_e2e. The live gate reads the
root .env through Vdoc/scripts/vdoc-e2e.sh and must target disposable services.

The script records failed commands as failed attestations and exits with the
gate's non-zero status. It never turns a failed gate into a passing record.
USAGE
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    fail 'required SHA-256 command not found (shasum or sha256sum)'
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --replace)
      REPLACE=1
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
      if [[ -z "$RESULT_FILE" ]]; then
        RESULT_FILE="$1"
      elif [[ -z "$GATE" ]]; then
        GATE="$1"
      else
        fail 'too many arguments'
      fi
      shift
      ;;
  esac
done

[[ -n "$RESULT_FILE" && -n "$GATE" ]] || { usage >&2; exit 2; }
case "$GATE" in
  release_dry_run)
    COMMAND='scripts/vdoc-release-dry-run.sh'
    WORKING_DIRECTORY='.'
    ;;
  live_persistence_e2e)
    COMMAND='./scripts/vdoc-e2e.sh live-compose --env-file ../.env'
    WORKING_DIRECTORY='Vdoc'
    ;;
  *)
    fail "unsupported gate: $GATE"
    ;;
esac

command -v jq >/dev/null 2>&1 || fail 'required command not found: jq'
[[ -f "$RESULT_FILE" && ! -L "$RESULT_FILE" ]] || fail "Pilot result must be a regular file: $RESULT_FILE"
[[ -f "$LOCK_FILE" && ! -L "$LOCK_FILE" ]] || fail "workspace lock must be a regular file: $LOCK_FILE"
"$VERIFY_SCRIPT" --allow-incomplete "$RESULT_FILE" >/dev/null

if jq -e 'any(.sign_off[]; .decision != "pending")' "$RESULT_FILE" >/dev/null; then
  fail 'run and attach automated gates before signing the Pilot result'
fi

commits="$(jq -c '.repositories | map({key: .path, value: .commit}) | from_entries' "$LOCK_FILE")"
current_commits="$(jq -cS '.repository_commits' "$RESULT_FILE")"
empty_commits='{"Vdoc":"","Vdoc-admin":"","Vdoc-mcp":"","Vdoc-site":"","Vdoc-skill":""}'
if [[ "$current_commits" != "$(printf '%s' "$commits" | jq -cS .)" && "$current_commits" != "$(printf '%s' "$empty_commits" | jq -cS .)" ]]; then
  fail 'Pilot repository commits are neither empty nor equal to workspace.lock.json'
fi

result_dir="$(CDPATH= cd -- "$(dirname -- "$RESULT_FILE")" && pwd -P)"
result_file="$result_dir/$(basename -- "$RESULT_FILE")"
evidence_dir="$result_dir/evidence/gates"
mkdir -p "$evidence_dir"
log_relative="evidence/gates/$GATE.log"
attestation_relative="evidence/gates/$GATE.attestation.json"
log_file="$result_dir/$log_relative"
attestation_file="$result_dir/$attestation_relative"

if [[ "$REPLACE" -ne 1 && ( -e "$log_file" || -e "$attestation_file" ) ]]; then
  fail "gate evidence already exists; inspect it or pass --replace: $GATE"
fi
[[ ! -L "$log_file" && ! -L "$attestation_file" ]] || fail 'refusing to replace symlinked gate evidence'

started_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
set +e
if [[ "$GATE" == 'release_dry_run' ]]; then
  (cd "$ROOT_DIR" && scripts/vdoc-release-dry-run.sh) >"$log_file" 2>&1
  gate_status=$?
else
  (cd "$ROOT_DIR/Vdoc" && ./scripts/vdoc-e2e.sh live-compose --env-file ../.env) >"$log_file" 2>&1
  gate_status=$?
fi
set -e
printf '\nVDOC_GATE_ATTESTATION gate=%s exit_code=%s\n' "$GATE" "$gate_status" >>"$log_file"
ended_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"

pilot_started_at="$(jq -r '.environment.started_at // empty' "$result_file")"
if [[ -n "$pilot_started_at" ]] && [[ "$ended_at" > "$pilot_started_at" || "$ended_at" == "$pilot_started_at" ]]; then
  fail "gate finished at or after the recorded Pilot start; log retained at $log_relative"
fi

log_sha="$(sha256_file "$log_file")"
lock_sha="$(sha256_file "$LOCK_FILE")"
jq -n \
  --arg gate "$GATE" \
  --arg command "$COMMAND" \
  --arg working_directory "$WORKING_DIRECTORY" \
  --arg started_at "$started_at" \
  --arg ended_at "$ended_at" \
  --argjson exit_code "$gate_status" \
  --argjson repository_commits "$commits" \
  --arg workspace_lock_sha256 "$lock_sha" \
  --arg log_path "$log_relative" \
  --arg log_sha "$log_sha" \
  '{
    schema_version: 1,
    gate: $gate,
    command: $command,
    working_directory: $working_directory,
    started_at: $started_at,
    ended_at: $ended_at,
    exit_code: $exit_code,
    repository_commits: $repository_commits,
    workspace_lock_sha256: $workspace_lock_sha256,
    log: {path: $log_path, sha256: $log_sha}
  }' >"$attestation_file"
attestation_sha="$(sha256_file "$attestation_file")"

if [[ "$gate_status" -eq 0 ]]; then
  result_status='passed'
else
  result_status='failed'
fi

tmp_result="$(mktemp "$result_dir/.pilot-result.XXXXXX")"
cleanup() {
  [[ ! -e "$tmp_result" ]] || rm -f "$tmp_result"
}
trap cleanup EXIT
jq \
  --argjson commits "$commits" \
  --arg gate "$GATE" \
  --arg status "$result_status" \
  --arg path "$attestation_relative" \
  --arg sha256 "$attestation_sha" \
  '.repository_commits = $commits |
   .automated_gates[$gate] = {
     status: $status,
     attestation: {path: $path, sha256: $sha256}
   }' \
  "$result_file" >"$tmp_result"

"$VERIFY_SCRIPT" --allow-incomplete "$tmp_result" >/dev/null || \
  fail "generated gate evidence failed verification; original result unchanged"
mv "$tmp_result" "$result_file"
trap - EXIT

printf 'Gate attestation recorded: %s (%s, exit code %s)\n' "$GATE" "$result_status" "$gate_status"
printf '  result: %s\n' "$result_file"
printf '  attestation: %s\n' "$attestation_relative"
printf '  log: %s\n' "$log_relative"
exit "$gate_status"
