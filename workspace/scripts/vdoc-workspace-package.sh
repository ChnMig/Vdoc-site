#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)}"
MANIFEST_FILE="${VDOC_WORKSPACE_DISTRIBUTION_FILE:-$ROOT_DIR/workspace-distribution.json}"
VERIFY_SCRIPT="${VDOC_WORKSPACE_VERIFY_SCRIPT:-$ROOT_DIR/scripts/vdoc-workspace-verify.sh}"
DIGEST_SCRIPT="${VDOC_CONTROL_PLANE_DIGEST_SCRIPT:-$ROOT_DIR/scripts/vdoc-control-plane-digest.sh}"
OUTPUT_DIR="$ROOT_DIR/dist"
MODE=package
CANDIDATE=0

usage() {
  cat <<'USAGE'
Usage: scripts/vdoc-workspace-package.sh [--check|--list] [--output-dir DIR] [--candidate]

Validate or package the Docker Compose workspace bootstrap. The generated
tarball contains Compose/configuration files, release tools, and the source
lock. It contains no application binaries, container images, repository source
trees, or secrets. vdoc-prebuilt-install.sh verifies and loads separately
published application images. Developers can use vdoc-workspace-init.sh to
fetch pinned source commits and build Backend/Admin locally.

Options:
  --check            Validate inventory and locked repository baselines only.
  --list             Print the exact packaged file inventory.
  --output-dir DIR   Write the tarball and SHA-256 file to DIR (default: dist).
  --candidate        Package a marked, non-deployable candidate without remote checks.
  -h, --help         Show this help.
USAGE
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --candidate)
      CANDIDATE=1
      shift
      ;;
    --check)
      [[ "$MODE" == package ]] || fail 'choose only one of --check or --list'
      MODE=check
      shift
      ;;
    --list)
      [[ "$MODE" == package ]] || fail 'choose only one of --check or --list'
      MODE=list
      shift
      ;;
    --output-dir)
      [[ $# -ge 2 ]] || fail '--output-dir requires a directory'
      OUTPUT_DIR="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      fail "unknown argument: $1"
      ;;
  esac
done

command -v jq >/dev/null 2>&1 || fail 'required command not found: jq'
command -v tar >/dev/null 2>&1 || fail 'required command not found: tar'
command -v gzip >/dev/null 2>&1 || fail 'required command not found: gzip'
command -v shasum >/dev/null 2>&1 || fail 'required command not found: shasum'
[[ -f "$MANIFEST_FILE" ]] || fail "workspace distribution manifest not found: $MANIFEST_FILE"

jq -e '
  .schema_version == 2 and
  (.name | type == "string" and test("^[a-z0-9-]+$")) and
  (.version | type == "string" and test("^[0-9]+\\.[0-9]+\\.[0-9]+$")) and
  (.artifact_name | type == "string" and test("^[A-Za-z0-9._-]+$")) and
  (.root_directory | type == "string" and test("^[A-Za-z0-9._-]+$")) and
  (.repository_lock | type == "string") and
  (.files | type == "array" and length > 0 and length == (unique | length)) and
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
' "$MANIFEST_FILE" >/dev/null || fail 'invalid workspace distribution manifest'

required_files=(
  '.env.example'
  'COMPOSE_DEPLOY.md'
  'DATABASE_SCHEMA.md'
  'IMPLEMENTATION_PLAN.md'
  'IMPROVEMENTS.md'
  'IMPROVEMENTS.zh-CN.md'
  'LICENSE'
  'PILOT_RUNBOOK.md'
  'PRD.md'
  'README.md'
  'RELEASE_DEPLOY.md'
  'docker-compose.yml'
  'contracts/pilot-result.schema.json'
  'scripts/vdoc-control-plane-digest.sh'
  'scripts/vdoc-gate-attest.sh'
  'scripts/vdoc-json-schema-validate.mjs'
  'scripts/vdoc-local-bootstrap.sh'
  'scripts/vdoc-prebuilt-install.sh'
  'scripts/vdoc-pilot-result-check.mjs'
  'scripts/vdoc-pilot-result-verify.sh'
  'scripts/vdoc-pilot-sign.sh'
  'scripts/vdoc-release-dry-run.sh'
  'scripts/vdoc-workspace-init.sh'
  'scripts/vdoc-workspace-lock-refresh.sh'
  'scripts/vdoc-workspace-package.sh'
  'scripts/vdoc-workspace-release-assets-verify.sh'
  'scripts/vdoc-workspace-resolve-release.sh'
  'scripts/vdoc-workspace-verify.sh'
  'workspace.lock.json'
)
for required_file in "${required_files[@]}"; do
  jq -e --arg path "$required_file" '.files | index($path) != null' "$MANIFEST_FILE" >/dev/null || \
    fail "distribution manifest omits required release file: $required_file"
done

required_executables=(
  'scripts/vdoc-control-plane-digest.sh'
  'scripts/vdoc-gate-attest.sh'
  'scripts/vdoc-json-schema-validate.mjs'
  'scripts/vdoc-local-bootstrap.sh'
  'scripts/vdoc-prebuilt-install.sh'
  'scripts/vdoc-pilot-result-check.mjs'
  'scripts/vdoc-pilot-result-verify.sh'
  'scripts/vdoc-pilot-sign.sh'
  'scripts/vdoc-release-dry-run.sh'
  'scripts/vdoc-workspace-init.sh'
  'scripts/vdoc-workspace-lock-refresh.sh'
  'scripts/vdoc-workspace-package.sh'
  'scripts/vdoc-workspace-release-assets-verify.sh'
  'scripts/vdoc-workspace-resolve-release.sh'
  'scripts/vdoc-workspace-verify.sh'
)
for required_executable in "${required_executables[@]}"; do
  jq -e --arg path "$required_executable" '.executables | index($path) != null' "$MANIFEST_FILE" >/dev/null || \
    fail "distribution manifest does not mark required tool executable: $required_executable"
done

repository_lock="$(jq -r '.repository_lock' "$MANIFEST_FILE")"
lock_file="$ROOT_DIR/$repository_lock"
[[ -f "$lock_file" ]] || fail "repository lock not found: $repository_lock"
jq -e '
  .schemaVersion == 2 and
  (.repositories | type == "array" and length == 5) and
  ([.repositories[].path] | sort) == (["Vdoc", "Vdoc-admin", "Vdoc-mcp", "Vdoc-site", "Vdoc-skill"] | sort) and
  all(.repositories[];
    (.remote | type == "string" and test("^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\\.git$")) and
    (.ref | type == "string" and
      test("^refs/(heads|tags)/[A-Za-z0-9][A-Za-z0-9._/-]*$") and
      (contains("..") | not) and
      (contains("//") | not) and
      (contains("@{") | not) and
      (endswith(".lock") | not) and
      (endswith("/.") | not) and
      (endswith("/") | not)) and
    (.commit | type == "string" and test("^[0-9a-f]{40}$"))
  ) and
  (.controlPlane.manifest == "workspace-distribution.json") and
  (.controlPlane.sha256 | type == "string" and test("^[0-9a-f]{64}$"))
' "$lock_file" >/dev/null || fail 'workspace lock is not a complete five-repository release lock'

while IFS= read -r relative_path; do
  absolute_path="$ROOT_DIR/$relative_path"
  [[ -f "$absolute_path" && ! -L "$absolute_path" ]] || \
    fail "distribution file is missing, not regular, or a symlink: $relative_path"
done < <(jq -r '.files[]' "$MANIFEST_FILE")

while IFS= read -r relative_path; do
  [[ -x "$ROOT_DIR/$relative_path" ]] || fail "distribution executable bit is missing: $relative_path"
done < <(jq -r '.executables[]' "$MANIFEST_FILE")

[[ -x "$DIGEST_SCRIPT" && ! -L "$DIGEST_SCRIPT" ]] || fail "control-plane digest script is not executable or is a symlink: $DIGEST_SCRIPT"
expected_control_digest="$(jq -r '.controlPlane.sha256' "$lock_file")"
actual_control_digest="$(VDOC_WORKSPACE_ROOT="$ROOT_DIR" VDOC_WORKSPACE_DISTRIBUTION_FILE="$MANIFEST_FILE" "$DIGEST_SCRIPT")"
[[ "$actual_control_digest" == "$expected_control_digest" ]] || \
  fail "workspace control-plane digest mismatch: expected $expected_control_digest, got $actual_control_digest"

if [[ "$MODE" == list ]]; then
  jq -r '.files[]' "$MANIFEST_FILE"
  exit 0
fi

[[ -x "$VERIFY_SCRIPT" ]] || fail "workspace verifier is not executable: $VERIFY_SCRIPT"
if [[ "$CANDIDATE" -eq 1 ]]; then
  jq -e '.candidate == true' "$lock_file" >/dev/null || fail '--candidate requires a marked candidate lock'
else
  jq -e '.candidate != true' "$lock_file" >/dev/null || fail 'candidate lock cannot be packaged as a release'
  VDOC_WORKSPACE_ROOT="$ROOT_DIR" VDOC_WORKSPACE_LOCK_FILE="$lock_file" "$VERIFY_SCRIPT"
fi

file_count="$(jq '.files | length' "$MANIFEST_FILE")"
if [[ "$MODE" == check ]]; then
  printf 'Docker Compose bootstrap distribution verified: %s files and 5 locked repositories.\n' "$file_count"
  exit 0
fi

artifact_name="$(jq -r '.artifact_name' "$MANIFEST_FILE")"
root_directory="$(jq -r '.root_directory' "$MANIFEST_FILE")"
mkdir -p "$OUTPUT_DIR"
output_real="$(CDPATH= cd -- "$OUTPUT_DIR" && pwd -P)"
artifact="$output_real/$artifact_name.tar.gz"
checksum="$artifact.sha256"
[[ ! -e "$artifact" && ! -e "$checksum" ]] || \
  fail "refusing to overwrite existing distribution artifact: $artifact"

stage="$(mktemp -d)"
cleanup() {
  rm -rf -- "$stage"
}
trap cleanup EXIT
mkdir -p "$stage/$root_directory"

while IFS= read -r relative_path; do
  destination="$stage/$root_directory/$relative_path"
  mkdir -p "$(dirname -- "$destination")"
  COPYFILE_DISABLE=1 cp "$ROOT_DIR/$relative_path" "$destination"
  if jq -e --arg path "$relative_path" '.executables | index($path) != null' "$MANIFEST_FILE" >/dev/null; then
    chmod 0755 "$destination"
  else
    chmod 0644 "$destination"
  fi
done < <(jq -r '.files[]' "$MANIFEST_FILE")

find "$stage/$root_directory" -type d -exec chmod 0755 {} +
TZ=UTC find "$stage/$root_directory" -exec touch -t 197001010000.00 {} +
archive_list="$stage/archive.list"
(
  cd "$stage"
  find "$root_directory" -print | LC_ALL=C sort >"$archive_list"
)
tar_ownership=(--uid 0 --gid 0 --uname root --gname root)
if tar --version | grep -q 'GNU tar'; then
  tar_ownership=(--owner=root:0 --group=root:0)
fi
COPYFILE_DISABLE=1 tar \
  --format=ustar \
  --no-recursion \
  --no-xattrs \
  "${tar_ownership[@]}" \
  -cf - \
  -C "$stage" \
  -T "$archive_list" | gzip -n >"$artifact"
digest="$(shasum -a 256 "$artifact" | awk '{print $1}')"
printf '%s  %s\n' "$digest" "$(basename -- "$artifact")" >"$checksum"

printf 'Docker Compose bootstrap artifact: %s\n' "$artifact"
printf 'SHA-256: %s\n' "$checksum"
if [[ "$CANDIDATE" -eq 1 ]]; then
  printf 'Candidate only: do not publish or deploy these files.\n'
else
  printf 'Publish both files together through the Site tag release workflow or the documented release process.\n'
fi
