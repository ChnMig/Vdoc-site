# Vdoc Release And Deploy Checklist

This document closes the v0.2 engineering delivery loop and defines the separate Pilot sign-off gate. It is intentionally conservative: publish only artifacts that have passed CI, local dry-run checks, the live smoke path, and the applicable human evidence review.

## Single-file deployment distribution

`deploy/docker-compose.yml` is the canonical user deployment. Site publishes its identical bytes and SHA-256 as Release assets and website downloads; the rendered example includes this same source. Keep the source workspace archive as an optional developer/offline distribution.

Backend and Admin tag workflows publish their verified amd64/arm64 image archives to GHCR and create a multi-platform version tag. `container-image.json` records image digests and source revision. Existing image tags cannot be overwritten with different contents. On first publication, ensure both GHCR packages are public and verify anonymous pulls before releasing Site. CI requires `packages: write`; users do not need a registry login.

Before publishing, run `python3 scripts/test-single-compose.py` with the candidate image options. It uses a directory containing only YAML and disposable project/volume names, verifies placeholder rejection, automatic setup, stored content and tokens across container recreation, and optionally upgrades a legacy backend image. It never uses the real workspace `.env` or application volumes.

## 1. Required Checks

For the 0.3.0 release, the Compose archive is `vdoc-compose-bootstrap-v0.3.0.tar.gz`. Update and commit MCP/Skill first, update their install pins in Admin and Site, then commit Admin. Pin Backend/Admin/MCP/Skill commits in the workspace source lock and update `.env.example` build provenance. Keep only the Site commit as `@release`, sync the workspace export, and commit Site last.

Push the Backend, MCP, Skill, and Admin `v0.3.0` tags before the Site tag. The Site tag build resolves its own tag to its checkout commit, checks all other tags against the committed lock, and includes five exact commit hashes in the archive. A missing or mismatched tag fails the release; there is no fallback to a branch or an older release. Do not move published tags.

Backend/Admin tag workflows also build and smoke-test native Linux amd64 and arm64 Docker images. Their compressed Docker archives and per-image SHA-256 files are retained as release assets; the release waits for both image jobs. The bootstrap image loader verifies those files, their platform, and their source-revision labels against the lock.

Before publication, run `pnpm workspace:package --candidate` in Site for content/build/browser checks. Candidates are marked in their lock, cannot be initialized or packaged as releases, and are never uploaded as release distributions by branch/PR CI. After all tags exist, `pnpm workspace:package` and `pnpm site:package` use the strict published path. Stable Site tags deploy to GitHub Pages after the tagged release and Pages verification pass.

Run or confirm the CI workflows for each repository. The workflow files live under hidden `.github/` directories in each subproject; from the workspace root you can verify them with `rg --hidden --files -g 'ci.yml' .`.

Use the root release dry-run from the workspace root as the local closure gate before tagging:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

The five repository baselines are pinned in `workspace.lock.json` schema v2 by remote, advertised ref, and commit; the same lock binds the non-Git root control plane to its canonical distributed-file SHA-256. Use `scripts/vdoc-workspace-init.sh` only to clone missing repositories on a fresh machine, and `scripts/vdoc-workspace-verify.sh` to verify an existing workspace. Existing repositories are never fetched, reset, checked out, or cleaned by the initializer. The verifier uses `git ls-remote`, so forged or stale local `origin/*` refs cannot prove publication.

After committing and pushing all five repositories, update every cross-repository MCP/Skill pin and the Compose provenance values to those commits. Then review and explicitly write the candidate lock:

```sh
scripts/vdoc-workspace-lock-refresh.sh
scripts/vdoc-workspace-lock-refresh.sh --write
scripts/vdoc-workspace-verify.sh
```

The default refresh never mutates the lock. `--write` is atomic and refuses dirty or unpushed HEADs. A `refs/heads/main` lock proves the current remote tip only; an immutable release claim requires reviewed release tags and a final lock generated against them.

The dry-run is local only. It verifies the workspace lock and its tests, Compose configuration, backend formatting/vet/tests/E2E/build, Admin formatting/typecheck/lint/unit/build/entrypoint/browser checks, both Site base paths with browser and performance checks, and MCP/Skill package dry-runs. It does not publish packages, deploy services, push images, create git refs, or automate external release infrastructure. Add `--include-live` only when disposable live PostgreSQL/RustFS resources are already running; without it, live persistence is explicitly not covered.

It also validates the Docker Compose bootstrap inventory, its post-publication asset verifier, and the Pilot result gate. These are structural checks: the dry-run does not fabricate a public release or approve a real Pilot result.

