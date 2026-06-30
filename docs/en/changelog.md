# Changelog

This page records the current user-visible v0.1 state covered by the VitePress docs. It is not a marketing list; it is what users should know before evaluation, deployment, or pilot use.

## Current Docs Changes

- The reading path changed from an operations manual to: understand Vdoc, learn the runtime flow, deploy, first use, Agent integration, upgrade, and troubleshoot.
- The Chinese default entry is `/`.
- English docs use `/en/...` with matching topic routes.
- Added [How It Works](how-it-works) to explain Admin review, Drafts, Versions, MCP, Skills, and Agents.
- [Deployment Guide](deployment) has been rewritten around `scripts/vdoc-local-bootstrap.sh`, root Compose, optional demo seed, live-compose E2E, release dry-run, direct deployment, and external PostgreSQL/S3 compatible storage.
- [First Use](admin-usage) now covers the first chain from initial admin to Project, Document, Draft, Version, MCP Token, MCP adapter, and Skill.
- [Upgrade and Rollback](release-rollback) now covers PostgreSQL/object storage backup, `docker compose --env-file .env up -d --build`, live E2E, `scripts/vdoc-release-dry-run.sh`, health verification, and rollback.

## Current Product Surface

- Backend provides public health/auth/docs/MCP routes and private Admin routes.
- Backend automatically runs migrations when database is enabled and tries to create the missing bucket when storage is enabled.
- Admin Docker supports runtime `VDOC_ADMIN_API_BASE_URL` to generate a browser-usable backend API base URL.
- `@vdoc/mcp` is an installable stdio MCP adapter that forwards Agent MCP requests to backend.
- `Vdoc-skill` is an installable Agent workflow package that tells Agents to query Vdoc MCP before answering from facts.
- Live E2E uses `./scripts/vdoc-e2e.sh live-compose --env-file ../.env` and resets only the disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default.

## Boundaries to Remember

- MCP cannot publish Versions directly.
- Agents can submit Drafts; publishing requires Admin or SuperAdmin review.
- Do not use Compose service names in browser config. Browsers use `127.0.0.1` or domains; containers use service names such as `postgres`, `rustfs`, and `backend`.
- Do not put real secrets in docs, logs, screenshots, or Git history.

## Verify the Docs

1. Open `/` and confirm the default Chinese page loads.
2. Open `/en/product-overview` and confirm the English page loads.
3. Click [How It Works](how-it-works), [Deployment Guide](deployment), [MCP Tools](mcp-tools), and [Upgrade and Rollback](release-rollback), and confirm the sidebar path is coherent.
