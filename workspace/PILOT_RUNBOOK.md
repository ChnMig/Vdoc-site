# Vdoc Pilot Runbook

This runbook prepares and records a v0.1 Pilot. The automation path bootstraps `.env`, starts the root Compose stack, optionally seeds demo data, runs live E2E, and verifies the release candidate. Those checks do not replace real target-user execution, observed evidence, feedback, or human sign-off.

## 1. Prerequisites

- Go matching `Vdoc/go.mod`
- Node.js 22.13 or newer for `Vdoc-admin/` and `Vdoc-site/`; Node.js 20 or newer for `Vdoc-mcp/` and `Vdoc-skill/`
- `pnpm` 11.6.0 for `Vdoc-admin/` and `Vdoc-site/`
- `npm` for `Vdoc-mcp/` and `Vdoc-skill/`
- Docker with Compose v2
- `git`, `jq`, and `shasum` for lock, evidence, and provenance checks

Run every root command from the workspace root, the directory that contains `docker-compose.yml`, `Vdoc/`, `Vdoc-admin/`, `Vdoc-site/`, `Vdoc-mcp/`, and `Vdoc-skill/`.

The five repository baselines are pinned in `workspace.lock.json` schema v2 by remote, advertised ref, and commit. The lock also binds the non-Git root control plane to the distributed-file digest. On a fresh machine, extract the checksummed bootstrap and run `scripts/vdoc-workspace-init.sh`; it clones only missing repositories after confirming the fetched ref resolves to the locked commit. For an existing workspace, run `scripts/vdoc-workspace-verify.sh`. The verifier queries the configured remotes directly, so a forged local `origin/*` ref is not publication evidence. Initialization never fetches, resets, checks out, or cleans an existing repository, so local changes remain untouched and drift fails visibly.

Do not use production secrets in local `.env` files. Do not paste or commit raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values. The bootstrap script writes disposable local secrets into `.env` and does not print them.

## 2. Bootstrap Local Compose Env

Create a local-only `.env`:

```sh
scripts/vdoc-local-bootstrap.sh
```

If `.env` already exists, inspect it instead of overwriting it blindly. Use `scripts/vdoc-local-bootstrap.sh --dry-run` to confirm the target path, or `scripts/vdoc-local-bootstrap.sh --force` only when you intend to replace the local environment.

You may set `VDOC_INITIAL_ADMIN_EMAIL` and `VDOC_INITIAL_ADMIN_PASSWORD` in `.env` before the first backend start. Leave them blank if you prefer trusted first-user registration during a disposable pilot.

## 3. Start Root Compose

Start PostgreSQL, RustFS, backend API, and Admin from the workspace root:

```sh
docker compose --env-file .env up -d --build
```

The root stack uses PostgreSQL 18 and mounts its named volume at `/var/lib/postgresql`, as required by the PostgreSQL 18 image layout. A volume created by PostgreSQL 17 or earlier requires an explicit `pg_upgrade` or dump/restore migration before reuse. Do not start the PostgreSQL 18 service against that legacy volume, and never use `down -v` as an upgrade step.

Check status and health:

```sh
docker compose --env-file .env ps
curl http://127.0.0.1:8080/api/v1/open/health
curl -I http://127.0.0.1:8081/
docker compose --env-file .env exec backend /app/vdoc --version
```

The backend version output must not contain `dev` or `unknown`. Its Git commit
must identify the source that was built; a `-dirty` suffix is acceptable only
for disposable local development and blocks a release/Pilot gate. Release
Compose values must match `workspace.lock.json`.

Default local URLs:

- Backend health: `http://127.0.0.1:8080/api/v1/open/health`
- Admin: `http://127.0.0.1:8081`
- PostgreSQL host port: `127.0.0.1:5432`
- RustFS S3 API: `http://127.0.0.1:9000`
- RustFS console: `http://127.0.0.1:9001`

## 4. Optional Demo Seed

To create demo data against the local backend and root `.env`, run:

```sh
cd Vdoc && go run ./tools/vdoc-demo-seed
```

The seed command is optional. Use it for local demos and smoke checks, not for long-running pilot data you plan to preserve.

## 5. Run Live Backend E2E

