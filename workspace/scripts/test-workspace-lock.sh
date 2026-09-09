#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
VERIFY_SCRIPT="$ROOT_DIR/scripts/vdoc-workspace-verify.sh"
INIT_SCRIPT="$ROOT_DIR/scripts/vdoc-workspace-init.sh"
REFRESH_SCRIPT="$ROOT_DIR/scripts/vdoc-workspace-lock-refresh.sh"
DIGEST_SCRIPT="$ROOT_DIR/scripts/vdoc-control-plane-digest.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
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

create_remote_fixture() {
  local base="$1"
  FIXTURE_ORIGIN="$base/origin.git"
  FIXTURE_SOURCE="$base/source"
  FIXTURE_REF='refs/heads/main'
  git init --quiet --bare --initial-branch=main "$FIXTURE_ORIGIN"
  git init --quiet --initial-branch=main "$FIXTURE_SOURCE"
  git -C "$FIXTURE_SOURCE" config user.email test@example.com
  git -C "$FIXTURE_SOURCE" config user.name 'Workspace Test'
  printf 'fixture\n' >"$FIXTURE_SOURCE/fixture.txt"
  git -C "$FIXTURE_SOURCE" add fixture.txt
  git -C "$FIXTURE_SOURCE" commit --quiet -m fixture
  git -C "$FIXTURE_SOURCE" remote add origin "$FIXTURE_ORIGIN"
  git -C "$FIXTURE_SOURCE" push --quiet -u origin main
  FIXTURE_COMMIT="$(git -C "$FIXTURE_SOURCE" rev-parse HEAD)"
}

clone_fixture() {
  local destination="$1"
  mkdir -p "$(dirname -- "$destination")"
  git clone --quiet "$FIXTURE_ORIGIN" "$destination"
}

write_control_manifest() {
  local workspace="$1"
  mkdir -p "$workspace"
  printf 'control plane fixture\n' >"$workspace/control.txt"
  jq -n '{
    schema_version: 2,
    name: "fixture",
    version: "0.1",
    artifact_name: "fixture",
    root_directory: "fixture",
    repository_lock: "workspace.lock.json",
    files: ["control.txt", "workspace-distribution.json", "workspace.lock.json"],
    executables: []
  }' >"$workspace/workspace-distribution.json"
}

write_lock() {
  local workspace="$1"
  local path="$2"
  local remote="$3"
  local ref="$4"
  local commit="$5"
  local digest
  [[ -f "$workspace/workspace-distribution.json" ]] || write_control_manifest "$workspace"
  digest="$(VDOC_WORKSPACE_ROOT="$workspace" \
    VDOC_WORKSPACE_DISTRIBUTION_FILE="$workspace/workspace-distribution.json" \
    "$DIGEST_SCRIPT")"
  jq -n \
    --arg path "$path" \
    --arg remote "$remote" \
    --arg ref "$ref" \
    --arg commit "$commit" \
    --arg digest "$digest" \
    '{
      schemaVersion: 2,
      repositories: [{path: $path, remote: $remote, ref: $ref, commit: $commit}],
      controlPlane: {manifest: "workspace-distribution.json", sha256: $digest}
    }' >"$workspace/workspace.lock.json"
}

run_verify() {
  local workspace="$1"
  VDOC_WORKSPACE_ROOT="$workspace" \
    VDOC_WORKSPACE_LOCK_FILE="$workspace/workspace.lock.json" \
    VDOC_WORKSPACE_DISTRIBUTION_FILE="$workspace/workspace-distribution.json" \
    VDOC_CONTROL_PLANE_DIGEST_SCRIPT="$DIGEST_SCRIPT" \
    "$VERIFY_SCRIPT"
}

run_init() {
  local workspace="$1"
  VDOC_WORKSPACE_ROOT="$workspace" \
    VDOC_WORKSPACE_LOCK_FILE="$workspace/workspace.lock.json" \
    VDOC_WORKSPACE_DISTRIBUTION_FILE="$workspace/workspace-distribution.json" \
    VDOC_CONTROL_PLANE_DIGEST_SCRIPT="$DIGEST_SCRIPT" \
    VDOC_WORKSPACE_VERIFY_SCRIPT="$VERIFY_SCRIPT" \
    "$INIT_SCRIPT"
}

run_refresh() {
  local workspace="$1"
  shift
  VDOC_WORKSPACE_ROOT="$workspace" \
    VDOC_WORKSPACE_LOCK_FILE="$workspace/workspace.lock.json" \
    VDOC_WORKSPACE_DISTRIBUTION_FILE="$workspace/workspace-distribution.json" \
    VDOC_CONTROL_PLANE_DIGEST_SCRIPT="$DIGEST_SCRIPT" \
    "$REFRESH_SCRIPT" "$@"
}

test_init_clones_locked_ref_and_commit() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"

  run_init "$workspace" >"$tmp/out.txt"

  [[ "$(git -C "$workspace/Repo" rev-parse HEAD)" == "$FIXTURE_COMMIT" ]] || fail 'init did not checkout the locked commit'
  assert_contains "$tmp/out.txt" 'Workspace verification complete: control plane and 1 repositories match the lock and advertised remote refs.'
}

