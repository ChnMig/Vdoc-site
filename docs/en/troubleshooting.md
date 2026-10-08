# Troubleshooting

This page follows the path users experience: Compose startup, backend health, Admin login, Draft and Version publishing, then MCP and Skill Agent behavior.

## Protect Secrets First

- Record the failing command, URL, page action, or Agent action.
- Record response envelope `code`, `status`, `message`, and `trace_id`.
- Mask private `docker-compose.yml` values, JWTs, MCP Tokens, database passwords, storage secrets, and `Authorization` headers before sharing logs.
- Do not put tokens in CLI args while reproducing issues.

<div id="full-compose-does-not-start"></div>

## Single-file Compose Does Not Start

Validate config from the deployment directory containing `docker-compose.yml` without printing interpolated secrets:

```sh
docker compose config --quiet
docker compose ps --all
docker compose logs --tail=100 config-check rustfs backend admin
```

The current [deployment method](deployment.md#quick-start) only needs this YAML. Common causes:

- `config-check` fails: replace every `CHANGE_ME` value in the YAML and check `VDOC_DATABASE_PASSWORD`, storage credentials, JWT/MCP keys, and initial-admin settings. The syntax check `docker compose config --quiet` does not replace application config validation.
- A local port is already in use: change the host side of `services.backend.ports` or `services.admin.ports`, and use the new port in your browser or MCP config. Keep container ports unchanged.
- Image pulling fails: check connectivity and image sources, then run `docker compose pull`. The first download may take longer; single-file deployment uses released images.
- PostgreSQL or RustFS is not ready: inspect service logs and health status. For bundled PostgreSQL, also run `docker compose logs --tail=100 postgres`; with external PostgreSQL, inspect the existing database.

After correcting config, run `docker compose up -d --wait`. A successful `config-check` showing `Exited (0)` is normal. Do not delete data volumes to retry. YAML-only deployments do not require `.env` or source scripts; see [developer configuration](#source-workspace) for source workspace troubleshooting.

## Backend Health Fails

Check the health path:

```sh
curl http://127.0.0.1:8080/api/v1/open/health
```

If you changed the host port in `services.backend.ports`, use the actual port.

Then check:

- Backend logs for PostgreSQL connection or migration failure.
- Backend logs for storage initialization failure.
- Check `VDOC_DATABASE_HOST` and `VDOC_DATABASE_PORT`. Bundled PostgreSQL uses `postgres:5432`; external PostgreSQL must use an existing database address reachable from the container. Container-local `127.0.0.1` points to the container itself.
- `VDOC_STORAGE_ENDPOINT` uses the correct endpoint. In full Compose, backend should use `rustfs:9000`, not `127.0.0.1:9000`.
- Database user, password, and database name match the actual instance.

When database or storage is enabled, unreachable dependencies stop backend startup instead of falling back to memory mode.

## PostgreSQL Connection Fails

- Bundled PostgreSQL: `VDOC_DATABASE_HOST` is `postgres` and the port is `5432`. YAML anchors share the database name, user, and `VDOC_DATABASE_PASSWORD` with PostgreSQL.
- External PostgreSQL: check network, SSL mode, user, password, database name, and provider host. See [external database configuration](deployment.md#external-postgresql).
- The single-file YAML's `VDOC_DATABASE_PASSWORD` does not need URL encoding; write a literal `$` as `$$`. Only percent encode URI-reserved password characters if you separately configure an explicit `VDOC_DATABASE_DSN`.
- Do not use `docker compose down -v` to fix a connection issue unless you intentionally want to delete local data.

## RustFS or External Object Storage Fails

- Full Compose: backend uses `VDOC_STORAGE_ENDPOINT=rustfs:9000`, `VDOC_STORAGE_USE_SSL=false`, and `VDOC_STORAGE_PATH_STYLE=true`.
- External object storage: check endpoint, bucket, region, SSL, path style, access key, secret key, and bucket permissions.
- When storage is enabled, backend tries to create the bucket if it is missing. Creation failure usually means credential or permission problems.
- The default single-file config does not publish RustFS host ports. Backend connects over the Compose network to S3 API `rustfs:9000`; the RustFS console uses a different port and must not be used as the storage endpoint.

## Admin Does Not Open or Calls the Wrong Backend

- Full Compose Admin defaults to `http://127.0.0.1:8081`.
- Admin Docker uses `VDOC_ADMIN_API_BASE_URL` to generate `/runtime-config.js`.
- Keep `VDOC_ADMIN_API_BASE_URL: 'same-origin'` for current deployments. Browsers call `/api/v1/...` on the workbench origin, and Admin's built-in Caddy forwards it to `backend:8080`. The default local API origin is `http://127.0.0.1:8081`.
- Check `http://127.0.0.1:8081/api/v1/open/health` and `/runtime-config.js`; the latter should contain `apiBaseUrl: window.location.origin`. After changing Compose environment values, run `docker compose up -d --wait --force-recreate admin`; restarting an old container does not update its config.
- Do not change this value to a separate Backend origin or `http://backend:8080` for troubleshooting. Built-in CORS wildcard request headers do not guarantee cross-origin `Authorization` support in every browser, and browsers cannot resolve Compose service names. Domain deployments also retain same-origin config; see [Caddy configuration](deployment.md#caddy-domain).
- Skill, MCP, and CLI clients use the separate Backend address; their `VDOC_BASE_URL` serves a different purpose from the browser API origin.
- Private API calls use raw JWT `Authorization`, no `Bearer` prefix.

## Login API Returns HTTP 200 but Still Fails

Vdoc REST uses an envelope. Inspect the body, not only HTTP status:

- `code`
- `status`
- `message`
- `detail`
- `trace_id`

If `code` is not `200` or `status` is not `OK`, handle it as a business error.

## Draft or Version Flow Fails

- The current user needs the right role: Writer creates and submits Drafts, Project Admin or SuperAdmin reviews.
- `document_type=1` means OpenAPI, and `document_type=2` means Markdown.
- OpenAPI content should be OpenAPI 3.0 or 3.1.
- `relative_path` is Document identity. Do not query across systems by display name.
- Publishing requires approve. v0.2 does not support MCP direct publish.

## Admin AI Summary or Page Chat Fails

- Read [Admin AI](admin-ai.md) first. Confirm the Project has an enabled project provider or can fall back to an enabled system provider.
- Run the provider test for that scope. Check `base_url`, `api_mode`, `model`, and timeout without printing `api_key` in logs.
- Confirm provider detail exposes only `api_key_set` and `api_key_last4`. If no encrypted key is set, have an authorized administrator save the configuration.
- Check whether the matching `draft_review_summary`, `version_change_summary`, `diff_change_summary`, or `page_chat` prompt is enabled.
- `pending` means the latest request is still generating. `skipped` usually means no usable provider or a disabled prompt. `failed` means the provider call failed or its context changed before completion. None of these states should block Draft submission, Version publishing, machine Diff, or human review.
- Page chat must bind to the current Draft, Version, or Diff. Cross-Project access, missing read permission, or an empty message fails.
- Diagnose with `trace_id` and audit status. Audit may contain a failure reason and token usage, while prompt overrides, summaries, and chat content are managed product records. Logs and audit metadata must not contain raw API keys, JWTs, MCP Tokens, `Authorization` headers, or secrets embedded in prompts.

## MCP Adapter Fails

- Agent MCP config must set `VDOC_MCP_TOKEN`.
- Set either `VDOC_BASE_URL` or `VDOC_MCP_URL`.
- If using `VDOC_BASE_URL`, the adapter appends `/api/v1/open/mcp`.
- Do not put tokens in `args`; use `env`.
- stdout is reserved for MCP protocol frames; diagnostics go to stderr.
- Confirm `/api/v1/open/mcp` is reachable from the Agent machine.

## Agent Does Not Use Vdoc Facts

- Confirm `@vdoc/mcp` `tools/list` succeeds.
- Confirm `Vdoc-mcp/skills/vdoc/` is installed as the target runtime's `vdoc` skill folder and `SKILL.md` is at the skill root.
- Give explicit tasks such as: "First query Vdoc `get_endpoint_detail`, then explain request fields."
- If the Agent still guesses fields, enums, response shapes, or Markdown text, reload the Skill and require it to query Vdoc MCP first.

## When to Roll Back

- Backend health fails and cannot be fixed quickly: return to the previous backend or workspace version first.
- Admin page fails but backend is healthy: roll back Admin build or container first.
- MCP `tools/list` fails: check token and backend before rolling back MCP package.
- Agent ignores Vdoc facts: check MCP and Skill installation before rolling back the Skill package.
- Admin AI fails while machine Diff and human review work: roll back provider or prompt configuration first. Do not roll back a published Version or let AI replace review.

Read [Upgrade and Rollback](release-rollback.md) before rolling back. Do not delete PostgreSQL or object storage data.

<div id="source-workspace"></div>

## Developers: Source Workspace and Live E2E

These steps are only for maintainers who have downloaded the complete source workspace. Ordinary single-file deployments do not use these scripts or `.env`. See [workspace deployment notes](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/COMPOSE_DEPLOY.md) for the source layout and configuration.

Validate development config and inspect status from the workspace root:

```sh
docker compose --env-file .env config --quiet
docker compose --env-file .env ps --all
```

If the source workspace has no `.env`, run `scripts/vdoc-local-bootstrap.sh` or configure it from `.env.example`. The script refuses to replace an existing `.env`; do not use `--force` on an existing deployment. Development ports use `VDOC_BACKEND_HOST_PORT`, `VDOC_ADMIN_HOST_PORT`, and related variables; host access to PostgreSQL and RustFS also uses their published ports. Local Admin development uses `VITE_VDOC_API_BASE_URL`; use a same-origin proxy or a development gateway that explicitly allows `Authorization` for authenticated requests.

### Live E2E Fails

From the backend directory, check the root Compose derived settings:

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not reset the application database from `VDOC_POSTGRES_DB`. Common causes include root Compose not running, a wrong `.env` path, changed host ports without a container restart, or `VDOC_TEST_POSTGRES_DB` pointing at the application database.

The local gate can be listed and then run:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

It runs local checks only. It does not publish or deploy.
