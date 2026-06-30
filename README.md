# Vdoc Site

Docs-only VitePress site for Vdoc. The site is the public documentation surface for people evaluating, installing, operating, and integrating Vdoc.

## Stack

- VitePress default theme with a small custom theme extension.
- TypeScript for VitePress config and tests.
- Vitest structure tests.
- ESLint and Prettier quality gates.

## Routes

- `/`: Simplified Chinese documentation landing page.
- `/en/`: English documentation landing page.
- Topic pages use matching slugs in both locales, for example `/deployment` and `/en/deployment`.

Required topic slugs are `product-overview`, `how-it-works`, `version-notes`, `deployment`, `admin-usage`, `api-reference`, `changelog`, `mcp-tools`, `skill-workflows`, `release-rollback`, and `troubleshooting`.

## Local Development

```sh
pnpm install
pnpm dev
```

## Verification

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

## Content Sources

The documentation is grounded in the workspace product and backend documents:

- `../PRD.md`
- `../IMPLEMENTATION_PLAN.md`
- `../IMPROVEMENTS.md`
- `../PILOT_RUNBOOK.md`
- `../RELEASE_DEPLOY.md`
- `../Vdoc/README.md`
- `../Vdoc/docs/api/API.md`
- `../Vdoc-mcp/README.md`
- `../Vdoc-skill/README.md`
- `../Vdoc-skill/SKILL.md`

## Design Direction

The design system is documented in `DESIGN.md` and implemented in `docs/.vitepress/theme/custom.css`: light reading canvas, near-black text, restrained green accent, subtle borders, documentation-grade whitespace, bilingual CJK-safe typography, and accessible focus states.

The public site links to the project repository at <https://github.com/ChnMig/Vdoc>. It is not the authenticated management surface; that role belongs to `Vdoc-admin/`.

## Safety Boundary

Do not publish raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values in site docs, logs, screenshots, or examples.