test_init_preserves_and_rejects_existing_dirty_repository() {
  local tmp workspace before status_before status_after
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  printf 'dirty\n' >>"$workspace/Repo/fixture.txt"
  before="$(git -C "$workspace/Repo" rev-parse HEAD)"
  status_before="$(git -C "$workspace/Repo" status --short)"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"

  if run_init "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'init accepted an existing dirty repository as a reproducible locked workspace'
  fi

  [[ "$(git -C "$workspace/Repo" rev-parse HEAD)" == "$before" ]] || fail 'init changed an existing repository HEAD'
  status_after="$(git -C "$workspace/Repo" status --short)"
  [[ "$status_after" == "$status_before" ]] || fail 'init changed an existing dirty worktree'
  assert_contains "$tmp/out.txt" 'no fetch, reset, checkout, or worktree cleanup performed'
  assert_contains "$tmp/err.txt" 'worktree is dirty'
}

test_verify_rejects_dirty_worktree() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"
  printf 'dirty\n' >>"$workspace/Repo/fixture.txt"

  if run_verify "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'verify accepted a dirty repository as a reproducible locked workspace'
  fi
  assert_contains "$tmp/err.txt" 'worktree is dirty'
}

test_verify_rejects_head_drift() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"

  git -C "$workspace/Repo" config user.email test@example.com
  git -C "$workspace/Repo" config user.name 'Workspace Test'
  printf 'drift\n' >"$workspace/Repo/drift.txt"
  git -C "$workspace/Repo" add drift.txt
  git -C "$workspace/Repo" commit --quiet -m drift

  if run_verify "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'verify accepted a repository whose HEAD drifted from the lock'
  fi
  assert_contains "$tmp/err.txt" 'HEAD mismatch'
}

test_verify_rejects_forged_local_remote_ref_for_unpushed_commit() {
  local tmp workspace local_commit
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  git -C "$workspace/Repo" config user.email test@example.com
  git -C "$workspace/Repo" config user.name 'Workspace Test'
  printf 'local only\n' >"$workspace/Repo/local.txt"
  git -C "$workspace/Repo" add local.txt
  git -C "$workspace/Repo" commit --quiet -m 'local only'
  local_commit="$(git -C "$workspace/Repo" rev-parse HEAD)"
  git -C "$workspace/Repo" update-ref refs/remotes/origin/main "$local_commit"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$local_commit"

  if run_verify "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'verify trusted a forged local origin ref for an unpushed commit'
  fi
  assert_contains "$tmp/err.txt" 'remote ref mismatch'
}

test_verify_rejects_remote_ref_move() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"

  printf 'remote moved\n' >"$FIXTURE_SOURCE/next.txt"
  git -C "$FIXTURE_SOURCE" add next.txt
  git -C "$FIXTURE_SOURCE" commit --quiet -m next
  git -C "$FIXTURE_SOURCE" push --quiet origin main

  if run_verify "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'verify accepted a lock after its advertised remote ref moved'
  fi
  assert_contains "$tmp/err.txt" 'remote ref mismatch'
}

test_verify_rejects_remote_drift() {
  local tmp workspace expected_origin expected_commit
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp/first"
  clone_fixture "$workspace/Repo"
  expected_origin="$FIXTURE_ORIGIN"
  expected_commit="$FIXTURE_COMMIT"
  create_remote_fixture "$tmp/second"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$expected_origin" "$FIXTURE_REF" "$expected_commit"
  git -C "$workspace/Repo" remote set-url origin "$FIXTURE_ORIGIN"

  if run_verify "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'verify accepted an unexpected origin remote'
  fi
  assert_contains "$tmp/err.txt" 'origin mismatch'
}

test_verify_rejects_insecure_github_remote() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  git -C "$workspace/Repo" remote set-url origin 'http://github.com/Example/Repo.git'
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo 'https://github.com/Example/Repo.git' "$FIXTURE_REF" "$FIXTURE_COMMIT"

  if run_verify "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'verify accepted a plaintext GitHub origin as equivalent to the HTTPS release lock'
  fi
  assert_contains "$tmp/err.txt" 'origin mismatch'
}

test_verify_rejects_control_plane_tampering() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"
  printf 'tampered\n' >>"$workspace/control.txt"

  if run_verify "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'verify accepted a tampered root control plane'
  fi
  assert_contains "$tmp/err.txt" 'control-plane digest mismatch'
  assert_not_contains "$tmp/out.txt" 'OK: Repo'
}

test_verify_accepts_annotated_tag_ref() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  git -C "$FIXTURE_SOURCE" tag -a v0.1.0 -m v0.1.0
  git -C "$FIXTURE_SOURCE" push --quiet origin refs/tags/v0.1.0
  clone_fixture "$workspace/Repo"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" refs/tags/v0.1.0 "$FIXTURE_COMMIT"

  run_verify "$workspace" >"$tmp/out.txt"
  assert_contains "$tmp/out.txt" 'refs/tags/v0.1.0'
}

