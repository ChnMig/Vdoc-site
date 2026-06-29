# Product Overview

Vdoc is a documentation fact system shared by people and Agents. Teams store OpenAPI contracts and Markdown knowledge in Vdoc, publish immutable Versions through human review, then let Admin, scripts, MCP, and Agents read only approved facts.

## What Problem Vdoc Solves

- API fields, enums, response shapes, and auth notes are scattered across repos, chat, and memory.
- Agents can guess contracts from training data instead of reading your reviewed team facts.
- Documentation changes often lack Drafts, review, diffs, and rollback points.
- Backend API, Admin, MCP, and Skill often lack a clear startup order, so pilot users do not know where to start.

Vdoc does not replace engineering review. It makes approved facts queryable, auditable, and usable by Agents.

## Who Uses Vdoc

- Product or platform teams manage external APIs and project knowledge.
- Backend maintainers publish OpenAPI and Markdown document versions.
- Frontend developers query endpoint detail, request bodies, response bodies, and diffs.
- Documentation maintainers use Draft and review flows for Markdown changes.
- Agent users connect MCP and Skill so Agents query Vdoc before writing code, doing migration analysis, or submitting Drafts.

## Core Objects

- Team: ownership boundary for a group of Projects.
- Project: documentation set for one product or service, with members and permissions.
- Document: OpenAPI or Markdown document. `document_type=1` means OpenAPI, `document_type=2` means Markdown.
- `relative_path`: stable Document identity, such as `apis/petstore.yaml` or `docs/runbook.md`. Display names can change, but `relative_path` should stay stable.
- Branch: work track for a Document. New Documents get `dev`, `test`, and protected `prod`; `feature/*` branches can also be created.
- Draft: reviewable content change. Writers or Agents can create and submit Drafts.
- Version: immutable published result created after approval.
- MCP Token: credential for Agent access to Vdoc MCP, created in Admin and stored in Agent environment variables or a secret manager.

## Roles

- SuperAdmin: system-level management and approval.
- Project Reader: reads published facts in a Project.
- Project Writer: uploads Drafts and submits them for review.
- Project Admin: approves, requests changes, or rejects Drafts.

## What v0.1 Can Do

- Manage Team, Project, Document, Branch, Draft, Review, Version, Diff, endpoint browsing, and MCP Token creation in Admin.
- Manage both OpenAPI and Markdown documents.
- Query published OpenAPI endpoints, fields, response shapes, diffs, and change summaries.
- Query published Markdown content and version diffs.
- Let Agents query published facts through MCP, or create, update, and submit Drafts.
- Use the Vdoc Skill to make Agents query Vdoc before integration, migration, or documentation changes.
- Complete the local loop with `scripts/vdoc-local-bootstrap.sh`, root `docker-compose.yml`, optional demo seed, live-compose E2E, and release dry-run.

## What v0.1 Does Not Do

- It does not let MCP publish Versions directly. Publishing requires Admin or SuperAdmin approval.
- It does not provide a CLI token store. Tokens live in local Agent config or a secret manager.
- It does not include invitation flow, notification bot, PR bot, full SDK, or code generation platform.
- It does not include commercial billing or full tenant administration.

## Correct Mental Model

1. Admin creates Team and Project.
2. A Project gets OpenAPI or Markdown Documents.
3. A Writer or Agent creates a Draft on a Branch.
4. Admin reviews the Draft and approval creates a Version.
5. A user creates an MCP Token.
6. Agent uses `@vdoc/mcp` to query Version, endpoint, diff, or Markdown content.
7. If the Agent needs to change content, it submits a Draft. It cannot publish directly.

Next, read [How It Works](en/how-it-works), then start the system with [Deployment Guide](en/deployment).
