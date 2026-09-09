#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

import { validateJsonSchema } from "./vdoc-json-schema-validate.mjs";

const REQUIRED_REPOSITORIES = ["Vdoc", "Vdoc-admin", "Vdoc-site", "Vdoc-mcp", "Vdoc-skill"];
const REQUIRED_CRITERIA = Array.from(
  { length: 14 },
  (_, index) => `prd-3.3-${String(index + 1).padStart(2, "0")}`,
);
const REQUIRED_TARGET_USER_ROLE_CRITERIA = {
  project_admin: [
    "prd-3.3-01",
    "prd-3.3-02",
    "prd-3.3-08",
    "prd-3.3-10",
    "prd-3.3-12",
    "prd-3.3-13",
  ],
  writer: ["prd-3.3-01", "prd-3.3-02", "prd-3.3-08", "prd-3.3-10"],
  reader: [
    "prd-3.3-03",
    "prd-3.3-04",
    "prd-3.3-05",
    "prd-3.3-06",
    "prd-3.3-07",
    "prd-3.3-09",
    "prd-3.3-11",
  ],
  external_reader: ["prd-3.3-14"],
};
const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const GATE_COMMANDS = {
  release_dry_run: {
    command: "scripts/vdoc-release-dry-run.sh",
    working_directory: ".",
  },
  live_persistence_e2e: {
    command: "./scripts/vdoc-e2e.sh live-compose --env-file ../.env",
    working_directory: "Vdoc",
  },
};

