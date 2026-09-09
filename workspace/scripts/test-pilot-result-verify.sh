#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

fail() {
  printf 'FAIL: %s\n' "$1" >&2
  exit 1
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

expect_failure() {
  local name="$1"
  local expected="$2"
  shift 2
  local output
  printf 'test: %s\n' "$name"
  if output="$({ "$@"; } 2>&1)"; then
    fail "$name unexpectedly passed"
  fi
  if ! printf '%s\n' "$output" | rg -F -- "$expected" >/dev/null; then
    printf '%s\n' "$output" >&2
    fail "$name failed for the wrong reason; expected: $expected"
  fi
}

tmp="$(mktemp -d)"
workspace="$tmp/workspace"
result_dir="$workspace/results"
mkdir -p "$workspace/scripts" "$workspace/contracts" "$result_dir/evidence/gates"

for file in \
  vdoc-json-schema-validate.mjs \
  vdoc-pilot-result-check.mjs \
  vdoc-pilot-result-verify.sh \
  vdoc-pilot-sign.sh \
  vdoc-control-plane-digest.sh \
  vdoc-workspace-verify.sh; do
  cp "$ROOT_DIR/scripts/$file" "$workspace/scripts/$file"
done
chmod +x "$workspace/scripts/"*
cp "$ROOT_DIR/contracts/pilot-result.schema.json" "$workspace/contracts/pilot-result.schema.json"
cp "$ROOT_DIR/PILOT_RESULT.template.json" "$workspace/PILOT_RESULT.template.json"

repo_rows="$tmp/repositories.tsv"
: >"$repo_rows"
mkdir -p "$tmp/remotes"
for repo in Vdoc Vdoc-admin Vdoc-site Vdoc-mcp Vdoc-skill; do
  repo_dir="$workspace/$repo"
  remote="$tmp/remotes/$repo.git"
  git init -q --bare --initial-branch=main "$remote"
  git init -q --initial-branch=main "$repo_dir"
  printf 'fixture for %s\n' "$repo" >"$repo_dir/README.md"
  git -C "$repo_dir" add README.md
  git -C "$repo_dir" -c user.name='Vdoc Test' -c user.email='test@vdoc.invalid' commit -q -m fixture
  git -C "$repo_dir" remote add origin "$remote"
  commit="$(git -C "$repo_dir" rev-parse HEAD)"
  git -C "$repo_dir" push -q -u origin main
  printf '%s\t%s\t%s\t%s\n' "$repo" "$remote" refs/heads/main "$commit" >>"$repo_rows"
done

jq -n '{
  schema_version: 2,
  name: "pilot-test-control-plane",
  version: "0.1",
  artifact_name: "pilot-test-control-plane",
  root_directory: "pilot-test-control-plane",
  repository_lock: "workspace.lock.json",
  files: ([
    "PILOT_RESULT.template.json",
    "contracts/pilot-result.schema.json",
    "scripts/vdoc-control-plane-digest.sh",
    "scripts/vdoc-json-schema-validate.mjs",
    "scripts/vdoc-pilot-result-check.mjs",
    "scripts/vdoc-pilot-result-verify.sh",
    "scripts/vdoc-pilot-sign.sh",
    "scripts/vdoc-workspace-verify.sh",
    "workspace-distribution.json",
    "workspace.lock.json"
  ] | sort),
  executables: ([
    "scripts/vdoc-control-plane-digest.sh",
    "scripts/vdoc-json-schema-validate.mjs",
    "scripts/vdoc-pilot-result-check.mjs",
    "scripts/vdoc-pilot-result-verify.sh",
    "scripts/vdoc-pilot-sign.sh",
    "scripts/vdoc-workspace-verify.sh"
  ] | sort)
}' >"$workspace/workspace-distribution.json"
control_digest="$(VDOC_WORKSPACE_ROOT="$workspace" \
  VDOC_WORKSPACE_DISTRIBUTION_FILE="$workspace/workspace-distribution.json" \
  "$workspace/scripts/vdoc-control-plane-digest.sh")"
jq -Rn '
  [inputs | split("\t") | {path: .[0], remote: .[1], ref: .[2], commit: .[3]}]
' <"$repo_rows" | jq --arg digest "$control_digest" \
  '{schemaVersion: 2, repositories: ., controlPlane: {manifest: "workspace-distribution.json", sha256: $digest}}' \
  >"$workspace/workspace.lock.json"