test_init_rejects_unsafe_ref_syntax() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" 'refs/heads/main..forged' "$FIXTURE_COMMIT"

  if run_init "$workspace" >"$tmp/out.txt" 2>"$tmp/err.txt"; then
    fail 'init accepted an unsafe Git ref from the lock'
  fi
  assert_contains "$tmp/err.txt" 'unsafe or unsupported ref'
  [[ ! -e "$workspace/Repo" ]] || fail 'init created a repository before rejecting the unsafe ref'
}

test_verify_accepts_git_worktree_layout() {
  local tmp workspace
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  mkdir -p "$workspace"
  git -C "$FIXTURE_SOURCE" worktree add --quiet --detach "$workspace/Repo" "$FIXTURE_COMMIT"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"

  run_verify "$workspace" >"$tmp/out.txt"
  assert_contains "$tmp/out.txt" 'Workspace verification complete: control plane and 1 repositories'
}

test_refresh_refuses_dirty_or_unpushed_heads() {
  local tmp workspace local_commit
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"

  printf 'dirty\n' >>"$workspace/Repo/fixture.txt"
  if run_refresh "$workspace" >"$tmp/dirty-out.txt" 2>"$tmp/dirty-err.txt"; then
    fail 'lock refresh accepted a dirty worktree'
  fi
  assert_contains "$tmp/dirty-err.txt" 'worktree is dirty'

  git -C "$workspace/Repo" restore fixture.txt
  git -C "$workspace/Repo" config user.email test@example.com
  git -C "$workspace/Repo" config user.name 'Workspace Test'
  printf 'local\n' >"$workspace/Repo/local.txt"
  git -C "$workspace/Repo" add local.txt
  git -C "$workspace/Repo" commit --quiet -m local
  local_commit="$(git -C "$workspace/Repo" rev-parse HEAD)"
  git -C "$workspace/Repo" update-ref refs/remotes/origin/main "$local_commit"
  if run_refresh "$workspace" >"$tmp/local-out.txt" 2>"$tmp/local-err.txt"; then
    fail 'lock refresh accepted an unpushed HEAD with a forged local remote ref'
  fi
  assert_contains "$tmp/local-err.txt" 'push first'
}

test_refresh_defaults_to_review_and_writes_atomically_on_request() {
  local tmp workspace before after
  tmp="$(mktemp -d)"
  workspace="$tmp/workspace"
  create_remote_fixture "$tmp"
  clone_fixture "$workspace/Repo"
  write_control_manifest "$workspace"
  write_lock "$workspace" Repo "$FIXTURE_ORIGIN" "$FIXTURE_REF" "$FIXTURE_COMMIT"
  before="$(shasum -a 256 "$workspace/workspace.lock.json" | awk '{print $1}')"
  printf 'control plane changed\n' >>"$workspace/control.txt"

  run_refresh "$workspace" >"$tmp/review.txt"
  after="$(shasum -a 256 "$workspace/workspace.lock.json" | awk '{print $1}')"
  [[ "$after" == "$before" ]] || fail 'default lock refresh modified the lock'
  assert_contains "$tmp/review.txt" 'Candidate workspace lock (not written)'
  assert_contains "$tmp/review.txt" 'Diff against current lock'

  run_refresh "$workspace" --write >"$tmp/write.txt"
  [[ "$(shasum -a 256 "$workspace/workspace.lock.json" | awk '{print $1}')" != "$before" ]] || fail 'explicit lock refresh did not update the lock'
  assert_contains "$tmp/write.txt" 'refreshed atomically'
  run_verify "$workspace" >"$tmp/verify.txt"
}

printf 'test: init clones the locked advertised ref and commit\n'
test_init_clones_locked_ref_and_commit
printf 'test: init preserves and rejects an existing dirty repository\n'
test_init_preserves_and_rejects_existing_dirty_repository
printf 'test: verify rejects a dirty worktree\n'
test_verify_rejects_dirty_worktree
printf 'test: verify rejects HEAD drift\n'
test_verify_rejects_head_drift
printf 'test: verify rejects a forged local remote ref\n'
test_verify_rejects_forged_local_remote_ref_for_unpushed_commit
printf 'test: verify rejects advertised remote ref movement\n'
test_verify_rejects_remote_ref_move
printf 'test: verify rejects origin drift\n'
test_verify_rejects_remote_drift
printf 'test: verify rejects insecure GitHub origin equivalence\n'
test_verify_rejects_insecure_github_remote
printf 'test: verify rejects root control-plane tampering\n'
test_verify_rejects_control_plane_tampering
printf 'test: verify accepts an annotated tag ref\n'
test_verify_accepts_annotated_tag_ref
printf 'test: init rejects unsafe ref syntax before cloning\n'
test_init_rejects_unsafe_ref_syntax
printf 'test: verify accepts a Git worktree layout\n'
test_verify_accepts_git_worktree_layout
printf 'test: lock refresh rejects dirty and unpushed heads\n'
test_refresh_refuses_dirty_or_unpushed_heads
printf 'test: lock refresh is review-first and atomic on explicit write\n'
test_refresh_defaults_to_review_and_writes_atomically_on_request
printf 'ok\n'
