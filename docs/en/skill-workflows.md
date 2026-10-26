# Skill Workflows

Vdoc Skill teaches Agents to query MCP facts first; it neither stores data, computes diffs, nor calls Backend directly.

## Let AI Install, Update, or Uninstall {#ai-install}

Copy a sentence to your AI. Installation needs no Token; [AI instructions](https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md) cover installation, verification, updates, and removal.

<div class="skill-install-prompts">

Stable project:

```text
Read https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md and install the Vdoc Skill in my current project using the release channel.
```

Test project:

```text
Read https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md and install the Vdoc Skill in my current project using the beta channel.
```

Update this project (keep its channel):

```text
Read https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md and update this project's installed Vdoc MCP and Skill to the latest version in its original channel, preserving the installation location and MCP configuration.
```

Remove this project's integration:

```text
Read https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md and remove this project's Vdoc MCP and Skill integration, preserving installations shared with other projects and all other tool configurations.
```

</div>

## Before Querying Vdoc

- The runtime supports Skills/custom workflows; its Skill directory is known.
- [MCP is configured](mcp-tools.md), and Vdoc `tools/list` succeeds.
- Do not put raw MCP Tokens, JWTs, DB passwords, storage secrets, or `Authorization` values in Skills, examples, logs, or issues.

Initialize with the [Deployment Guide](deployment.md#quick-start) if needed; verify connectivity/permissions with [your first query](admin-usage.md#first-query).

## Installation

Since v0.3.7, optional `Vdoc-mcp/skills/vdoc` shares MCP's package/locked version; MCP works independently. [Verify and globally install compiled MCP](mcp-tools.md#installation-options) before linking, avoiding Git's `tsc: command not found` preparation error:

```sh
# Personal install; change the directory for another agent or project scope.
(
  set -eu
  VDOC_SKILL_DIR="$HOME/.agents/skills/vdoc"
  vdoc-mcp skill install --directory "$VDOC_SKILL_DIR"
  test -f "$VDOC_SKILL_DIR/SKILL.md"
)
```

Links include references, templates, and examples. Claude Code uses `--directory "$HOME/.claude/skills/vdoc"`; projects use `--directory .agents/skills/vdoc`. Existing targets stay untouched; preserve edits and move old installs before migration. Keep personal rules outside package files.

### Updating

Verify the newer reviewed lock's MCP package and reinstall at the original global npm prefix; linked Skills update. Restart MCP/reload the Agent. Relink after Node/npm prefix changes; update old Git pins or use global `vdoc-mcp`. The package is not on npm: `npm update --global @vdoc/mcp` requires registry publication and migration from Git installation. Never link `npx` caches.

### release / beta isolation {#release-channels}

Use the [channel installer](mcp-tools.md#release-channels); link beta in a separate test project:

```sh
"$HOME/.local/share/vdoc/mcp/beta/node_modules/.bin/vdoc-mcp" skill install --directory .agents/skills/vdoc
```

Stable projects link `~/.local/share/vdoc/mcp/release/node_modules/.bin/vdoc-mcp` to a separate directory. Beta keeps separate Skill directories, MCP configuration, and Tokens. Reinstall with the original channel/prefix; restart MCP/reload the Agent. Resolve unknown sources/channel mismatches before replacement. Configure [MCP](mcp-tools.md) separately.

Validate both in the combined repository:

```sh
cd Vdoc-mcp
npm test
```

## When the Agent Must Query Vdoc First

- Integrating frontend/backend endpoints or checking endpoints, fields, enums, response properties, auth schemes, and servers.
- Comparing API/Markdown/TXT Versions or deriving migration notes from semantic diffs.
- Quoting published Markdown/TXT; creating, updating, or submitting Drafts.

## Workflow 1: Endpoint Integration

1. Before endpoint integration, load the Skill; locate the version with `list_projects`, `list_documents`, or `list_api_versions`.
2. Read method, path, parameters, request/response bodies, and auth via `get_endpoint_detail`.
3. Use returned facts for code/explanations; cite Vdoc, never guess.

## Workflow 2: Migration Analysis

1. Resolve `from_version_id`/`to_version_id` via MCP.
2. Use `compare_api_versions`/`get_change_summary` results to explain breaking/compatible changes and migration actions.
3. Request publication of missing versions in Admin; never invent conclusions.

## Workflow 3: Markdown / TXT Document Draft

1. Read published content with `get_latest_doc`, then revise it as requested.
2. Create a Draft with `create_doc_draft`/`update_doc_draft`; submit it for review with `submit_doc_draft`.
3. Admin/SuperAdmin reviews and publishes in Admin.

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

Ask for request fields: the Agent must query MCP first and cite `get_endpoint_detail` or related results. To publish, it must only submit a Draft for Admin/SuperAdmin approval.

## Failure Signs

- Inventing fields without a Vdoc query, or using display names for stable IDs/`relative_path`.
- Claiming publication before Admin has a new Version.
- Putting MCP Tokens in CLI args, logs, or docs.
- Running Live E2E against the application database instead of disposable `VDOC_TEST_POSTGRES_DB` (default `vdoc_e2e`).

If this occurs, reload the Skill, verify MCP, and require a Vdoc query first.
