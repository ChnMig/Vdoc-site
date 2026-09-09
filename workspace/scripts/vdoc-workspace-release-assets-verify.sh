#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)}"
MANIFEST_FILE="${VDOC_WORKSPACE_DISTRIBUTION_FILE:-$ROOT_DIR/workspace-distribution.json}"
CURL_BIN="${VDOC_CURL_BIN:-curl}"
RELEASE_BASE_URL=""
EXPECTED_SHA256=""
LOCAL_ARTIFACT=""

usage() {
  cat <<'USAGE'
Usage: scripts/vdoc-workspace-release-assets-verify.sh \
  --release-base-url URL [--expected-sha256 HEX] [--local-artifact PATH]

Download the published Docker Compose bootstrap and its .sha256 sidecar, then
verify the public bytes. This is a post-publication gate; it must not run as a
pre-publication package check.

Options:
  --release-base-url URL  Immutable GitHub release download base, ending in a tag.
  --expected-sha256 HEX   Optional expected archive digest from the release record.
  --local-artifact PATH   Optional local candidate that must match the public bytes.
  -h, --help              Show this help.
USAGE
}

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release-base-url)
      [[ $# -ge 2 ]] || fail '--release-base-url requires a value'
      RELEASE_BASE_URL="$2"
      shift 2
      ;;
    --expected-sha256)
      [[ $# -ge 2 ]] || fail '--expected-sha256 requires a value'
      EXPECTED_SHA256="$2"
      shift 2
      ;;
    --local-artifact)
      [[ $# -ge 2 ]] || fail '--local-artifact requires a path'
      LOCAL_ARTIFACT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *) fail "unknown argument: $1" ;;
  esac
done

[[ -n "$RELEASE_BASE_URL" ]] || { usage >&2; exit 2; }
[[ "$RELEASE_BASE_URL" =~ ^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/releases/download/[A-Za-z0-9._-]+$ ]] || \
  fail 'release base URL must be an immutable GitHub release download URL without query or fragment'
if [[ -n "$EXPECTED_SHA256" && ! "$EXPECTED_SHA256" =~ ^[0-9a-f]{64}$ ]]; then
  fail '--expected-sha256 must be 64 lowercase hexadecimal characters'
fi

command -v "$CURL_BIN" >/dev/null 2>&1 || fail "required command not found: $CURL_BIN"
command -v jq >/dev/null 2>&1 || fail 'required command not found: jq'
command -v shasum >/dev/null 2>&1 || fail 'required command not found: shasum'
[[ -f "$MANIFEST_FILE" && ! -L "$MANIFEST_FILE" ]] || fail "distribution manifest not found: $MANIFEST_FILE"

artifact_name="$(jq -er '.artifact_name | select(type == "string" and test("^[A-Za-z0-9._-]+$"))' "$MANIFEST_FILE")" || \
  fail 'distribution manifest has an invalid artifact_name'
archive_name="$artifact_name.tar.gz"
checksum_name="$archive_name.sha256"

tmp="$(mktemp -d)"
cleanup() {
  rm -rf -- "$tmp"
}
trap cleanup EXIT

archive="$tmp/$archive_name"
checksum="$tmp/$checksum_name"
"$CURL_BIN" --fail --location --silent --show-error \
  --output "$archive" "$RELEASE_BASE_URL/$archive_name" || \
  fail "published archive is unavailable: $RELEASE_BASE_URL/$archive_name"
"$CURL_BIN" --fail --location --silent --show-error \
  --output "$checksum" "$RELEASE_BASE_URL/$checksum_name" || \
  fail "published checksum is unavailable: $RELEASE_BASE_URL/$checksum_name"

[[ -s "$archive" && -s "$checksum" ]] || fail 'published archive or checksum is empty'
[[ "$(wc -l <"$checksum" | tr -d ' ')" == 1 ]] || fail 'published checksum must contain exactly one line'
read -r declared_sha declared_name extra <"$checksum"
[[ -z "${extra:-}" ]] || fail 'published checksum contains unexpected fields'
[[ "$declared_sha" =~ ^[0-9a-f]{64}$ ]] || fail 'published checksum has an invalid SHA-256 value'
[[ "$declared_name" == "$archive_name" ]] || fail "published checksum names unexpected artifact: $declared_name"

actual_sha="$(shasum -a 256 "$archive" | awk '{print $1}')"
[[ "$actual_sha" == "$declared_sha" ]] || fail 'published archive does not match its checksum sidecar'
if [[ -n "$EXPECTED_SHA256" ]]; then
  [[ "$actual_sha" == "$EXPECTED_SHA256" ]] || fail 'published archive does not match --expected-sha256'
fi
if [[ -n "$LOCAL_ARTIFACT" ]]; then
  [[ -f "$LOCAL_ARTIFACT" && ! -L "$LOCAL_ARTIFACT" ]] || fail "local artifact is missing, not regular, or a symlink: $LOCAL_ARTIFACT"
  local_sha="$(shasum -a 256 "$LOCAL_ARTIFACT" | awk '{print $1}')"
  [[ "$local_sha" == "$actual_sha" ]] || fail 'published archive bytes differ from the local release candidate'
fi

printf 'Published Docker Compose bootstrap verified: %s\n' "$RELEASE_BASE_URL/$archive_name"
printf 'SHA-256: %s\n' "$actual_sha"
