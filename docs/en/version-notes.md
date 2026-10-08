# Version Notes

## v0.3.14

- Reject invalid boolean configuration instead of silently falling back to in-memory storage. Cancel dependency startup and background summary work promptly.
- Retain provider-reported token usage when a Provider test is canceled or a summary/chat request is superseded, without overwriting newer content.
- Reject published version-name collisions when editing or submitting drafts. Reuse stored objects for unchanged saves while preserving transactions, audits and concurrency checks.
- Scope project-member forms to the project and login session, preserving new input after delayed success. Show loading, failure, retry and empty states for user token inventories.
- Refresh a current-version share once when publication races with content loading. Ignore download errors from an older unlock proof after reauthentication.
- Recursively sanitize MCP error data while preserving error codes and JSON types. Keep successful document content unchanged.
- Pass PostgreSQL credentials as separate Compose connection fields, preserving literal special characters. Align troubleshooting with single-file deployment and use verified release archives for global MCP/Skill installation.

This release adds no application database migration and preserves REST/MCP tool parameters. Back up the database and object storage, preserve accounts, keys and volumes, then update images and recreate containers. Reload the Agent and restart MCP after updating MCP/Skill. See [upgrade and rollback](release-rollback.md).

## v0.3.13

- Bind workbench requests to the account credentials at invocation, preventing old operations from using a newly signed-in account's token. Stop the second step of an initial AI chat after sign-out, reauthentication or navigation.
- Show an invalid-link message when a version deep link conflicts with the current branch filter.
- Retain upstream token usage in failed AI audits when permission/configuration changes or cancellation invalidate the result.
- Move public-share password verification outside the global store lock, then recheck access and the password snapshot before issuing an unlock proof.
- Bound and cancel HTTP error response streams in MCP, preserving the received status instead of reporting a timeout. Harden unknown-error sanitization and fixed-commit installation failures.
- Allow the Skill to edit only a draft's version name or changelog while retaining the content and revision from the same read.
- Route Docker workbench API requests through its own `/api` proxy, fixing login and public-share requests in the default deployment. Update both deployment guides and the release lock.

This release adds no application database migration and preserves REST/MCP tool parameters. When upgrading an existing Compose configuration, set `VDOC_ADMIN_API_BASE_URL` to `same-origin`, preserve accounts, keys and volumes, then recreate Admin. Backend no longer uses the legacy `cors_allowed_origins` setting; cross-origin browser APIs require built-in CORS to be disabled and explicit authentication/share headers to be permitted at the gateway. See [upgrade and rollback](release-rollback.md). Restart the Agent after updating MCP/Skill.

## v0.3.10

- Cancel pending draft file submissions after sign-out, account changes, or leaving the page while preserving normal saves.
- Keep branch defaults accurate after switching the default; prevent old request completions from clearing a new project's or document's form input.
- Distinguish loading, failed, and successfully empty share inventories with retry; clear old secrets and setup configurations when refreshed MCP tokens are revoked or expired.
- Continue rejecting truncated AI output while retaining provider-reported token usage in failure audits.
- Validate candidate sources before tagging and retain strict tag and asset identity checks after publication; clarify that published versions on archived branches remain comparable within active documents.

No database migration is added and REST/MCP tool parameters remain compatible. Back up the database and object storage before upgrading, then update the MCP/Skill package and restart the agent.

## v0.3.9

- Evaluate OpenAPI request property changes against `additionalProperties`, so narrowed input requires handling; refresh stored diff facts when read.
- Recheck the parent team inside project creation transactions, preventing active projects from being created after another instance archives their team.
- Keep MCP response reads bounded while allowing the JSON escaping overhead of documents within the default backend size limit.
- Preserve the super administrator's All projects audit selection and the original filename and extension of public-share downloads.
- Accept valid prerelease versions across coordinated locks, packaging, and installation; prereleases still cannot replace `latest` or deploy the stable website.

No database migration is added and REST/MCP tool parameters remain compatible. Back up the database and object storage before upgrading, then update the MCP/Skill package and restart the agent.

## v0.3.8

The default global MCP/Skill installation now downloads the compiled GitHub Release archive and checks `SHA256SUMS` before installing it. This avoids npm global Git source preparation failures. Existing pinned `npx` MCP configurations remain supported. No application database migration is added.

## v0.3.7

- Consolidate the optional workflow Skill into `Vdoc-mcp/skills/vdoc`; MCP and Skill now share one package, version, and release.
- Preserve the original Skill Git history and historical tags under `skill/` in Vdoc-mcp. New installs and the four-repository workspace lock no longer require the old repository.
- Add `vdoc-mcp skill install` to link the bundled Skill. Updates at the same global installation path update its content; existing directories are never overwritten.
- Update the Admin installation guide and website examples to use the combined package. npm registry publication remains separate; current installs use reviewed Git commits or verified release archives.

