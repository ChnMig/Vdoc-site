#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
VERIFY_SCRIPT="$ROOT_DIR/scripts/vdoc-workspace-release-assets-verify.sh"
BASE_URL='https://github.com/ChnMig/Vdoc/releases/download/v0.1.0-test'

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_contains() {
  local file="$1"
  local needle="$2"
  grep -Fq -- "$needle" "$file" || fail "expected $file to contain $needle"
}

tmp="$(mktemp -d)"
release_dir="$tmp/release"
mkdir -p "$release_dir"
artifact_name="$(jq -r '.artifact_name' "$ROOT_DIR/workspace-distribution.json").tar.gz"
printf 'deterministic public fixture\n' >"$release_dir/$artifact_name"
artifact_sha="$(shasum -a 256 "$release_dir/$artifact_name" | awk '{print $1}')"
printf '%s  %s\n' "$artifact_sha" "$artifact_name" >"$release_dir/$artifact_name.sha256"

fake_curl="$tmp/curl"
cat >"$fake_curl" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
output=''
url=''
while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      output="$2"
      shift 2
      ;;
    --fail|--location|--silent|--show-error)
      shift
      ;;
    *)
      url="$1"
      shift
      ;;
  esac
done
source="$FAKE_RELEASE_DIR/${url##*/}"
[[ -f "$source" ]] || exit 22
cp "$source" "$output"
EOF
chmod +x "$fake_curl"

printf 'test: published archive and checksum are verified\n'
FAKE_RELEASE_DIR="$release_dir" VDOC_CURL_BIN="$fake_curl" \
  "$VERIFY_SCRIPT" --release-base-url "$BASE_URL" --expected-sha256 "$artifact_sha" \
  --local-artifact "$release_dir/$artifact_name" >"$tmp/success.txt"
assert_contains "$tmp/success.txt" 'Published Docker Compose bootstrap verified'
assert_contains "$tmp/success.txt" "$artifact_sha"

printf 'test: a missing public asset fails closed\n'
mv "$release_dir/$artifact_name" "$release_dir/$artifact_name.missing"
if FAKE_RELEASE_DIR="$release_dir" VDOC_CURL_BIN="$fake_curl" \
  "$VERIFY_SCRIPT" --release-base-url "$BASE_URL" >"$tmp/missing-out.txt" 2>"$tmp/missing-err.txt"; then
  fail 'release verifier accepted a missing archive'
fi
assert_contains "$tmp/missing-err.txt" 'published archive is unavailable'
mv "$release_dir/$artifact_name.missing" "$release_dir/$artifact_name"

printf 'test: a mismatched checksum fails closed\n'
printf '%064d  %s\n' 0 "$artifact_name" >"$release_dir/$artifact_name.sha256"
if FAKE_RELEASE_DIR="$release_dir" VDOC_CURL_BIN="$fake_curl" \
  "$VERIFY_SCRIPT" --release-base-url "$BASE_URL" >"$tmp/mismatch-out.txt" 2>"$tmp/mismatch-err.txt"; then
  fail 'release verifier accepted a mismatched checksum'
fi
assert_contains "$tmp/mismatch-err.txt" 'does not match its checksum sidecar'

printf 'test: an unexpected release-record digest fails closed\n'
printf '%s  %s\n' "$artifact_sha" "$artifact_name" >"$release_dir/$artifact_name.sha256"
if FAKE_RELEASE_DIR="$release_dir" VDOC_CURL_BIN="$fake_curl" \
  "$VERIFY_SCRIPT" --release-base-url "$BASE_URL" --expected-sha256 "$(printf '%064d' 0)" \
  >"$tmp/expected-out.txt" 2>"$tmp/expected-err.txt"; then
  fail 'release verifier accepted the wrong expected digest'
fi
assert_contains "$tmp/expected-err.txt" 'does not match --expected-sha256'

printf 'ok\n'
