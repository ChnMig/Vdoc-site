#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
[[ $# -eq 0 ]] || fail 'Usage: scripts/vdoc-prebuilt-install.sh (loads the images pinned by this release)'
for command in curl jq shasum docker; do command -v "$command" >/dev/null || fail "Required command: $command"; done
version="$(jq -er '.version' "$ROOT_DIR/workspace-distribution.json")"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail 'Invalid distribution version'
tag="v$version"
if jq -e ' .candidate == true' "$ROOT_DIR/workspace.lock.json" >/dev/null; then fail "Candidate archives cannot be installed; download the published release"; fi
jq -e --arg ref "refs/tags/$tag" 'all(.repositories[]; .ref == $ref)' "$ROOT_DIR/workspace.lock.json" >/dev/null || fail 'Source lock must match the release tag'
daemon="$(docker info --format '{{.OSType}}/{{.Architecture}}')" || fail 'Start Docker before installing images'
case "$daemon" in
  linux/amd64|linux/x86_64) arch=amd64 ;;
  linux/arm64|linux/aarch64) arch=arm64 ;;
  *) fail "Unsupported Docker platform: $daemon; use Linux containers on amd64 or arm64" ;;
esac
stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
for pair in backend:Vdoc admin:Vdoc-admin; do
  component="${pair%%:*}"
  repository="${pair#*:}"
  commit="$(jq -er --arg repo "$repository" '.repositories[] | select(.path == $repo) | .commit' "$ROOT_DIR/workspace.lock.json")"
  [[ "$commit" =~ ^[0-9a-f]{40}$ ]] || fail "Missing immutable source for $repository"
  archive="vdoc-${component}_${tag}_linux_${arch}.docker.tar.gz"
  base="https://github.com/ChnMig/$repository/releases/download/$tag"
  curl -fL --retry 3 --connect-timeout 15 --max-time 600 "$base/$archive" -o "$stage/$archive"
  curl -fL --retry 3 --connect-timeout 15 --max-time 60 "$base/$archive.sha256" -o "$stage/$archive.sha256"
  [[ "$(wc -l <"$stage/$archive.sha256" | tr -d ' ')" == 1 ]] || fail 'Unexpected checksum file'
  read -r expected filename <"$stage/$archive.sha256"
  [[ "$expected" =~ ^[0-9a-f]{64}$ && "$filename" == "$archive" ]] || fail 'Checksum must name exactly the requested image archive'
  actual="$(shasum -a 256 "$stage/$archive" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || fail "Checksum mismatch: $archive"
  docker load --input "$stage/$archive"
  image="vdoc-$component:$tag"
  [[ "$(docker image inspect "$image" --format '{{.Os}}/{{.Architecture}}')" == "linux/$arch" ]] || fail "Wrong image platform: $image"
  [[ "$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.version"}}')" == "$tag" ]] || fail "Wrong image version: $image"
  [[ "$(docker image inspect "$image" --format '{{index .Config.Labels "org.opencontainers.image.revision"}}')" == "$commit" ]] || fail "Image source does not match the lock: $image"
  printf 'Verified %s (%s)\n' "$image" "$commit"
done
printf 'Images are ready. After configuring .env, run: docker compose --env-file .env up -d --no-build\n'
