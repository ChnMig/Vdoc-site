# Product Overview

Vdoc is a documentation hub for teams developing with AI. Keep OpenAPI contracts, AGENTS.md, and runbooks in one project, inspect each change, publish after review, and let your team and agents query the same published content.

## When to Use Vdoc

| Your situation                                                         | What to do in Vdoc                                                                                                   |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| The backend changed an API and the frontend needs to assess the impact | Compare OpenAPI versions, inspect field changes and Breaking Changes, then read the full endpoint definition.        |
| Your agent needs team conventions, but its context is out of date      | Query published Markdown through MCP and use the Skill to guide the agent to read before answering.                  |
| A teammate or agent changed a document and someone needs to check it   | Submit a draft, inspect its Diff, and have an administrator approve publication. Historical versions stay immutable. |

See **[how one API change moves through Vdoc](how-it-works.md#example)**, or **[deploy with Docker Compose](deployment.md#quick-start)**. Then follow [First Use](admin-usage.md) to publish a sample document and query it with your agent.

## Who It Is For

Product and platform teams developing with AI: backend maintainers publish contracts, frontend developers check integration impact, documentation owners review team knowledge, and agents query published content through MCP. Teams can host Vdoc on their own infrastructure.

## How Documents Are Organized

- **Team:** groups related projects and forms the first navigation level in Workspace.
- **Project:** the documents for a product or service, with access assigned through project membership and role.
- **Folder:** a nested directory within a project. Empty folders persist, and subfolders can be created at any level.
- **Document:** OpenAPI, Markdown, or TXT, each with its own icon. The display name and filename are separate; the folder and filename form a stable `relative_path`, such as `apis/orders.yaml`, `docs/team-guide.md`, or `notes/checklist.txt`.
- **Branch:** separate document tracks for `dev`, `test`, and protected `prod`, with custom branches available.
- **Draft and Version:** changes enter as drafts. A Project Admin or SuperAdmin approves publication to create an immutable version. Writers and agents can submit drafts.

In Admin's **Workspace**, browse teams, projects, and folders to find a document. Each project groups its documents, members, and permission-gated settings; access is assigned per project. Click a document to enter its own page: the current project's file tree on the left, content in the center, and an outline with version, Diff, AI, and settings tools on the right. Branch and revision controls sit above the content, while Share and Edit draft are in the document header. Narrow screens use a drawer for files and a dialog for the outline.

MCP Tokens grant agents scoped read or draft permissions; Vdoc Skill provides a workflow for querying before collaborating.

## After Your First Trial

Configure an OpenAI-compatible model with [Admin AI](admin-ai.md) for automatic change summaries and page chat. Use [public sharing](admin-usage.md#create-and-manage-public-shares) to let people outside the project read published documents, optionally with a password and revocable access.

## Current Version Boundaries

Publishing requires human review. MCP cannot publish directly. Admin AI cannot approve, reject, modify, or publish content, and it does not replace machine Diff.

The current candidate supports Docker Compose self-hosting; see [Version Notes](version-notes.md) for capabilities and limits. Invitation flows, notification bots, PR Bots, full SDKs, a code-generation platform, and commercial billing are outside the current scope.

Start with the [Deployment Guide](deployment.md#quick-start), then complete [your first agent query](admin-usage.md).
