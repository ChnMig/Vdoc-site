# Product Overview

Vdoc is a documentation hub for teams developing with AI. Keep OpenAPI contracts, AGENTS.md, and runbooks in one project, inspect each change, publish after review, and let your team and agents query the same published content.

## When to Use Vdoc

| Your situation                                                         | What to do in Vdoc                                                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The backend changed an API and the frontend needs to assess the impact | Compare OpenAPI versions, inspect field changes and Breaking Changes, then read the full endpoint definition.        |
| Your agent needs team conventions, but its context is out of date      | Query published Markdown through MCP and use the Skill to guide the agent to read before answering.                  |
| A teammate or agent changed a document and someone needs to check it   | Submit a draft, inspect its Diff, and have an administrator approve publication. Historical versions stay immutable. |

See **[how one API change moves through Vdoc](how-it-works#example)**, or **[deploy with Docker Compose](deployment#quick-start)**. Then follow [First Use](admin-usage) to publish a sample document and query it with your agent.

## Who It Is For

Product and platform teams developing with AI: backend maintainers publish contracts, frontend developers check integration impact, documentation owners review team knowledge, and agents query published content through MCP. Teams can host Vdoc on their own infrastructure.

## How Documents Are Organized

- **Project:** the documents for a product or service, with access managed by membership and role.
- **Document:** OpenAPI or Markdown identified by a stable `relative_path`, such as `apis/orders.yaml` or `docs/team-guide.md`.
- **Branch:** separate document tracks for `dev`, `test`, and protected `prod`, with custom branches available.
- **Draft and Version:** changes enter as drafts. A Project Admin or SuperAdmin approves publication to create an immutable version. Writers and agents can submit drafts.

Your team manages these in the Admin workbench. MCP Tokens grant agents scoped read or draft permissions; Vdoc Skill provides a workflow for querying before collaborating.

## After Your First Trial

Configure an OpenAI-compatible model with [Admin AI](admin-ai) for automatic change summaries and page chat. Use [public sharing](admin-usage#create-and-manage-public-shares) to let people outside the project read published documents, optionally with a password and revocable access.

## Current Version Boundaries

Publishing requires human review. MCP cannot publish directly. Admin AI cannot approve, reject, modify, or publish content, and it does not replace machine Diff.

The current candidate supports Docker Compose self-hosting; see [Version Notes](version-notes) for capabilities and limits. Invitation flows, notification bots, PR Bots, full SDKs, a code-generation platform, and commercial billing are outside the current scope.

Start with the [Deployment Guide](deployment#quick-start), then complete [your first agent query](admin-usage).