- `Vdoc/.github/workflows/ci.yml` for backend build, vet, tests, and v0.1 E2E smoke.
- `Vdoc-admin/.github/workflows/ci.yml` for formatting, build, lint, Vitest jsdom tests, container-entrypoint checks, and browser safety paths.
- `Vdoc-site/.github/workflows/ci.yml` for formatting, typecheck, lint, unit/content tests, the self-hosted root build, its budget, and root browser/performance QA. The root dry-run additionally verifies the optional `/Vdoc-site/` compatibility base.
- `Vdoc-mcp/.github/workflows/ci.yml` for build, tests, and package dry-run.
- `Vdoc-skill/.github/workflows/ci.yml` for tests and package dry-run.

Before tagging a pilot release, also run the live backend smoke from `PILOT_RUNBOOK.md` with disposable PostgreSQL and RustFS/S3 resources:

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not use or reset the application database from `VDOC_POSTGRES_DB`.

## 2. Secret And Environment Requirements

Backend production or pilot deployments must set:

- `VDOC_JWT_KEY`
- `VDOC_DATABASE_ENABLED=true`
- `VDOC_DATABASE_DSN`
- `VDOC_STORAGE_ENABLED=true`
- `VDOC_STORAGE_ENDPOINT`
- `VDOC_STORAGE_BUCKET`
- `VDOC_STORAGE_ACCESS_KEY`
- `VDOC_STORAGE_SECRET_KEY`
- `VDOC_MCP_TOKEN_CIPHER_KEY`
- `VDOC_MCP_TOKEN_CIPHER_KID`
- `VDOC_MCP_TOKEN_CIPHER_KEYRING` as a JSON object only while historical keys are needed
- `VDOC_SERVER_CORS_ALLOWED_ORIGINS` with the exact Admin/public-share HTTP(S) origins that may call the API
- `VDOC_BACKEND_VERSION`, `VDOC_BACKEND_GIT_COMMIT`, and `VDOC_BACKEND_BUILD_TIME` matching the locked backend source
- `VDOC_ADMIN_VERSION`, `VDOC_ADMIN_GIT_COMMIT`, and `VDOC_ADMIN_BUILD_TIME` matching the locked Admin source when building the Compose images

Admin deployments must set:

- `VITE_VDOC_API_BASE_URL`

Rules:

- Production CORS values must be comma-separated origins only, for example `https://admin.example.com`; do not use `*`, paths, query strings, fragments, or a trailing slash. Include every deployed Admin/public-share origin and verify an unauthorized preflight receives `403` before release.
- Never commit `.env` files, JWT keys, MCP tokens, storage secrets, database passwords, or Authorization headers.
- Never paste raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values into release notes, logs, screenshots, or issues.
- Never change a key while keeping the same KID. A KID identifies exactly one key for its lifetime.
- Keep MCP tokens user-bound in v0.2; project-bound robot/CI tokens remain future work.
- Container base images and CI service images must include an OCI `@sha256:` digest. Update a tag and digest together through review; never silently refresh only the digest during a release build.
- Backend/Admin Docker builds reject `dev`, `unknown`, missing provenance, and malformed Git commits. A `-dirty` commit suffix is local-development provenance, not a releasable source identity.

After building the root Compose stack, confirm the embedded backend provenance:

```sh
docker compose --env-file .env exec backend /app/vdoc --version
jq -r '.repositories[] | select(.path == "Vdoc") | .commit' workspace.lock.json
```

The reported Git commit must equal the lock exactly. Inspect the backend and
Admin OCI labels as part of the retained image evidence; do not rebuild an
image after recording its digest.

### Cipher-key rotation

`mcp_token` protects three persisted secret classes: MCP token reveal ciphertext,
AI Provider API keys, and public-share capabilities. Rotate them as one unit:

1. Back up PostgreSQL and stop all but one backend writer.
2. Move the old `VDOC_MCP_TOKEN_CIPHER_KID` and key into
   `VDOC_MCP_TOKEN_CIPHER_KEYRING`, for example
   `{"local-aes-gcm-v1":"<old-key>"}`. Set a new unique active KID and a new
   `VDOC_MCP_TOKEN_CIPHER_KEY`.
3. Start one backend. Startup decrypts and validates every encrypted record
   first, then rewrites all historical KIDs to the active KID in one repository
   transaction. An unknown KID, wrong key, or hash mismatch aborts startup
   before rotated state is persisted.
