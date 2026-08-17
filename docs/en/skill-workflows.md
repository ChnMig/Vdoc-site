# Skill Workflows

The Vdoc Skill is an Agent runtime workflow package. It does not store data, compute diffs, or call the backend directly. It teaches Agents when they must query facts through Vdoc MCP.

## Before You Start

- The Agent has configured [MCP Tools](mcp-tools), and Vdoc `tools/list` succeeds.
- The target runtime supports skills or custom workflow instructions.
- You know the skill folder location required by the runtime.
- Do not put raw MCP Tokens, JWTs, DB passwords, storage secrets, or `Authorization` header values in Skill files, examples, logs, or issues.

If no local Vdoc environment exists yet, run the shared closure path from the workspace root:

```sh
scripts/vdoc-local-bootstrap.sh
docker compose --env-file .env up -d --build
cd Vdoc && go run ./tools/vdoc-demo-seed
```

The demo seed is optional. See [Deployment Guide](deployment) for the full local gate, where live E2E uses `./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only` and `./scripts/vdoc-e2e.sh live-compose --env-file ../.env`, and the release gate uses `scripts/vdoc-release-dry-run.sh --list` and `scripts/vdoc-release-dry-run.sh`.

## Installation

Install the Skill at `$HOME/.agents/skills/vdoc` for personal use or `.agents/skills/vdoc` for the current repository, with `SKILL.md` at the `vdoc` skill root. The installed commit must equal the `Vdoc-skill` entry in the release package's `workspace.lock.json`:

```sh
# Personal installation; use .agents/skills/vdoc for repository scope instead.
VDOC_SKILL_DIR="$HOME/.agents/skills/vdoc"
VDOC_SKILL_COMMIT=9f3a1807e7cd09c677475b4a2397faff2a985829
test ! -e "$VDOC_SKILL_DIR"
mkdir -p "$(dirname -- "$VDOC_SKILL_DIR")"
git init "$VDOC_SKILL_DIR"
git -C "$VDOC_SKILL_DIR" remote add origin https://github.com/ChnMig/Vdoc-skill.git
git -C "$VDOC_SKILL_DIR" fetch --depth 1 origin "$VDOC_SKILL_COMMIT"
git -C "$VDOC_SKILL_DIR" checkout --detach FETCH_HEAD
test "$(git -C "$VDOC_SKILL_DIR" rev-parse HEAD)" = "$VDOC_SKILL_COMMIT"
test -f "$VDOC_SKILL_DIR/SKILL.md"
```

If the target already exists, verify its current `HEAD`. Upgrade only by
fetching and checking out the commit from a newer reviewed lock; do not run an
unpinned `git pull` in an installed Skill.

The directory should contain:

```text
SKILL.md
templates/
  endpoint-integration.md
  frontend-change-summary.md
examples/
  endpoint-query-example.md
  compare-versions-example.md
```

The Skill must be paired with `@vdoc/mcp`. The Skill is workflow guidance; MCP is the live tool surface and source of facts.

Validate the package:

```sh
cd Vdoc-skill
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