The live E2E script can derive host-side PostgreSQL and RustFS settings from the root `.env` while the root Compose stack is running:

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Warning: live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not use or reset the application database from `VDOC_POSTGRES_DB`. Never set `VDOC_TEST_POSTGRES_DB` to the application database.

The success output lists variable names and the non-secret test database name. It must not print raw credentials.

## 6. Run Admin Workbench Path

Open Admin at `http://127.0.0.1:8081` and complete the first setup path:

1. Create or identify a Team.
2. Create a Project.
3. Create an OpenAPI or Markdown Document.
4. Create a Branch.
5. Create and submit a Draft.
6. Review and approve to publish a Version.
7. Create an MCP Token.
8. Reveal the active token again, copy the generated MCP config, and open the Vdoc Skill installation page.
9. Browse endpoint details, safe Markdown preview, document content, Draft Diff Preview, and Version Diff pages.
10. As Project Admin, create both unprotected and password-protected public links for a published Branch. In a private browser window, verify latest/history viewing and original download, then revoke the link and confirm access fails immediately.

Private REST uses a raw JWT in `Authorization` with no `Bearer` prefix. Keep JWTs and MCP tokens inside browser state, local agent config, or secret storage. Do not copy them into docs, logs, screenshots, command arguments, or issues.

For public shares, confirm the browser removes the `#vdoc_share_...` fragment before the first request, sends no account cookie/JWT, renders no raw Markdown HTML or remote images, and does not expose the capability in logs, storage, referrers, screenshots, or analytics.

## 7. Verify MCP Adapter And Skill

After creating an MCP token in Admin, configure the target agent with `npx --yes github:ChnMig/Vdoc-mcp#b65f346453525a3f35a6ce466cf47a4488d5c8f8`, `VDOC_BASE_URL=http://127.0.0.1:8080`, and `VDOC_MCP_TOKEN` in a secret-aware environment field. The Git commit must equal the `Vdoc-mcp` entry in `workspace.lock.json`; `@vdoc/mcp` is not published to the npm registry yet. Do not put tokens in CLI arguments.

Package checks remain local and do not publish anything:

```sh
cd Vdoc-mcp
npm ci
npm test
```

```sh
cd Vdoc-skill
npm test
```

Install or link the locked `Vdoc-skill/` checkout as `$HOME/.agents/skills/vdoc` for personal use or `.agents/skills/vdoc` for the current repository, with `SKILL.md` at that directory root. Verify `git -C Vdoc-skill rev-parse HEAD` equals the `Vdoc-skill` commit in `workspace.lock.json`; do not install from an unpinned shallow clone or moving branch. Pair it with the MCP adapter. v0.1 agents can submit Drafts, but direct MCP publish is not available. Admin or SuperAdmin review publishes Versions.

## 8. Local Release Gate

From the workspace root, inspect the local gate and then run it:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

The release dry-run verifies the workspace lock, Compose configuration, backend formatting/vet/tests/build, Admin formatting/typecheck/lint/unit/build/entrypoint/browser checks, both Site base paths with browser and performance checks, and MCP/Skill package dry-runs. It runs local checks only. It does not publish packages, deploy services, push images, create git refs, or automate external release infrastructure. Live PostgreSQL/RustFS E2E is intentionally excluded unless you pass `--include-live` with disposable services already running.

## 9. Record Real Pilot Evidence

Pilot result schema v2 treats every claim as a content-addressed local artifact.
Copy the template into an ignored result directory; the JSON file and all
referenced evidence must stay under that same directory. Do not edit the
template in place and do not commit participant data by default:

```sh
mkdir -p pilot-results
cp PILOT_RESULT.template.json pilot-results/<pilot-id>.json
scripts/vdoc-pilot-result-verify.sh --allow-incomplete pilot-results/<pilot-id>.json
```

Before recording `environment.started_at`, attach both fixed automated gates.
This ordering proves the tested baseline existed before target-user execution:

```sh
scripts/vdoc-gate-attest.sh pilot-results/<pilot-id>.json release_dry_run
scripts/vdoc-gate-attest.sh pilot-results/<pilot-id>.json live_persistence_e2e
```

