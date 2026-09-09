#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd -P)"
PACKAGE_SCRIPT="$ROOT_DIR/scripts/vdoc-workspace-package.sh"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

assert_contains() {
  local file="$1"
  local needle="$2"
  grep -Fq -- "$needle" "$file" || fail "expected $file to contain $needle"
}

assert_not_contains() {
  local file="$1"
  local needle="$2"
  if grep -Fq -- "$needle" "$file"; then
    fail "expected $file not to contain $needle"
  fi
}

tmp="$(mktemp -d)"
fake_verify="$tmp/verify.sh"
cat >"$fake_verify" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
printf 'fixture workspace verified\n'
EOF
chmod +x "$fake_verify"

printf 'test: distribution list is explicit, complete, and secret-free\n'
VDOC_WORKSPACE_VERIFY_SCRIPT="$fake_verify" "$PACKAGE_SCRIPT" --list >"$tmp/list.txt"
for required in \
  'LICENSE' \
  'workspace.lock.json' \
  'scripts/vdoc-workspace-init.sh' \
  'scripts/vdoc-workspace-lock-refresh.sh' \
  'scripts/vdoc-control-plane-digest.sh' \
  'scripts/vdoc-json-schema-validate.mjs' \
  'scripts/vdoc-pilot-result-check.mjs' \
  'scripts/vdoc-gate-attest.sh' \
  'scripts/vdoc-pilot-sign.sh' \
  'scripts/vdoc-pilot-result-verify.sh' \
  'scripts/vdoc-release-dry-run.sh' \
  'scripts/vdoc-workspace-release-assets-verify.sh' \
  'PILOT_RESULT.template.json' \
  'IMPROVEMENTS.md' \
  'IMPROVEMENTS.zh-CN.md' \
  'PILOT_RUNBOOK.md' \
  'RELEASE_DEPLOY.md'; do
  assert_contains "$tmp/list.txt" "$required"
done
if grep -Fxq '.env' "$tmp/list.txt"; then
  fail 'distribution inventory includes local .env secrets'
fi
jq -e '
  .schemaVersion == 2 and
  all(.repositories[];
    (.remote | test("^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\\.git$")) and
    (.ref | test("^refs/(heads|tags)/"))
  )
' "$ROOT_DIR/workspace.lock.json" >/dev/null || \
  fail 'distribution lock contains a credential-dependent remote or missing advertised ref'

printf 'test: distribution check validates the repository gate\n'
VDOC_WORKSPACE_VERIFY_SCRIPT="$fake_verify" "$PACKAGE_SCRIPT" --check >"$tmp/check.txt"
assert_contains "$tmp/check.txt" '5 locked repositories'

printf 'test: package emits two byte-identical verifiable artifacts\n'
output_one="$tmp/output-one"
output_two="$tmp/output-two"
VDOC_WORKSPACE_VERIFY_SCRIPT="$fake_verify" "$PACKAGE_SCRIPT" --output-dir "$output_one" >"$tmp/package-one.txt"
VDOC_WORKSPACE_VERIFY_SCRIPT="$fake_verify" "$PACKAGE_SCRIPT" --output-dir "$output_two" >"$tmp/package-two.txt"
artifact_one="$output_one/vdoc-compose-bootstrap-v0.3.tar.gz"
artifact_two="$output_two/vdoc-compose-bootstrap-v0.3.tar.gz"
checksum_one="$artifact_one.sha256"
checksum_two="$artifact_two.sha256"
[[ -f "$artifact_one" && -f "$checksum_one" && -f "$artifact_two" && -f "$checksum_two" ]] || \
  fail 'package artifact or checksum is missing'
(cd "$output_one" && shasum -a 256 -c "$(basename -- "$checksum_one")") >/dev/null
(cd "$output_two" && shasum -a 256 -c "$(basename -- "$checksum_two")") >/dev/null
[[ "$(shasum -a 256 "$artifact_one" | awk '{print $1}')" == "$(shasum -a 256 "$artifact_two" | awk '{print $1}')" ]] || \
  fail 'identical control-plane inputs produced different artifact bytes'
cmp -s "$checksum_one" "$checksum_two" || fail 'identical artifacts produced different checksum files'

tar -tzf "$artifact_one" >"$tmp/archive-list.txt"
duplicates="$(LC_ALL=C sort "$tmp/archive-list.txt" | uniq -d)"
[[ -z "$duplicates" ]] || fail "archive contains duplicate entries: $duplicates"
assert_not_contains "$tmp/archive-list.txt" '/._'
assert_not_contains "$tmp/archive-list.txt" '.DS_Store'

tar -tvzf "$artifact_one" >"$tmp/archive-verbose.txt"
grep -Eq ' root([[:space:]]+|/)root[[:space:]]' "$tmp/archive-verbose.txt" || \
  fail 'archive owner/group are not normalized to root/root'
