# MCP Setup and Tools

Connect your agent to Vdoc so it can query published OpenAPI, Markdown, and TXT documents or submit drafts for human review. For a first connection, follow [Connect Your Agent](admin-usage.md#connect-agent), then [read your first document](admin-usage.md#first-query).

`@vdoc/mcp` is the stdio adapter. It forwards `tools/list` and `tools/call` to Backend `/api/v1/open/mcp`; document storage and business logic stay on the Backend.

## Before You Start

- Vdoc backend is deployed and `/api/v1/open/health` succeeds.
- An MCP Token has been created in Admin.
- The target Agent runtime supports MCP stdio server configuration.
- Do not put raw MCP Tokens, JWTs, DB passwords, storage secrets, or `Authorization` header values in repos, screenshots, logs, README files, or issues.

The agent machine also needs Node.js 20 or later, npm, and Git. If Vdoc is not running yet, start with [Docker Compose deployment](deployment.md#quick-start), including initial-admin setup. A first query needs a published document; demo seeding and engineering release checks are optional.

## Installation Options

`@vdoc/mcp` is not published to the npm registry yet. For one-off usage, run the commit-pinned source from the official GitHub repository:

```sh
npx --yes github:ChnMig/Vdoc-mcp#ea2445e4e528e4ee98b97ef35121c93975b07afa
```

For one-off usage, prefer the commit-pinned `npx` source in the Agent MCP config. The 40-character commit above must equal the `Vdoc-mcp` entry in the reviewed release package's `workspace.lock.json`; do not remove the fragment or replace it with a moving branch. Do not put tokens in `args`.

For global installation, use the compiled release archive and verify it before installing. Source Git installs can fail during npm preparation with `tsc: command not found`; the release archive needs no compilation at install time:

```sh
(
  set -eu
  VDOC_MCP_VERSION=0.3.17-beta.8
  VDOC_MCP_PACKAGE_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$VDOC_MCP_PACKAGE_DIR"' EXIT
  VDOC_MCP_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/v$VDOC_MCP_VERSION"
  curl -fsSL "$VDOC_MCP_RELEASE/vdoc-mcp-$VDOC_MCP_VERSION.tgz" -o "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
  curl -fsSL "$VDOC_MCP_RELEASE/SHA256SUMS" -o "$VDOC_MCP_PACKAGE_DIR/SHA256SUMS"
  (cd "$VDOC_MCP_PACKAGE_DIR" && shasum -a 256 -c SHA256SUMS)
  npm install --global "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
)
```

Use the MCP version selected by your deployment package's `workspace.lock.json`. To use the global install from an Agent, change its config's `command` to `vdoc-mcp` and remove the `npx` `args`, keeping the private `env`. Restart the MCP connection after updating. See [Skill Workflows](skill-workflows.md#installation) for optional Skill installation and updates.

`VDOC_MCP_TOKEN` is an environment variable in the shell or Agent configuration, not a package CLI argument. Never put the raw token in `npx`, `npm`, or adapter `args`. Run `set +x` to disable xtrace before manual diagnosis, and keep credentials out of shell history, logs, and screenshots.

## Follow release / beta updates {#release-channels}

MCP and its bundled Skill use one package per channel. `release` selects only stable releases; `beta` selects only `vMAJOR.MINOR.PATCH-beta.N` prereleases. A missing channel fails without falling back to another channel. Separate prefixes at `~/.local/share/vdoc/mcp/release` and `~/.local/share/vdoc/mcp/beta` preserve any existing global MCP installation.

First download `install-channel.mjs` and `install-channel.mjs.sha256` from a reviewed [MCP Release](https://github.com/ChnMig/Vdoc-mcp/releases) that includes them. The commands below pin the installer to `v0.3.17-beta.8`; run them in a dedicated tools directory. A failed download or checksum stops installation. Older releases do not contain these assets:

```sh
(
  set -eu
  VDOC_MCP_INSTALLER_TAG='v0.3.17-beta.8'
  VDOC_MCP_INSTALLER_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/$VDOC_MCP_INSTALLER_TAG"
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs" -o install-channel.mjs
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs.sha256" -o install-channel.mjs.sha256
  shasum -a 256 -c install-channel.mjs.sha256
  node install-channel.mjs --channel beta
  # For stable: node install-channel.mjs --channel release
)
```

Each execution resolves the channel's newest published version, verifies its archive, then installs it. Put the printed absolute executable path in your Agent's `command`, removing `npx` arguments. Name the stable connection `vdoc` and the test connection `vdoc_beta`. Beta uses `VDOC_BASE_URL=http://127.0.0.1:18080` (or your test domain) and a Token created in Beta Admin. Keep production Tokens out of the test connection. When both environments are configured, explicitly select which connection to query.

After installation, repeat this command to update beta MCP and its bundled Skill; replace both `beta` values with `release` for stable updates:

```sh
node "$HOME/.local/share/vdoc/mcp/beta/node_modules/@vdoc/mcp/scripts/install-channel.mjs" --channel beta
```

Restart MCP and reload the Agent after updating. Link each channel's Skill into its own agent or project directory; see [Skill channel isolation](skill-workflows.md#release-channels). The installer requires Node.js 20+ and npm, without requiring npm registry publication.

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

| Variable              | Required                               | Purpose                                                                                                        |
| --------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `VDOC_BASE_URL`       | Required if `VDOC_MCP_URL` is not set  | Vdoc backend origin; adapter appends `/api/v1/open/mcp`.                                                       |
| `VDOC_MCP_URL`        | Required if `VDOC_BASE_URL` is not set | Full Vdoc MCP endpoint URL; overrides `VDOC_BASE_URL`.                                                         |
| `VDOC_MCP_TOKEN`      | Yes                                    | MCP Token created in Admin; store only in Agent config or secrets.                                             |
| `VDOC_MCP_TIMEOUT_MS` | No                                     | HTTP timeout in milliseconds, default `180000`, range `1`–`180000`; allow this duration in the agent host too. |

For local full Compose, `VDOC_BASE_URL` is usually `http://127.0.0.1:8080`. For remote deployments, use a backend domain reachable from the Agent machine.

## Agent Config Example

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": [
        "--yes",
        "github:ChnMig/Vdoc-mcp#ea2445e4e528e4ee98b97ef35121c93975b07afa"
      ],
      "env": {
        "VDOC_BASE_URL": "https://your-vdoc.example.test",
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
    "VDOC_MCP_URL": "https://your-vdoc.example.test/api/v1/open/mcp",
    "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN",
    "VDOC_MCP_TIMEOUT_MS": "180000"
  }
}
```

## Tool Scope

The backend is the source of truth for tool definitions. The adapter calls Vdoc `tools/list` at runtime, so schemas stay aligned with the deployed backend.

v0.2 read tools cover:

- projects
- documents
- API versions
- Markdown / TXT versions
- endpoint detail
- API diffs
- Markdown / TXT docs
- change summaries

`list_documents` filters results by token scope: `api:read` alone sees only OpenAPI documents, `doc:read` sees Markdown and TXT documents, and a token with both sees all document types. API read tools require an OpenAPI target; `doc_*` read tools accept Markdown and TXT. One read scope cannot bypass the other.

v0.2 draft tools cover creating, updating, viewing, and submitting OpenAPI, Markdown, and TXT Drafts. The normative inventory is (and must match backend `tools/list`):

<!-- VDOC_MCP_TOOL_INVENTORY_START -->

- `list_projects`
- `list_documents`
- `list_document_branches`
- `list_api_endpoints`
- `list_api_versions`
- `list_doc_versions`
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
- `get_schema_version`
- `get_doc_version`

<!-- VDOC_MCP_TOOL_INVENTORY_END -->

The current source version adds `list_document_branches` for branch IDs, names, defaults and protection status, including unpublished branches, and `list_api_endpoints` for endpoint IDs in a selected version. The endpoint list accepts optional `method` and exact OpenAPI `path` filters. Resolve these IDs before querying details or creating the first draft. Branch discovery requires the target document type's read scope. Older release deployments may not include these tools; check their runtime inventory and upgrade Backend with Skill.

The current backend's `get_endpoint_detail` includes definitions of the endpoint's active security schemes in `normalized_operation.securitySchemes`. Header, location, or type changes to the same scheme appear in version comparisons. OpenAPI 3.1 Schema `$ref` sibling constraints are preserved, and operation parameters override path parameters by `name + in`. After an upgrade, reading historical endpoints or comparisons refreshes older parsed facts from the original documents while retaining version and endpoint IDs. Upgrade older backends to receive these facts.

Use the current backend `tools/list` response as the final tool list. v0.2 does not expose direct publish tools.

## Agent Behavior Rules

- Query Vdoc before answering endpoint fields, response properties, enum values, auth schemes, or Markdown / TXT text.
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

## v0.2: Explicit Branches and Historical Versions

- `get_latest_doc` and `get_latest_schema` require `branch_id`; they never select across branches. Resolve branch names with `list_document_branches` first.
- For complete historical content, use `get_doc_version` for Markdown / TXT or `get_schema_version` for OpenAPI, with `project_id`, `document_id`, and `version_id`. Verify and cite the returned `version` and `content`.
- `get_api_version_draft` preserves its metadata and adds the raw body in `content.content`. Its `revision` and content come from one snapshot; use that revision as `expected_revision` when editing.
- Markdown / TXT draft writes use `content`. Legacy `markdown_content` remains accepted; supply at least one body field, with identical values if both are present. TXT retains literal content and line endings, may be empty, and is not parsed as Markdown or OpenAPI. Check the deployed backend schema first.
- Undeclared arguments return `INVALID_ARGUMENT`. Existing callers must supply a branch to latest-content tools and use the dedicated version tools for historical reads.

Start with the [Codex/Cursor configuration steps](admin-usage.md#connect-agent).
