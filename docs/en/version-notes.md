# Version Notes

## v0.4.7-beta.1

Refine workbench layout, icon spacing and interaction feedback. No new migration. See the [changelog](changelog.md) and [upgrade guide](release-rollback.md).

## v0.4.6

Managed images and MCP import are now stable. See the [changelog](changelog.md) and [upgrade guide](release-rollback.md).

## v0.4.6-beta.1

Managed Markdown images and MCP import: see the [changelog](changelog.md) and [upgrade guide](release-rollback.md).

## v0.4.5

Smaller Agent comparison responses and shorter shared-lock usage. No new migration. Full-content callers must pass `include_content: true`. Update components and restart MCP; see [upgrade notes](release-rollback.md).

## v0.4.4

Breadcrumb icons identify each level. Copy from directories, lists, file trees and readers with project/document IDs. Readers can copy too. No new migration; restart MCP after updating.

## v0.4.3

Preserve empty folders and isolate private tokens. Add folder row menus, a move tree, clickable paths and refresh; simplify reader actions. Unify capabilities, date/time controls, tables and motion, retaining sidebar preferences and reduced-motion support.

Migration **026** preserves legacy authorization. npm 0.4.3 was subsequently published on 2026-11-05; the GitHub MCP installer remains available. Beta is unchanged. See [upgrade instructions](release-rollback.md).

## v0.4.2

- Folder/document CRUD and moves; team/project discovery. 28 MCP tools retain full source reads, writes and downloads.
- Install, update and uninstall MCP globally; projects share user-wide configuration.
- Rename/move folders within a project, updating document paths; delete empty folders.
- Show key capabilities/access boundaries, remove draft wording and enlarge collapsed sidebar targets.
- Add Unlimited output tokens, retaining custom values; fix duplicate activity pagination.

Migration **025** preserves existing settings. Back up, upgrade Backend/Admin/MCP together and restart MCP. Stable channels update; Beta stays separate. See [Upgrade and Rollback](release-rollback.md).

## v0.4.1

Raw search, exact-commit section reads and optimistic, idempotent patches are stable, with no new migration. Update components together and restart MCP. See the [changelog](changelog.md) for tools and channels.

## v0.4.1-beta.1

Beta of the MCP source tools, with no new migration. See the [changelog](changelog.md) for scope and upgrade instructions.

## v0.4.0

Document branches, versions and MCP access are stable. Upgrades from v0.3.17 apply migrations 018–024; beta.7 adds none. Back up and update components together. See [upgrade instructions](release-rollback.md) for compatibility and audit retention.

## v0.4.0-beta.7

Exact-commit downloads and a PostgreSQL audit fix; migration **024** expands resource IDs. Back up and update components together. See the [changelog](changelog.md).

## v0.4.0-beta.6

Add npm `@beta`, global installation prompts and version warnings without migrations. First npm publication initialized `latest` to beta.6; the first stable npm release replaces it. See the [changelog](changelog.md).

## v0.4.0-beta.5

Standalone MCP and audit retention. See [upgrade instructions](release-rollback.md) for migration **023**, log cleanup and installer changes.

## v0.4.0-beta.4

See the [changelog](changelog.md) for sidebars and AI chat. Migration 022 retains chats and audit references for legacy and new documents. Back up Beta data before updating components together; image rollback does not undo migrations.

## v0.4.0-beta.3

Restore the document layout without changing branches or schema. See the [changelog](changelog.md).

## v0.4.0-beta.2

