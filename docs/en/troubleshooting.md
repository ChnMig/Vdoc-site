# Troubleshooting

This page follows the path users experience: Compose startup, backend health, Admin login, Draft and Version publishing, then MCP and Skill Agent behavior.

## Protect Secrets First

- Record the failing command, URL, page action, or Agent action.
- Record response envelope `code`, `status`, `message`, and `trace_id`.
- Mask `.env`, JWTs, MCP Tokens, database passwords, storage secrets, and `Authorization` headers before sharing logs.
- Do not put tokens in CLI args while reproducing issues.

## Full Compose Does Not Start

Validate config from the workspace root without printing interpolated values:

```sh
docker compose --env-file .env config --quiet
docker compose --env-file .env ps
```

Common causes:

- `scripts/vdoc-local-bootstrap.sh` was not run to create `.env`, or `.env.example` was copied by hand without replacing placeholders.
- `VDOC_POSTGRES_PASSWORD`, `VDOC_STORAGE_ACCESS_KEY`, `VDOC_STORAGE_SECRET_KEY`, `VDOC_JWT_KEY`, or `VDOC_MCP_TOKEN_CIPHER_KEY` still contains placeholder text.
- A local port is already in use. Change `VDOC_BACKEND_HOST_PORT`, `VDOC_ADMIN_HOST_PORT`, `VDOC_POSTGRES_HOST_PORT`, `VDOC_RUSTFS_HOST_PORT`, or `VDOC_RUSTFS_CONSOLE_HOST_PORT`.
- Docker is building app images, so the first start takes longer.

Read logs:

```sh
docker compose --env-file .env logs --tail=100 postgres rustfs backend admin
```

To create a new disposable local `.env`, run:

```sh
scripts/vdoc-local-bootstrap.sh
```

If `.env` already exists, the script refuses to overwrite it. Use `--force` only when you intend to discard the local environment.

## Backend Health Fails

Check the health path:

```sh
curl http://127.0.0.1:8080/api/v1/open/health
```

If `.env` changed `VDOC_BACKEND_HOST_PORT`, use the actual port.

Then check:

- Backend logs for PostgreSQL connection or migration failure.
- Backend logs for storage initialization failure.
- `VDOC_DATABASE_DSN` uses the correct host. In full Compose, backend should use `postgres:5432`, not `127.0.0.1:5432`.
- `VDOC_STORAGE_ENDPOINT` uses the correct endpoint. In full Compose, backend should use `rustfs:9000`, not `127.0.0.1:9000`.
- PostgreSQL password is percent encoded before being put in the DSN if needed.

When database or storage is enabled, unreachable dependencies stop backend startup instead of falling back to memory mode.

## PostgreSQL Connection Fails

- Full Compose: `VDOC_DATABASE_DSN` uses `postgres:5432`, and user, password, and database match `VDOC_POSTGRES_*` in `.env`.
- Backend running on the host: DSN uses `127.0.0.1` and the port exposed by `VDOC_POSTGRES_HOST_PORT`.
- External PostgreSQL: check network, SSL mode, user, password, database name, and provider host.
- Percent encode passwords containing URI-reserved characters such as `@`, `:`, `/`, `#`, or `?`.
- Do not use `docker compose down -v` to fix a connection issue unless you intentionally want to delete local data.

## RustFS or External Object Storage Fails

- Full Compose: backend uses `VDOC_STORAGE_ENDPOINT=rustfs:9000`, `VDOC_STORAGE_USE_SSL=false`, and `VDOC_STORAGE_PATH_STYLE=true`.
- Backend running on the host: endpoint uses `127.0.0.1:9000` or your changed `VDOC_RUSTFS_HOST_PORT`.
- External object storage: check endpoint, bucket, region, SSL, path style, access key, secret key, and bucket permissions.
- When storage is enabled, backend tries to create the bucket if it is missing. Creation failure usually means credential or permission problems.
- RustFS console defaults to `http://127.0.0.1:9001`, but backend connects to the S3 API port `9000`.

## Admin Does Not Open or Calls the Wrong Backend

- Full Compose Admin defaults to `http://127.0.0.1:8081`.
- Admin Docker uses `VDOC_ADMIN_API_BASE_URL` to generate `/runtime-config.js`.
- This value must be a backend origin the browser can reach, such as `http://127.0.0.1:8080` or your domain.
- Do not set it to `http://backend:8080`, because browsers cannot resolve Compose service names.
- Local Admin development uses `VITE_VDOC_API_BASE_URL`.
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
- Publishing requires approve. v0.1 does not support MCP direct publish.

## Admin AI Summary or Page Chat Fails

- Read [Admin AI](admin-ai) first. Confirm the Project has an enabled project provider or can fall back to an enabled system provider.
- Run the provider test for that scope. Check `base_url`, `api_mode`, `model`, and timeout without printing `api_key` in logs.
- Confirm provider detail exposes only `api_key_set` and `api_key_last4`. If no encrypted key is set, have an authorized administrator save the configuration.
- Check whether the matching `draft_review_summary`, `version_change_summary`, `diff_change_summary`, or `page_chat` prompt is enabled.
- `pending` means the latest request is still generating. `skipped` usually means no usable provider or a disabled prompt. `failed` means the provider call failed or its context changed before completion. None of these states should block Draft submission, Version publishing, machine Diff, or human review.
- Page chat must bind to the current Draft, Version, or Diff. Cross-Project access, missing read permission, or an empty message fails.
- Diagnose with `trace_id` and audit status. Audit may contain a failure reason and token usage, while prompt overrides, summaries, and chat content are managed product records. Logs and audit metadata must not contain raw API keys, JWTs, MCP Tokens, `Authorization` headers, or secrets embedded in prompts.

## Live E2E Fails

From the backend directory, check the root Compose derived settings:

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not reset the application database from `VDOC_POSTGRES_DB`. Common causes include root Compose not running, a wrong `.env` path, changed host ports without a container restart, or `VDOC_TEST_POSTGRES_DB` pointing at the application database.

## MCP Adapter Fails

- Agent MCP config must set `VDOC_MCP_TOKEN`.
- Set either `VDOC_BASE_URL` or `VDOC_MCP_URL`.
- If using `VDOC_BASE_URL`, the adapter appends `/api/v1/open/mcp`.
- Do not put tokens in `args`; use `env`.
- stdout is reserved for MCP protocol frames; diagnostics go to stderr.
- Confirm `/api/v1/open/mcp` is reachable from the Agent machine.

## Agent Does Not Use Vdoc Facts

- Confirm `@vdoc/mcp` `tools/list` succeeds.
- Confirm `Vdoc-skill/` is installed as the target runtime's `vdoc` skill folder and `SKILL.md` is at the skill root.
- Give explicit tasks such as: "First query Vdoc `get_endpoint_detail`, then explain request fields."
- If the Agent still guesses fields, enums, response shapes, or Markdown text, reload the Skill and require it to query Vdoc MCP first.

## When to Roll Back

- Backend health fails and cannot be fixed quickly: return to the previous backend or workspace version first.
- Admin page fails but backend is healthy: roll back Admin build or container first.
- MCP `tools/list` fails: check token and backend before rolling back MCP package.
- Agent ignores Vdoc facts: check MCP and Skill installation before rolling back the Skill package.
- Admin AI fails while machine Diff and human review work: roll back provider or prompt configuration first. Do not roll back a published Version or let AI replace review.

Read [Upgrade and Rollback](release-rollback) before rolling back. Do not delete PostgreSQL or object storage data.

The local gate can be listed and then run:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

It runs local checks only. It does not publish or deploy.
