# Vdoc Docs

These docs are for teams that want to evaluate, deploy, and use Vdoc. They explain the product first, then walk through deployment, first use, Agent setup, upgrades, and troubleshooting.

## What You Can Do Here

- Learn how Vdoc connects OpenAPI, Markdown, human review, and Agent queries.
- Start PostgreSQL, RustFS, backend API, and Admin with the Docker Compose package.
- Use external PostgreSQL and S3 compatible storage instead.
- Create Project, Document, Draft, Version, and MCP Token records in Admin.
- Connect `@vdoc/mcp` and the Vdoc Skill so Agents query published facts before answering.
- Back up, upgrade, verify, and roll back a Vdoc environment.

## Recommended Reading Path

1. Start with [Product Overview](en/product-overview) to decide whether Vdoc fits your team.
2. Read [How It Works](en/how-it-works) to understand Admin review, Drafts, Versions, MCP, Skills, and Agent use.
3. Follow [Deployment Guide](en/deployment) to choose full Compose, direct deployment, or external dependencies.
4. Use [First Use](en/admin-usage) to go from initial admin login to MCP Token creation.
5. Connect Agents with [MCP Tools](en/mcp-tools) and [Skill Workflows](en/skill-workflows).
6. Before upgrades, read [Upgrade and Rollback](en/release-rollback). If something fails, use [Troubleshooting](en/troubleshooting).

## Language and Routes

- `/docs/index.html` opens the Chinese docs by default.
- English routes use `/docs/index.html#/en/...`, for example `/docs/index.html#/en/deployment`.
- The language switch tries to keep you on the same topic.
- Each article has a `Copy this Markdown` button that copies only the current Markdown file.

## Safety Boundary

- Examples use placeholders only. Never commit real `.env`, JWT keys, MCP Tokens, database passwords, storage secrets, or `Authorization` headers.
- Private REST requests use the raw JWT in `Authorization`; do not add `Bearer`.
- MCP config should pass `VDOC_MCP_TOKEN` through environment variables, not command-line arguments.
- v0.1 does not provide direct MCP publishing. Agents can submit Drafts, but publishing requires Admin or SuperAdmin approval.
