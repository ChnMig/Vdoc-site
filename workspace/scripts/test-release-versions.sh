#!/usr/bin/env bash
set -euo pipefail

# Exercise the published path with real isolated Git tags and archive bytes.
# GitHub downloads and Docker image metadata are supplied by offline fixtures.
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
unset VDOC_WORKSPACE_ROOT VDOC_WORKSPACE_LOCK_FILE VDOC_WORKSPACE_DISTRIBUTION_FILE
unset VDOC_WORKSPACE_VERIFY_SCRIPT VDOC_CONTROL_PLANE_DIGEST_SCRIPT
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
export RELEASE_TEST_GIT="$(command -v git)"
mkdir -p "$tmp/bin"

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }
expect_failure() {
  local expected="$1"
  shift
  if "$@" >"$tmp/out" 2>"$tmp/err"; then
    fail "unexpected success: $expected"
  fi
  grep -Fq "$expected" "$tmp/err" || { cat "$tmp/err" >&2; fail "missing error: $expected"; }
}

cat >"$tmp/bin/git" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == ls-remote ]]; then
  [[ "$2" == --exit-code && "$3" == https://github.com/ChnMig/*.git ]] || exit 93
  remote="${3##*/}"
  exec "$RELEASE_TEST_GIT" ls-remote --exit-code "$RELEASE_TEST_REMOTES/$remote" "${@:4}"
fi
exec "$RELEASE_TEST_GIT" "$@"
SH
cat >"$tmp/bin/curl" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
url= output=
while [[ $# -gt 0 ]]; do
  case "$1" in
    https://*) url="$1"; shift ;;
    -o) output="$2"; shift 2 ;;
    *) shift ;;
  esac
done
case "$url" in
  https://github.com/ChnMig/Vdoc/releases/download/*) component=backend ;;
  https://github.com/ChnMig/Vdoc-admin/releases/download/*) component=admin ;;
  *) exit 94 ;;
esac
archive="vdoc-${component}_v${RELEASE_TEST_VERSION}_linux_amd64.docker.tar.gz"
base="${url%/*}"
[[ "${base##*/}" == "v$RELEASE_TEST_VERSION" ]] || exit 95
name="${url##*/}"
printf '%s\n' "$url" >>"$RELEASE_TEST_DOWNLOADS"
if [[ "$name" == "$archive.sha256" ]]; then
  digest="$(printf 'fixture image %s %s' "$RELEASE_TEST_VERSION" "$component" | shasum -a 256 | awk '{print $1}')"
  printf '%s  %s\n' "$digest" "$archive" >"$output"
else
  [[ "$name" == "$archive" ]] || exit 96
  printf 'fixture image %s %s' "$RELEASE_TEST_VERSION" "$component" >"$output"
fi
SH
cat >"$tmp/bin/docker" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
  info) printf 'linux/amd64\n' ;;
  load) printf '%s\n' "$*" >>"$RELEASE_TEST_LOADS" ;;
  image)
    case "$3" in
      "vdoc-backend:v$RELEASE_TEST_VERSION") repo=Vdoc ;;
      "vdoc-admin:v$RELEASE_TEST_VERSION") repo=Vdoc-admin ;;
      *) exit 97 ;;
    esac
    case "$5" in
      *'.Os'*) printf 'linux/amd64\n' ;;
      *'image.version'*) printf 'v%s\n' "$RELEASE_TEST_VERSION" ;;
      *'image.revision'*) jq -er --arg repo "$repo" '.repositories[] | select(.path == $repo) | .commit' "$RELEASE_TEST_LOCK" ;;
      *) exit 98 ;;
    esac ;;
  *) exit 99 ;;
esac
SH
chmod +x "$tmp/bin/"*
export PATH="$tmp/bin:$PATH"