4. Verify that all three tables contain only the active KID:

   ```sql
   SELECT 'mcp_tokens' AS source, cipher_kid, count(*) FROM mcp_tokens GROUP BY cipher_kid
   UNION ALL
   SELECT 'ai_providers', cipher_kid, count(*) FROM ai_providers GROUP BY cipher_kid
   UNION ALL
   SELECT 'document_shares', cipher_kid, count(*) FROM document_shares GROUP BY cipher_kid;
   ```

5. Reveal one MCP token, test one configured AI Provider, and reveal one active
   public share. Then remove `VDOC_MCP_TOKEN_CIPHER_KEYRING`, restart again, and
   repeat the checks before restoring normal backend concurrency.

Treat the keyring JSON as a secret. Do not place it in command arguments,
release logs, screenshots, or committed Compose files.

## 3. Backend Release

The Backend CI automatically packages and publishes a GitHub Release when a `vMAJOR.MINOR.PATCH` tag (optionally with a prerelease suffix) passes its existing checks. It produces Linux amd64/arm64, macOS amd64/arm64, and Windows amd64 archives plus `SHA256SUMS`; binaries embed the tag, full commit, and commit time. The publisher uses the verified CI artifacts and does not overwrite existing releases. Local packaging is available through `make release-package RELEASE_TAG=<version-tag>`.

Build a local artifact:

```sh
cd Vdoc
make verify
make test-e2e
make build
```

For cross-platform distributables:

```sh
cd Vdoc
CROSS=1 make build
```

Deploy with the target environment's process manager or container platform. The backend should start with persistence enabled for shared pilots; do not rely on the in-memory fallback outside local development.

Post-deploy checks:

```sh
curl https://your-vdoc.example.com/api/v1/open/health
```

The health response must report ready dependencies for database and storage when those features are enabled.

## 4. Admin Release

The Admin tag workflow runs its existing build, lint, unit, container-entrypoint, and browser checks before publishing `vdoc-admin_<tag>.tar.gz` and `SHA256SUMS` to GitHub Releases. The archive contains the verified static site, runtime configuration stub, and license notices. For a local packaging check, build first, then run `pnpm release:package <version-tag>`; outputs are ignored by Git.

```sh
cd Vdoc-admin
pnpm install --frozen-lockfile
pnpm format:check
pnpm exec tsc -b --pretty false
pnpm lint
pnpm test
pnpm build
pnpm test:entrypoint
pnpm test:browser
```

Admin unit tests run in Vitest's jsdom environment; the browser gate additionally requires a locally installed Playwright-compatible browser.

Deploy the generated `dist/` directory or extract the tagged static archive to the chosen hosting platform with SPA fallback. Configure `window.__VDOC_ADMIN_CONFIG__.apiBaseUrl` in the included `runtime-config.js` for a prebuilt archive, or `VITE_VDOC_API_BASE_URL` when building locally, so authenticated and anonymous API calls target the deployed backend. Public share browser links use the Admin origin by default; set `VITE_VDOC_PUBLIC_SHARE_BASE_URL` when building for a separate public-share frontend origin. That frontend origin must also appear in `VDOC_SERVER_CORS_ALLOWED_ORIGINS`.

Post-deploy smoke:

1. Register or log in.
2. Confirm `/api/v1/private/identity/me` succeeds.
3. Open Dashboard as SuperAdmin and as Project Admin.
4. Create or inspect a Project, Document, Promote Draft, Draft Diff Preview, Version, Markdown/OpenAPI Diff, MCP Token, and Skill instructions.
5. Reveal an active MCP Token, verify revoked/expired tokens remain redacted, and copy the MCP config example.
6. Create unprotected and protected public document links, verify anonymous view/history/download on desktop and mobile, then revoke them and confirm immediate uniform failure.

## 5. Site Release

```sh
cd Vdoc-site
pnpm install --frozen-lockfile
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm workspace:package
pnpm test:content

pnpm build:root
pnpm check:budget
PLAYWRIGHT_BASE_PATH=/ pnpm test:browser
PLAYWRIGHT_BASE_PATH=/ pnpm test:performance

pnpm build:pages
pnpm check:budget
PLAYWRIGHT_BASE_PATH=/Vdoc-site/ pnpm test:browser
PLAYWRIGHT_BASE_PATH=/Vdoc-site/ pnpm test:performance
```

Each base build overwrites the same output directory, so build once per base and run its browser and performance gates before building the other base. The deployable Pages output is `Vdoc-site/docs/.vitepress/dist/` from the workspace root, or `docs/.vitepress/dist/` inside `Vdoc-site`.

The Site repository tracks the workspace sources only. Its CI regenerates the Compose archive and checksum, verifies their contents, runs the root-site gates, and uploads a `site-distribution` Actions artifact containing the static-site archive, Compose archive, and both checksums. These generated files are excluded from Git.