VERIFY=(env VDOC_WORKSPACE_ROOT="$workspace" "$workspace/scripts/vdoc-pilot-result-verify.sh")
SIGN=("$workspace/scripts/vdoc-pilot-sign.sh")
commits="$(jq -c '.repositories | map({key: .path, value: .commit}) | from_entries' "$workspace/workspace.lock.json")"
lock_sha="$(sha256_file "$workspace/workspace.lock.json")"

printf 'Consent was recorded outside the public result.\n' >"$result_dir/evidence/consent.txt"
printf 'Observed target-user execution evidence for all PRD 3.3 criteria.\n' >"$result_dir/evidence/criteria.txt"
printf 'Verbatim interview transcript retained with participant consent.\n' >"$result_dir/evidence/feedback.txt"
consent_sha="$(sha256_file "$result_dir/evidence/consent.txt")"
criteria_sha="$(sha256_file "$result_dir/evidence/criteria.txt")"
feedback_sha="$(sha256_file "$result_dir/evidence/feedback.txt")"

printf 'Release checks completed.\nVDOC_GATE_ATTESTATION gate=release_dry_run exit_code=0\n' \
  >"$result_dir/evidence/gates/release_dry_run.log"
printf 'Live persistence test passed.\nVDOC_GATE_ATTESTATION gate=live_persistence_e2e exit_code=0\n' \
  >"$result_dir/evidence/gates/live_persistence_e2e.log"
release_log_sha="$(sha256_file "$result_dir/evidence/gates/release_dry_run.log")"
live_log_sha="$(sha256_file "$result_dir/evidence/gates/live_persistence_e2e.log")"

jq -n \
  --argjson commits "$commits" \
  --arg lock_sha "$lock_sha" \
  --arg log_sha "$release_log_sha" \
  '{
    schema_version: 1,
    gate: "release_dry_run",
    command: "scripts/vdoc-release-dry-run.sh",
    working_directory: ".",
    started_at: "2026-08-14T06:00:00Z",
    ended_at: "2026-08-14T06:30:00Z",
    exit_code: 0,
    repository_commits: $commits,
    workspace_lock_sha256: $lock_sha,
    log: {path: "evidence/gates/release_dry_run.log", sha256: $log_sha}
  }' >"$result_dir/evidence/gates/release_dry_run.attestation.json"
jq -n \
  --argjson commits "$commits" \
  --arg lock_sha "$lock_sha" \
  --arg log_sha "$live_log_sha" \
  '{
    schema_version: 1,
    gate: "live_persistence_e2e",
    command: "./scripts/vdoc-e2e.sh live-compose --env-file ../.env",
    working_directory: "Vdoc",
    started_at: "2026-08-14T06:30:01Z",
    ended_at: "2026-08-14T07:00:00Z",
    exit_code: 0,
    repository_commits: $commits,
    workspace_lock_sha256: $lock_sha,
    log: {path: "evidence/gates/live_persistence_e2e.log", sha256: $log_sha}
  }' >"$result_dir/evidence/gates/live_persistence_e2e.attestation.json"
release_attestation_sha="$(sha256_file "$result_dir/evidence/gates/release_dry_run.attestation.json")"
live_attestation_sha="$(sha256_file "$result_dir/evidence/gates/live_persistence_e2e.attestation.json")"

