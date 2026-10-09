# Changelog

## v0.3.15

Fix literal prompt placeholders in the Chinese and English AI setup guide. <code v-pre>{{context}}</code> and <code v-pre>{{message}}</code> remain visible so the required fields can be preserved.

This documentation patch adds no database migration and uses the v0.3.14 application behavior and upgrade process.

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

This page records the current user-visible v0.2 state covered by the VitePress docs. It is not a marketing list; it is what users should know before evaluation, deployment, or pilot use.

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

- Standalone deployments use Backend/Admin `latest`, PostgreSQL `18` and RustFS `1.0.0`; pull/up updates containers.
- Document separate frontend/backend Caddy domains on ports 8081/8080 and the first-use workflow.
- Support explicit wildcard CORS without disabling account, MCP or share authentication.
- Promote `latest` after stable publication; prereleases and older releases cannot overwrite newer aliases.

## v0.3.2

- Sync [go-template/http-services](https://github.com/ChnMig/go-template/tree/main/http-services) through `f8ab237`, and identify the scaffold source and synchronization record in both backend READMEs.
- Centralize request log metadata and standard-context trace fallback; clear stale values after failed parameter rebinding while preserving credential and document-content redaction.
- Treat disconnected and aborted requests as cancellations without appending an error envelope or empty success response; add a Base64URL random-string helper and regression coverage.
- Align all five repositories, images, Compose downloads, and Agent install references to v0.3.2.

No database migration is added beyond v0.3.1. Existing REST/MCP APIs and token formats remain compatible. See [Upgrade and Rollback](release-rollback.md).

## v0.3.1

- Preserve exact OpenAPI numbers and semantic differences across schema processing, MCP responses, and the workbench, including large integers and high-precision decimals.
- Improve history pagination, endpoint fact reads, token authentication, and password hashing lock scope; fix historical selections, draft conflicts, and review snapshot handling.
- Fix UTF-8 password sign-in, whitespace validation when creating users, keyboard skip navigation, and fallback fonts when external fonts are unavailable.
- Propagate MCP cancellation to the backend HTTP connection, with regression coverage for numeric transport, cancellation, concurrent permissions, and browser workflows.

This release includes migration `007_parser_facts_and_history_pages.sql`, adding parser metadata, history query indexes, and the Diff `must_handle` field. Back up the database and object storage before following [Upgrade and Rollback](release-rollback.md). The 22-tool MCP contract remains compatible.

## v0.3.0

- Deploy and update with a single [docker-compose.yml](deployment.md): all settings and secrets are in YAML, with no `.env` or installation scripts.
- Pull verified Linux amd64/arm64 Backend and Admin images directly from GHCR.
- Validate required configuration before database initialization; backend startup handles schema migrations, administrator and storage bucket setup.
- Document preservation of existing keys and volumes, including migration from older Compose archives.

This release adds no database migrations and keeps the v0.2.0 MCP API contract. See [Upgrade and Rollback](release-rollback.md).

## v0.2.1

- The [deployment guide](deployment.md#compose-example) adds a complete Docker Compose example with one-click copying for all four services, plus `.env`, deployment directory, and image-loading instructions. The example reads directly from the deployment package source.
- Fixed clipped MCP configuration panels on narrow Admin screens; long configurations scroll within their panel.
- Aligned all five repositories, prebuilt images, the Compose download, and MCP/Skill install references to v0.2.1.

This patch adds no database migration. Backend APIs and the 22-tool MCP contract remain compatible with v0.2.0. See [Upgrade and Rollback](release-rollback.md) for the upgrade procedure.

## v0.2.0

- New MCP tools `get_schema_version` and `get_doc_version` return complete content from an exact published version.
- Latest-content reads require `branch_id`, and undeclared arguments are rejected. Reload MCP tool discovery after upgrading and update callers of `get_latest_schema` / `get_latest_doc`.
- OpenAPI draft reads add raw content from the same snapshot as the revision, while preserving existing metadata fields.
- Backend/Admin releases include Linux amd64 and arm64 Docker images. The installer verifies checksums and source identity without requiring five source checkouts.
- Admin and first-use docs provide Codex / Cursor configurations. The site improves Chinese search, language switching, main landmarks and feature-link names.
- The official site uses [GitHub Pages](https://chnmig.github.io/Vdoc-site/), deployed only after a stable Site tag passes verification.

No database migration is added. Human publication, immutable versions and token permissions retain their existing boundaries. Back up PostgreSQL and object storage and upgrade the coordinated five-repository release.

## Current Docs Changes

- The reading path changed from an operations manual to: understand Vdoc, learn the runtime flow, deploy, first use, Agent integration, upgrade, and troubleshoot.
- The Chinese default entry is `/`.
- English docs use `/en/...` with matching topic routes.
- Added [How It Works](how-it-works.md) to explain Admin review, Drafts, Versions, MCP, Skills, and Agents.
- [Deployment Guide](deployment.md) has been rewritten around `scripts/vdoc-local-bootstrap.sh`, root Compose, optional demo seed, live-compose E2E, release dry-run, direct deployment, and external PostgreSQL/S3 compatible storage.
- [First Use](admin-usage.md) now covers the first chain from initial admin to Project, Document, Draft, Version, MCP Token, MCP adapter, and Skill.
- Added [Admin AI](admin-ai.md) for system and project providers, two OpenAI-compatible API modes, prompt overrides, automatic summaries, page chat, audit behavior, and the human publishing boundary.
- [Upgrade and Rollback](release-rollback.md) now covers PostgreSQL/object storage backup, `docker compose --env-file .env up -d --build`, live E2E, `scripts/vdoc-release-dry-run.sh`, health verification, and rollback.

## Current Product Surface

- Backend provides public health/auth/docs/MCP routes and private Admin routes.
- Backend automatically runs migrations when database is enabled and tries to create the missing bucket when storage is enabled.
- Admin Docker supports runtime `VDOC_ADMIN_API_BASE_URL` to generate a browser-usable backend API base URL.
- `@vdoc/mcp` is an installable stdio MCP adapter that forwards Agent MCP requests to backend.
- `Vdoc-skill` is an installable Agent workflow package that tells Agents to query Vdoc MCP before answering from facts.
- Built-in Admin AI can help explain Drafts, Versions, and Diffs, but it does not replace the external MCP/Skill Agent, machine Diff, or the human publishing gate.
- Live E2E uses `./scripts/vdoc-e2e.sh live-compose --env-file ../.env` and resets only the disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default.

## Boundaries to Remember

- MCP cannot publish Versions directly.
- Agents can submit Drafts; publishing requires Admin or SuperAdmin review.
- Do not use Compose service names in browser config. Browsers use `127.0.0.1` or domains; containers use service names such as `postgres`, `rustfs`, and `backend`.
- Do not put real secrets in docs, logs, screenshots, or Git history.

## Verify the Docs

1. Open `/` and confirm the default Chinese page loads.
2. Open `/en/product-overview` and confirm the English page loads.
3. Click [How It Works](how-it-works.md), [Admin AI](admin-ai.md), [Deployment Guide](deployment.md), [MCP Tools](mcp-tools.md), and [Upgrade and Rollback](release-rollback.md), and confirm the topic path is coherent.