assert_not_contains "$tmp/archive-verbose.txt" 'chenming'
assert_not_contains "$tmp/archive-verbose.txt" 'staff'
assert_not_contains "$tmp/archive-verbose.txt" '2026'

mkdir -p "$tmp/extracted"
tar -xzf "$artifact_one" -C "$tmp/extracted"
[[ -x "$tmp/extracted/vdoc-workspace/scripts/vdoc-workspace-init.sh" ]] || \
  fail 'archive did not preserve the workspace initializer executable'
[[ -x "$tmp/extracted/vdoc-workspace/scripts/vdoc-pilot-sign.sh" ]] || \
  fail 'archive did not preserve the Pilot signer executable'
[[ -f "$tmp/extracted/vdoc-workspace/LICENSE" ]] || \
  fail 'archive did not include the root control-plane license'
[[ ! -e "$tmp/extracted/vdoc-workspace/.env" ]] || fail 'archive leaked a local .env file'

printf 'test: package refuses to overwrite an existing artifact\n'
if VDOC_WORKSPACE_VERIFY_SCRIPT="$fake_verify" "$PACKAGE_SCRIPT" --output-dir "$output_one" >/dev/null 2>&1; then
  fail 'package overwrote an existing artifact'
fi

printf 'test: omitting any critical release file is rejected before packaging\n'
critical_files=(
  '.env.example'
  'COMPOSE_DEPLOY.md'
  'DATABASE_SCHEMA.md'
  'IMPLEMENTATION_PLAN.md'
  'IMPROVEMENTS.md'
  'IMPROVEMENTS.zh-CN.md'
  'LICENSE'
  'PILOT_RUNBOOK.md'
  'PRD.md'
  'README.md'
  'RELEASE_DEPLOY.md'
  'docker-compose.yml'
  'scripts/vdoc-control-plane-digest.sh'
  'scripts/vdoc-gate-attest.sh'
  'scripts/vdoc-json-schema-validate.mjs'
  'scripts/vdoc-pilot-result-check.mjs'
  'scripts/vdoc-pilot-result-verify.sh'
  'scripts/vdoc-pilot-sign.sh'
  'scripts/vdoc-release-dry-run.sh'
  'scripts/vdoc-workspace-release-assets-verify.sh'
  'scripts/vdoc-workspace-verify.sh'
)
for critical_file in "${critical_files[@]}"; do
  safe_name="${critical_file//\//_}"
  jq --arg missing "$critical_file" '
    .files |= map(select(. != $missing)) |
    .executables |= map(select(. != $missing))
  ' "$ROOT_DIR/workspace-distribution.json" >"$tmp/missing-$safe_name.json"
  if VDOC_WORKSPACE_DISTRIBUTION_FILE="$tmp/missing-$safe_name.json" \
    VDOC_WORKSPACE_VERIFY_SCRIPT="$fake_verify" \
    "$PACKAGE_SCRIPT" --list >"$tmp/missing-out.txt" 2>"$tmp/missing-err.txt"; then
    fail "package accepted a manifest without required file: $critical_file"
  fi
  assert_contains "$tmp/missing-err.txt" "omits required release file: $critical_file"
done

printf 'test: unsafe manifest path is rejected\n'
jq '.files += ["../secret"]' "$ROOT_DIR/workspace-distribution.json" >"$tmp/unsafe.json"
if VDOC_WORKSPACE_DISTRIBUTION_FILE="$tmp/unsafe.json" "$PACKAGE_SCRIPT" --list >/dev/null 2>&1; then
  fail 'package accepted an unsafe relative path'
fi

printf 'test: control-plane content tampering is rejected\n'
fixture_root="$tmp/control-fixture"
mkdir -p "$fixture_root"
while IFS= read -r relative_path; do
  mkdir -p "$fixture_root/$(dirname -- "$relative_path")"
  cp -p "$ROOT_DIR/$relative_path" "$fixture_root/$relative_path"
done < <(jq -r '.files[]' "$ROOT_DIR/workspace-distribution.json")
printf '\ntampered\n' >>"$fixture_root/README.md"
if VDOC_WORKSPACE_ROOT="$fixture_root" \
  VDOC_WORKSPACE_DISTRIBUTION_FILE="$fixture_root/workspace-distribution.json" \
  VDOC_CONTROL_PLANE_DIGEST_SCRIPT="$fixture_root/scripts/vdoc-control-plane-digest.sh" \
  VDOC_WORKSPACE_VERIFY_SCRIPT="$fake_verify" \
  "$PACKAGE_SCRIPT" --list >"$tmp/tamper-out.txt" 2>"$tmp/tamper-err.txt"; then
  fail 'package accepted tampered root control-plane content'
fi
assert_contains "$tmp/tamper-err.txt" 'control-plane digest mismatch'

printf 'ok\n'