valid="$result_dir/valid.json"
jq \
  --argjson commits "$commits" \
  --arg consent_sha "$consent_sha" \
  --arg criteria_sha "$criteria_sha" \
  --arg feedback_sha "$feedback_sha" \
  --arg release_attestation_sha "$release_attestation_sha" \
  --arg live_attestation_sha "$live_attestation_sha" \
  '
    .pilot_id = "pilot-2026-08-14" |
    .environment = {
      name: "Disposable target-user Pilot",
      base_url: "https://pilot.vdoc.test",
      started_at: "2026-08-14T08:00:00Z",
      ended_at: "2026-08-14T10:00:00Z"
    } |
    .repository_commits = $commits |
    .participants = [
      {
        participant_id: "project-admin-01",
        role: "project_admin",
        participant_kind: "target_user",
        consent_recorded: true,
        consent_evidence: {path: "evidence/consent.txt", sha256: $consent_sha}
      },
      {
        participant_id: "writer-01",
        role: "writer",
        participant_kind: "target_user",
        consent_recorded: true,
        consent_evidence: {path: "evidence/consent.txt", sha256: $consent_sha}
      },
      {
        participant_id: "reader-01",
        role: "reader",
        participant_kind: "target_user",
        consent_recorded: true,
        consent_evidence: {path: "evidence/consent.txt", sha256: $consent_sha}
      },
      {
        participant_id: "external-reader-01",
        role: "external_reader",
        participant_kind: "target_user",
        consent_recorded: true,
        consent_evidence: {path: "evidence/consent.txt", sha256: $consent_sha}
      }
    ] |
    .criteria |= map(
      .status = "passed" |
      .participant_ids = ({
        "prd-3.3-01": ["writer-01", "project-admin-01"],
        "prd-3.3-02": ["writer-01", "project-admin-01"],
        "prd-3.3-03": ["reader-01"],
        "prd-3.3-04": ["reader-01"],
        "prd-3.3-05": ["reader-01"],
        "prd-3.3-06": ["reader-01"],
        "prd-3.3-07": ["reader-01"],
        "prd-3.3-08": ["writer-01", "project-admin-01"],
        "prd-3.3-09": ["reader-01"],
        "prd-3.3-10": ["writer-01", "project-admin-01"],
        "prd-3.3-11": ["reader-01"],
        "prd-3.3-12": ["project-admin-01"],
        "prd-3.3-13": ["project-admin-01"],
        "prd-3.3-14": ["external-reader-01"]
      }[.criterion_id]) |
      .executed_at = "2026-08-14T09:00:00Z" |
      .evidence_refs = [{path: "evidence/criteria.txt", sha256: $criteria_sha}] |
      .observed_result = "Observed result recorded by the Pilot operator."
    ) |
    .feedback = [
      {
        participant_id: "project-admin-01",
        captured_at: "2026-08-14T09:30:00Z",
        context: "Project Admin post-task interview documented at docs.example.com",
        verbatim: "The review, publish, configuration, and sharing controls matched the expected boundary.",
        evidence_ref: {path: "evidence/feedback.txt", sha256: $feedback_sha}
      },
      {
        participant_id: "writer-01",
        captured_at: "2026-08-14T09:31:00Z",
        context: "Writer post-task interview documented at docs.example.com",
        verbatim: "The draft workflow completed without bypassing review.",
        evidence_ref: {path: "evidence/feedback.txt", sha256: $feedback_sha}
      },
      {
        participant_id: "reader-01",
        captured_at: "2026-08-14T09:32:00Z",
        context: "Reader post-task interview documented at docs.example.com",
        verbatim: "Published versions, diffs, endpoints, and MCP facts were discoverable.",
        evidence_ref: {path: "evidence/feedback.txt", sha256: $feedback_sha}
      },
      {
        participant_id: "external-reader-01",
        captured_at: "2026-08-14T09:33:00Z",
        context: "External Reader post-task interview documented at docs.example.com",
        verbatim: "The anonymous share enforced its password, history, download, and revocation policies.",
        evidence_ref: {path: "evidence/feedback.txt", sha256: $feedback_sha}
      }
    ] |
    .automated_gates = {
      release_dry_run: {
        status: "passed",
        attestation: {
          path: "evidence/gates/release_dry_run.attestation.json",
          sha256: $release_attestation_sha
        }
      },
      live_persistence_e2e: {
        status: "passed",
        attestation: {
          path: "evidence/gates/live_persistence_e2e.attestation.json",
          sha256: $live_attestation_sha
        }
      }
    } |
    .metrics.openapi_draft_seconds = 45 |
    .pilot_outcome = "validated"
  ' "$workspace/PILOT_RESULT.template.json" >"$valid"

printf 'test: incomplete template passes schema validation only\n'
"${VERIFY[@]}" --allow-incomplete "$workspace/PILOT_RESULT.template.json" >/dev/null
expect_failure \
  'incomplete template cannot close product validation' \
  'empty or whitespace-only string' \
  "${VERIFY[@]}" "$workspace/PILOT_RESULT.template.json"

printf 'test: signing tool creates two payload-bound approval records\n'
"${SIGN[@]}" "$valid" pilot_operator 'Pilot Operator' >/dev/null
"${SIGN[@]}" "$valid" product_owner 'Product Owner' >/dev/null

