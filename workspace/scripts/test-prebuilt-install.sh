#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
stage="$(mktemp -d)"
trap 'rm -rf -- "$stage"' EXIT
mkdir -p "$stage/bin" "$stage/scripts"
cp "$ROOT_DIR/scripts/vdoc-prebuilt-install.sh" "$ROOT_DIR/scripts/vdoc-local-bootstrap.sh" "$stage/scripts/"
cp "$ROOT_DIR/.env.example" "$stage/.env.example"
printf '{"version":"0.2.0"}\n' >"$stage/workspace-distribution.json"
jq -n '{repositories: [{path:"Vdoc", ref:"refs/tags/v0.2.0", commit:("a"*40)}, {path:"Vdoc-admin", ref:"refs/tags/v0.2.0", commit:("a"*40)}]}' >"$stage/workspace.lock.json"
cat >"$stage/bin/docker" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
case "$1" in
 info) printf 'linux/aarch64\n' ;;
 load) printf '%s\n' "$*" >>"$DOCKER_LOG" ;;
 image)
  case "$*" in
   *'.Os'*) printf 'linux/arm64\n' ;;
   *'image.version'*) printf 'v0.2.0\n' ;;
   *'image.revision'*)
     if [[ "${WRONG_REVISION:-0}" == 1 ]]; then printf '%040d\n' 0; else printf '%s\n' aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa; fi ;;
   *) exit 2 ;;
  esac ;;
 *) exit 2 ;;
esac
MOCK
cat >"$stage/bin/curl" <<'MOCK'
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
name="${url##*/}"
if [[ "$name" == *.sha256 ]]; then
 digest="$(printf 'vdoc-test-image' | shasum -a 256 | awk '{print $1}')"
 [[ "${BAD_CHECKSUM:-0}" != 1 ]] || digest="$(printf '%064d' 0)"
 printf '%s  %s\n' "$digest" "${name%.sha256}" >"$output"
else
 [[ "$name" == *_linux_arm64.docker.tar.gz ]] || exit 3
 printf 'vdoc-test-image' >"$output"
fi
MOCK
chmod +x "$stage/bin/docker" "$stage/bin/curl"
export PATH="$stage/bin:$PATH" DOCKER_LOG="$stage/docker.log"
bash "$stage/scripts/vdoc-prebuilt-install.sh" >"$stage/success.log"
[[ "$(wc -l <"$DOCKER_LOG" | tr -d ' ')" == 2 ]]
rm "$DOCKER_LOG"
if BAD_CHECKSUM=1 bash "$stage/scripts/vdoc-prebuilt-install.sh" >"$stage/bad.log" 2>&1; then echo 'accepted corrupt image' >&2; exit 1; fi
[[ ! -e "$DOCKER_LOG" ]]
if WRONG_REVISION=1 bash "$stage/scripts/vdoc-prebuilt-install.sh" >"$stage/revision.log" 2>&1; then echo 'accepted wrong source revision' >&2; exit 1; fi
grep -q 'does not match the lock' "$stage/revision.log"
bash "$stage/scripts/vdoc-local-bootstrap.sh" --prebuilt >"$stage/bootstrap.log"
grep -q '^VDOC_AUTH_ALLOW_REGISTRATION=false$' "$stage/.env"
grep -q '^VDOC_BACKEND_VERSION=v0.2.0$' "$stage/.env"
jq '.candidate = true' "$stage/workspace.lock.json" >"$stage/candidate.json"
mv "$stage/candidate.json" "$stage/workspace.lock.json"
rm "$DOCKER_LOG"
if bash "$stage/scripts/vdoc-prebuilt-install.sh" >"$stage/candidate.log" 2>&1; then echo 'accepted candidate' >&2; exit 1; fi
[[ ! -e "$DOCKER_LOG" ]]
if bash "$stage/scripts/vdoc-local-bootstrap.sh" --prebuilt --output "$stage/candidate.env" >"$stage/bootstrap-candidate.log" 2>&1; then echo 'initialized candidate' >&2; exit 1; fi
[[ ! -e "$stage/candidate.env" ]]
printf 'Prebuilt installation tests passed: platform, checksums, source identity, candidates and repository-free bootstrap.\n'