Pushing a Site `vMAJOR.MINOR.PATCH` tag (optionally with a prerelease suffix) automatically creates a GitHub Release after those checks pass. The publish job downloads and verifies the exact CI artifacts; it does not rebuild them or overwrite an existing release. Prerelease tags create prereleases. Stable Site tags additionally deploy the verified `/Vdoc-site/` build to https://chnmig.github.io/Vdoc-site/. Prereleases never deploy Pages. Application commits remain pinned by `workspace.lock.json`; publishing a Site tag does not change those pins or approve the separate live/Pilot gates.

The repository workflow verifies the root `/` build and publishes its static archive. Its reusable Pages workflow checks out the stable Site tag, downloads the published Compose artifact, verifies source identity, builds and tests `/Vdoc-site/`, then deploys to GitHub Pages. Branch pushes do not deploy the website.

For every site candidate, record the source SHA, CI workflow run ID, retained static-artifact identifier and checksum, deployment URL, selected base path, and references to the format/typecheck/lint/unit/content/build-budget/browser/performance evidence. The CI workflow retains browser/performance failure evidence for 14 days. After a `/Vdoc-site/` deployment, check `/Vdoc-site/`, `/Vdoc-site/en/`, `/Vdoc-site/admin-ai`, `/Vdoc-site/en/admin-ai`, and their local assets; links, scripts, styles, fonts, and the favicon must remain under `/Vdoc-site/`.

This site delivery chain changes no backend or Admin runtime behavior. Confirm public pages still describe the same backend, Admin, MCP, Skill, and Admin AI behavior as this checklist.

## 6. MCP Package Release

The MCP tag workflow publishes an npm-format `.tgz` and `SHA256SUMS` to GitHub Releases after its existing checks pass. Before tagging, use `npm version <next-version> --no-git-tag-version`, commit both package manifests, and push the matching `v<next-version>` tag. Packaging rejects a mismatch with `package.json` or `package-lock.json`. The adapter reports that package version in its MCP handshake and HTTP user-agent. This workflow does not publish to the npm registry.

```sh
cd Vdoc-mcp
npm ci
npm test
npm_config_cache=/tmp/vdoc-npm-cache npm pack --dry-run
```

Before publishing, verify:

- `dist/`, `examples/`, `README.md`, and `LICENSE` are included.
- README examples use `VDOC_BASE_URL` or `VDOC_MCP_URL` plus `VDOC_MCP_TOKEN` environment variables.
- No docs include real tokens or Authorization headers.

## 7. Skill Package Release

The Skill tag workflow uses the same package-version check and GitHub Release process as MCP. Update both manifests with `npm version <next-version> --no-git-tag-version`, commit, and push the matching tag. Release assets contain the installable `.tgz` and `SHA256SUMS`; extracting with `--strip-components=1` places `SKILL.md` at the skill root. Generated artifacts are ignored by Git, and npm registry publication remains separate.

```sh
cd Vdoc-skill
npm ci
npm test
npm_config_cache=/tmp/vdoc-npm-cache npm pack --dry-run
```

Before publishing or distributing, verify `SKILL.md`, `templates/`, `examples/`, `README.md`, and `LICENSE` are included and no examples contain real secrets.

## 8. Rollback

Backend rollback:

1. Stop new traffic or put the service in maintenance at the load balancer.
2. Restore the previous backend binary/container.
3. Keep the database and object store intact unless a migration explicitly requires rollback.
4. Re-run health checks and a read-only MCP tool call.

Admin rollback:

1. Repoint static hosting to the previous `dist/` artifact.
2. Confirm login, Dashboard, Documents/public-share management, Drafts/Promote, Versions, Diffs, MCP Token, Skill, and anonymous share pages still load.

Site rollback:

1. Select the previous retained static artifact and verify its source SHA, checksum, selected base path, and QA evidence.
2. Repoint the operator-owned static hosting release to that exact artifact; do not rebuild it during rollback.
3. Record the rollback deployment URL, then recheck the locale entries, Admin AI pages, release/rollback pages, and base-safe assets.
4. If no verified artifact remains, check out the intended source SHA, run the complete release gate again, and treat the rebuilt output as a new release candidate rather than claiming an artifact rollback.

MCP/Skill rollback:

1. Keep the previous package version available.
2. Ask pilot users to pin the previous version in agent config if needed.

## 9. Pilot Product-Validation Gate

Engineering tests and CI can approve a release candidate, but they cannot assert that the MVP success criteria were validated by real users. Start from `PILOT_RESULT.template.json`, keep participant evidence outside source control unless an approved evidence system says otherwise, and follow `PILOT_RUNBOOK.md`.

