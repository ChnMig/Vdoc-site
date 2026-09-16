# Changelog

This page records the current user-visible v0.2 state covered by the VitePress docs. It is not a marketing list; it is what users should know before evaluation, deployment, or pilot use.

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