prepare_fixture() {
  local version="$1" repo commit digest
  workspace="$tmp/workspace-$version"
  export RELEASE_TEST_VERSION="$version"
  export RELEASE_TEST_REMOTES="$tmp/remotes-$version"
  export RELEASE_TEST_DOWNLOADS="$tmp/downloads-$version"
  export RELEASE_TEST_LOADS="$tmp/loads-$version"
  mkdir -p "$workspace" "$RELEASE_TEST_REMOTES"
  while IFS= read -r file; do
    mkdir -p "$workspace/$(dirname -- "$file")"
    cp -p "$ROOT_DIR/$file" "$workspace/$file"
  done < <(jq -r '.files[]' "$ROOT_DIR/workspace-distribution.json")
  jq --arg version "$version" '
    .version = $version | .artifact_name = ("vdoc-compose-bootstrap-v" + $version)
  ' "$workspace/workspace-distribution.json" >"$tmp/manifest.json"
  mv "$tmp/manifest.json" "$workspace/workspace-distribution.json"
  jq --arg ref "refs/tags/v$version" '.repositories[].ref = $ref | del(.candidate)' \
    "$workspace/workspace.lock.json" >"$tmp/lock.json"
  mv "$tmp/lock.json" "$workspace/workspace.lock.json"
  for repo in Vdoc Vdoc-admin Vdoc-mcp Vdoc-site; do
    git init --quiet --initial-branch=main "$workspace/$repo"
    git -C "$workspace/$repo" config user.email release-test@example.test
    git -C "$workspace/$repo" config user.name 'Release Test'
    printf '{"name":"%s","version":"%s"}\n' "$repo" "$version" >"$workspace/$repo/package.json"
    git -C "$workspace/$repo" add package.json
    git -C "$workspace/$repo" commit --quiet -m fixture
    git -C "$workspace/$repo" tag -a "v$version" -m fixture
    git init --quiet --bare "$RELEASE_TEST_REMOTES/$repo.git"
    git -C "$workspace/$repo" push --quiet "$RELEASE_TEST_REMOTES/$repo.git" main "refs/tags/v$version"
    git -C "$workspace/$repo" remote add origin "https://github.com/ChnMig/$repo.git"
    commit="$(git -C "$workspace/$repo" rev-parse HEAD)"
    [[ "$repo" != Vdoc-site ]] || commit=@release
    jq --arg repo "$repo" --arg commit "$commit" '
      (.repositories[] | select(.path == $repo) | .commit) = $commit
    ' "$workspace/workspace.lock.json" >"$tmp/lock.json"
    mv "$tmp/lock.json" "$workspace/workspace.lock.json"
  done
  digest="$(VDOC_WORKSPACE_ROOT="$workspace" "$workspace/scripts/vdoc-control-plane-digest.sh")"
  jq --arg digest "$digest" '.controlPlane.sha256 = $digest' "$workspace/workspace.lock.json" >"$tmp/lock.json"
  mv "$tmp/lock.json" "$workspace/workspace.lock.json"
}