Independent document branches and versions, with migration **021**. Back up and update components together. See the [changelog](changelog.md#v0-4-0-beta-2) for compatibility and rollback limits.

## v0.4.0-beta.1

Immutable commits and fixed releases replace drafts: [changelog](changelog.md#v0-4-0-beta-1). Back up Beta database/storage before migrations 018–020. Administrators import legacy projects; missing source cannot be restored.

## v0.3.17-beta.9

Workspace, document layout and toolchain: [changelog](changelog.md#v0-3-17-beta-9); dependency audits do not guarantee environment security. No migration beyond beta.8; Beta only. Back up before [manual upgrade](release-rollback.md), update Agent Node.js and restart MCP.

## v0.3.17-beta.8

[Document workspace and fixed-version sharing](admin-usage.md); automatic migrations 010/011. See the [changelog](changelog.md).

## v0.3.17-beta.7

Folder workspace, TXT, and initial uploads. See the [changelog](changelog.md).

## v0.3.17-beta.6

Task layouts and shared form controls: see the [changelog](changelog.md). Beta only; no API or database migration changes.

## v0.3.17-beta.5

[Settings and list layout updates](changelog.md).

## v0.3.17-beta.4

[Deployed versions, channel checks, and Node.js build update](changelog.md).

## v0.3.17-beta.3

[List layouts and password changes](changelog.md). Both versions update Beta only, add no migration, and leave stable images and the website unchanged.

## v0.3.16

Isolated Beta images, ports, networks, volumes and MCP/Skill channel installs: [changelog](changelog.md#v0-3-16). No migration. Use separate test accounts, keys and tokens.

## v0.3.15

Fix literal prompt placeholders in the Chinese and English AI setup guide. <code v-pre>{{context}}</code> and <code v-pre>{{message}}</code> remain visible so the required fields can be preserved.

This documentation patch adds no database migration and uses the v0.3.14 application behavior and upgrade process.

## v0.3.14

Configuration, AI audits, drafts, sessions, shares, MCP errors, and deployment fixes: [changelog](changelog.md#v0-3-14). No migrations. Back up data before [upgrading](release-rollback.md); restart the Agent after updating MCP and Skill.

## v0.3.13

Session, version-link, AI audit, sharing, and MCP fixes: [changelog](changelog.md#v0-3-13). No migrations. Set `VDOC_ADMIN_API_BASE_URL` to `same-origin` and recreate Admin. See [upgrade guidance](release-rollback.md) for cross-origin and legacy CORS changes.

## v0.3.10

Fix draft sessions, branch defaults, share/token states, AI audits, and release checks. See the [changelog](changelog.md). No migrations; back up, upgrade, and restart the Agent.

## v0.3.9

Fix OpenAPI compatibility, project concurrency, and large-document reads; retain share filenames and support prerelease tags. See the [changelog](changelog.md). No migrations.

## v0.3.8

Compiled archive installs, SHA256 verification and existing `npx` compatibility: [changelog](changelog.md#v0-3-8). No migration.

## v0.3.7

Merge Skill into `Vdoc-mcp/skills/vdoc`, sharing its version and release, with `vdoc-mcp skill install`. See the [changelog](changelog.md). No migrations; preserve local Skill edits and restart the Agent.

These notes describe the v0.2 boundary. Before planning a pilot, writing Agent instructions, publishing packages, or upgrading, confirm that this scope is not being overstated.

## v0.3.6

Session, CORS, OpenAPI-direction and AI-cache fixes: [changelog](changelog.md#v0-3-6). No migration; REST/MCP remain compatible. [Upgrades](release-rollback.md) retain application `latest`, PostgreSQL 18, RustFS 1.0.0 and two domains.

## v0.3.5

The deployment guide now displays the [complete Compose example for an existing PostgreSQL server](deployment.md#external-compose-example), including all YAML and field comments. Both language editions read from the same source as the downloadable file, keeping the example in sync with configuration updates.

This documentation patch adds no application feature or database migration. All five distributions use v0.3.5.

## v0.3.4

Identity isolation, OpenAPI formats, theme sync and external PostgreSQL Compose: [changelog](changelog.md#v0-3-4). No migration beyond v0.3.3; REST/MCP stay compatible. See [upgrading](release-rollback.md).

## v0.3.3

Stable images, two domains and CORS: [changelog](changelog.md#v0-3-3). Domains proxy frontend 8081/backend 8080; the frontend uses Backend HTTPS, and CORS `*` still requires authentication. Update with `docker compose pull` and `docker compose up -d --wait`. [Deployment checks](deployment.md#caddy-domain) cover login, publication, MCP and anonymous shares.

No migration. Retain credentials and back up database/storage, including RustFS upgrades from beta to 1.0.0. See [upgrading](release-rollback.md).

## v0.3.2

Sync go-template `http-services/` to `f8ab237`; logging, cancellation and coordinated releases: [changelog](changelog.md#v0-3-2). REST/MCP, 22 tools and tokens remain compatible. No new migration; [upgrades](release-rollback.md) from older versions still apply pending migrations, including 007.

## v0.3.1

Precision, diff, history and concurrency fixes: [changelog](changelog.md#v0-3-1). Adds `007_parser_facts_and_history_pages.sql` for parser versions, history indexes and `must_handle`. [Back up database/storage](release-rollback.md); image rollback does not undo migrations. Five repositories share this version; 22 tools, human review, permissions and bcrypt cost 12 remain unchanged.

## v0.3.0

Single-file Compose, dual-architecture images and startup validation: [changelog](changelog.md#v0-3-0). No migration; MCP API stays at v0.2.0. [Upgrades](release-rollback.md) retain keys and data volumes.

## v0.2.1

Compose examples and narrow MCP panels: [changelog](changelog.md#v0-2-1). Five repositories/downloads share this version. No migration; backend/22 tools remain compatible with v0.2.0. [Upgrades](release-rollback.md) retain `.env`, Compose project name and volumes.

## v0.2.0

Exact-version reads, dual-architecture releases and GitHub Pages: [changelog](changelog.md#v0-2-0). Refresh tools and add `branch_id` to latest-content calls. No migration; human publication, immutable versions and token permissions stay unchanged. [Back up database/storage](release-rollback.md) and upgrade all five releases together.

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
