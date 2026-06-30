# First Use

This page starts after deployment and walks through the first Vdoc data path that an Agent can query: Project, Document, Draft, Version, MCP Token, MCP adapter, and Skill.

## Before You Start

If no local environment is running yet, run this from the workspace root:

```sh
scripts/vdoc-local-bootstrap.sh
docker compose --env-file .env up -d --build
cd Vdoc && go run ./tools/vdoc-demo-seed
```

`vdoc-demo-seed` is optional. Then confirm:

- Backend health succeeds at `/api/v1/open/health`.
- Admin opens in a browser.
- If you use Admin Docker, `VDOC_ADMIN_API_BASE_URL` points to a backend origin the browser can reach, such as `http://127.0.0.1:8080`.
- If you use Admin local development, `VITE_VDOC_API_BASE_URL` points to the backend origin.
- You prepared an initial SuperAdmin, or you explicitly allow first-user registration in a trusted pilot environment.

## 1. Log In to Admin

Full Compose deployments should set these in `.env`:

```sh
VDOC_INITIAL_ADMIN_EMAIL=admin@example.com
VDOC_INITIAL_ADMIN_NAME=Vdoc Admin
VDOC_INITIAL_ADMIN_PASSWORD=replace-with-initial-admin-password
```

Backend creates that SuperAdmin only when the user table is empty. After startup, open Admin:

```text
http://127.0.0.1:8081
```

Log in with the initial admin. Admin uses a raw JWT when calling private APIs. Manual debugging uses the same rule:

```sh
curl -H "Authorization: $JWT" \
  http://127.0.0.1:8080/api/v1/private/identity/me
```

Keep `JWT` in a private shell variable, and do not write the value into command history, docs, or logs. Do not add a `Bearer` prefix.

## 2. Create Team and Project

1. Create or select a Team.
2. Create a Project under that Team.
3. Add members.
4. Use Reader for read access, Writer for Draft creation and submission, and Admin for review.

Project is the main permission and Agent query boundary. Do not mix unrelated products in one Project unless they share the same permission model.

## 3. Create a Document

Choose a Document type:

- `document_type=1`: OpenAPI.
- `document_type=2`: Markdown.

Set a stable `relative_path`:

- `apis/petstore.yaml`
- `apis/billing.yaml`
- `docs/runbook.md`

Display names can change, but `relative_path` should be the cross-system identity. New Documents get `dev`, `test`, and protected `prod` branches. You can also create `feature/*` branches.

## 4. Create and Submit a Draft

1. Choose Project, Document, and Branch.
2. Create a Draft.
3. Use OpenAPI 3.0 or 3.1 content for OpenAPI Drafts.
4. Use Markdown text for Markdown Drafts.
5. Submit the Draft for review.

After submission, the Draft is not yet the source of truth. Agents should treat it as published fact only after approval creates a Version.

## 5. Review and Publish a Version

A Project Admin or SuperAdmin opens the Draft under review:

1. Check raw content, normalized content, or Markdown content.
2. For OpenAPI, check endpoint list, endpoint detail, diff, and breaking changes.
3. Request changes or reject if the content is wrong.
4. Approve if the content is correct.
5. Confirm the Version list shows a new immutable Version.

v0.1 does not support MCP direct publishing. Admin is the publishing gate.

## 6. Create an MCP Token

Open the MCP Token area in Admin:

1. Create a user-bound MCP Token.
2. Copy the returned token once.
3. Put the token into the Agent runtime environment or secret manager.
4. Do not store the token in command-line arguments, README files, screenshots, logs, or issues.

Later list or detail views may show only masked token values. That is expected.

## 7. Connect the MCP Adapter

Local full Compose example:

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["-y", "@vdoc/mcp"],
      "env": {
        "VDOC_BASE_URL": "http://127.0.0.1:8080",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

For deployed environments, set `VDOC_BASE_URL` to a backend origin reachable from the Agent machine. You can also set `VDOC_MCP_URL` to the full `/api/v1/open/mcp` endpoint.

## 8. Install the Skill

Install, copy, or link `Vdoc-skill/` as the Agent runtime's `vdoc` skill folder. `SKILL.md` must be at the skill root. The Skill stores no facts. Live facts come from Vdoc MCP.

## Completion Checks

- Admin Dashboard opens.
- `GET /api/v1/private/identity/me` succeeds.
- At least one Project, Document, Draft, and published Version exists.
- MCP Token does not appear in command-line arguments or logs.
- Agent `tools/list` returns Vdoc tool schemas.
- When answering endpoint or Markdown questions, the Agent calls Vdoc MCP first and uses the returned facts.

To complete the local loop, run:

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not reset the application database from `VDOC_POSTGRES_DB`. Finally, run this from the workspace root:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

The release dry-run does not publish packages or deploy services. Do not put raw JWTs, MCP Tokens, DB passwords, storage secrets, or `Authorization` header values in docs, logs, screenshots, or issues.
