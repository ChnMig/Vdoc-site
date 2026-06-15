# Design

## Surface

Vdoc-site is the public marketing and documentation surface for Vdoc. It contains a Vite React portal with routes for `/`, `/concepts`, and `/workflows`, plus a Docsify documentation app under `public/docs/index.html` with English and Simplified Chinese content.

## Visual Direction

Use the existing restrained document-system identity: a living dossier, not a generic SaaS splash page. The current design uses warm archival paper, stamp-like accents, readable columns, sticky navigation, and product-model diagrams. Preserve the committed identity instead of introducing a new palette or trendy visual language.

## Color

Primary React tokens live in `src/index.css` and are exposed through Tailwind v4 `@theme inline`:

- `--canvas: oklch(0.91 0.032 82)` for the main archival backdrop.
- `--paper: oklch(0.98 0.018 88)` and `--paper-deep: oklch(0.94 0.036 83)` for document surfaces.
- `--ink: oklch(0.22 0.036 72)` for primary text.
- `--muted: oklch(0.46 0.04 72)` for secondary text; keep contrast at WCAG AA or darken toward `--ink`.
- `--stamp: oklch(0.55 0.16 34)` and `--stamp-strong: oklch(0.44 0.14 31)` for action and review-gate emphasis.
- `--brass` and `--sage` are supporting accents; use sparingly.

Docsify tokens live in `public/docs/vdoc-docs.css` and mirror the same system with `--vdoc-ink`, `--vdoc-muted`, `--vdoc-canvas`, `--vdoc-panel`, `--vdoc-accent`, and `--vdoc-accent-strong`.

## Typography

The brand uses a deliberate contrast between archival display serif and practical sans:

- Display: `Iowan Old Style`, `Palatino Linotype`, Georgia, serif.
- Sans: `Avenir Next`, `Gill Sans`, `Trebuchet MS`, sans-serif.
- Mono: `Berkeley Mono`, `SFMono-Regular`, Consolas, monospace.

Keep body copy in readable columns. Use balanced or pretty wrapping on headings and prose when changing layouts. Display letter spacing should stay at or above `-0.04em`; the docs stylesheet already uses `-0.03em` for `h1`.

## Layout

The React portal favors practical sticky navigation, max-width content, document-like panels, and responsive grids. Key structures include the brand lockup, language switcher, hero copy, archive preview, route index, feature cards, document pages, and workflow timeline. The Docsify app uses a left documentation sidebar and a narrow reading column.

Avoid turning every section into identical card grids. The current card and timeline patterns work because they map to product concepts and workflow order; new sections should earn their structure from the content.

## Components

- `SiteHeader` provides brand, nav, language switching, and repository handoff.
- `RouteRenderer`, `Home`, `Concepts`, `Workflows`, and `DocumentPage` are the main React surface patterns.
- `RouteCard`, `FeatureCard`, timeline items, and Docsify navigation are content affordances, not generic decoration.
- Documentation entry cards should point to concrete routes and preserve bilingual handoff behavior.

## Motion

Motion is restrained. `paper-rise` gives the hero and document panels a short 520ms entrance only inside `@media (prefers-reduced-motion: no-preference)`. Do not gate content visibility on animation. New motion should read as document material moving into place, not as generic landing-page choreography.

## Accessibility

Maintain WCAG 2.2 AA. Preserve the skip link, semantic header/nav/main/footer landmarks, `aria-current`, language switch labels, document language updates, keyboard focus visibility, and reduced-motion behavior. Placeholder and muted text must pass AA contrast on the archival surfaces.

## Implementation Notes

- Stack: Vite, React, TypeScript, Tailwind CSS v4, Vitest, Testing Library.
- Main style files: `src/index.css` for the React portal and `public/docs/vdoc-docs.css` for Docsify.
- Primary content source: `src/content.ts` plus Markdown files under `public/docs/`.
- Verify with `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm format:check` from `Vdoc-site/`.

## Follow-ups

Future polish should replace the thick side-accent border on timeline items with a less generic treatment, such as a full outline, numbered marker, or background tint that still preserves the workflow sequence.
