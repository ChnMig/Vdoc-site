#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
CHECKER="$ROOT_DIR/scripts/vdoc-pilot-result-check.mjs"
VERIFY_SCRIPT="$ROOT_DIR/scripts/vdoc-pilot-result-verify.sh"
REPLACE=0
RESULT_FILE=""
ROLE=""
NAME=""

usage() {
  cat <<'USAGE'
Usage: scripts/vdoc-pilot-sign.sh [--replace] RESULT.json ROLE NAME

Create a payload-bound approval record and attach it to a Pilot result. ROLE is
pilot_operator or product_owner. NAME must identify the human reviewer and must
be quoted when it contains spaces. This records review provenance; it is not a
cryptographic identity proof, so the release owner must authenticate signers.
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
      elif [[ -z "$ROLE" ]]; then
        ROLE="$1"
      elif [[ -z "$NAME" ]]; then
        NAME="$1"
      else
        fail 'too many arguments'
      fi
      shift
      ;;
  esac
done

[[ -n "$RESULT_FILE" && -n "$ROLE" && -n "$NAME" ]] || { usage >&2; exit 2; }
[[ "$ROLE" == 'pilot_operator' || "$ROLE" == 'product_owner' ]] || fail "unsupported sign-off role: $ROLE"
[[ "$NAME" == "${NAME#"${NAME%%[![:space:]]*}"}" && "$NAME" == "${NAME%"${NAME##*[![:space:]]}"}" ]] || \
  fail 'signer name must not have leading or trailing whitespace'
[[ -f "$RESULT_FILE" && ! -L "$RESULT_FILE" ]] || fail "Pilot result must be a regular file: $RESULT_FILE"
command -v jq >/dev/null 2>&1 || fail 'required command not found: jq'
command -v node >/dev/null 2>&1 || fail 'required command not found: node'
"$VERIFY_SCRIPT" --allow-incomplete "$RESULT_FILE" >/dev/null

if [[ "$(jq -r --arg role "$ROLE" '.sign_off[$role].decision' "$RESULT_FILE")" != 'pending' && "$REPLACE" -ne 1 ]]; then
  fail "$ROLE already has a sign-off; inspect it or pass --replace"
fi

other_role='pilot_operator'
[[ "$ROLE" == 'pilot_operator' ]] && other_role='product_owner'
other_name="$(jq -r --arg role "$other_role" '.sign_off[$role].name' "$RESULT_FILE")"
if [[ -n "$other_name" && "$NAME" == "$other_name" ]]; then
  fail 'Pilot operator and Product Owner must be different people'
fi

pilot_ended_at="$(jq -r '.environment.ended_at // empty' "$RESULT_FILE")"
[[ -n "$pilot_ended_at" ]] || fail 'record the Pilot end time before signing'
signed_at="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
[[ "$signed_at" > "$pilot_ended_at" ]] || fail 'the signer clock must be after the recorded Pilot end time'

payload_sha="$(node "$CHECKER" --payload-sha "$RESULT_FILE")"
[[ "$payload_sha" =~ ^[0-9a-f]{64}$ ]] || fail 'could not calculate Pilot payload SHA-256'

result_dir="$(CDPATH= cd -- "$(dirname -- "$RESULT_FILE")" && pwd -P)"
result_file="$result_dir/$(basename -- "$RESULT_FILE")"
evidence_dir="$result_dir/evidence/sign-off"
mkdir -p "$evidence_dir"
approval_relative="evidence/sign-off/$ROLE.approval.json"
approval_file="$result_dir/$approval_relative"
if [[ -e "$approval_file" && "$REPLACE" -ne 1 ]]; then
  fail "approval record already exists; inspect it or pass --replace: $approval_relative"
fi
[[ ! -L "$approval_file" ]] || fail 'refusing to replace a symlinked approval record'

jq -n \
  --arg role "$ROLE" \
  --arg name "$NAME" \
  --arg signed_at "$signed_at" \
  --arg result_file "$(basename -- "$result_file")" \
  --arg payload_sha256 "$payload_sha" \
  '{
    schema_version: 1,
    role: $role,
    name: $name,
    decision: "approve",
    signed_at: $signed_at,
    result_file: $result_file,
    payload_sha256: $payload_sha256
  }' >"$approval_file"
approval_sha="$(sha256_file "$approval_file")"

tmp_result="$(mktemp "$result_dir/.pilot-result.XXXXXX")"
cleanup() {
  [[ ! -e "$tmp_result" ]] || rm -f "$tmp_result"
}
trap cleanup EXIT
jq \
  --arg role "$ROLE" \
  --arg name "$NAME" \
  --arg signed_at "$signed_at" \
  --arg payload_sha256 "$payload_sha" \
  --arg approval_path "$approval_relative" \
  --arg approval_sha "$approval_sha" \
  '.sign_off[$role] = {
    name: $name,
    decision: "approve",
    signed_at: $signed_at,
    payload_sha256: $payload_sha256,
    approval_record: {path: $approval_path, sha256: $approval_sha}
  }' \
  "$result_file" >"$tmp_result"

"$VERIFY_SCRIPT" --allow-incomplete "$tmp_result" >/dev/null || \
  fail 'generated approval record failed verification; original result unchanged'
mv "$tmp_result" "$result_file"
trap - EXIT

printf 'Pilot sign-off recorded: %s by %s at %s\n' "$ROLE" "$NAME" "$signed_at"
printf '  payload_sha256: %s\n' "$payload_sha"
printf '  approval_record: %s\n' "$approval_relative"
printf 'Human release control must still authenticate the signer identity.\n'