No application database migration is added. Preserve any local Skill edits before migrating, then reload the agent and restart MCP.

These notes describe the v0.2 boundary. Before planning a pilot, writing Agent instructions, publishing packages, or upgrading, confirm that this scope is not being overstated.

## v0.3.6

- Prevent delayed sign-in or registration responses from replacing a newer account; cancel requests when leaving the form and check session identity before applying results.
- Keep CORS and security headers on global rate-limit rejections; preflight requests no longer consume business request quota.
- Respect request/response direction for OpenAPI `readOnly` and `writeOnly` required fields, including references, nesting, and `allOf`; refresh stored diff facts when read.
- Prevent old AI summary callbacks from repopulating the cache after sign-out, account changes, or a new login.

This patch adds no database migrations and keeps the REST/MCP contracts compatible. Deployment continues to use application `latest` images, PostgreSQL `18`, RustFS `1.0.0`, and separate frontend/backend domains. See [Upgrade and Rollback](release-rollback.md).

## v0.3.5

The deployment guide now displays the [complete Compose example for an existing PostgreSQL server](deployment.md#external-compose-example), including all YAML and field comments. Both language editions read from the same source as the downloadable file, keeping the example in sync with configuration updates.

This documentation patch adds no application feature or database migration. All five distributions use v0.3.5.

## v0.3.4

- Prevent late identity requests from overwriting or clearing a newer login session, including cancelled routes and sign-in with the same token.
- Correct the document format in OpenAPI 3.1 draft previews and published Diffs. Cross-dialect comparisons use the target format; existing cached facts are repaired on read.
- Keep the workbench theme context synchronized with operating-system theme changes.
- Add a standalone Compose file for an existing PostgreSQL server, with field comments, downloads, and checksums for both deployment variants.

No database migration is added beyond v0.3.3. REST/MCP contracts remain compatible. See [upgrade and rollback](release-rollback.md).

## v0.3.3

Standalone Compose follows the newest stable Backend/Admin images, PostgreSQL 18.x patches, and RustFS 1.0.0. Application image references no longer require editing each release; run `docker compose pull` and `docker compose up -d --wait` to update running containers.

[Two-domain Caddy deployment](deployment.md#caddy-domain) keeps frontend port 8081 and backend port 8080 separate. Admin connects to the backend HTTPS domain, and backend CORS is `*`; authentication and authorization remain required. The deployment smoke script covers real sign-in, publication, MCP reads and anonymous shares.

No application database migration is added beyond v0.3.2. Back up data and retain credentials; moving RustFS from an older beta to 1.0.0 also requires an object-storage backup. See [Upgrade and Rollback](release-rollback.md).

## v0.3.2

This patch integrates request log context, parameter rebinding cleanup, transport-abort handling, and the Base64URL random-string helper from the Go scaffold. Both backend READMEs identify [ChnMig/go-template](https://github.com/ChnMig/go-template), under `http-services/`, as the source. The reviewed upstream commit is `f8ab237`.

Logs continue to omit request bodies, credentials, and document contents. Ordinary API errors retain the unified business envelope; aborted connections or streams record a cancellation and terminate transport. Existing REST/MCP APIs, the 22 MCP tools, and issued token formats remain compatible.

Backend, Admin, Site, MCP, Skill, and Compose downloads use `v0.3.2`. No database migration is added beyond v0.3.1. Upgrades from older versions still apply pending migrations, including 007. See [Upgrade and Rollback](release-rollback.md).

## v0.3.1

This patch fixes exact contract numbers, semantic differences, history pagination, password input, and authenticated-page accessibility. It also improves MCP cancellation and backend concurrency. Published facts retain their original JSON numbers in MCP responses.

Upgrade applies `007_parser_facts_and_history_pages.sql`, adding parser metadata, history query indexes, and the Diff `must_handle` field. Back up PostgreSQL and object storage first; rolling back an image does not reverse database migrations. See [Upgrade and Rollback](release-rollback.md).

Backend, Admin, Site, MCP, Skill, and Compose downloads use `v0.3.1`. The existing 22 MCP tools remain compatible; human review, permissions, and bcrypt cost 12 remain unchanged.

## v0.3.0

- Deploy and update with a single [docker-compose.yml](deployment.md): all settings and secrets are in YAML, with no `.env` or installation scripts.
- Pull verified Linux amd64/arm64 Backend and Admin images directly from GHCR.
- Validate required configuration before database initialization; backend startup handles schema migrations, administrator and storage bucket setup.
- Document preservation of existing keys and volumes, including migration from older Compose archives.

This release adds no database migrations and keeps the v0.2.0 MCP API contract. See [Upgrade and Rollback](release-rollback.md).

## v0.2.1

This patch includes the [complete Compose example](deployment.md#compose-example) and the fix for clipped MCP configuration panels on narrow Admin screens. All five repositories and deployment downloads use v0.2.1.

Backend APIs and the 22-tool MCP contract remain compatible with v0.2.0, with no new database migration. Follow [Upgrade and Rollback](release-rollback.md) to update release files and load new images while preserving the existing `.env`, Compose project name, and data volumes.

## v0.2.0

- New MCP tools `get_schema_version` and `get_doc_version` return complete content from an exact published version.
- Latest-content reads require `branch_id`, and undeclared arguments are rejected. Reload MCP tool discovery after upgrading and update callers of `get_latest_schema` / `get_latest_doc`.
- OpenAPI draft reads add raw content from the same snapshot as the revision, while preserving existing metadata fields.
- Backend/Admin releases include Linux amd64 and arm64 Docker images. The installer verifies checksums and source identity without requiring five source checkouts.
- Admin and first-use docs provide Codex / Cursor configurations. The site improves Chinese search, language switching, main landmarks and feature-link names.
- The official site uses [GitHub Pages](https://chnmig.github.io/Vdoc-site/), deployed only after a stable Site tag passes verification.

No database migration is added. Human publication, immutable versions and token permissions retain their existing boundaries. Back up PostgreSQL and object storage and upgrade the coordinated five-repository release.

## Included in v0.1

- One Go backend for REST API, MCP endpoint, persistence, authentication, review workflow, automatic migrations, and object storage writes.
- PostgreSQL persistence and S3 compatible object storage support.
- Root `docker-compose.yml` that starts PostgreSQL, RustFS, backend, and Admin.
- `scripts/vdoc-local-bootstrap.sh` for generating a disposable local `.env` while writing secrets only to the file.
- `Vdoc/scripts/vdoc-e2e.sh live-compose` for deriving live E2E settings from the root `.env`.
- `scripts/vdoc-release-dry-run.sh` as the local release gate, with no publishing or deployment.
- Admin UI for Team, Project, Document, Branch, Draft, Review, Version, Diff, endpoint detail, and MCP Token management.
- Built-in [Admin AI](admin-ai.md) with system and project OpenAI-compatible providers, prompt overrides, provider tests, automatic Draft and Version summaries, Draft/Version/Diff summary read and regeneration, page chat, and auditing.
- `@vdoc/mcp` package for Agent runtimes to query the Vdoc backend through MCP.
- `Vdoc-skill` package that tells Agents to query Vdoc before relying on API or Markdown facts.

## Production-Like Dependencies

- PostgreSQL stores metadata, users, permissions, and workflow state.
- RustFS, MinIO, or managed S3 compatible storage stores raw and normalized document objects.
- A stable backend origin is used by Admin browsers and Agent runtimes.
- Secret management is needed for JWT keys, MCP token cipher keys, database passwords, storage credentials, and Agent MCP tokens.

## Runtime Behavior

- When `VDOC_DATABASE_ENABLED=true`, backend connects to PostgreSQL and runs migrations at startup.
- Database connection or migration failure stops backend startup instead of falling back to memory mode.
- When `VDOC_STORAGE_ENABLED=true`, backend connects to object storage and tries to create the bucket if it is missing.
- Admin Docker reads `VDOC_ADMIN_API_BASE_URL` at container startup and writes `/runtime-config.js`.
- In full Compose, backend uses `postgres:5432` and `rustfs:9000`; browsers and host commands use `127.0.0.1` or a domain.
- Live E2E resets the disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not reset the application database from `VDOC_POSTGRES_DB`.

## Still Not Included

- MCP direct publish tools.
- AI authority to approve, request changes, reject, modify, or publish.
- Invitation flows and notification robots.
- PR bot automation.
- Full SDK or code generation platform.
- Commercial billing or full tenant management.

## Compatibility Rules

- Admin private API requests put the raw JWT in `Authorization`, with no `Bearer` prefix.
- REST returns an envelope with `code`, `status`, `message`, `detail`, `total`, `trace_id`, and `timestamp`.
- The MCP adapter forwards to `/api/v1/open/mcp`; it does not implement Vdoc business logic locally.
- Published Versions are immutable facts.
- `relative_path` is stable Document identity.

## Pilot Verification

1. Backend health returns success.
2. Admin can create or view Team, Project, Document, Draft, Version, Diff, and MCP Token records.
3. Live E2E passes `./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only` and `./scripts/vdoc-e2e.sh live-compose --env-file ../.env`.
4. `scripts/vdoc-release-dry-run.sh --list` and `scripts/vdoc-release-dry-run.sh` pass.
5. MCP `tools/list` returns tool schemas from the deployed backend.
6. Skill package tests pass, and Agents call Vdoc MCP before answering endpoint or migration questions.
7. Release notes clearly state that v0.2 does not support MCP direct publishing.
8. Admin AI provider tests succeed, Draft and Version summaries can be read, and failure cases do not block machine Diff or human review.
