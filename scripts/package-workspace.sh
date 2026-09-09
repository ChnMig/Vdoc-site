#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
node "$SITE_ROOT/scripts/sync-workspace.mjs" --check

stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
mkdir -p "$stage/vdoc-workspace"
COPYFILE_DISABLE=1 cp -R "$SITE_ROOT/workspace/." "$stage/vdoc-workspace/"

# Keep packaging tied to the shipped verifier and public locked refs.
unset VDOC_WORKSPACE_LOCK_FILE VDOC_WORKSPACE_DISTRIBUTION_FILE
unset VDOC_WORKSPACE_VERIFY_SCRIPT VDOC_CONTROL_PLANE_DIGEST_SCRIPT
export VDOC_WORKSPACE_ROOT="$stage/vdoc-workspace"
"$VDOC_WORKSPACE_ROOT/scripts/vdoc-workspace-init.sh"
"$VDOC_WORKSPACE_ROOT/scripts/vdoc-workspace-package.sh" --output-dir "$stage/output"

artifact_name="$(jq -r '.artifact_name' "$VDOC_WORKSPACE_ROOT/workspace-distribution.json")"
mkdir -p "$SITE_ROOT/docs/public/downloads"
cp "$stage/output/$artifact_name.tar.gz" "$SITE_ROOT/docs/public/downloads/"
cp "$stage/output/$artifact_name.tar.gz.sha256" "$SITE_ROOT/docs/public/downloads/"
printf 'Website download prepared: docs/public/downloads/%s.tar.gz\n' "$artifact_name"
