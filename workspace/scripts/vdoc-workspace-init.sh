#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}"
LOCK_FILE="${VDOC_WORKSPACE_LOCK_FILE:-$ROOT_DIR/workspace.lock.json}"
VERIFY_SCRIPT="${VDOC_WORKSPACE_VERIFY_SCRIPT:-$ROOT_DIR/scripts/vdoc-workspace-verify.sh}"
MANIFEST_FILE="${VDOC_WORKSPACE_DISTRIBUTION_FILE:-$ROOT_DIR/workspace-distribution.json}"
DIGEST_SCRIPT="${VDOC_CONTROL_PLANE_DIGEST_SCRIPT:-$ROOT_DIR/scripts/vdoc-control-plane-digest.sh}"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

validate_ref() {
  local ref="$1"
  case "$ref" in
    refs/heads/*|refs/tags/*) ;;
    *) return 1 ;;
  esac
  [[ "$ref" =~ ^refs/(heads|tags)/[A-Za-z0-9][A-Za-z0-9._/-]*$ ]] || return 1
  [[ "$ref" != *'..'* && "$ref" != *'//'* && "$ref" != *'@{'* && "$ref" != *.lock && "$ref" != */. && "$ref" != */ ]] || return 1
}

is_repository_root() {
  local repo_dir="$1"
  local repo_root repo_real root_real
  repo_root="$(git -C "$repo_dir" rev-parse --show-toplevel 2>/dev/null)" || return 1
  repo_real="$(CDPATH= cd -- "$repo_dir" 2>/dev/null && pwd -P)" || return 1
  root_real="$(CDPATH= cd -- "$repo_root" 2>/dev/null && pwd -P)" || return 1
  [[ "$repo_real" == "$root_real" ]]
}

require_command git
require_command jq

[[ -f "$LOCK_FILE" && ! -L "$LOCK_FILE" ]] || fail "workspace lock is missing, not regular, or a symlink: $LOCK_FILE"
if jq -e '.candidate == true' "$LOCK_FILE" >/dev/null; then
  fail 'candidate bootstrap is for local checks only; download the published release to deploy'
fi
[[ -x "$VERIFY_SCRIPT" ]] || fail "workspace verifier is not executable: $VERIFY_SCRIPT"
[[ -f "$MANIFEST_FILE" && ! -L "$MANIFEST_FILE" ]] || \
  fail "workspace distribution manifest is missing, not regular, or a symlink: $MANIFEST_FILE"
[[ -x "$DIGEST_SCRIPT" && ! -L "$DIGEST_SCRIPT" ]] || \
  fail "control-plane digest script is not executable or is a symlink: $DIGEST_SCRIPT"

jq -e '
  .schemaVersion == 2 and
  (.repositories | type == "array" and length > 0) and
  ([.repositories[].path] | length == (unique | length)) and
  all(.repositories[];
    (.path | type == "string" and test("^[A-Za-z0-9._-]+$")) and
    (.remote | type == "string" and length > 0 and (startswith("-") | not)) and
    (.ref | type == "string" and test("^refs/(heads|tags)/[A-Za-z0-9][A-Za-z0-9._/-]*$")) and
    (.commit | type == "string" and test("^[0-9a-f]{40}$"))
  ) and
  (.controlPlane.manifest == "workspace-distribution.json") and
  (.controlPlane.sha256 | type == "string" and test("^[0-9a-f]{64}$"))
' "$LOCK_FILE" >/dev/null || fail "invalid workspace lock: $LOCK_FILE"

expected_control_digest="$(jq -r '.controlPlane.sha256' "$LOCK_FILE")"
actual_control_digest="$(VDOC_WORKSPACE_ROOT="$ROOT_DIR" VDOC_WORKSPACE_DISTRIBUTION_FILE="$MANIFEST_FILE" "$DIGEST_SCRIPT")"
[[ "$actual_control_digest" == "$expected_control_digest" ]] || \
  fail "workspace control-plane digest mismatch: expected $expected_control_digest, got $actual_control_digest"

while IFS=$'\t' read -r repo_path remote ref commit; do
  [[ -n "$repo_path" ]] || continue
  validate_ref "$ref" || fail "$repo_path has an unsafe or unsupported ref: $ref"
  repo_dir="$ROOT_DIR/$repo_path"

  if [[ -e "$repo_dir" ]]; then
    is_repository_root "$repo_dir" || \
      fail "refusing to replace existing non-Git path: $repo_dir"
    printf 'KEEP: %s already exists; no fetch, reset, checkout, or worktree cleanup performed.\n' "$repo_path"
    continue
  fi

  printf 'CLONE: %s @ %s (%s)\n' "$repo_path" "$commit" "$ref"
  git init --quiet "$repo_dir"
  git -C "$repo_dir" remote add origin "$remote"
  if ! GIT_TERMINAL_PROMPT=0 git -C "$repo_dir" fetch --quiet --depth 1 origin "$ref"; then
    fail "could not fetch locked ref $ref for $repo_path; partial clone left at $repo_dir for inspection"
  fi
  fetched_commit="$(git -C "$repo_dir" rev-parse 'FETCH_HEAD^{commit}')"
  if [[ "$fetched_commit" != "$commit" ]]; then
    fail "$repo_path fetched ref $ref at $fetched_commit, but the lock expects $commit; partial clone left for inspection"
  fi
  git -C "$repo_dir" checkout --quiet --detach FETCH_HEAD
done < <(jq -r '.repositories[] | [.path, .remote, .ref, .commit] | @tsv' "$LOCK_FILE")

VDOC_WORKSPACE_ROOT="$ROOT_DIR" \
  VDOC_WORKSPACE_LOCK_FILE="$LOCK_FILE" \
  VDOC_WORKSPACE_DISTRIBUTION_FILE="$MANIFEST_FILE" \
  VDOC_CONTROL_PLANE_DIGEST_SCRIPT="$DIGEST_SCRIPT" \
  "$VERIFY_SCRIPT"
