# MCP Setup and Tools

Agents use MCP to read and manage authorized OpenAPI, Markdown and TXT documents. The consuming application decides how to use them. Start with [Connect Your Agent](admin-usage.md#connect-agent), then [read a document](admin-usage.md#first-query).

The stdio adapter `@chnmig/vdoc-mcp` forwards `tools/list` and `tools/call` to `/api/v1/open/mcp`; Backend owns storage and business logic.

The tool inventory on this page describes `v0.4.2` (npm `@latest`). Stable deployments should use the MCP version matching their backend.

## Before You Start

- Vdoc backend is deployed and `/api/v1/open/health` succeeds.
- An MCP Token has been created in Admin.
- The target Agent runtime supports MCP stdio server configuration.
- Do not put raw MCP Tokens, JWTs, DB passwords, storage secrets, or `Authorization` header values in repos, screenshots, logs, README files, or issues.

The agent machine also needs Node.js 20 or later and npm. If Vdoc is not running yet, start with [Docker Compose deployment](deployment.md#quick-start), including initial-admin setup. A first query needs an authorized saved document; demo seeding and engineering release checks are optional.

## Installation Options

Stable environments use npm `@latest` with the matching stable backend, without a Git commit:

```sh
npx --yes @chnmig/vdoc-mcp@latest --version
```

To install a global command, run `npm install --global @chnmig/vdoc-mcp@latest`; repeat it to update. `@latest` selects stable releases and `@beta` selects betas; the tags update independently. For a fixed deployment, use an exact package version matching its backend.

The workbench's **MCP client configuration** offers global install, update and uninstall prompts with user-wide configuration shared by projects. The [installation guide](https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.4.2/docs/public/mcp-install.md) preserves settings, channels and shared installations. No Skill is installed.

The configuration below uses `npx`, resolving the channel's latest package at startup. Global installs require an explicit update. Restart MCP after updating. npm ships compiled JavaScript; no Git or TypeScript compiler is needed.

For a deployment locked to the reviewed workspace release, the verified prebuilt archive remains available:

```sh
(
  set -eu
  VDOC_MCP_VERSION=0.4.2
  VDOC_MCP_PACKAGE_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$VDOC_MCP_PACKAGE_DIR"' EXIT
  VDOC_MCP_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/v$VDOC_MCP_VERSION"
  curl -fsSL "$VDOC_MCP_RELEASE/vdoc-mcp-$VDOC_MCP_VERSION.tgz" -o "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
  curl -fsSL "$VDOC_MCP_RELEASE/SHA256SUMS" -o "$VDOC_MCP_PACKAGE_DIR/SHA256SUMS"
  (cd "$VDOC_MCP_PACKAGE_DIR" && shasum -a 256 -c SHA256SUMS)
  npm install --global "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
)
```

Use the MCP version selected by your deployment package's `workspace.lock.json`. To use the global install from an Agent, change its config's `command` to `vdoc-mcp` and remove the `npx` `args`, keeping the private `env`. Restart the MCP connection after updating.

`VDOC_MCP_TOKEN` is an environment variable in the shell or Agent configuration, not a package CLI argument. Never put the raw token in `npx`, `npm`, or adapter `args`. Run `set +x` to disable xtrace before manual diagnosis, and keep credentials out of shell history, logs, and screenshots.

## Follow release / beta updates {#release-channels}

Use `@chnmig/vdoc-mcp@beta` for testing and `@chnmig/vdoc-mcp@latest` for stable. With npx, each MCP restart resolves the latest published version in the selected channel. With a global installation, rerun the same `npm install --global` command. Keep each environment's server name, URL and token separate; no Git commit or installer path is needed in npm configurations.

### Existing GitHub channel installations

MCP uses one adapter package per channel. `release` selects only stable releases; `beta` selects only `vMAJOR.MINOR.PATCH-beta.N` prereleases. A missing channel fails without falling back to another channel. Separate prefixes at `~/.local/share/vdoc/mcp/release` and `~/.local/share/vdoc/mcp/beta` preserve any existing global MCP installation.

First download `install-channel.mjs` and `install-channel.mjs.sha256` from a reviewed [MCP Release](https://github.com/ChnMig/Vdoc-mcp/releases) that includes them. These commands pin the MCP-only installer to `v0.4.2`; run them in a dedicated tools directory. A failed download or checksum stops installation. Older releases do not contain these assets:

```sh
(
  set -eu
  VDOC_MCP_INSTALLER_TAG='v0.4.2'
  VDOC_MCP_INSTALLER_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/$VDOC_MCP_INSTALLER_TAG"
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs" -o install-channel.mjs
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs.sha256" -o install-channel.mjs.sha256
  shasum -a 256 -c install-channel.mjs.sha256
  node install-channel.mjs --channel release
  # For beta: node install-channel.mjs --channel beta
)
```

Each execution resolves the channel's newest published version, verifies its archive, then installs it. Put the printed absolute executable path in your Agent's `command`, removing `npx` arguments. Name the stable connection `vdoc` and the test connection `vdoc_beta`. Beta uses `VDOC_BASE_URL=http://127.0.0.1:18080` (or your test domain) and a Token created in Beta Admin. Keep production Tokens out of the test connection. When both environments are configured, explicitly select which connection to query.

After installation, repeat the command for your chosen channel. Stable environments use `release`; test environments use `beta`:

```sh
node "$HOME/.local/share/vdoc/mcp/release/node_modules/@chnmig/vdoc-mcp/scripts/install-channel.mjs" --channel release
node "$HOME/.local/share/vdoc/mcp/beta/node_modules/@chnmig/vdoc-mcp/scripts/install-channel.mjs" --channel beta
```

Restart MCP and reload the Agent after updating. The installer requires Node.js 20+ and npm, and remains available for existing GitHub channel installations.

For development and package checks, see the [MCP README](https://github.com/ChnMig/Vdoc-mcp/blob/v0.4.2/README.md). stdout carries MCP frames; diagnostics use stderr.

## Client and server version check

On a successful backend request, MCP compares its package version with `X-Vdoc-Server-Version` from the actual connected backend, including beta labels. A mismatch warns through MCP logging and stderr, reporting both versions and suggesting alignment. Tools remain available; repeated warnings for the same state are suppressed. If a backend or proxy does not report a recognizable version, MCP says it cannot verify the version. A successful connection does not prove compatibility.

Align the client and backend to the same release and channel, or pin the client to that server's exact version, then restart MCP. The check uses the normal request response and needs no extra API, probe or permission.

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
      "args": ["--yes", "@chnmig/vdoc-mcp@latest"],
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

## Document management

Select the server/environment, project and document, then call `list_branches` and `resolve_ref` to pin an immutable commit. Read with `get_document_at_commit` and compare fixed IDs with `compare_commits`. A branch head can be unpublished; verify an exact release before describing content as published.

Save with `commit_changes` using the observed head/generation and a stable idempotency key. On conflict, reread and compare before reconciling. After an unknown outcome, retry the identical payload and key. The backend generates commit IDs and numbered versions. Approval and publication remain workbench actions.

Vdoc supplies document operations and facts. Code generation, consumer migrations and other business workflows belong to the consuming agent or application.

## Download a source file locally {#download-source}

Ask the agent to download a document's main branch to `/home/me/project/docs/guide.md`. It identifies the document and branch, pins an exact commit through `resolve_ref`, then calls `download_document_at_commit` with `project_id`, `document_id`, the full `commit_id` and absolute file path `output_path`.

The stdio adapter saves original UTF-8 OpenAPI JSON/YAML, Markdown and TXT content without reformatting or changing line endings, and verifies SHA-256 before saving. It returns `file_path`, `byte_length`, `sha256` and document/commit IDs without echoing the entire body into the conversation. Existing backend read permissions and audits apply, with a 10 MiB source-file limit.

Missing parent directories are created. Existing files, directories and symlinks are never overwritten; choose another filename when needed. Only the explicit destination path is used; document bodies cannot choose it. Files are saved on the adapter's machine, so remote/containerized adapters need a shared mount. Direct backend HTTP clients still read content using `get_document_at_commit` and save it themselves.

## Upgrading an older combined installation

For the first MCP-only upgrade, download and verify the standalone installer from a reviewed release containing this change and keep the existing channel/prefix. Earlier bundled installers require a Skill asset that is no longer shipped. Remove the obsolete Vdoc Skill link from its agent/project scope while preserving any locally maintained files, then restart MCP and reload the agent. The installer does not modify agent directories or existing MCP credentials.

## Tool Scope

The adapter reads deployed backend `tools/list` schemas at runtime. v0.4.2 uses independent document branches and immutable commits: 21 backend tools plus the stdio-only `download_document_at_commit`, for 22 tools in total. Update Backend and MCP together to use the team/project discovery below. Legacy version and draft tools are no longer advertised.

Document lists and search respect type scopes: `api:read` reads OpenAPI and `doc:read` reads Markdown/TXT. Patches require both the corresponding read and write scopes (`api:draft` / `doc:draft` remain the protocol scope identifiers) and project Writer permission. Human administrators approve and publish.

<!-- VDOC_MCP_TOOL_INVENTORY_START -->

- `create_document`
- `resolve_ref`
- `list_branches`
- `create_branch`
- `list_commits`
- `get_commit`
- `get_document_at_commit`
- `commit_changes`
- `compare_commits`
- `list_merge_requests`
- `create_merge_request`
- `list_releases`
- `get_release`
- `analyze_changes`
- `list_repository_events`
- `list_teams`
- `list_projects`
- `list_documents`
- `search_documents`
- `get_document_section`
- `apply_document_patch`

<!-- VDOC_MCP_TOOL_INVENTORY_END -->

### Discover teams and projects by name

One user configuration spans authorized teams/projects. `list_teams(query?)` returns IDs, names and accessible project counts, omitting empty-access teams. `list_projects(query?, team_id?, team_name?)` filters by project substring, team ID or complete team name; results include team names and preserve duplicate candidates. Omit filters to list all accessible projects. Names ignore case, filters intersect, and read scopes plus current membership apply.

### Full source and optional structured views

`get_document_at_commit(project_id, document_id, commit_id)` always returns the complete original source. `commit_changes` retains full-file replacement and `download_document_at_commit` downloads original files. These paths do not require Markdown or OpenAPI parsing and never truncate, reorder or format content to save context. BOM, CRLF, trailing newlines and empty files are preserved. Storage currently accepts UTF-8 text; arbitrary binary uploads require a separate future extension.

`get_document_section` offers optional views at an exact `commit_id`:

- `kind=lines` (default): any stored text, using 1-based inclusive `start_line` / `end_line`. Defaults to up to 200 lines; at most 500 lines and 256 KiB. Continue with `next_line`. Oversized selections fail explicitly; choose a smaller range or read full source.
- `kind=markdown_heading`: a unique ATX `heading`, including its child sections, ignoring headings in fenced code blocks. Duplicate headings require line selection.
- `kind=openapi_operation`: an HTTP `method` and exact `path`. `content_kind=derived_json` identifies parsed output; do not use it as replacement source.
- `kind=outline`: Markdown ATX headings or OpenAPI operations, at most 500 entries and 256 KiB. Parsing failure leaves line views, full reads and original downloads available.

### Search and partial edits

`search_documents(project_id, query)` performs a case-insensitive literal search over names, paths and raw source. Optionally use `path_prefix`, or select `document_id` with `branch_id` or `commit_id` (not both). Defaults to each document's default branch. Results include the exact commit, matched fields, a bounded snippet and a content line number. `limit` defaults to 20, maximum 50. Each page scans at most 100 documents or stops after cumulative reads reach 16 MiB, finishing the current file first. Continue `next_cursor` even through empty pages. Cursors bind the search criteria; default heads may change between pages, while each returned result remains pinned to its actual commit.

`apply_document_patch` accepts `document_id`, `branch_id`, observed `expected_head_commit_id`, `expected_generation`, a stable `idempotency_key` and 1–100 `edits` with `old_text` / `new_text`. All anchors refer to the same original source and must be unique and non-overlapping. Empty `old_text` is permitted only for a single insertion into an empty document; empty `new_text` deletes an anchor. Other bytes and metadata remain unchanged. Success creates a normal numbered commit without publication.

Reload, compare and reconcile after a head/generation conflict. Missing or repeated anchors fail explicitly. After an unknown outcome, retry identical arguments and key; retries return the original commit even after later saves. A key cannot be reused for a different patch.

For initial setup, use the [Codex / Cursor / Claude Code guide](admin-usage.md#connect-agent).