function fail(message) {
  throw new Error(message);
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256Bytes(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(file) {
  const stat = fs.statSync(file);
  if (stat.size > MAX_INPUT_BYTES) fail(`file exceeds ${MAX_INPUT_BYTES} byte verification limit: ${file}`);
  return sha256Bytes(fs.readFileSync(file));
}

function readJson(file, label) {
  let stat;
  try {
    stat = fs.lstatSync(file);
  } catch (error) {
    fail(`${label} not found: ${file} (${error.message})`);
  }
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`${label} must be a regular non-symlink file: ${file}`);
  if (stat.size > MAX_INPUT_BYTES) fail(`${label} exceeds ${MAX_INPUT_BYTES} byte verification limit: ${file}`);
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${file} (${error.message})`);
  }
}

function exactKeys(value, expected, label) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (canonicalJson(actual) !== canonicalJson(wanted)) {
    fail(`${label} has unexpected fields (expected ${wanted.join(", ")}; got ${actual.join(", ")})`);
  }
}

function strictTimestamp(value, label) {
  if (typeof value !== "string") fail(`${label} must be a UTC timestamp`);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/.exec(value);
  if (!match) fail(`${label} must use YYYY-MM-DDTHH:MM:SSZ`);
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const parsed = new Date(value);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute ||
    parsed.getUTCSeconds() !== second ||
    parsed.getUTCMilliseconds() !== 0
  ) {
    fail(`${label} is not a real UTC date/time`);
  }
  return parsed.getTime();
}

function assertNoBlankStrings(value, label = "$result") {
  if (typeof value === "string") {
    if (value.trim().length === 0) fail(`${label} contains an empty or whitespace-only string`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertNoBlankStrings(entry, `${label}[${index}]`));
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      assertNoBlankStrings(entry, `${label}.${key}`);
    }
  }
}

const SECRET_PATTERNS = [
  ["raw Vdoc token or capability", /\bvdoc_(?:share_)?[0-9a-f]{48}\b/giu],
  ["public-share unlock secret", /\bvdoc_share_unlock_[A-Za-z0-9._~-]+\b/gu],
  ["JWT", /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/gu],
  [
    "Authorization header",
    /\bAuthorization\b["']?\s*[:=]\s*["']?(?!\[?redacted\]?\b|<redacted>\b)[A-Za-z0-9+/_=-]{8,}/giu,
  ],
  [
    "Vdoc secret assignment",
    /\b(?:VDOC_(?:MCP_TOKEN|POSTGRES_PASSWORD|STORAGE_ACCESS_KEY|STORAGE_SECRET_KEY|INITIAL_ADMIN_PASSWORD|TOKEN_CIPHER_KEY)|AWS_SECRET_ACCESS_KEY|DATABASE_PASSWORD)\b\s*[:=]\s*["']?(?!\[?redacted\]?\b|<redacted>\b)[^\s"',;}]{4,}/giu,
  ],
  ["database credential URI", /\bpostgres(?:ql)?:\/\/[^\s:/]+:[^\s@/]+@/giu],
  [
    "JSON secret value",
    /["'](?:password|secret_key|access_key|token_cipher_key)["']\s*:\s*["'](?!\[?redacted\]?|<redacted>)[^"']{4,}["']/giu,
  ],
];

function scanSecrets(bytes, label) {
  const text = Buffer.isBuffer(bytes) ? bytes.toString("utf8") : String(bytes);
  for (const [description, expression] of SECRET_PATTERNS) {
    expression.lastIndex = 0;
    if (expression.test(text)) fail(`${label} appears to contain a ${description}`);
  }
}

function scanPlaceholders(value) {
  const text = JSON.stringify(value);
  if (/(^|[^A-Za-z])(TODO|TBD|REPLACE[_ -]?ME)([^A-Za-z]|$)/iu.test(text)) {
    fail("Pilot closure contains placeholder text");
  }
}

function isInside(parent, candidate) {
  return candidate === parent || candidate.startsWith(`${parent}${path.sep}`);
}

function makeEvidenceVerifier(resultFile) {
  const resultDirectory = fs.realpathSync(path.dirname(resultFile));
  const scannedFiles = new Set();

  return function verifyEvidence(reference, label) {
    if (reference === null || typeof reference !== "object" || Array.isArray(reference)) {
      fail(`${label} must be an evidence object`);
    }
    exactKeys(reference, ["path", "sha256"], label);
    if (
      typeof reference.path !== "string" ||
      reference.path.length === 0 ||
      reference.path.includes("\\") ||
      path.posix.isAbsolute(reference.path) ||
      path.win32.isAbsolute(reference.path)
    ) {
      fail(`${label}.path must be a portable relative path`);
    }
    const segments = reference.path.split("/");
    if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
      fail(`${label}.path must not contain empty, dot, or parent segments`);
    }
    const candidate = path.resolve(resultDirectory, ...segments);
    if (!isInside(resultDirectory, candidate)) fail(`${label}.path escapes the Pilot result directory`);

    let stat;
    try {
      stat = fs.lstatSync(candidate);
    } catch (error) {
      fail(`${label}.path does not exist: ${reference.path} (${error.message})`);
    }
    if (stat.isSymbolicLink() || !stat.isFile()) {
      fail(`${label}.path must reference a regular non-symlink file: ${reference.path}`);
    }
    const realCandidate = fs.realpathSync(candidate);
    if (!isInside(resultDirectory, realCandidate)) fail(`${label}.path resolves outside the result directory`);
    const actualHash = sha256File(realCandidate);
    if (actualHash !== reference.sha256) {
      fail(`${label}.sha256 mismatch for ${reference.path}: expected ${reference.sha256}, got ${actualHash}`);
    }
    if (!scannedFiles.has(realCandidate)) {
      const bytes = fs.readFileSync(realCandidate);
      if (bytes.length === 0 || /^[\t\n\r ]*$/u.test(bytes.toString("utf8"))) {
        fail(`evidence ${reference.path} is empty or whitespace-only`);
      }
      scanSecrets(bytes, `evidence ${reference.path}`);
      scannedFiles.add(realCandidate);
    }
    return realCandidate;
  };
}

function validateLock(lock) {
  exactKeys(lock, ["schemaVersion", "repositories", "controlPlane"], "workspace lock");
  if (lock.schemaVersion !== 2 || !Array.isArray(lock.repositories)) fail("invalid workspace lock structure");
  if (lock.controlPlane === null || typeof lock.controlPlane !== "object" || Array.isArray(lock.controlPlane)) {
    fail("invalid workspace control-plane lock");
  }
  exactKeys(lock.controlPlane, ["manifest", "sha256"], "workspace control-plane lock");
  if (
    lock.controlPlane.manifest !== "workspace-distribution.json" ||
    !/^[0-9a-f]{64}$/.test(lock.controlPlane.sha256)
  ) {
    fail("invalid workspace control-plane lock");
  }
  const paths = lock.repositories.map((entry) => entry.path);
  if (canonicalJson([...paths].sort()) !== canonicalJson([...REQUIRED_REPOSITORIES].sort())) {
    fail("workspace lock must contain exactly the five Vdoc repositories");
  }
  for (const entry of lock.repositories) {
    exactKeys(entry, ["path", "remote", "ref", "commit"], `workspace lock repository ${entry.path ?? "?"}`);
    if (!/^[0-9a-f]{40}$/.test(entry.commit)) fail(`invalid locked commit for ${entry.path}`);
    if (typeof entry.remote !== "string" || entry.remote.length === 0) fail(`invalid locked remote for ${entry.path}`);
    if (
      typeof entry.ref !== "string" ||
      !/^refs\/(heads|tags)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(entry.ref) ||
      entry.ref.includes("..") ||
      entry.ref.includes("//") ||
      entry.ref.includes("@{") ||
      entry.ref.endsWith(".lock") ||
      entry.ref.endsWith("/.") ||
      entry.ref.endsWith("/")
    ) {
      fail(`invalid locked ref for ${entry.path}`);
    }
  }
}

function lockedCommits(lock) {
  return Object.fromEntries(lock.repositories.map((entry) => [entry.path, entry.commit]));
}

function validateApprovalRecord(
  file,
  role,
  signature,
  resultFile,
  expectedPayloadHash,
  requireResultName = false,
) {
  const record = readJson(file, `${role} approval record`);
  exactKeys(
    record,
    ["schema_version", "role", "name", "decision", "signed_at", "result_file", "payload_sha256"],
    `${role} approval record`,
  );
  if (
    record.schema_version !== 1 ||
    record.role !== role ||
    record.name !== signature.name ||
    record.decision !== signature.decision ||
    record.signed_at !== signature.signed_at ||
    record.payload_sha256 !== expectedPayloadHash
  ) {
    fail(`${role} approval record does not match the result sign-off and payload`);
  }
  if (
    typeof record.result_file !== "string" ||
    record.result_file.length === 0 ||
    path.basename(record.result_file) !== record.result_file ||
    (requireResultName && record.result_file !== path.basename(resultFile))
  ) {
    fail(`${role} approval record does not identify the expected Pilot result file`);
  }
}

function validateDraftSignatures(result, resultFile, verifyEvidence) {
  const payload = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "sign_off"));
  const payloadHash = sha256Bytes(canonicalJson(payload));
  const completedNames = [];
  for (const [role, signature] of Object.entries(result.sign_off)) {
    if (signature.decision === "pending") {
      if (
        signature.name !== "" ||
        signature.signed_at !== null ||
        signature.payload_sha256 !== null ||
        signature.approval_record !== null
      ) {
        fail(`${role} pending sign-off must not contain approval data`);
      }
      continue;
    }
    if (signature.name.trim().length === 0) fail(`${role} sign-off name is blank`);
    strictTimestamp(signature.signed_at, `sign_off.${role}.signed_at`);
    if (signature.payload_sha256 !== payloadHash || signature.approval_record === null) {
      fail(`${role} sign-off is not bound to the current Pilot payload`);
    }
    const approvalFile = verifyEvidence(signature.approval_record, `sign_off.${role}.approval_record`);
    validateApprovalRecord(approvalFile, role, signature, resultFile, payloadHash);
    completedNames.push(signature.name.trim());
  }
  if (new Set(completedNames).size !== completedNames.length) {
    fail("completed Pilot sign-offs must use different signer names");
  }
}

function validateGateAttestation({
  gateName,
  gate,
  verifyEvidence,
  commits,
  lockHash,
  pilotStartedAt = null,
  closure = false,
}) {
  if (gate.attestation === null) {
    if (closure) fail(`${gateName} must have passed with an attestation`);
    if (gate.status === "passed" || gate.status === "failed") {
      fail(`${gateName} status ${gate.status} requires an attestation`);
    }
    return;
  }
  if (gate.status === "not_run" || gate.status === "blocked") {
    fail(`${gateName} status ${gate.status} must not claim an attestation`);
  }
  const attestationFile = verifyEvidence(gate.attestation, `automated_gates.${gateName}.attestation`);
  const attestation = readJson(attestationFile, `${gateName} attestation`);
  exactKeys(
    attestation,
    [
      "schema_version",
      "gate",
      "command",
      "working_directory",
      "started_at",
      "ended_at",
      "exit_code",
      "repository_commits",
      "workspace_lock_sha256",
      "log",
    ],
    `${gateName} attestation`,
  );
  const expected = GATE_COMMANDS[gateName];
  if (
    attestation.schema_version !== 1 ||
    attestation.gate !== gateName ||
    attestation.command !== expected.command ||
    attestation.working_directory !== expected.working_directory ||
    canonicalJson(attestation.repository_commits) !== canonicalJson(commits) ||
    attestation.workspace_lock_sha256 !== lockHash
  ) {
    fail(`${gateName} attestation provenance does not match the required command, commits, and lock`);
  }
  const startedAt = strictTimestamp(attestation.started_at, `${gateName} attestation.started_at`);
  const endedAt = strictTimestamp(attestation.ended_at, `${gateName} attestation.ended_at`);
  if (startedAt > endedAt) fail(`${gateName} attestation starts after it ends`);
  if (closure && endedAt >= pilotStartedAt) {
    fail(`${gateName} attestation must finish before the Pilot starts`);
  }
  if (gate.status === "passed" && attestation.exit_code !== 0) {
    fail(`${gateName} passed attestation must record exit code 0`);
  }
  if (gate.status === "failed" && (!Number.isInteger(attestation.exit_code) || attestation.exit_code === 0)) {
    fail(`${gateName} failed attestation must record a non-zero integer exit code`);
  }
  if (closure && gate.status !== "passed") fail(`${gateName} must have passed for closure`);
  const logFile = verifyEvidence(attestation.log, `${gateName} attestation.log`);
  const marker = `VDOC_GATE_ATTESTATION gate=${gateName} exit_code=${attestation.exit_code}`;
  if (!fs.readFileSync(logFile, "utf8").includes(marker)) {
    fail(`${gateName} log does not contain the gate-attestation completion marker`);
  }
}

function verifyCurrentWorkspace(root, lockFile) {
  const verifier = path.join(root, "scripts", "vdoc-workspace-verify.sh");
  const stat = fs.lstatSync(verifier);
  if (stat.isSymbolicLink() || !stat.isFile()) fail(`workspace verifier must be a regular file: ${verifier}`);
  const run = spawnSync(verifier, [], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      VDOC_WORKSPACE_ROOT: root,
      VDOC_WORKSPACE_LOCK_FILE: lockFile,
    },
    maxBuffer: 4 * 1024 * 1024,
  });
  if (run.error) fail(`could not execute workspace verifier: ${run.error.message}`);
  if (run.status !== 0) {
    const detail = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().slice(0, 4000);
    fail(`current workspace does not verify against the Pilot lock${detail ? `:\n${detail}` : ""}`);
  }
}

function validateReferencedEvidence(result, verifyEvidence) {
  result.participants.forEach((participant, index) => {
    if (participant.consent_evidence !== null) {
      verifyEvidence(participant.consent_evidence, `participants[${index}].consent_evidence`);
    }
  });
  result.criteria.forEach((criterion, criterionIndex) => {
    criterion.evidence_refs.forEach((reference, evidenceIndex) =>
      verifyEvidence(reference, `criteria[${criterionIndex}].evidence_refs[${evidenceIndex}]`),
    );
  });
  result.feedback.forEach((feedback, index) => {
    if (feedback.evidence_ref !== null) {
      verifyEvidence(feedback.evidence_ref, `feedback[${index}].evidence_ref`);
    }
  });
  for (const [gateName, gate] of Object.entries(result.automated_gates)) {
    if (gate.attestation !== null) {
      verifyEvidence(gate.attestation, `automated_gates.${gateName}.attestation`);
    }
  }
  result.known_issues.forEach((issue, index) => {
    if (issue.reference !== undefined) {
      verifyEvidence(issue.reference, `known_issues[${index}].reference`);
    }
  });
  for (const [role, signature] of Object.entries(result.sign_off)) {
    if (signature.approval_record !== null) {
      verifyEvidence(signature.approval_record, `sign_off.${role}.approval_record`);
    }
  }
}

function validateClosure({ result, resultFile, root, lock, lockFile, verifyEvidence }) {
  assertNoBlankStrings(result);
  scanPlaceholders(result);

  const pilotStartedAt = strictTimestamp(result.environment.started_at, "environment.started_at");
  const pilotEndedAt = strictTimestamp(result.environment.ended_at, "environment.ended_at");
  if (pilotStartedAt >= pilotEndedAt) fail("Pilot start must be before Pilot end");
  if (result.pilot_outcome !== "validated") fail("pilot_outcome must be validated for closure");

  const commits = lockedCommits(lock);
  if (canonicalJson(result.repository_commits) !== canonicalJson(commits)) {
    fail("Pilot repository commits do not exactly match workspace.lock.json");
  }

  const participantIds = result.participants.map((participant) => participant.participant_id);
  if (new Set(participantIds).size !== participantIds.length) fail("participant IDs must be unique");
  const participantById = new Map(
    result.participants.map((participant) => [participant.participant_id, participant]),
  );
  const targetUsers = result.participants.filter(
    (participant) => participant.participant_kind === "target_user",
  );
  const targetUserIds = new Set(targetUsers.map((participant) => participant.participant_id));
  const targetUserIdsByRole = new Map(
    Object.keys(REQUIRED_TARGET_USER_ROLE_CRITERIA).map((role) => [
      role,
      new Set(
        targetUsers
          .filter((participant) => participant.role === role)
          .map((participant) => participant.participant_id),
      ),
    ]),
  );
  for (const [role, roleParticipantIDs] of targetUserIdsByRole) {
    if (roleParticipantIDs.size === 0) {
      fail(`Pilot closure requires a target user with role ${role}`);
    }
  }
  result.participants.forEach((participant, index) => {
    if (participant.consent_recorded !== true || participant.consent_evidence === null) {
      fail(`participants[${index}] must have recorded, evidenced consent`);
    }
  });

  const criterionIds = result.criteria.map((criterion) => criterion.criterion_id).sort();
  if (canonicalJson(criterionIds) !== canonicalJson([...REQUIRED_CRITERIA].sort())) {
    fail("Pilot closure must contain each PRD 3.3 criterion exactly once");
  }
  result.criteria.forEach((criterion, index) => {
    if (criterion.status !== "passed") fail(`criteria[${index}] is not passed`);
    const executedAt = strictTimestamp(criterion.executed_at, `criteria[${index}].executed_at`);
    if (executedAt < pilotStartedAt || executedAt > pilotEndedAt) {
      fail(`criteria[${index}] was not executed inside the Pilot window`);
    }
    if (criterion.participant_ids.length === 0) fail(`criteria[${index}] has no participants`);
    for (const participantId of criterion.participant_ids) {
      if (!participantById.has(participantId)) {
        fail(`criteria[${index}] references unknown participant ${participantId}`);
      }
    }
    if (!criterion.participant_ids.some((participantId) => targetUserIds.has(participantId))) {
      fail(`criteria[${index}] was not exercised by a target user`);
    }
    if (criterion.evidence_refs.length === 0) fail(`criteria[${index}] has no evidence`);
  });

  const criterionByID = new Map(
    result.criteria.map((criterion) => [criterion.criterion_id, criterion]),
  );
  for (const [role, requiredCriterionIDs] of Object.entries(
    REQUIRED_TARGET_USER_ROLE_CRITERIA,
  )) {
    const roleParticipantIDs = targetUserIdsByRole.get(role);
    for (const criterionID of requiredCriterionIDs) {
      const criterion = criterionByID.get(criterionID);
      if (
        !criterion.participant_ids.some((participantID) => roleParticipantIDs.has(participantID))
      ) {
        fail(`${criterionID} must be exercised by target user role ${role}`);
      }
    }
  }

  if (result.feedback.length === 0) fail("Pilot closure requires feedback");
  let targetUserFeedback = 0;
  const targetUserFeedbackRoles = new Set();
  result.feedback.forEach((feedback, index) => {
    if (!participantById.has(feedback.participant_id)) {
      fail(`feedback[${index}] references unknown participant ${feedback.participant_id}`);
    }
    if (targetUserIds.has(feedback.participant_id)) {
      targetUserFeedback += 1;
      targetUserFeedbackRoles.add(participantById.get(feedback.participant_id).role);
    }
    const capturedAt = strictTimestamp(feedback.captured_at, `feedback[${index}].captured_at`);
    if (capturedAt < pilotStartedAt || capturedAt > pilotEndedAt) {
      fail(`feedback[${index}] was not captured inside the Pilot window`);
    }
    if (feedback.evidence_ref === null) fail(`feedback[${index}] has no evidence`);
  });
  if (targetUserFeedback === 0) fail("Pilot closure requires feedback from a target user");
  for (const role of Object.keys(REQUIRED_TARGET_USER_ROLE_CRITERIA)) {
    if (!targetUserFeedbackRoles.has(role)) {
      fail(`Pilot closure requires feedback from target user role ${role}`);
    }
  }

  if (
    typeof result.metrics.openapi_draft_seconds !== "number" ||
    result.metrics.openapi_draft_seconds <= 0 ||
    result.metrics.openapi_draft_seconds > 60
  ) {
    fail("openapi_draft_seconds must be greater than zero and no more than 60");
  }
  if (result.known_issues.some((issue) => issue.severity === "critical" && issue.status === "open")) {
    fail("an open critical known issue blocks Pilot closure");
  }

  const lockHash = sha256File(lockFile);
  for (const [gateName, gate] of Object.entries(result.automated_gates)) {
    validateGateAttestation({
      gateName,
      gate,
      verifyEvidence,
      commits,
      lockHash,
      pilotStartedAt,
      closure: true,
    });
  }

  const payload = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "sign_off"));
  const exactPayloadHash = sha256Bytes(canonicalJson(payload));

  const signatures = Object.entries(result.sign_off);
  const signerNames = signatures.map(([, signature]) => signature.name.trim());
  if (new Set(signerNames).size !== signerNames.length) fail("Pilot operator and Product Owner must be different people");
  for (const [role, signature] of signatures) {
    if (
      signature.decision !== "approve" ||
      signature.payload_sha256 !== exactPayloadHash ||
      signature.approval_record === null
    ) {
      fail(`${role} sign-off is not an approval bound to the current Pilot payload`);
    }
    const signedAt = strictTimestamp(signature.signed_at, `sign_off.${role}.signed_at`);
    if (signedAt <= pilotEndedAt) fail(`${role} must sign after the Pilot ends`);
    const approvalFile = verifyEvidence(signature.approval_record, `sign_off.${role}.approval_record`);
    validateApprovalRecord(approvalFile, role, signature, resultFile, exactPayloadHash, true);
  }

  verifyCurrentWorkspace(root, lockFile);
}

function payloadSha(resultFile) {
  const result = readJson(path.resolve(resultFile), "Pilot result");
  const payload = Object.fromEntries(Object.entries(result).filter(([key]) => key !== "sign_off"));
  process.stdout.write(`${sha256Bytes(canonicalJson(payload))}\n`);
}

function parseArguments(argv) {
  if (argv[0] === "--payload-sha") {
    if (argv.length !== 2) fail("Usage: vdoc-pilot-result-check.mjs --payload-sha RESULT.json");
    return { payloadOnly: true, resultFile: argv[1] };
  }
  const options = { allowIncomplete: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--allow-incomplete") {
      options.allowIncomplete = true;
    } else if (["--root", "--lock", "--schema"].includes(argument)) {
      const value = argv[index + 1];
      if (!value) fail(`missing value for ${argument}`);
      options[argument.slice(2)] = value;
      index += 1;
    } else if (argument.startsWith("-")) {
      fail(`unknown argument: ${argument}`);
    } else if (options.resultFile === undefined) {
      options.resultFile = argument;
    } else {
      fail("only one Pilot result file may be supplied");
    }
  }
  for (const key of ["root", "lock", "schema", "resultFile"]) {
    if (options[key] === undefined) fail(`missing required ${key} argument`);
  }
  return options;
}

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.payloadOnly) return payloadSha(options.resultFile);

  const root = fs.realpathSync(path.resolve(options.root));
  const lockFile = path.resolve(options.lock);
  const schemaFile = path.resolve(options.schema);
  const resultFile = path.resolve(options.resultFile);
  const schema = readJson(schemaFile, "Pilot schema");
  if (
    schema.$id !== "https://vdoc.dev/contracts/pilot-result-v2.schema.json" ||
    schema.title !== "Vdoc v0.1 Pilot Result v2"
  ) {
    fail("unexpected Pilot result schema identity");
  }
  const result = readJson(resultFile, "Pilot result");
  const errors = validateJsonSchema(schema, result);
  if (errors.length > 0) fail(`Pilot result does not match schema v2:\n${errors.slice(0, 50).join("\n")}`);

  const lock = readJson(lockFile, "workspace lock");
  validateLock(lock);
  scanSecrets(fs.readFileSync(resultFile), "Pilot result");
  const verifyEvidence = makeEvidenceVerifier(resultFile);
  validateReferencedEvidence(result, verifyEvidence);
  const draftCommits = result.repository_commits;
  const draftLockHash = sha256File(lockFile);
  for (const [gateName, gate] of Object.entries(result.automated_gates)) {
    validateGateAttestation({
      gateName,
      gate,
      verifyEvidence,
      commits: draftCommits,
      lockHash: draftLockHash,
    });
  }
  validateDraftSignatures(result, resultFile, verifyEvidence);

  if (options.allowIncomplete) {
    console.log("Pilot result schema and referenced evidence are valid; product validation remains incomplete.");
    return;
  }
  validateClosure({ result, resultFile, root, lock, lockFile, verifyEvidence });
  console.log(
    "Pilot evidence closure candidate verified: schema, on-disk evidence hashes, target-user participation, pre-Pilot gate attestations, locked commits, and payload-bound sign-offs are structurally consistent.",
  );
  console.log(
    "Human release control must still verify signer identity, participant authenticity, and evidence-store immutability.",
  );
}

try {
  main();
} catch (error) {
  console.error(`FAIL: ${error.message}`);
  process.exit(1);
}
