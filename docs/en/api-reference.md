# API Reference

This page is for scripts, Admin debugging, and Agent integration. It is not the full OpenAPI file. The backend serves the machine-readable definition at `/api/v1/open/docs/openapi.yaml`.

## Base Paths

| Surface          | Path                             | Auth                                         |
| ---------------- | -------------------------------- | -------------------------------------------- |
| Public REST      | `/api/v1/open/*`                 | Route-specific; most public routes are open. |
| Private REST     | `/api/v1/private/*`              | Raw JWT in `Authorization`.                  |
| OpenAPI document | `/api/v1/open/docs/openapi.yaml` | None.                                        |
| MCP JSON-RPC     | `/api/v1/open/mcp`               | Raw MCP Token.                               |

The default backend origin for local full Compose is `http://127.0.0.1:8080`. Use your backend domain in deployed environments.

```sh
API_BASE="${API_BASE:-http://127.0.0.1:8080}"
curl "$API_BASE/api/v1/open/health"
curl "$API_BASE/api/v1/open/docs/openapi.yaml"
```

## Authentication Rule

Public auth starts with register or login. Private REST uses the JWT returned by login or registration. MCP uses an MCP Token created in Admin or private REST.

Key rule: `Authorization` contains the raw JWT or MCP Token. Do not add `Bearer`. Never paste full header values into docs, logs, screenshots, or commits. Shell environment variables are not package CLI arguments, so never put credentials in package or process `args`. Run `set +x` to disable xtrace, then pass the header to `curl` through stdin config so the raw value does not enter `curl` process arguments.

## Response Envelope

REST handlers may return HTTP 200 for both success and business errors. The semantic result is inside the JSON body.

| Field       | Meaning                                                                                                       |
| ----------- | ------------------------------------------------------------------------------------------------------------- |
| `code`      | Semantic status code such as `200`, `400`, `401`, `403`, `404`, `409`, or `500`.                              |
| `status`    | Semantic status text such as `OK`, `INVALID_ARGUMENT`, `UNAUTHENTICATED`, `PERMISSION_DENIED`, or `INTERNAL`. |
| `message`   | Caller-facing message.                                                                                        |
| `detail`    | Success result or error detail.                                                                               |
| `total`     | Optional total for list endpoints.                                                                            |
| `trace_id`  | Trace identifier for debugging.                                                                               |
| `timestamp` | Response time.                                                                                                |

## Register or Log In

This example is only for local smoke tests. Do not use a real user password.

```sh
PASSWORD="sample-password-change-me"

REGISTER_RESPONSE=$(curl -sS "$API_BASE/api/v1/open/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"docs-admin@example.test","name":"Docs Admin","password":"sample-password-change-me"}')

ADMIN_USER_ID=$(printf '%s' "$REGISTER_RESPONSE" | jq -r '.detail.user.id')
JWT=$(printf '%s' "$REGISTER_RESPONSE" | jq -r '.detail.token')

set +x
curl_with_jwt() {
  printf 'header = "Authorization: %s"\n' "$JWT" |
    curl --config - "$@"
}
```

Verify private identity:

```sh
curl_with_jwt -sS "$API_BASE/api/v1/private/identity/me"
```

## Roles and Document Types

- SuperAdmin can manage and approve at the system level.
- Project Reader can query.
- Project Writer can upload Drafts and submit them.
- Project Admin can approve, request changes, or reject.
- `document_type=1` means OpenAPI.
- `document_type=2` means Markdown.
- `relative_path` is stable Document identity. Display name changes should not change it.

## Create Team, Project, and Document

