# Vdoc Site

Public marketing and documentation portal for Vdoc. It presents product concepts, deployment notes, API surfaces, MCP adapter setup, and Skill workflows for visitors.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Vitest and Testing Library smoke tests
- Lightweight local i18n dictionary for English and Simplified Chinese

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
- `../Vdoc/README.md`
- `../Vdoc/docs/api/API.md`
- `../Vdoc-mcp/README.md`
- `../Vdoc-skill/README.md`
- `../Vdoc-skill/SKILL.md`

## Design Direction

The site uses a standalone public-facing design system: dark editorial panels, amber/aqua contract highlights, ledger-like documentation cards, and a document observatory hero. It is not a management surface and does not link visitors into self-hosted operations UI.

## Internationalization

All major portal and documentation copy is stored in `src/content.ts` with English and Simplified Chinese variants. The language switcher derives an initial language from `localStorage` or the browser locale, then persists the selected language client-side.
