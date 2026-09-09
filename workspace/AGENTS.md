# Vdoc Workspace Notes

This workspace groups the Vdoc product repositories and distributable agent assets.

## Repository Boundaries

- `Vdoc/` is the backend service. Backend MCP API implementation, token lifecycle, persistence, config, tests, and backend runtime code belong here.
- `Vdoc-mcp/` is for the MCP files or package that users install into their agents. It should contain the installable agent-facing MCP distribution, not the backend service implementation.
- `Vdoc-skill/` is for the skill files or package that users install into their agents. It should contain the installable agent-facing skill distribution.
- `Vdoc-site/` is the public website for project introduction and marketing/docs pages.
- `Vdoc-admin/` is the authenticated product workbench and developer portal.

## Documentation Placement

Product-level PRD, design, roadmap, schema, and planning documents live at this workspace root. Backend-specific runtime docs, API references, tests, and implementation code stay inside `Vdoc/`.

## Impeccable Design Context

Impeccable frontend context is intentionally split by surface. Run Impeccable from `Vdoc-site/` for the public marketing/docs site, or from `Vdoc-admin/` for the authenticated product workbench. From the workspace root, set `IMPECCABLE_CONTEXT_DIR=Vdoc-site` or `IMPECCABLE_CONTEXT_DIR=Vdoc-admin` before invoking Impeccable; do not add a root `PRODUCT.md` unless creating a separate workspace-level design context on purpose.
