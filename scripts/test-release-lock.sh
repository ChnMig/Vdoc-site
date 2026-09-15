#!/usr/bin/env bash
set -euo pipefail

SITE_ROOT="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
tmp="$(mktemp -d)"
trap 'rm -rf -- "$tmp"' EXIT
export RELEASE_TEST_GIT="$(command -v git)"
export RELEASE_TEST_REMOTES="$tmp/remotes"
mkdir -p "$tmp/remotes" "$tmp/bin" "$tmp/workspace"
cp "$SITE_ROOT/workspace/workspace-distribution.json" "$tmp/workspace/"
cp "$SITE_ROOT/workspace/workspace.lock.json" "$tmp/template.json"
version="$(jq -r .version "$tmp/workspace/workspace-distribution.json")"
tag="v$version"

for repo in Vdoc Vdoc-admin Vdoc-mcp Vdoc-site Vdoc-skill; do
  git init --quiet --initial-branch=main "$tmp/$repo"
  git -C "$tmp/$repo" config user.email release-test@example.test
  git -C "$tmp/$repo" config user.name 'Release Test'
  printf '{"name":"%s","version":"%s"}\n' "$repo" "$version" >"$tmp/$repo/package.json"
  git -C "$tmp/$repo" add package.json
  git -C "$tmp/$repo" commit --quiet -m fixture
  git -C "$tmp/$repo" tag -a "$tag" -m fixture
  git init --quiet --bare "$tmp/remotes/$repo.git"
  git -C "$tmp/$repo" push --quiet "$tmp/remotes/$repo.git" main refs/tags/$tag
  git -C "$tmp/$repo" remote add origin "https://github.com/ChnMig/$repo.git"
  commit="$(git -C "$tmp/$repo" rev-parse HEAD)"
  if [[ "$repo" != Vdoc-site ]]; then
    jq --arg path "$repo" --arg commit "$commit" '(.repositories[] | select(.path == $path) | .commit) = $commit' "$tmp/template.json" >"$tmp/next.json"
    mv "$tmp/next.json" "$tmp/template.json"
  fi
done

# Use real Git refs in isolated local repositories; no GitHub access or mutation.
cat >"$tmp/bin/git" <<'SH'
#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == ls-remote ]]; then
  [[ "${RELEASE_TEST_OFFLINE:-0}" != 1 ]] || exit 92
  [[ "$2" == --exit-code && "$3" == https://github.com/ChnMig/*.git ]] || exit 93
  remote="${3##*/}"
  exec "$RELEASE_TEST_GIT" ls-remote --exit-code "$RELEASE_TEST_REMOTES/$remote" "${@:4}"
fi
exec "$RELEASE_TEST_GIT" "$@"
SH
chmod +x "$tmp/bin/git"
export PATH="$tmp/bin:$PATH"
export VDOC_WORKSPACE_ROOT="$tmp/workspace"
resolver="$SITE_ROOT/workspace/scripts/vdoc-workspace-resolve-release.sh"
reset_lock() { cp "$tmp/template.json" "$tmp/workspace/workspace.lock.json"; }
resolve_lock() { bash "$resolver" --site-dir "$tmp/Vdoc-site" "$@"; }
expect_failure() {
  local expected="$1"
  shift
  if "$@" >"$tmp/out" 2>"$tmp/err"; then
    printf 'Unexpected success: %s\n' "$expected" >&2
    exit 1
  fi
  grep -Fq "$expected" "$tmp/err" || { cat "$tmp/err" >&2; exit 1; }
}

reset_lock
resolve_lock
site_commit="$(git -C "$tmp/Vdoc-site" rev-parse HEAD)"
jq -e --arg commit "$site_commit" '.candidate != true and all(.repositories[]; .commit | test("^[0-9a-f]{40}$")) and (.repositories[] | select(.path == "Vdoc-site") | .commit == $commit)' "$tmp/workspace/workspace.lock.json" >/dev/null

# actions/checkout uses the HTTPS origin without a .git suffix.
git -C "$tmp/Vdoc-site" remote set-url origin https://github.com/ChnMig/Vdoc-site
reset_lock
resolve_lock
git -C "$tmp/Vdoc-site" remote set-url origin https://example.test/Vdoc-site.git
reset_lock
expect_failure 'unexpected origin' resolve_lock
git -C "$tmp/Vdoc-site" remote set-url origin https://github.com/ChnMig/Vdoc-site.git

reset_lock
GITHUB_REF=refs/tags/v0.0.0 expect_failure 'workflow tag does not match' resolve_lock

reset_lock
tag_object="$(git --git-dir="$tmp/remotes/Vdoc.git" rev-parse refs/tags/$tag)"
git --git-dir="$tmp/remotes/Vdoc.git" update-ref -d refs/tags/$tag
expect_failure "publish refs/tags/$tag" resolve_lock
cmp "$tmp/template.json" "$tmp/workspace/workspace.lock.json"
git --git-dir="$tmp/remotes/Vdoc.git" update-ref refs/tags/$tag "$tag_object"

reset_lock
jq '(.repositories[] | select(.path == "Vdoc") | .commit) = "1111111111111111111111111111111111111111"' "$tmp/template.json" >"$tmp/workspace/workspace.lock.json"
expect_failure 'expected 1111111111111111111111111111111111111111' resolve_lock

reset_lock
printf 'dirty\n' >"$tmp/Vdoc-site/uncommitted.txt"
expect_failure 'commit the Site changes' resolve_lock
rm "$tmp/Vdoc-site/uncommitted.txt"

reset_lock
jq '(.repositories[] | select(.path == "Vdoc-admin") | .commit) = "@release"' "$tmp/template.json" >"$tmp/workspace/workspace.lock.json"
expect_failure 'only Site may use @release' resolve_lock

reset_lock
RELEASE_TEST_OFFLINE=1 resolve_lock --candidate
jq -e '.candidate == true' "$tmp/workspace/workspace.lock.json" >/dev/null
for script in vdoc-workspace-init.sh vdoc-workspace-verify.sh; do
  expect_failure 'candidate bootstrap is for local checks only' bash "$SITE_ROOT/workspace/scripts/$script"
done
printf 'Release lock tests passed: exact tags, moved/missing refs, source identity, atomic failure, and candidate isolation.\n'
