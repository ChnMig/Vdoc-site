# Version Notes

These notes describe the v0.1 boundary. Before planning a pilot, writing Agent instructions, publishing packages, or upgrading, confirm that this scope is not being overstated.

## Included in v0.1

- One Go backend for REST API, MCP endpoint, persistence, authentication, review workflow, automatic migrations, and object storage writes.
- PostgreSQL persistence and S3 compatible object storage support.
- Root `docker-compose.yml` that starts PostgreSQL, RustFS, backend, and Admin.
- `scripts/vdoc-local-bootstrap.sh` for generating a disposable local `.env` while writing secrets only to the file.
- `Vdoc/scripts/vdoc-e2e.sh live-compose` for deriving live E2E settings from the root `.env`.
- `scripts/vdoc-release-dry-run.sh` as the local release gate, with no publishing or deployment.
- Admin UI for Team, Project, Document, Branch, Draft, Review, Version, Diff, endpoint detail, and MCP Token management.
- Built-in [Admin AI](admin-ai) with system and project OpenAI-compatible providers, prompt overrides, provider tests, automatic Draft and Version summaries, Draft/Version/Diff summary read and regeneration, page chat, and auditing.
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

## Not Included in v0.1

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
7. Release notes clearly state that v0.1 does not support MCP direct publishing.
8. Admin AI provider tests succeed, Draft and Version summaries can be read, and failure cases do not block machine Diff or human review.
