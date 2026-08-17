# Vdoc Site

Docs-only VitePress site for Vdoc. The site is the public documentation surface for people evaluating, installing, operating, and integrating Vdoc.

## Stack

- VitePress default theme with a small custom theme extension.
- TypeScript for VitePress config and tests.
- Vitest structure tests.
- Playwright and axe browser checks.
- ESLint and Prettier quality gates.

Development requires Node.js `>=22.13` and pnpm `11.6.0`.
Local browser checks use the installed Microsoft Edge Beta channel. CI installs only Playwright Chromium.

## Routes

- `/`: Simplified Chinese documentation landing page.
- `/en/`: English documentation landing page.
- Topic pages use matching slugs in both locales, for example `/deployment` and `/en/deployment`.

Required topic slugs are `product-overview`, `how-it-works`, `version-notes`, `deployment`, `admin-usage`, `admin-ai`, `api-reference`, `changelog`, `mcp-tools`, `skill-workflows`, `release-rollback`, and `troubleshooting`. Every topic is authored at both `/<slug>` and `/en/<slug>`.

## Local Development

```sh
pnpm install
pnpm dev
```

## Verification

```sh
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:content
pnpm test:browser:root
pnpm test:browser:pages
pnpm test:performance:root
pnpm test:performance:pages
```

`pnpm build:root` builds for `/`. `pnpm build:pages` builds for the GitHub Pages base `/Vdoc-site/`; navigation, local-search results, favicon, and generated assets stay inside the selected base. Both builds write to `docs/.vitepress/dist/`.

The performance suite runs with one Playwright worker so browser teardown and measurements remain deterministic across both base paths. Route, interaction, and accessibility checks keep their normal parallel execution.

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

The design system is documented in `DESIGN.md` and implemented in `docs/.vitepress/theme/custom.css`: lean VitePress help-center home pages, white documentation canvas, plain text navigation, blue brand actions, default feature cards, and Vdoc trust-loop nouns in both locales.

The public site links to the project repository at <https://github.com/ChnMig/Vdoc>. It is not the authenticated management surface; that role belongs to `Vdoc-admin/`.

## Safety Boundary

Do not publish raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values in site docs, logs, screenshots, or examples.