Each command writes a gate log and a JSON attestation under
`evidence/gates/`, hashes both, binds the exact command, five commits, and
`workspace.lock.json` SHA-256, and records failure without converting it to a
pass. The live gate uses the disposable database configured in `.env`. If a
gate finishes at or after an already-recorded Pilot start, the attestation is
rejected and the retained log must be inspected.

Now record a real UTC Pilot window using `YYYY-MM-DDTHH:MM:SSZ`, the exact five
commits, pseudonymous participant IDs, participant kind (`target_user` or
`staff`), recorded consent, each of the 14 PRD 3.3 criteria, the measured
OpenAPI draft duration, known issues, and verbatim feedback. Closure requires
four distinct target-user participants, one for each supported Pilot role.
Each role must exercise the criteria mapped to its real product task and must
provide evidenced verbatim feedback inside the Pilot window:

| Target-user role | Required PRD 3.3 criteria | Product task |
| --- | --- | --- |
| `project_admin` | 01, 02, 08, 10, 12, 13 | review/publish boundary, first-run administration, AI configuration, and share creation |
| `writer` | 01, 02, 08, 10 | OpenAPI/Markdown draft and submit path without bypassing review |
| `reader` | 03–07, 09, 11 | discovery, versions, endpoint detail, diffs, change summaries, and MCP published-fact reads |
| `external_reader` | 14 | anonymous share password, history, download, and revocation behavior |

A criterion may name more than one participant when the workflow crosses role
boundaries. Staff may facilitate or observe, but staff evidence never replaces
the mapped target-user execution.

Every `consent_evidence`, criterion `evidence_refs`, feedback `evidence_ref`,
and optional issue reference uses this shape:

```json
{"path":"evidence/criteria/prd-3.3-01.txt","sha256":"<64 lowercase hex>"}
```

Generate the digest from the exact stored artifact, for example:

```sh
shasum -a 256 pilot-results/evidence/criteria/prd-3.3-01.txt
```

Paths must be portable relative paths inside the result directory. The
verifier rejects missing files, symlinks, traversal, digest mismatch, files
larger than its limit, blank observations/feedback, invalid dates, and evidence
that appears to contain JWTs, raw Vdoc tokens or share capabilities,
Authorization values, database credentials, storage keys, or cipher keys.
Access-controlled logs, screenshots, recordings, and issue exports are valid
only after redaction and content hashing.

Automation may validate structure and gates, but it must not invent observed outcomes, participant feedback, consent, or signatures. `not_run`, `failed`, and `blocked` are valid draft facts and must not be rewritten as `passed` to satisfy the gate. `--allow-incomplete` validates the draft structure and every reference already present; it never claims product validation.

After recording `environment.ended_at` and the honest `pilot_outcome`, freeze
the payload. The Pilot operator and Product Owner must be different,
authenticated people and sign independently after the Pilot ends:

```sh
scripts/vdoc-pilot-sign.sh pilot-results/<pilot-id>.json pilot_operator "<reviewer name>"
scripts/vdoc-pilot-sign.sh pilot-results/<pilot-id>.json product_owner "<reviewer name>"
```

The signer creates an approval record under `evidence/sign-off/` and binds it
to the canonical SHA-256 of the result with `sign_off` removed. Any later
payload edit invalidates both approvals and requires fresh review. The helper
records provenance but is not cryptographic identity proof; the release owner
must authenticate both humans outside this script.

Run the closure gate without `--allow-incomplete`:

```sh
scripts/vdoc-pilot-result-verify.sh pilot-results/<pilot-id>.json
```

Only the final success output means the evidence set is a candidate for product-validation closure. The command also re-verifies the current root digest, clean repository worktrees, exact HEADs, and live advertised remote refs. An unfilled template, an unsigned or same-person result, a result without evidenced consent/target-user execution/feedback, a post-signature payload edit, a workspace mismatch, or automation tests alone must be reported as **not yet validated**. Independent signer authentication and immutable evidence retention remain human release gates.

## 10. Stop Pilot Services

Stop services while keeping local data:

```sh
docker compose --env-file .env down
```

Use `docker compose --env-file .env down -v` only for disposable environments because it removes local PostgreSQL and RustFS volumes.
