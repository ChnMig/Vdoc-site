# MCP Tools

`@vdoc/mcp` is the stdio MCP adapter for Agent runtimes. It does not implement Vdoc business logic locally. It forwards MCP `tools/list` and `tools/call` requests to backend `/api/v1/open/mcp`.

## Before You Start

- Vdoc backend is deployed and `/api/v1/open/health` succeeds.
- An MCP Token has been created in Admin.
- The target Agent runtime supports MCP stdio server configuration.
- Do not put raw MCP Tokens, JWTs, DB passwords, storage secrets, or `Authorization` header values in repos, screenshots, logs, README files, or issues.

For a local backend, use the shared closure path:

```sh
scripts/vdoc-local-bootstrap.sh
docker compose --env-file .env up -d --build
cd Vdoc && go run ./tools/vdoc-demo-seed
```

The demo seed is optional. See [Deployment Guide](deployment) for the full local gate, where live E2E uses `./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only` and `./scripts/vdoc-e2e.sh live-compose --env-file ../.env`, and the release gate uses `scripts/vdoc-release-dry-run.sh --list` and `scripts/vdoc-release-dry-run.sh`. Live E2E resets only the disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default, not the application database.

## Installation Options

Global install:

```sh
npm install -g @vdoc/mcp
```

For one-off usage, prefer `npx` in the Agent MCP config. Do not put tokens in `args`.

Local development or package smoke:

```sh
cd Vdoc-mcp
npm ci
npm test
# Set VDOC_MCP_TOKEN through a private shell environment or Agent secret env first.
VDOC_BASE_URL="http://127.0.0.1:8080" npm start
```

stdout is reserved for MCP protocol frames. Read stderr for diagnostics.

## Environment Variables

| Variable              | Required                               | Purpose                                                            |
| --------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| `VDOC_BASE_URL`       | Required if `VDOC_MCP_URL` is not set  | Vdoc backend origin; adapter appends `/api/v1/open/mcp`.           |
| `VDOC_MCP_URL`        | Required if `VDOC_BASE_URL` is not set | Full Vdoc MCP endpoint URL; overrides `VDOC_BASE_URL`.             |
| `VDOC_MCP_TOKEN`      | Yes                                    | MCP Token created in Admin; store only in Agent config or secrets. |
| `VDOC_MCP_TIMEOUT_MS` | No                                     | HTTP timeout in milliseconds, default `30000`.                     |

For local full Compose, `VDOC_BASE_URL` is usually `http://127.0.0.1:8080`. For remote deployments, use a backend domain reachable from the Agent machine.

## Agent Config Example

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["-y", "@vdoc/mcp"],
      "env": {
        "VDOC_BASE_URL": "http://your-vdoc.example.test",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

If you already know the full MCP endpoint, use this form:

```json
{
  "env": {
    "VDOC_MCP_URL": "http://your-vdoc.example.test/api/v1/open/mcp",
    "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN",
    "VDOC_MCP_TIMEOUT_MS": "30000"
  }
}
```

## Tool Scope

The backend is the source of truth for tool definitions. The adapter calls Vdoc `tools/list` at runtime, so schemas stay aligned with the deployed backend.

v0.1 read tools cover:

- projects
- documents
- API versions
- endpoint detail
- API diffs
- Markdown docs
- change summaries

v0.1 draft tools cover creating, updating, viewing, and submitting OpenAPI and Markdown Drafts. Common tool names include:

- `list_projects`
- `list_documents`
- `list_api_versions`
- `get_latest_schema`
- `get_endpoint_detail`
- `compare_api_versions`
- `get_change_summary`
- `create_api_version_draft`
- `update_api_version_draft`
- `submit_api_version_draft`
- `get_api_version_draft`
- `get_latest_doc`
- `compare_doc_versions`
- `create_doc_draft`
- `update_doc_draft`
- `submit_doc_draft`
- `get_doc_draft`

Use the current backend `tools/list` response as the final tool list. v0.1 does not expose direct publish tools.

## Agent Behavior Rules

- Query Vdoc before answering endpoint fields, response properties, enum values, auth schemes, or Markdown text.
- Prefer stable IDs and `relative_path` over display names.
- Treat published Versions as immutable facts.
- Do not say a Draft is published unless Admin approval has created a Version.
- If a tool call fails, report envelope `code`, `status`, `message`, and `trace_id` after masking secrets.
- Do not put raw MCP Tokens, JWTs, DB passwords, storage secrets, or `Authorization` header values in repos, screenshots, logs, README files, or issues.

## Verification

- Agent MCP server `vdoc` starts.
- `tools/list` returns Vdoc tool schemas.
- At least one read-only tool call succeeds.
- Token is not present in process args, logs, docs, or screenshots.
- Agent answers mention Vdoc query results when the task depends on API or document facts.
