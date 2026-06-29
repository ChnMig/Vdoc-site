# Vdoc Site

Public marketing portal for Vdoc plus a Chinese-first standalone Docsify documentation app. The React site presents the home page, product concepts, and workflows; user-facing setup, full Compose deployment, first use, API reference, MCP tools, Skill workflows, upgrades, and troubleshooting are handed off to `/docs/index.html` as static Docsify content.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Vitest and Testing Library smoke tests
- Lightweight local i18n dictionary for English and Simplified Chinese
- Browser history and `popstate` based client-side routing, with no routing dependency
- Chinese-first Docsify under `public/docs` for the documentation site, with English routes under `/docs/index.html#/en/...`
- The marketing site/docs are deployed separately by the Vdoc maintainers; user Docker Compose deployments cover backend API and Admin, not this site.

## Local Development

```sh
pnpm install
pnpm dev
```

## Workspace Local Closure

The public docs describe the same local path as the root runbooks. From the workspace root:

```sh
scripts/vdoc-local-bootstrap.sh
docker compose --env-file .env up -d --build
cd Vdoc && go run ./tools/vdoc-demo-seed
```

The demo seed is optional. For live E2E against the root Compose stack:

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not reset the application database from `VDOC_POSTGRES_DB`.

Use the release dry-run as the local gate:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

Do not publish raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values in site docs, logs, screenshots, or examples. The dry-run does not publish or deploy the public site.

## Verification

```sh
pnpm lint
pnpm test
pnpm build
pnpm format:check
```

## Content Sources

The site content is grounded in the workspace product and backend documents:

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

The React site uses a restrained document system with readable content columns and practical sticky navigation. The public React routes are `/`, `/concepts`, and `/workflows`; `/docs/index.html` and Docsify hash routes such as `/docs/index.html#/api-reference`, `/docs/index.html#/mcp-tools`, and `/docs/index.html#/skill-workflows` are served by the static Docsify app.

The documentation app lives in `public/docs/` and is copied to `dist/docs/` by Vite. It includes `index.html`, `.nojekyll`, `_sidebar.md`, `_navbar.md`, `README.md`, and bilingual Markdown pages for product overview, how Vdoc works, changelog, version notes, deployment, first use, API reference, MCP tools, Skill workflows, upgrade/rollback, and troubleshooting. `/docs/index.html` opens the Chinese product overview directly, Docsify uses Chinese hash routes such as `/docs/index.html#/deployment` and English hash routes such as `/docs/index.html#/en/deployment`, loads localized sidebars plus the return-to-site button, and includes a localized per-page Markdown copy button that copies only the currently displayed Markdown file.

The public site links to the project repository at <https://github.com/ChnMig/Vdoc>. It is not the authenticated management surface; that role belongs to `Vdoc-admin/`.

## Internationalization

All major portal and documentation copy is stored in `src/content.ts` with English and Simplified Chinese variants. The language switcher derives an initial language from `localStorage` or the browser locale, then persists the selected language client-side. English portal documentation links point to `/docs/index.html#/en/product-overview` and matching `/en/<slug>` docs routes; Chinese links keep `/docs/index.html` as the default product overview and use Chinese hash routes for individual topics.
