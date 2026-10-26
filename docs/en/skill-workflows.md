# Skill Workflows

Vdoc Skill teaches Agents to query MCP facts first; it neither stores data, computes diffs, nor calls Backend directly.

## Let AI Install It {#ai-install}

Copy a sentence to your AI. Installation needs no Token; [AI instructions](https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md) cover installation, verification, and updates.

<div class="skill-install-prompts">

Stable project:

```text
Read https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md and install the Vdoc Skill in my current project using the release channel.
```

Test project:

```text
Read https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md and install the Vdoc Skill in my current project using the beta channel.
```

</div>

## Before Querying Vdoc

- The runtime supports Skills/custom workflows; its Skill directory is known.
- [MCP is configured](mcp-tools.md), and Vdoc `tools/list` succeeds.
- Do not put raw MCP Tokens, JWTs, DB passwords, storage secrets, or `Authorization` values in Skills, examples, logs, or issues.

Initialize Vdoc using the [Deployment Guide](deployment.md#quick-start) if needed. Before using the Skill, verify connectivity and permissions with [your first query](admin-usage.md#first-query).

## Installation

Since v0.3.7, optional `Vdoc-mcp/skills/vdoc` shares MCP's package and locked version; MCP works without it. [Verify and globally install compiled MCP](mcp-tools.md#installation-options) before linking to avoid Git's `tsc: command not found` preparation error:

```sh
# Personal install; change the directory for another agent or project scope.
(
  set -eu
  VDOC_SKILL_DIR="$HOME/.agents/skills/vdoc"
  vdoc-mcp skill install --directory "$VDOC_SKILL_DIR"
  test -f "$VDOC_SKILL_DIR/SKILL.md"
)
```

The link includes references, templates, and examples. Pass `--directory "$HOME/.claude/skills/vdoc"` for Claude Code or `--directory .agents/skills/vdoc` for projects. Existing destinations stay untouched; preserve edits and move old installs before migrating. Keep personal rules outside package files.

### Updating

Verify the newer reviewed lock's MCP release; reinstall at the same global npm prefix to update its linked Skill. Restart MCP and reload the Agent. Relink after changing Node/npm prefixes. Update old Git pins, or use global `vdoc-mcp`.

The package is not on npm yet. `npm update --global @vdoc/mcp` applies only after registry publication and migration from Git installation. Never link persistently from `npx` caches.

### release / beta isolation {#release-channels}

Use the [MCP channel installer](mcp-tools.md#release-channels), then link beta's Skill in a separate test project:

```sh
"$HOME/.local/share/vdoc/mcp/beta/node_modules/.bin/vdoc-mcp" skill install --directory .agents/skills/vdoc
```

Stable projects link from `~/.local/share/vdoc/mcp/release/node_modules/.bin/vdoc-mcp` into a separate directory; Beta uses its own Skill directory, MCP configuration, and Token. Repeat the channel install to update its Skill, then reload the Agent. Skills CLI on the default branch lacks channel isolation: use channel packages or a reviewed commit.

### Independent Skills CLI installation

```sh
npx skills add ChnMig/Vdoc-mcp --skill vdoc -g
```

This follows the default branch, updating independently of global MCP. Pin it with the reviewed commit's GitHub tree URL for `skills/vdoc`. Keep installer destinations separate. Configure [MCP Tools](mcp-tools.md) separately.

Validate MCP and Skill in the combined repository:

```sh
cd Vdoc-mcp
npm test
```

## When the Agent Must Query Vdoc First

- Integrating frontend/backend endpoints or checking endpoints, fields, enums, response properties, auth schemes, and servers.
- Comparing API/Markdown/TXT Versions or deriving migration notes from semantic diffs.
- Quoting published Markdown/TXT; creating, updating, or submitting Drafts.

## Workflow 1: Endpoint Integration

1. To integrate an endpoint, load the Skill and find its version with `list_projects`, `list_documents`, or `list_api_versions`.
2. Read method, path, parameters, request/response bodies, and auth with `get_endpoint_detail`.
3. Write code/explanations from the returned facts, citing Vdoc instead of guessing.

## Workflow 2: Migration Analysis

1. Resolve `from_version_id` and `to_version_id` through MCP for the API comparison.
2. Call `compare_api_versions` or `get_change_summary`; explain breaking/compatible changes and migration actions only from those results.
3. If a version is missing, request publication in Admin instead of inventing conclusions.

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
