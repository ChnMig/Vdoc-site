#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${VDOC_WORKSPACE_ROOT:-$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)}"
SITE_DIR="$ROOT_DIR/Vdoc-site"
CANDIDATE=0

fail() { printf 'FAIL: %s\n' "$1" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --site-dir) [[ $# -ge 2 ]] || fail '--site-dir requires a path'; SITE_DIR="$2"; shift 2 ;;
    --candidate) CANDIDATE=1; shift ;;
    *) fail 'Usage: vdoc-workspace-resolve-release.sh --site-dir PATH [--candidate]' ;;
  esac
done

lock="$ROOT_DIR/workspace.lock.json"
version="$(jq -er '.version' "$ROOT_DIR/workspace-distribution.json")"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail 'invalid release version'
ref="refs/tags/v$version"
if [[ "${GITHUB_REF:-}" == refs/tags/* && "${GITHUB_REF:-}" != "$ref" ]]; then
  fail 'workflow tag does not match the Compose release version'
fi
jq -e --arg ref "$ref" '
  .schemaVersion == 2 and
  ([.repositories[].path] | sort) == ["Vdoc", "Vdoc-admin", "Vdoc-mcp", "Vdoc-site", "Vdoc-skill"] and
  all(.repositories[];
    .remote == ("https://github.com/ChnMig/" + .path + ".git") and
    .ref == $ref and
    ((.commit | type == "string" and test("^[0-9a-f]{40}$")) or
     (.path == "Vdoc-site" and .commit == "@release"))
  )
' "$lock" >/dev/null || fail 'release lock must pin all five public repositories to the release tag; only Site may use @release'

site_commit="$(git -C "$SITE_DIR" rev-parse HEAD)"
[[ "$site_commit" =~ ^[0-9a-f]{40}$ ]] || fail 'cannot resolve Site checkout'
[[ "$(jq -r '.version' "$SITE_DIR/package.json")" == "$version" ]] || fail 'Site package version does not match the release'
site_origin="$(git -C "$SITE_DIR" remote get-url origin)"
case "${site_origin%.git}" in
  https://github.com/ChnMig/Vdoc-site|git@github.com:ChnMig/Vdoc-site) ;;
  *) fail 'Site checkout has an unexpected origin' ;;
esac

if [[ "$CANDIDATE" -eq 0 ]]; then
  [[ -z "$(git -C "$SITE_DIR" status --porcelain=v1 --untracked-files=all)" ]] || fail 'commit the Site changes before building a published release'
  while IFS=$'\t' read -r path remote expected; do
    [[ "$expected" != '@release' ]] || expected="$site_commit"
    output="$(GIT_TERMINAL_PROMPT=0 git ls-remote --exit-code "$remote" "$ref" "${ref}^{}")" || fail "$path: publish $ref before packaging"
    direct="$(printf '%s\n' "$output" | awk -v ref="$ref" '$2 == ref {print $1}')"
    peeled="$(printf '%s\n' "$output" | awk -v ref="${ref}^{}" '$2 == ref {print $1}')"
    [[ "$direct" =~ ^[0-9a-f]{40}$ && ( -z "$peeled" || "$peeled" =~ ^[0-9a-f]{40}$ ) ]] || fail "$path: invalid advertised tag"
    actual="${peeled:-$direct}"
    [[ "$actual" == "$expected" ]] || fail "$path: $ref points to $actual, expected $expected"
    if [[ "$path" == Vdoc-site && "$actual" != "$site_commit" ]]; then
      fail 'Site release must be built from its tagged checkout'
    fi
  done < <(jq -r '.repositories[] | [.path, .remote, .commit] | @tsv' "$lock")
fi

resolved="$(mktemp "$ROOT_DIR/.release-lock.XXXXXX")"
trap 'rm -f -- "$resolved"' EXIT
jq --arg commit "$site_commit" --argjson candidate "$CANDIDATE" '
  (.repositories[] | select(.path == "Vdoc-site") | .commit) = $commit |
  if $candidate == 1 then .candidate = true else del(.candidate) end
' "$lock" >"$resolved"
mv "$resolved" "$lock"
if [[ "$CANDIDATE" -eq 1 ]]; then
  printf 'Candidate lock prepared for local checks only; deployment and release packaging are disabled.\n'
else
  printf 'Release lock verified: five %s tags and exact commits.\n' "$ref"
fi
