# Design

## Surface

Vdoc-site is the public marketing and documentation surface for Vdoc. It contains a Vite React portal with routes for `/`, `/concepts`, and `/workflows`, plus a Docsify documentation app under `public/docs/index.html` with English and Simplified Chinese content.

## Visual Direction

Use the Review Ledger Field Manual direction: a dark graphite review field with pale ledger/document artifacts laid over it. The site should feel like a platform engineer opening a release binder before agents are allowed to consume production-facing documentation. The hero reads as a manual cover and review desk, the document preview reads as a real version/diff dossier, the trust loop reads as a connected control process, and docs/guide paths read as index rows in a field manual. Avoid dense dashboards, abstract maps, route tables, generic SaaS purple, glass decoration, gradient text, decorative stripes, and identical icon-card grids.

## Color

Primary React tokens live in `src/index.css` and are exposed through Tailwind v4 `@theme inline`:

- `--canvas` is the dark graphite review field used behind the public portal.
- `--surface` is the pale ledger sheet color for dossiers, path rows, articles, and docs surfaces.
- `--surface-strong` and `--surface-tint` are graphite-toned panels used for manual cover blocks and connected process fields.
- `--ink` is pale text on graphite; `--paper-ink` is the primary text color on ledger sheets; `--muted` and `--paper-muted` remain AA-safe supporting text colors.
- `--review`, `--publish`, and `--query` mark review stamp, sealed version, and agent lookup moments in the document journey.
- `--stamp`, `--stamp-strong`, and `--field` create the red review-stamp language without resorting to generic warning colors.
- `--line` and `--line-strong` provide quiet graphite/ledger boundaries for navigation, sequence rows, and documentation paths.
- `--shadow-field` is the only large depth token and is reserved for the main document dossier; other separation should use borders, tonal shifts, or grid placement.

Docsify tokens live in `public/docs/vdoc-docs.css` and mirror the same graphite field, pale ledger sheet, review stamp, and index-row language.

## Typography

The brand uses a bilingual-friendly technical manual stack:

- Display: `DIN Condensed`, `DIN Alternate`, `Arial Narrow`, `Noto Sans SC`, `Source Han Sans SC`, sans-serif.
- Sans: `Avenir Next`, `Noto Sans SC`, `Source Han Sans SC`, `PingFang SC`, system-ui, sans-serif.
- Mono: `Berkeley Mono`, `SFMono-Regular`, `SF Mono`, Consolas, monospace.

Keep body copy in readable columns. Use balanced wrapping on headings and pretty wrapping on long prose. Display letter spacing stays above `-0.04em`. Use mono for ledger metadata, path coordinates, version IDs, and stamp-like short labels only, not as a generic developer costume.

## Layout

The React portal is a Review Ledger Field Manual:

- `GuideHome` arranges the home route as a dark manual-cover hero, visual document dossier, connected trust loop, route handoffs, and docs path index.
- `IntroHero` makes the public value proposition immediate and keeps the Docs, API reference, and GitHub CTAs above the fold without generic SaaS hero metrics.
- `DocumentSheet` renders a pale ledger/diff dossier with review stamp, immutable version metadata, semantic diff line, and source tags.
- `DocumentJourney` preserves the `Draft -> Human review -> Immutable Version -> Diff -> MCP / Skill query` labels while presenting them as an uneven connected process, not five equal cards.
- `GuidePaths` keeps `.route-card` anchors for documentation entrypoints, but renders them as dense index rows with path numbers, intent labels, and row cues.
- `ConceptsGuide` explains the concrete Vdoc product concepts as manual articles with ledger metadata.
- `WorkflowGuide` presents the operating flow as an ordered procedure with a visible sequence rail.
- `HelpfulNotFound` gives a short explanation plus direct links back to Home and Docs.

Reusable patterns:

- `.document-sheet` is the dossier artifact and may use `--shadow-field`; nested generic cards are not allowed inside it.
- `.trust-loop` is a connected process rail; each `.trust-loop-step` may vary in span and tone to show control flow weight.
- `.route-card` is an index row, not a card. It must preserve the class for tests/docs contracts.
- `.guide-route`, `.concept-article`, and `.workflow-step` use ledger rows and ruled article sections rather than equal card grids.

## Interaction

- React navigation remains limited to `/`, `/concepts`, and `/workflows`; retired `/api` and `/agents` paths resolve to the helpful not-found route.
- Docs links route to English `/docs/index.html#/en/...` and Chinese `/docs/index.html#/...`, with the Chinese overview at `/docs/index.html`.
- The language switcher persists `vdoc-site-language`, updates `document.documentElement.lang`, and refreshes the document title/meta description.
- The header keeps `.nav-link` for normal navigation and `.nav-link-github` for the repository link.
- Hover and focus states should feel like a physical ledger row being selected: tonal shift, small transform, and visible focus outline. Reduced motion collapses transforms and animations.

## Accessibility

Maintain semantic landmarks, skip link, visible focus states, keyboard-safe custom navigation, high-contrast text, and reduced-motion-safe transitions. The public site should remain readable in both English and Simplified Chinese on narrow mobile screens without horizontal overflow.