```sh
TEAM_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/teams" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Docs Team","description":"API docs smoke team"}')
TEAM_ID=$(printf '%s' "$TEAM_RESPONSE" | jq -r '.detail.id')

PROJECT_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects" \
  -H 'Content-Type: application/json' \
  -d "{\"team_id\":\"$TEAM_ID\",\"name\":\"Docs Project\",\"description\":\"API docs smoke project\",\"admin_user_id\":\"$ADMIN_USER_ID\"}")
PROJECT_ID=$(printf '%s' "$PROJECT_RESPONSE" | jq -r '.detail.id')

DOCUMENT_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents" \
  -H 'Content-Type: application/json' \
  -d '{"name":"petstore","document_type":1,"relative_path":"apis/petstore.yaml","description":"Docs sample document"}')
DOCUMENT_ID=$(printf '%s' "$DOCUMENT_RESPONSE" | jq -r '.detail.id')
```

After Document creation, Vdoc creates `dev`, `test`, and protected `prod` branches. Get the `dev` branch:

```sh
BRANCH_ID=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/branches" |
  jq -r '.detail[] | select(.name=="dev") | .id')
```

## Draft, Review, and Version

OpenAPI Drafts submit OpenAPI 3.0 or 3.1 content as `schema_content`. Markdown Drafts use the same private REST draft routes and may submit Markdown text as `schema_content` or `content`. MCP Markdown draft tools use `markdown_content`. `content_kind` accepts `raw` or `normalized` for OpenAPI, and `raw` or `stable` for Markdown.

Before running the OpenAPI example, set `SCHEMA_V1` to a valid JSON string, for example with `jq -Rs . < openapi.yaml`.

```sh
DRAFT_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts" \
  -H 'Content-Type: application/json' \
  -d "{\"branch_id\":\"$BRANCH_ID\",\"version_name\":\"1.0.0\",\"schema_content\":$SCHEMA_V1}")
DRAFT_ID=$(printf '%s' "$DRAFT_RESPONSE" | jq -r '.detail.id')

curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts/$DRAFT_ID/submit" \
  -X POST

VERSION_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts/$DRAFT_ID/approve" \
  -X POST)
VERSION_ID=$(printf '%s' "$VERSION_RESPONSE" | jq -r '.detail.id')
```

Other review actions:

```text
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/request-changes
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/reject
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/promote
```

## Query Version, Endpoint, and Diff

```sh
curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/content/raw"

ENDPOINTS_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/endpoints?path=/pets")
ENDPOINT_ID=$(printf '%s' "$ENDPOINTS_RESPONSE" | jq -r '.detail[0].id')

curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/endpoints/$ENDPOINT_ID"
```

Compare two published Versions:

```sh
DIFF_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/diffs" \
  -H 'Content-Type: application/json' \
  -d "{\"from_version_id\":\"$VERSION_ONE_ID\",\"to_version_id\":\"$VERSION_TWO_ID\"}")
DIFF_ID=$(printf '%s' "$DIFF_RESPONSE" | jq -r '.detail.id')

curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/diffs/$DIFF_ID/summary"
```

## MCP Token and MCP JSON-RPC

Create an MCP Token. `.detail.token` is a one-time-copy secret; later list, get, and revoke responses are masked.

```sh
MCP_TOKEN_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/mcp-tokens" \
  -H 'Content-Type: application/json' \
  -d '{"name":"docs-agent","scopes":[1,2]}')
MCP_TOKEN=$(printf '%s' "$MCP_TOKEN_RESPONSE" | jq -r '.detail.token')

curl_with_mcp_token() {
  printf 'header = "Authorization: %s"\n' "$MCP_TOKEN" |
    curl --config - "$@"
}
```

List MCP tools:

```sh
curl_with_mcp_token -sS "$API_BASE/api/v1/open/mcp" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"tools-list","method":"tools/list"}'
```

Example read tool call:

```sh
curl_with_mcp_token -sS "$API_BASE/api/v1/open/mcp" \
  -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":\"endpoint-detail\",\"method\":\"tools/call\",\"params\":{\"name\":\"get_endpoint_detail\",\"arguments\":{\"project_id\":\"$PROJECT_ID\",\"document_id\":\"$DOCUMENT_ID\",\"version_id\":\"$VERSION_ID\",\"endpoint_id\":\"$ENDPOINT_ID\"}}}"
```

