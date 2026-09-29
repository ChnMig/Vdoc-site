# Skill Workflows

The Vdoc Skill is an Agent runtime workflow package. It does not store data, compute diffs, or call the backend directly. It teaches Agents when they must query facts through Vdoc MCP.

## Before You Start

- The Agent has configured [MCP Tools](mcp-tools.md), and Vdoc `tools/list` succeeds.
- The target runtime supports skills or custom workflow instructions.
- You know the skill folder location required by the runtime.
- Do not put raw MCP Tokens, JWTs, DB passwords, storage secrets, or `Authorization` header values in Skill files, examples, logs, or issues.

If Vdoc is not running yet, follow the [Deployment Guide](deployment.md#quick-start). Complete [your first published document query](admin-usage.md#first-query) before installing the Skill, so you know the MCP connection and document permissions work.

## Installation

Since v0.3.7, the optional Skill lives in `Vdoc-mcp/skills/vdoc` and is included in the MCP package. MCP works without it. Both use the `Vdoc-mcp` release pinned by the workspace lock. Install the compiled archive after verifying its checksum; this avoids npm global Git preparation failures such as `tsc: command not found`:

```sh
# Personal install; change the directory for another agent or project scope.
(
  set -eu
  VDOC_SKILL_DIR="$HOME/.agents/skills/vdoc"
  VDOC_MCP_VERSION=0.3.8
  VDOC_MCP_PACKAGE_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$VDOC_MCP_PACKAGE_DIR"' EXIT
  VDOC_MCP_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/v$VDOC_MCP_VERSION"
  curl -fsSL "$VDOC_MCP_RELEASE/vdoc-mcp-$VDOC_MCP_VERSION.tgz" -o "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
  curl -fsSL "$VDOC_MCP_RELEASE/SHA256SUMS" -o "$VDOC_MCP_PACKAGE_DIR/SHA256SUMS"
  (cd "$VDOC_MCP_PACKAGE_DIR" && shasum -a 256 -c SHA256SUMS)
  npm install --global "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
  vdoc-mcp skill install --directory "$VDOC_SKILL_DIR"
  test -f "$VDOC_SKILL_DIR/SKILL.md"
)
```

The installer links the complete bundled Skill, including references, templates, and examples. For Claude Code, pass `--directory "$HOME/.claude/skills/vdoc"`; for project scope, use `--directory .agents/skills/vdoc`.

If the destination already exists, the installer leaves it untouched. Preserve local changes and move the old installation before migrating. Keep personal rules outside the linked package files.

### Updating

Install the verified MCP release archive from the newer reviewed lock globally at the same npm prefix; the linked Skill updates with it. Reload your agent and restart MCP. Changing the Node installation or npm prefix requires relinking. Existing MCP configurations pinned to another Git commit must also be updated, or changed to use the global `vdoc-mcp` command.

The package is not published to npm yet. `npm update --global @vdoc/mcp` will apply only after registry publication and migration from a Git-pinned install. Do not link a persistent Skill from an `npx` cache directory.

### Independent Skills CLI installation

```sh
npx skills add ChnMig/Vdoc-mcp --skill vdoc -g
```

This follows the default branch and is managed independently by Skills CLI; global MCP package updates do not update it. For a pinned installation, use the GitHub tree URL for the reviewed commit and `skills/vdoc` directory. Do not let Skills CLI and the MCP installer manage the same destination. Configure [MCP Tools](mcp-tools.md) separately.

Validate both the Skill and MCP from the combined repository:

```sh
cd Vdoc-mcp
npm test
```

## When the Agent Must Query Vdoc First

- Writing frontend or backend endpoint integration.
- Checking whether an endpoint, field, enum, response property, auth scheme, or server exists.
- Comparing two API or Markdown Versions.
- Preparing migration notes from semantic diff.
- Quoting reviewed Markdown document text.
- Creating, updating, or submitting Drafts.

## Workflow 1: Endpoint Integration

1. User asks to integrate an endpoint.
2. Agent loads the Vdoc Skill.
3. Agent calls `list_projects`, `list_documents`, or `list_api_versions` through MCP to locate the target version.
4. Agent calls `get_endpoint_detail` to read method, path, parameters, request body, response body, and auth information.
5. Agent writes code or explanation from the returned facts.
6. Agent states that facts came from Vdoc, not guessing.

## Workflow 2: Migration Analysis

1. User asks about migration impact between two API versions.
2. Agent resolves `from_version_id` and `to_version_id` through MCP.
3. Agent calls `compare_api_versions` or `get_change_summary`.
4. Agent explains breaking changes, compatible changes, and migration actions only from returned results.
5. If Vdoc has no matching version, Agent should ask for a Version to be published in Admin instead of inventing conclusions.

## Workflow 3: Markdown Document Draft

1. User asks to change a managed Markdown document.
2. Agent calls `get_latest_doc` to read published content.
3. Agent prepares a revision from the user request.
4. Agent uses `create_doc_draft` or `update_doc_draft` to create a Draft.
5. Agent uses `submit_doc_draft` to submit it for human review.
6. Admin or SuperAdmin reviews and publishes in Admin.

## Good Prompt Examples

```text
Use Vdoc first. Find the published endpoint detail for POST /orders, then update the client payload validation.
```

```text
Compare the current prod OpenAPI version with the previous one and summarize breaking changes before editing docs.
```

```text
Read the reviewed runbook Markdown from Vdoc, then answer the deployment question using only those facts.
```

## Verification

1. Ask the Agent to explain request fields for an endpoint.
2. Observe that the Agent calls Vdoc MCP first.
3. Check that the answer uses `get_endpoint_detail` or related Vdoc tool results.
4. Ask the Agent to publish a version and confirm it only submits a Draft, then says Admin or SuperAdmin approval is required.

## Failure Signs

- Agent invents endpoint fields without a Vdoc query.
- Agent uses display names instead of stable IDs or `relative_path`.
- Agent says a Draft is published before Admin has a new Version.
- Agent puts MCP Tokens in CLI args, logs, or docs.
- Live E2E points at the application database instead of the disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default.

When this happens, reload the Skill, verify MCP availability, and restate that the Agent must query Vdoc MCP first.
