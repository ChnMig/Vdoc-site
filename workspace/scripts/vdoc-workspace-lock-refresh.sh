#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)}"
LOCK_FILE="${VDOC_WORKSPACE_LOCK_FILE:-$ROOT_DIR/workspace.lock.json}"
MANIFEST_FILE="${VDOC_WORKSPACE_DISTRIBUTION_FILE:-$ROOT_DIR/workspace-distribution.json}"
DIGEST_SCRIPT="${VDOC_CONTROL_PLANE_DIGEST_SCRIPT:-$ROOT_DIR/scripts/vdoc-control-plane-digest.sh}"
WRITE=0

usage() {
  cat <<'USAGE'
Usage: scripts/vdoc-workspace-lock-refresh.sh [--write]

Build a candidate schema-v2 workspace lock from clean repository HEADs. Every
HEAD must equal the commit currently advertised by its configured remote ref.
The default mode prints the candidate and diff without changing the lock.

Options:
  --write      Atomically replace workspace.lock.json with the verified candidate.
  -h, --help   Show this help.
USAGE
}

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
    git@github.com:*) remote="github.com/${remote#git@github.com:}" ;;
    ssh://git@github.com/*) remote="github.com/${remote#ssh://git@github.com/}" ;;
    https://github.com/*) remote="github.com/${remote#*://github.com/}" ;;
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

while [[ $# -gt 0 ]]; do
  case "$1" in
    --write)
      WRITE=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *) fail "unknown argument: $1" ;;
  esac
done

require_command git
require_command jq
require_command diff

[[ -f "$LOCK_FILE" && ! -L "$LOCK_FILE" ]] || fail "workspace lock is missing, not regular, or a symlink: $LOCK_FILE"
[[ -f "$MANIFEST_FILE" && ! -L "$MANIFEST_FILE" ]] || fail "workspace distribution manifest is missing, not regular, or a symlink: $MANIFEST_FILE"
[[ -x "$DIGEST_SCRIPT" && ! -L "$DIGEST_SCRIPT" ]] || fail "control-plane digest script is not executable or is a symlink: $DIGEST_SCRIPT"

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
  (.controlPlane.manifest | type == "string") and
  (.controlPlane.sha256 | type == "string" and test("^[0-9a-f]{64}$"))
' "$LOCK_FILE" >/dev/null || fail "invalid workspace lock: $LOCK_FILE"

candidate_repositories="$(mktemp)"
candidate="$(mktemp "$(dirname -- "$LOCK_FILE")/.workspace.lock.candidate.XXXXXX")"
cleanup() {
  rm -f -- "$candidate_repositories" "$candidate"
}
trap cleanup EXIT
printf '[]\n' >"$candidate_repositories"

while IFS=$'\t' read -r repo_path expected_remote expected_ref; do
  [[ -n "$repo_path" ]] || continue
  validate_ref "$expected_ref" || fail "$repo_path has an unsafe or unsupported ref: $expected_ref"
  repo_dir="$ROOT_DIR/$repo_path"
  is_repository_root "$repo_dir" || fail "$repo_path is missing or is not a Git repository root"

  actual_remote="$(git -C "$repo_dir" remote get-url origin 2>/dev/null)" || fail "$repo_path does not define an origin remote"
  [[ "$(normalize_remote "$actual_remote")" == "$(normalize_remote "$expected_remote")" ]] || \
    fail "$repo_path origin mismatch: expected $expected_remote, got $actual_remote"

  worktree_status="$(git -C "$repo_dir" status --porcelain=v1 --untracked-files=all)"
  [[ -z "$worktree_status" ]] || fail "$repo_path worktree is dirty; commit or remove local changes before refreshing the lock"

  head_commit="$(git -C "$repo_dir" rev-parse HEAD)"
  remote_commit="$(remote_ref_commit "$expected_remote" "$expected_ref")" || \
    fail "$repo_path cannot resolve $expected_ref from the configured remote"
  [[ "$remote_commit" == "$head_commit" ]] || \
    fail "$repo_path HEAD $head_commit is not the commit advertised by $expected_ref ($remote_commit); push first"

  jq \
    --arg path "$repo_path" \
    --arg remote "$expected_remote" \
    --arg ref "$expected_ref" \
    --arg commit "$head_commit" \
    '. + [{path: $path, remote: $remote, ref: $ref, commit: $commit}]' \
    "$candidate_repositories" >"${candidate_repositories}.next"
  mv "${candidate_repositories}.next" "$candidate_repositories"
done < <(jq -r '.repositories[] | [.path, .remote, .ref] | @tsv' "$LOCK_FILE")

control_manifest="$(jq -r '.controlPlane.manifest' "$LOCK_FILE")"
[[ "$control_manifest" == "workspace-distribution.json" ]] || fail "unsupported control-plane manifest: $control_manifest"
control_digest="$(VDOC_WORKSPACE_ROOT="$ROOT_DIR" VDOC_WORKSPACE_DISTRIBUTION_FILE="$MANIFEST_FILE" "$DIGEST_SCRIPT")"
[[ "$control_digest" =~ ^[0-9a-f]{64}$ ]] || fail "control-plane digest script returned an invalid SHA-256"

jq -n \
  --slurpfile repositories "$candidate_repositories" \
  --arg manifest "$control_manifest" \
  --arg sha256 "$control_digest" \
  '{schemaVersion: 2, repositories: $repositories[0], controlPlane: {manifest: $manifest, sha256: $sha256}}' \
  >"$candidate"

if [[ "$WRITE" -eq 1 ]]; then
  chmod --reference="$LOCK_FILE" "$candidate" 2>/dev/null || chmod 0644 "$candidate"
  mv "$candidate" "$LOCK_FILE"
  trap - EXIT
  rm -f -- "$candidate_repositories"
  printf 'Workspace lock refreshed atomically: %s\n' "$LOCK_FILE"
  printf 'Re-run scripts/vdoc-workspace-verify.sh before release.\n'
  exit 0
fi

printf '%s\n' 'Candidate workspace lock (not written):'
cat "$candidate"
printf '%s\n' 'Diff against current lock:'
diff -u "$LOCK_FILE" "$candidate" || true
printf '%s\n' 'Use --write only after reviewing this candidate.'
