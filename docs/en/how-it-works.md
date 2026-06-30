# How It Works

This page connects the human workflow and the Agent workflow. After reading it, you should know how content enters Vdoc, when it becomes queryable fact, what Agents can do, and what they cannot do.

## The Short Flow

Drafts enter review first. Admin approval creates immutable Versions. MCP exposes published facts and allowed Draft actions to Agents. The Skill tells Agents to query Vdoc before answering.

## From Content to Fact

1. Admin creates Team, Project, and Document.
2. Document uses `relative_path` as stable identity, for example `apis/billing.yaml`.
3. A Writer or Agent creates a Draft on a Branch.
4. The Draft enters review.
5. A Project Admin or SuperAdmin checks content, diff, endpoint detail, or Markdown changes.
6. Approval creates an immutable Version in the backend.
7. Admin, API, MCP, and Agents read that published Version.

## What Admin Does

- Initializes Team, Project, members, and permissions.
- Creates OpenAPI or Markdown Documents.
- Reviews Drafts, then approves, rejects, or requests changes.
- Views Versions, Diffs, endpoint details, and Markdown content.
- Creates MCP Tokens and shares them safely with Agent users.

Admin is the publishing gate. In v0.1, MCP and Skill cannot bypass Admin to publish Versions directly.

## What MCP Does

`@vdoc/mcp` is the stdio MCP adapter used by Agent runtimes. It does not store Vdoc data or implement business logic locally. It forwards `tools/list` and `tools/call` to backend `/api/v1/open/mcp`.

MCP can do two kinds of work:

- Read published facts, such as Project, Document, API Version, endpoint detail, diff, change summary, and Markdown content.
- Create, update, view, and submit Drafts so human review can continue.

MCP cannot publish Versions directly. If an Agent says it published content, treat that as wrong unless Admin shows a new Version after approval.

## What the Skill Does

The Vdoc Skill is workflow guidance for Agents. It does not store data and does not call the backend by itself. It tells Agents to query Vdoc through MCP before these tasks:

- Writing endpoint integration code.
- Checking fields, enums, auth, servers, or response shapes.
- Comparing two API or Markdown Versions.
- Answering from reviewed Markdown content.
- Creating or updating Drafts.

The Skill reduces guessing. Live facts still come from MCP tool results.

## Good Agent Path

1. User asks an Agent to integrate an endpoint, analyze migration impact, or edit docs.
2. Agent follows the Skill and calls Vdoc MCP first.
3. Agent uses `relative_path`, Project, Document, Branch, or Version to find the target.
4. Agent calls a read tool, such as `get_endpoint_detail`, `compare_api_versions`, or `get_latest_doc`.
5. Agent writes code, writes an explanation, or creates a Draft from returned facts.
6. If Vdoc content must change, Agent submits a Draft.
7. Admin review and approval create the Version that becomes the new fact.

## Runtime Surfaces

- Backend provides REST, MCP endpoint, persistence, and object storage writes.
- Admin is the human workbench opened in a browser.
- PostgreSQL stores metadata and workflow state.
- RustFS or another S3 compatible store keeps raw and normalized document objects.
- Agents reach backend through the MCP adapter. They do not connect to PostgreSQL or object storage.

In Docker Compose, containers talk to each other through service names, for example backend connects to `postgres:5432` and `rustfs:9000`. Browsers and host commands use `127.0.0.1` or your domain, for example `http://127.0.0.1:8081` for Admin.

Next, start the system with [Deployment Guide](deployment), then create the first data path with [First Use](admin-usage).
