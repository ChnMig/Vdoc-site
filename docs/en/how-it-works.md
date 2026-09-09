# How It Works

Start with one API change and see how a document is reviewed, published, and made available to both your team and agents.

## Example: An Order Amount Changes Type {#example}

Suppose your team keeps an order API in `apis/orders.yaml`. This illustrative example changes a response field on the same `GET /orders/{id}` endpoint:

| Compare                        | Published v1                | v2 awaiting review                             |
| ------------------------------ | --------------------------- | ---------------------------------------------- |
| OpenAPI type of `total`        | `number`                    | `string`                                       |
| Value in a sample response     | `42.5`                      | `"42.50"`                                      |
| What the frontend should check | Handling amounts as numbers | Type definitions, calculations, and formatting |

1. **Submit the change.** A backend developer or agent submits the new OpenAPI content as a draft. Published v1 remains unchanged.
2. **Inspect the Diff.** Vdoc's OpenAPI semantic Diff shows the `total` type change and compatibility impact. Reviewers can inspect the original document and endpoint details.
3. **Publish after human review.** A Project Admin or SuperAdmin checks and approves the draft, creating immutable v2. MCP cannot bypass this step to publish directly.
4. **Let the agent query.** A frontend developer asks an agent to compare published v1 and v2 through MCP and read the new endpoint details before suggesting code changes.

Once both versions are published, try this prompt, using your actual project and versions:

```text
Query published v1 and v2 of apis/orders.yaml in Vdoc.
Compare GET /orders/{id}, then read the v2 endpoint details.
Explain which integration code the total type change affects and suggest updates.
Cite the document, branch, and version. If either version is missing, do not guess.
```

Document changes do not automatically update your code. Vdoc provides versions, Diffs, and endpoint content; the agent uses those results to suggest changes, and your team validates the code.

Markdown follows the same draft, review, and publish flow, with file Diffs for changes. To try it yourself, **[deploy Vdoc](deployment#quick-start)** and follow **[First Use](admin-usage)** with a shorter Markdown example.

## What People, MCP, and the Skill Each Do

- **Your team manages and publishes in Admin.** Create Teams, Projects, Documents, and Branches, inspect draft content and Diffs, approve versions, and configure MCP Tokens. Writers can create and submit drafts; a Project Admin or SuperAdmin approves publication.
- **MCP provides document tools.** `@vdoc/mcp` forwards agent requests to Backend `/api/v1/open/mcp`. It queries published endpoints, Markdown, versions, and Diffs, and can create, update, or submit drafts according to token permissions. It does not store Vdoc documents locally or expose direct-publish tools.
- **The Skill guides when to query.** Before endpoint integration, version migration, or Markdown edits, agents call MCP and use its results to answer or submit drafts. The Skill itself holds no live documents. See [Skill Workflows](skill-workflows).
- **Built-in AI helps reviewers.** Optional [Admin AI](admin-ai) uses an administrator-configured model for summaries, Diff explanations, and page chat. Summaries are labeled AI-generated. They cannot replace machine Diff, approve, reject, modify, or publish content. Missing providers or failed calls leave the original Diff and human review available.

## Identify the Document and Version

The same document may have different published content on `dev`, `test`, and `prod`. Locate it by Project, stable `relative_path`, Branch, and Version. Display names may change; the relative path supports ongoing references.

Read endpoint definitions with `get_endpoint_detail`, compare published API versions with `compare_api_versions`, and read Markdown with `get_latest_doc`. IDs and content should come from actual query results. If a target is missing or unpublished, the agent should explain what is missing instead of filling in fields.

To change a document, the agent first reads the current version, then submits a new Draft for human review. Publication is complete only when the versions page shows a new Version.

## Where to Start

1. [Deploy Vdoc](deployment#quick-start): start Backend, Admin, PostgreSQL, and RustFS.
2. [First Use](admin-usage): publish a sample document and complete one MCP query.
3. [MCP Setup and Tools](mcp-tools): look up connection settings, read access, and draft operations.

Browsers access Admin; agents access Backend through MCP. Neither connects directly to the database or object storage. Containers use Compose service names, while browsers and agents need addresses reachable from their own machines. See the [Deployment Guide](deployment) for configuration.
