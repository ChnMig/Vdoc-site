#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
CANDIDATE=0
if [[ "${1:-}" == --candidate && $# -eq 1 ]]; then
  CANDIDATE=1
elif [[ $# -ne 0 ]]; then
  printf 'Usage: scripts/package-workspace.sh [--candidate]\n' >&2
  exit 1
fi
node "$SITE_ROOT/scripts/sync-workspace.mjs" --check

stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
mkdir -p "$stage/vdoc-workspace"
COPYFILE_DISABLE=1 cp -R "$SITE_ROOT/workspace/." "$stage/vdoc-workspace/"

# Keep packaging tied to the shipped verifier and public locked refs.
unset VDOC_WORKSPACE_LOCK_FILE VDOC_WORKSPACE_DISTRIBUTION_FILE
unset VDOC_WORKSPACE_VERIFY_SCRIPT VDOC_CONTROL_PLANE_DIGEST_SCRIPT
export VDOC_WORKSPACE_ROOT="$stage/vdoc-workspace"
set --
if [[ "$CANDIDATE" -eq 1 ]]; then set -- --candidate; fi
"$VDOC_WORKSPACE_ROOT/scripts/vdoc-workspace-resolve-release.sh" --site-dir "$SITE_ROOT" "$@"
if [[ "$CANDIDATE" -eq 0 ]]; then
  "$VDOC_WORKSPACE_ROOT/scripts/vdoc-workspace-init.sh"
fi
"$VDOC_WORKSPACE_ROOT/scripts/vdoc-workspace-package.sh" --output-dir "$stage/output" "$@"

artifact_name="$(jq -r '.artifact_name' "$VDOC_WORKSPACE_ROOT/workspace-distribution.json")"
mkdir -p "$SITE_ROOT/docs/public/downloads"
# Keep exactly the current archive and checksum; obsolete downloads must not ship.
find "$SITE_ROOT/docs/public/downloads" -maxdepth 1 -type f \( -name 'vdoc-compose-bootstrap-*.tar.gz' -o -name 'vdoc-compose-bootstrap-*.tar.gz.sha256' \) -delete
cp "$stage/output/$artifact_name.tar.gz" "$SITE_ROOT/docs/public/downloads/"
cp "$stage/output/$artifact_name.tar.gz.sha256" "$SITE_ROOT/docs/public/downloads/"
printf 'Website download prepared: docs/public/downloads/%s.tar.gz\n' "$artifact_name"

cp "$SITE_ROOT/workspace/deploy/docker-compose.yml" "$SITE_ROOT/docs/public/downloads/docker-compose.yml"
(cd "$SITE_ROOT/docs/public/downloads" && shasum -a 256 docker-compose.yml >docker-compose.yml.sha256)
printf 'Standalone deployment prepared: docs/public/downloads/docker-compose.yml\n'
