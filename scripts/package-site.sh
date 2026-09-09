#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
DIST_ROOT="$SITE_ROOT/docs/.vitepress/dist"
OUTPUT_DIR="$SITE_ROOT/.artifacts/release"
artifact_name="$(jq -r '.artifact_name' "$SITE_ROOT/workspace/workspace-distribution.json")"

[[ -f "$DIST_ROOT/index.html" ]] || {
  printf 'Build the site before packaging: pnpm build:root\n' >&2
  exit 1
}
for file in "$artifact_name.tar.gz" "$artifact_name.tar.gz.sha256"; do
  cmp "$SITE_ROOT/docs/public/downloads/$file" "$DIST_ROOT/downloads/$file" || {
    printf 'Built download is missing or stale: %s; regenerate downloads and rebuild the site\n' "$file" >&2
    exit 1
  }
done
(
  cd "$DIST_ROOT/downloads"
  shasum -a 256 -c "$artifact_name.tar.gz.sha256"
)

stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
COPYFILE_DISABLE=1 tar -czf "$stage/vdoc-site-static.tar.gz" -C "$DIST_ROOT" .
(
  cd "$stage"
  shasum -a 256 vdoc-site-static.tar.gz >vdoc-site-static.tar.gz.sha256
)
cp "$DIST_ROOT/downloads/$artifact_name.tar.gz" "$stage/"
cp "$DIST_ROOT/downloads/$artifact_name.tar.gz.sha256" "$stage/"
mkdir -p "$OUTPUT_DIR"
rm -f -- "$OUTPUT_DIR"/*.tar.gz "$OUTPUT_DIR"/*.sha256
cp "$stage/"* "$OUTPUT_DIR/"
printf 'Site and Compose release artifacts prepared: %s\n' "$OUTPUT_DIR"
