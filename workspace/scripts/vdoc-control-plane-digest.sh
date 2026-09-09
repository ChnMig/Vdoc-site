#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)}"
MANIFEST_FILE="${VDOC_WORKSPACE_DISTRIBUTION_FILE:-$ROOT_DIR/workspace-distribution.json}"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

require_command jq
require_command shasum

ROOT_DIR="$(CDPATH= cd -- "$ROOT_DIR" && pwd -P)"
[[ -f "$MANIFEST_FILE" && ! -L "$MANIFEST_FILE" ]] || \
  fail "workspace distribution manifest is missing, not regular, or a symlink: $MANIFEST_FILE"
manifest_real="$(CDPATH= cd -- "$(dirname -- "$MANIFEST_FILE")" && pwd -P)/$(basename -- "$MANIFEST_FILE")"
[[ "$manifest_real" == "$ROOT_DIR/workspace-distribution.json" ]] || \
  fail "control-plane digest requires the canonical root manifest: $ROOT_DIR/workspace-distribution.json"

jq -e '
  .schema_version == 2 and
  (.repository_lock | type == "string") and
  (.files | type == "array" and length > 1 and length == (unique | length)) and
  (.files == (.files | sort)) and
  (.executables | type == "array" and length == (unique | length)) and
  (.executables == (.executables | sort)) and
  (.files as $files |
    all($files[];
      type == "string" and
      test("^[A-Za-z0-9._/-]+$") and
      (startswith("/") | not) and
      (split("/") | all(. != "" and . != "." and . != ".."))
    ) and
    all(.executables[]; . as $entry | ($files | index($entry)) != null)
  ) and
  (.repository_lock as $lock | .files | index($lock) != null) and
  (.files | index("workspace-distribution.json") != null)
' "$MANIFEST_FILE" >/dev/null || fail "invalid workspace distribution manifest: $MANIFEST_FILE"

repository_lock="$(jq -r '.repository_lock' "$MANIFEST_FILE")"
ledger="$(mktemp)"
cleanup() {
  rm -f -- "$ledger"
}
trap cleanup EXIT

while IFS= read -r relative_path; do
  [[ "$relative_path" != "$repository_lock" ]] || continue
  absolute_path="$ROOT_DIR/$relative_path"
  [[ -f "$absolute_path" && ! -L "$absolute_path" ]] || \
    fail "control-plane file is missing, not regular, or a symlink: $relative_path"
  file_digest="$(shasum -a 256 "$absolute_path" | awk '{print $1}')"
  printf '%s  %s\n' "$file_digest" "$relative_path" >>"$ledger"
done < <(jq -r '.files[]' "$MANIFEST_FILE")

while IFS= read -r relative_path; do
  [[ -x "$ROOT_DIR/$relative_path" ]] || \
    fail "control-plane executable bit is missing: $relative_path"
done < <(jq -r '.executables[]' "$MANIFEST_FILE")

shasum -a 256 "$ledger" | awk '{print $1}'