v0.1 does not expose direct publish tools through MCP. Agents can create, update, view, and submit Drafts, but publishing still requires Admin or SuperAdmin approval.

## Admin AI Routes

[Admin AI](admin-ai) uses private JWT APIs. Provider and prompt configuration is separate from the external MCP/Skill Agent, and AI output cannot replace machine Diff or human review.

```text
GET  /api/v1/private/ai/provider
PUT  /api/v1/private/ai/provider
POST /api/v1/private/ai/provider/test
GET  /api/v1/private/projects/{project_id}/ai/provider
PUT  /api/v1/private/projects/{project_id}/ai/provider
POST /api/v1/private/projects/{project_id}/ai/provider/test
GET  /api/v1/private/ai/prompts
PUT  /api/v1/private/ai/prompts/{prompt_key}
GET  /api/v1/private/projects/{project_id}/ai/prompts
PUT  /api/v1/private/projects/{project_id}/ai/prompts/{prompt_key}
GET  /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/ai-summary
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/ai-summary/regenerate
GET  /api/v1/private/projects/{project_id}/documents/{document_id}/versions/{version_id}/ai-summary
POST /api/v1/private/projects/{project_id}/documents/{document_id}/versions/{version_id}/ai-summary/regenerate
GET  /api/v1/private/projects/{project_id}/documents/{document_id}/diffs/{diff_id}/ai-summary
POST /api/v1/private/projects/{project_id}/documents/{document_id}/diffs/{diff_id}/ai-summary/regenerate
POST /api/v1/private/projects/{project_id}/ai/chat-sessions
GET  /api/v1/private/projects/{project_id}/ai/chat-sessions/{session_id}
POST /api/v1/private/projects/{project_id}/ai/chat-sessions/{session_id}/messages
```

Provider payloads contain `name`, `base_url`, `model`, `api_mode`, `api_key`, `enabled`, `temperature`, `timeout_ms`, and `max_output_tokens`. Read responses expose only `api_key_set` and `api_key_last4`. System and project providers both have test routes. Draft, Version, and Diff all support summary reads and manual regeneration, while chat sessions stay bound to the current page resource context.

## Route Categories

| Category     | Purpose                                                             |
| ------------ | ------------------------------------------------------------------- |
| Open         | Health, register/login, OpenAPI YAML, and MCP JSON-RPC.             |
| Identity     | Current JWT user identity.                                          |
| System Users | SuperAdmin user lifecycle and user MCP token oversight.             |
| Teams        | Team lifecycle.                                                     |
| Projects     | Project lifecycle and membership.                                   |
| Documents    | Project document lifecycle.                                         |
| Branches     | Document branch lifecycle.                                          |
| Drafts       | Draft creation, update, submission, review, and promotion.          |
| Versions     | Published document versions and raw, normalized, or stable content. |
| Endpoints    | Endpoint list and detail parsed from published versions.            |
| Diffs        | Semantic version comparison and summaries.                          |
| AI           | Provider, prompts, Draft/Version/Diff AI summaries, and page chat.  |
| MCP Tokens   | User MCP token lifecycle.                                           |

## Verification

1. `curl $API_BASE/api/v1/open/health` succeeds.
2. Register or login returns an envelope, and `detail.token` works with `GET /api/v1/private/identity/me`.
3. After create Draft, submit, and approve, Version content can be read.
4. `POST /api/v1/open/mcp` `tools/list` returns tool schemas.
5. Real JWTs, MCP Tokens, or `Authorization` header values do not appear in examples, logs, or Git history.

## Common Mistakes

- Checking only HTTP status is misleading; inspect envelope `code` and `status`.
- Do not add `Bearer` to `Authorization`.
- Do not put MCP Tokens in CLI args. Put them in Agent MCP config `env`.
- If an Agent says it published a Version, confirm it only submitted a Draft. v0.1 does not support MCP direct publish.
