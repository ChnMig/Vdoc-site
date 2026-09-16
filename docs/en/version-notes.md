# Version Notes

These notes describe the v0.2 boundary. Before planning a pilot, writing Agent instructions, publishing packages, or upgrading, confirm that this scope is not being overstated.

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
