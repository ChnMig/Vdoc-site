# Vdoc Site

Public marketing and documentation portal for Vdoc. It presents product concepts, deployment notes, API surfaces, MCP adapter setup, and Skill workflows as a lightweight multipage static site.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Vitest and Testing Library smoke tests
- Lightweight local i18n dictionary for English and Simplified Chinese
- Browser history and `popstate` based client-side routing, with no routing dependency

## Local Development

```sh
pnpm install
pnpm dev
```

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

The site uses a standalone public-facing paper system: ivory canvas, ink typography, subtle paper grain, folio cards, document tabs, and red-orange stamp accents. The public routes are `/`, `/concepts`, `/workflows`, `/docs`, `/docs/<doc-id>`, `/api`, and `/agents`; docs render as an index plus one article per document ID so long documentation can grow inside focused document routes.

The public site links to the project repository at <https://github.com/ChnMig/Vdoc>. It is not the authenticated management surface; that role belongs to `Vdoc-admin/`.

## Internationalization

All major portal and documentation copy is stored in `src/content.ts` with English and Simplified Chinese variants. The language switcher derives an initial language from `localStorage` or the browser locale, then persists the selected language client-side.