run_published_path() {
  local version="$1" archive extracted
  prepare_fixture "$version"
  printf 'test: matching %s resolves all tags, packages, and installs pinned images\n' "$version"
  GITHUB_REF="refs/tags/v$version" VDOC_WORKSPACE_ROOT="$workspace" \
    bash "$workspace/scripts/vdoc-workspace-resolve-release.sh" --site-dir "$workspace/Vdoc-site"
  jq -e --arg ref "refs/tags/v$version" '
    .candidate != true and all(.repositories[]; .ref == $ref and (.commit | test("^[0-9a-f]{40}$")))
  ' "$workspace/workspace.lock.json" >/dev/null || fail 'resolver did not produce the immutable matching release lock'
  VDOC_WORKSPACE_ROOT="$workspace" bash "$workspace/scripts/vdoc-workspace-package.sh" --output-dir "$workspace/release"
  archive="vdoc-compose-bootstrap-v$version.tar.gz"
  (cd "$workspace/release" && shasum -a 256 -c "$archive.sha256")
  extracted="$tmp/extracted-$version"
  mkdir -p "$extracted"
  tar -xzf "$workspace/release/$archive" -C "$extracted"
  [[ "$(jq -r .version "$extracted/vdoc-workspace/workspace-distribution.json")" == "$version" ]] || fail 'archive lost its version'
  export RELEASE_TEST_LOCK="$extracted/vdoc-workspace/workspace.lock.json"
  bash "$extracted/vdoc-workspace/scripts/vdoc-prebuilt-install.sh"
  [[ "$(wc -l <"$RELEASE_TEST_LOADS" | tr -d ' ')" == 2 ]] || fail 'both pinned images were not installed'
  [[ "$(wc -l <"$RELEASE_TEST_DOWNLOADS" | tr -d ' ')" == 4 ]] || fail 'image archives and checksums were not downloaded'
  grep -Fq "/v$version/vdoc-backend_v${version}_linux_amd64.docker.tar.gz" "$RELEASE_TEST_DOWNLOADS" || fail 'backend download did not preserve the complete release tag'
  grep -Fq "/v$version/vdoc-admin_v${version}_linux_amd64.docker.tar.gz" "$RELEASE_TEST_DOWNLOADS" || fail 'Admin download did not preserve the complete release tag'

  printf 'test: %s rejects tag/package/lock mismatches before any downloads\n' "$version"
  GITHUB_REF=refs/tags/v9.9.9 VDOC_WORKSPACE_ROOT="$workspace" \
    expect_failure 'workflow tag does not match' bash "$workspace/scripts/vdoc-workspace-resolve-release.sh" --site-dir "$workspace/Vdoc-site"
  cp "$workspace/Vdoc-site/package.json" "$tmp/site-package.json"
  jq '.version = "9.9.9"' "$tmp/site-package.json" >"$workspace/Vdoc-site/package.json"
  VDOC_WORKSPACE_ROOT="$workspace" expect_failure 'Site package version does not match' \
    bash "$workspace/scripts/vdoc-workspace-resolve-release.sh" --site-dir "$workspace/Vdoc-site"
  cp "$tmp/site-package.json" "$workspace/Vdoc-site/package.json"
  jq '(.repositories[] | select(.path == "Vdoc-admin") | .ref) = "refs/tags/v9.9.9"' "$RELEASE_TEST_LOCK" >"$tmp/lock.json"
  mv "$tmp/lock.json" "$RELEASE_TEST_LOCK"
  rm "$RELEASE_TEST_DOWNLOADS" "$RELEASE_TEST_LOADS"
  expect_failure 'Source lock must match the release tag' bash "$extracted/vdoc-workspace/scripts/vdoc-prebuilt-install.sh"
  [[ ! -e "$RELEASE_TEST_DOWNLOADS" && ! -e "$RELEASE_TEST_LOADS" ]] || fail 'mismatched release performed installation'
}

run_published_path 0.3.9
run_published_path 0.3.9-rc.1

printf 'test: numeric, alphanumeric, and hyphenated prerelease identifiers are accepted\n'
for version in 0.3.9-0 0.3.9-alpha.1 0.3.9-01a.x-y-z; do
  jq --arg version "$version" '.version = $version | .artifact_name = ("vdoc-compose-bootstrap-v" + $version)' \
    "$workspace/workspace-distribution.json" >"$tmp/manifest.json"
  mv "$tmp/manifest.json" "$workspace/workspace-distribution.json"
  jq --arg ref "refs/tags/v$version" '.repositories[].ref = $ref' \
    "$workspace/workspace.lock.json" >"$tmp/lock.json"
  mv "$tmp/lock.json" "$workspace/workspace.lock.json"
  jq --arg version "$version" '.version = $version' "$workspace/Vdoc-site/package.json" >"$tmp/manifest.json"
  mv "$tmp/manifest.json" "$workspace/Vdoc-site/package.json"
  GITHUB_REF="refs/tags/v$version" VDOC_WORKSPACE_ROOT="$workspace" \
    bash "$workspace/scripts/vdoc-workspace-resolve-release.sh" --site-dir "$workspace/Vdoc-site" --candidate
  digest="$(VDOC_WORKSPACE_ROOT="$workspace" "$workspace/scripts/vdoc-control-plane-digest.sh")"
  jq --arg digest "$digest" '.controlPlane.sha256 = $digest' "$workspace/workspace.lock.json" >"$tmp/lock.json"
  mv "$tmp/lock.json" "$workspace/workspace.lock.json"
  VDOC_WORKSPACE_ROOT="$workspace" bash "$workspace/scripts/vdoc-workspace-package.sh" --candidate --output-dir "$workspace/release-$version"
  expect_failure 'Candidate archives cannot be installed' bash "$workspace/scripts/vdoc-prebuilt-install.sh"
