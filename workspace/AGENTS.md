# Vdoc Workspace Notes

This workspace groups the Vdoc product repositories and distributable agent assets.

## Repository Boundaries

- `Vdoc/` is the backend service. Backend MCP API implementation, token lifecycle, persistence, config, tests, and backend runtime code belong here.
- `Vdoc-mcp/` contains the installable MCP adapter and its companion Skill at `skills/vdoc/`. They share one package, version, test suite, and release. Backend service implementation stays in `Vdoc/`.
- `Vdoc-skill/`, if present in an older local workspace, is a legacy checkout. Its history has been imported into `Vdoc-mcp/`; do not use it as an active source or release dependency.
- `Vdoc-site/` is the public website for project introduction and marketing/docs pages.
- `Vdoc-admin/` is the authenticated product workbench and developer portal.

## Documentation Placement

Product-level PRD, design, roadmap, schema, and planning documents live at this workspace root. Backend-specific runtime docs, API references, tests, and implementation code stay inside `Vdoc/`.

## Impeccable Design Context

Impeccable frontend context is intentionally split by surface. Run Impeccable from `Vdoc-site/` for the public marketing/docs site, or from `Vdoc-admin/` for the authenticated product workbench. From the workspace root, set `IMPECCABLE_CONTEXT_DIR=Vdoc-site` or `IMPECCABLE_CONTEXT_DIR=Vdoc-admin` before invoking Impeccable; do not add a root `PRODUCT.md` unless creating a separate workspace-level design context on purpose.