printf 'test: complete Pilot with docs.example.com passes closure validation\n'
"${VERIFY[@]}" "$valid" >/dev/null

case_root="$tmp/cases"
mkdir -p "$case_root"
new_case() {
  local name="$1"
  local directory="$case_root/$name"
  mkdir -p "$directory"
  cp "$valid" "$directory/valid.json"
  cp -R "$result_dir/evidence" "$directory/evidence"
  CASE_FILE="$directory/valid.json"
}

resign_case() {
  local file="$1"
  local temp_file="${file}.pending"
  jq '.sign_off = {
    pilot_operator: {name: "", decision: "pending", signed_at: null, payload_sha256: null, approval_record: null},
    product_owner: {name: "", decision: "pending", signed_at: null, payload_sha256: null, approval_record: null}
  }' "$file" >"$temp_file"
  mv "$temp_file" "$file"
  "${SIGN[@]}" --replace "$file" pilot_operator 'Pilot Operator' >/dev/null
  "${SIGN[@]}" --replace "$file" product_owner 'Product Owner' >/dev/null
}

new_case empty-sign-off
jq '.sign_off = {}' "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'empty sign_off object is rejected by schema' 'missing required property pilot_operator' "${VERIFY[@]}" "$CASE_FILE"

new_case staff-only-criteria
jq '.participants += [{
  participant_id: "staff-01",
  role: "project_admin",
  participant_kind: "staff",
  consent_recorded: true,
  consent_evidence: .participants[0].consent_evidence
}] | .criteria |= map(.participant_ids = ["staff-01"])' "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'every criterion requires a target user' 'was not exercised by a target user' "${VERIFY[@]}" "$CASE_FILE"

new_case staff-only-feedback
jq '.participants += [{
  participant_id: "staff-01",
  role: "project_admin",
  participant_kind: "staff",
  consent_recorded: true,
  consent_evidence: .participants[0].consent_evidence
}] | .feedback |= map(.participant_id = "staff-01")' "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'closure requires target-user feedback' 'requires feedback from a target user' "${VERIFY[@]}" "$CASE_FILE"

new_case missing-target-user-role
jq '.participants |= map(select(.role != "external_reader")) |
  .criteria[13].participant_ids = ["reader-01"] |
  .feedback |= map(select(.participant_id != "external-reader-01"))' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'closure requires every target-user role' 'requires a target user with role external_reader' "${VERIFY[@]}" "$CASE_FILE"

new_case target-user-role-not-exercised
jq '.criteria |= map(.participant_ids |= map(select(. != "writer-01")))' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'each target-user role must execute its required criteria' 'prd-3.3-01 must be exercised by target user role writer' "${VERIFY[@]}" "$CASE_FILE"

new_case target-user-role-without-feedback
jq '.feedback |= map(select(.participant_id != "reader-01"))' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'each target-user role must provide feedback' 'requires feedback from target user role reader' "${VERIFY[@]}" "$CASE_FILE"

new_case same-signer
product_record="$(dirname "$CASE_FILE")/evidence/sign-off/product_owner.approval.json"
jq '.name = "Pilot Operator"' "$product_record" >"$product_record.tmp" && mv "$product_record.tmp" "$product_record"
product_record_sha="$(sha256_file "$product_record")"
jq --arg sha "$product_record_sha" '.sign_off.product_owner.name = "Pilot Operator" | .sign_off.product_owner.approval_record.sha256 = $sha' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'the two signers must be distinct' 'different signer names' "${VERIFY[@]}" "$CASE_FILE"

new_case blank-feedback
jq '.feedback[0].verbatim = "   "' "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'whitespace-only feedback blocks closure' 'whitespace-only string' "${VERIFY[@]}" "$CASE_FILE"

new_case blank-evidence
printf ' \n\t' >"$(dirname "$CASE_FILE")/evidence/criteria.txt"
blank_evidence_sha="$(sha256_file "$(dirname "$CASE_FILE")/evidence/criteria.txt")"
jq --arg sha "$blank_evidence_sha" '.criteria |= map(.evidence_refs[0].sha256 = $sha)' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'whitespace-only evidence blocks closure' 'is empty or whitespace-only' "${VERIFY[@]}" "$CASE_FILE"

new_case invalid-calendar-time
jq '.criteria[0].executed_at = "2026-99-99T99:99:99Z"' "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'impossible UTC timestamp is rejected' 'is not a real UTC timestamp' "${VERIFY[@]}" "$CASE_FILE"