Pilot schema v2 requires content-addressed, on-disk evidence rather than free-form references. Before `environment.started_at`, attach both fixed gates so their logs and attestations are bound to the exact commands, five commits, workspace-lock digest, and pre-Pilot time:

```sh
scripts/vdoc-gate-attest.sh pilot-results/<pilot-id>.json release_dry_run
scripts/vdoc-gate-attest.sh pilot-results/<pilot-id>.json live_persistence_e2e
```

After the target-user window ends and the payload is frozen, two different authenticated humans create payload-bound approval records:

```sh
scripts/vdoc-pilot-sign.sh pilot-results/<pilot-id>.json pilot_operator "<reviewer name>"
scripts/vdoc-pilot-sign.sh pilot-results/<pilot-id>.json product_owner "<reviewer name>"
```

The release record may say **Pilot validated candidate** only after this command succeeds against the reviewed result:

```sh
scripts/vdoc-pilot-result-verify.sh pilot-results/<pilot-id>.json
```

The default gate requires four distinct target-user roles and binds them to real product tasks: `writer` covers criteria 01, 02, 08, and 10; `project_admin` covers 01, 02, 08, 10, 12, and 13; `reader` covers 03–07, 09, and 11; and `external_reader` covers 14. Every role must provide evidenced verbatim feedback, and all 14 criteria must pass inside the real Pilot window with nonblank observations and `{path, sha256}` evidence. The same gate also requires evidenced consent, pre-Pilot release/live gate attestations, an OpenAPI draft time of at most 60 seconds, commits matching `workspace.lock.json`, no open critical issue, and two distinct approvals bound to the unchanged payload. It re-verifies the current workspace and scans the result plus referenced artifacts for secret patterns, traversal, symlinks, and hash drift.

An empty template, `--allow-incomplete` success, a missing/unexercised target-user role, staff-only execution, missing role feedback, missing or hash-mismatched evidence, same-person/unsigned sign-off, a post-signature edit, or automated tests alone means **Pilot not yet validated**. The signing helper is provenance, not cryptographic identity authentication; signer identity and immutable evidence storage remain human controls. Do not convert `failed`, `blocked`, or negative verbatim feedback into a passing release narrative.

Ordinary deployments download `docker-compose.yml` alone, generated from `deploy/docker-compose.yml`. It contains configuration and versioned GHCR image references. The optional developer artifact is a Docker Compose bootstrap. `scripts/vdoc-workspace-package.sh` creates deterministic `vdoc-compose-bootstrap-v0.3.0.tar.gz` bytes with normalized order, modes, ownership, timestamps, and gzip metadata. It contains Compose/configuration files, the root MIT license, release tools, and the exact source lock; users build Backend/Admin images locally with Docker.

Vdoc-site provides the public workspace sources and website evaluation downloads; see [README.md](README.md#docker-compose-bootstrap-artifact). Those mutable website snapshots are not an immutable GitHub Release. The `v0.3.0` tag workflow produces the versioned Compose download after verifying all five source tags.

The Site tag workflow publishes both the tarball and `.sha256` file to GitHub Releases automatically. Record the exact tagged URL and checksum, together with any required release sign-off. Substitute an actually published Site tag below, then verify the public bytes instead of trusting the README link:

```sh
scripts/vdoc-workspace-release-assets-verify.sh \
  --release-base-url 'https://github.com/ChnMig/Vdoc-site/releases/download/<published-release-tag>' \
  --expected-sha256 <archive-sha256> \
  --local-artifact dist/vdoc-compose-bootstrap-v0.3.0.tar.gz
```

The in-lock root digest detects partial control-plane drift but is not an external signature because the lock and verifier ship together. Local package creation does not prove public availability; the release is not closed until the post-publication verifier succeeds.

## 10. Release Notes Template

```text
Version:
Workspace bootstrap URL:
Workspace bootstrap SHA-256:
Workspace control-plane SHA-256:
Workspace lock advertised refs:
Backend commit:
Admin commit:
Site commit:
Site workflow run ID:
Site artifact ID and checksum:
Site deployment URL and base path:
Site QA report references:
MCP package version:
Skill package version:
CI status:
Live smoke status:
Pilot result reference:
Pilot validation status:
Pilot operator / Product Owner sign-off:
Signer identity-authentication reference:
Immutable Pilot evidence reference:
Site smoke status:
Known limitations:
Rollback artifact:
```

Known v0.2 limitations should explicitly mention: no direct MCP publish, no invitation flow, no notification bot, no PR Bot, no complete SDK/codegen platform, and no commercial billing or tenant administration.