done

printf 'test: malformed SemVer and unsupported build metadata are rejected by release entry points\n'
invalid_versions=(0.3 00.3.9 0.03.9 0.3.09 0.3.9- 0.3.9-.rc 0.3.9-rc. 0.3.9-rc..1 0.3.9-01 0.3.9-rc.01 0.3.9-rc_1 0.3.9+build.1)
for version in "${invalid_versions[@]}"; do
  jq --arg version "$version" '.version = $version' "$workspace/workspace-distribution.json" >"$tmp/manifest.json"
  mv "$tmp/manifest.json" "$workspace/workspace-distribution.json"
  VDOC_WORKSPACE_ROOT="$workspace" expect_failure 'invalid release version' \
    bash "$workspace/scripts/vdoc-workspace-resolve-release.sh" --site-dir "$workspace/Vdoc-site"
  VDOC_WORKSPACE_ROOT="$workspace" expect_failure 'invalid workspace distribution manifest' \
    bash "$workspace/scripts/vdoc-workspace-package.sh" --list
  expect_failure 'Invalid distribution version' bash "$workspace/scripts/vdoc-prebuilt-install.sh"
  for repo in Vdoc Vdoc-admin Vdoc-mcp; do
    [[ -f "$ROOT_DIR/$repo/scripts/package-release.sh" ]] || continue
    expect_failure 'prerelease suffix' bash "$ROOT_DIR/$repo/scripts/package-release.sh" "v$version"
  done
  for repo in Vdoc Vdoc-admin; do
    [[ -f "$ROOT_DIR/$repo/scripts/package-image.sh" ]] || continue
    expect_failure 'Invalid release tag' bash "$ROOT_DIR/$repo/scripts/package-image.sh" "v$version" amd64
    if bash "$ROOT_DIR/$repo/scripts/publish-image.sh" "v$version" "$tmp"; then fail "publisher accepted v$version"; fi
    if bash "$ROOT_DIR/$repo/scripts/promote-latest-image.sh" "v$version"; then fail "latest promotion accepted v$version"; fi
  done
  printf '  rejected %s before packaging or installation\n' "$version"
done
printf 'test: valid prereleases cannot promote latest or pass the Pages gate\n'
for repo in Vdoc Vdoc-admin; do
  [[ -f "$ROOT_DIR/$repo/scripts/promote-latest-image.sh" ]] || continue
  bash "$ROOT_DIR/$repo/scripts/promote-latest-image.sh" v0.3.9-rc.1 >"$tmp/latest"
  grep -Fq 'Skipping latest for prerelease' "$tmp/latest" || fail 'prerelease did not skip latest promotion'
done
if [[ -f "$ROOT_DIR/Vdoc-site/scripts/verify-pages-download.mjs" ]]; then
  expect_failure 'Pages requires a stable release tag' \
    node "$ROOT_DIR/Vdoc-site/scripts/verify-pages-download.mjs" "$tmp" v0.3.9-rc.1
fi
printf 'Release version tests passed: stable and rc published paths, immutable refs, exact image URLs, and malformed version guards.\n'
