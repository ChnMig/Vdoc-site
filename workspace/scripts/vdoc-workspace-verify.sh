#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}"
LOCK_FILE="${VDOC_WORKSPACE_LOCK_FILE:-$ROOT_DIR/workspace.lock.json}"
MANIFEST_FILE="${VDOC_WORKSPACE_DISTRIBUTION_FILE:-$ROOT_DIR/workspace-distribution.json}"
DIGEST_SCRIPT="${VDOC_CONTROL_PLANE_DIGEST_SCRIPT:-$ROOT_DIR/scripts/vdoc-control-plane-digest.sh}"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "required command not found: $1"
}

normalize_remote() {
  local remote="$1"
  case "$remote" in
    git@github.com:*)
      remote="github.com/${remote#git@github.com:}"
      ;;
    ssh://git@github.com/*)
      remote="github.com/${remote#ssh://git@github.com/}"
      ;;
    https://github.com/*)
      remote="github.com/${remote#*://github.com/}"
      ;;
  esac
  case "$remote" in
    github.com/*) remote="${remote%.git}" ;;
  esac
  printf '%s' "$remote"
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

remote_ref_commit() {
  local remote="$1"
  local ref="$2"
  local output direct peeled
  output="$(GIT_TERMINAL_PROMPT=0 git ls-remote --exit-code "$remote" "$ref" "${ref}^{}" 2>/dev/null)" || return 1
  direct="$(printf '%s\n' "$output" | awk -v ref="$ref" '$2 == ref {print $1}')"
  peeled="$(printf '%s\n' "$output" | awk -v ref="${ref}^{}" '$2 == ref {print $1}')"
  [[ "$direct" =~ ^[0-9a-f]{40}$ ]] || return 1
  [[ -z "$peeled" || "$peeled" =~ ^[0-9a-f]{40}$ ]] || return 1
  if [[ -n "$peeled" ]]; then
    printf '%s' "$peeled"
    return
  fi
  printf '%s' "$direct"
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
    (.ref | type == "string" and length > 0) and
    (.commit | type == "string" and test("^[0-9a-f]{40}$"))
  ) and
  (.controlPlane.manifest == "workspace-distribution.json") and
  (.controlPlane.sha256 | type == "string" and test("^[0-9a-f]{64}$"))
' "$LOCK_FILE" >/dev/null || fail "invalid workspace lock: $LOCK_FILE"

manifest_lock="$(jq -r '.repository_lock' "$MANIFEST_FILE")"
[[ "$manifest_lock" == "workspace.lock.json" ]] || fail "workspace distribution points to an unsupported lock path: $manifest_lock"
expected_lock="$ROOT_DIR/$manifest_lock"
[[ "$(CDPATH= cd -- "$(dirname -- "$LOCK_FILE")" && pwd -P)/$(basename -- "$LOCK_FILE")" == \
   "$(CDPATH= cd -- "$(dirname -- "$expected_lock")" && pwd -P)/$(basename -- "$expected_lock")" ]] || \
  fail "workspace lock does not match the distribution manifest: $LOCK_FILE"

expected_control_digest="$(jq -r '.controlPlane.sha256' "$LOCK_FILE")"
actual_control_digest="$(VDOC_WORKSPACE_ROOT="$ROOT_DIR" VDOC_WORKSPACE_DISTRIBUTION_FILE="$MANIFEST_FILE" "$DIGEST_SCRIPT")"
[[ "$actual_control_digest" == "$expected_control_digest" ]] || \
  fail "workspace control-plane digest mismatch: expected $expected_control_digest, got $actual_control_digest"
printf 'OK: workspace control plane @ %s\n' "$actual_control_digest"

count=0
while IFS=$'\t' read -r repo_path expected_remote expected_ref expected_commit; do
  [[ -n "$repo_path" ]] || continue
  validate_ref "$expected_ref" || fail "$repo_path has an unsafe or unsupported ref: $expected_ref"
  repo_dir="$ROOT_DIR/$repo_path"
  is_repository_root "$repo_dir" || \
    fail "$repo_path is missing or is not a Git repository"

  actual_remote="$(git -C "$repo_dir" remote get-url origin 2>/dev/null)" || \
    fail "$repo_path does not define an origin remote"
  if [[ "$(normalize_remote "$actual_remote")" != "$(normalize_remote "$expected_remote")" ]]; then
    fail "$repo_path origin mismatch: expected $expected_remote, got $actual_remote"
  fi

  remote_commit="$(remote_ref_commit "$expected_remote" "$expected_ref")" || \
    fail "$repo_path cannot resolve locked ref $expected_ref from $expected_remote"
  if [[ "$remote_commit" != "$expected_commit" ]]; then
    fail "$repo_path remote ref mismatch: $expected_ref advertises $remote_commit, lock expects $expected_commit"
  fi

  git -C "$repo_dir" cat-file -e "${expected_commit}^{commit}" 2>/dev/null || \
    fail "$repo_path cannot resolve locked commit $expected_commit"

  actual_head="$(git -C "$repo_dir" rev-parse HEAD)"
  if [[ "$actual_head" != "$expected_commit" ]]; then
    fail "$repo_path HEAD mismatch: expected $expected_commit, got $actual_head"
  fi

  worktree_status="$(git -C "$repo_dir" status --porcelain=v1 --untracked-files=all)"
  if [[ -n "$worktree_status" ]]; then
    fail "$repo_path worktree is dirty; commit or remove local changes before locking a reproducible release candidate"
  fi

  printf 'OK: %s @ %s (%s)\n' "$repo_path" "$expected_commit" "$expected_ref"
  count=$((count + 1))
done < <(jq -r '.repositories[] | [.path, .remote, .ref, .commit] | @tsv' "$LOCK_FILE")

printf 'Workspace verification complete: control plane and %d repositories match the lock and advertised remote refs.\n' "$count"
