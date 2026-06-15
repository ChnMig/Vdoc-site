# Version Notes

These notes describe the v0.1 boundary. Before planning a pilot, writing Agent instructions, publishing packages, or upgrading, confirm that this scope is not being overstated.

## Included in v0.1

- One Go backend for REST API, MCP endpoint, persistence, authentication, review workflow, automatic migrations, and object storage writes.
- PostgreSQL persistence and S3 compatible object storage support.
- Root `docker-compose.yml` that starts PostgreSQL, RustFS, backend, and Admin.
- Admin UI for Team, Project, Document, Branch, Draft, Review, Version, Diff, endpoint detail, and MCP Token management.
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

## Not Included in v0.1

- MCP direct publish tools.
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
3. MCP `tools/list` returns tool schemas from the deployed backend.
4. Skill package tests pass, and Agents call Vdoc MCP before answering endpoint or migration questions.
5. Release notes clearly state that v0.1 does not support MCP direct publishing.