new_case criterion-outside-window
jq '.criteria[0].executed_at = "2026-08-14T07:59:59Z"' "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'criterion outside Pilot window is rejected' 'was not executed inside the Pilot window' "${VERIFY[@]}" "$CASE_FILE"

new_case feedback-outside-window
jq '.feedback[0].captured_at = "2026-08-14T10:00:01Z"' "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'feedback outside Pilot window is rejected' 'was not captured inside the Pilot window' "${VERIFY[@]}" "$CASE_FILE"

new_case gate-after-pilot-start
gate_record="$(dirname "$CASE_FILE")/evidence/gates/release_dry_run.attestation.json"
jq '.started_at = "2026-08-14T08:00:00Z" | .ended_at = "2026-08-14T08:00:01Z"' \
  "$gate_record" >"$gate_record.tmp" && mv "$gate_record.tmp" "$gate_record"
gate_record_sha="$(sha256_file "$gate_record")"
jq --arg sha "$gate_record_sha" '.automated_gates.release_dry_run.attestation.sha256 = $sha' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
resign_case "$CASE_FILE"
expect_failure 'gate attestation must predate Pilot' 'must finish before the Pilot starts' "${VERIFY[@]}" "$CASE_FILE"

new_case wrong-gate-command
gate_record="$(dirname "$CASE_FILE")/evidence/gates/release_dry_run.attestation.json"
jq '.command = "true"' "$gate_record" >"$gate_record.tmp" && mv "$gate_record.tmp" "$gate_record"
gate_record_sha="$(sha256_file "$gate_record")"
jq --arg sha "$gate_record_sha" '.automated_gates.release_dry_run.attestation.sha256 = $sha' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'arbitrary command cannot impersonate release gate' 'attestation provenance does not match' "${VERIFY[@]}" "$CASE_FILE"

new_case tampered-evidence
printf 'tampered\n' >>"$(dirname "$CASE_FILE")/evidence/criteria.txt"
expect_failure 'evidence hash detects post-signing tampering' 'sha256 mismatch' "${VERIFY[@]}" "$CASE_FILE"

new_case traversal-evidence
jq '.criteria[0].evidence_refs[0].path = "evidence/../evidence/criteria.txt"' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'dot segments cannot escape evidence policy' 'must not contain empty, dot, or parent segments' "${VERIFY[@]}" "$CASE_FILE"

new_case symlink-evidence
ln -s criteria.txt "$(dirname "$CASE_FILE")/evidence/symlink.txt"
jq '.criteria[0].evidence_refs[0].path = "evidence/symlink.txt"' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'symlink evidence is rejected' 'regular non-symlink file' "${VERIFY[@]}" "$CASE_FILE"

new_case jwt-secret
jq '.feedback[0].verbatim = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJwaWxvdC11c2VyIn0.c2lnbmF0dXJlMTIzNDU2"' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'raw JWT blocks result' 'appears to contain a JWT' "${VERIFY[@]}" "$CASE_FILE"

new_case database-secret
jq '.feedback[0].verbatim = "postgres://vdoc:database-password@db.internal/vdoc"' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'database password URI blocks result' 'database credential URI' "${VERIFY[@]}" "$CASE_FILE"

new_case storage-secret
jq '.feedback[0].verbatim = "VDOC_STORAGE_SECRET_KEY=raw-storage-secret"' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'storage key assignment blocks result' 'Vdoc secret assignment' "${VERIFY[@]}" "$CASE_FILE"

new_case signed-payload-mutated
jq '.criteria[0].observed_result = "Changed after both approvals."' \
  "$CASE_FILE" >"$CASE_FILE.tmp" && mv "$CASE_FILE.tmp" "$CASE_FILE"
expect_failure 'post-signing payload changes invalidate approvals' 'not bound to the current Pilot payload' "${VERIFY[@]}" "$CASE_FILE"

printf 'dirty\n' >"$workspace/Vdoc/untracked.txt"
expect_failure 'synthetic result cannot close while current workspace verification fails' 'current workspace does not verify' "${VERIFY[@]}" "$valid"
rm "$workspace/Vdoc/untracked.txt"

printf 'test: clean workspace still passes after negative matrix\n'
"${VERIFY[@]}" "$valid" >/dev/null

printf 'ok\n'
