# Design

## Surface

Vdoc-site is now a docs-only VitePress site. The root `/` is the Simplified Chinese documentation entry, and `/en/` is the English documentation entry. There is no separate marketing portal, legacy documentation runtime, or client-side route layer.

## Visual Direction

Use a light reading canvas for technical teams evaluating, installing, and operating Vdoc. The page should feel like a precise hosted documentation product: fast to scan, comfortable for long reading, bilingual, and explicit about the human review boundary. The visual reference is documentation-as-product in the Mintlify family, adapted for Vdoc with quieter whitespace and a restrained green accent.

Physical scene: a platform engineer is reading setup instructions beside a running terminal in a bright office, moving between Chinese and English pages while checking exact commands. The design is light because the task is sustained reading and command copying, not spectacle.

## Color Tokens

All visual color lives in `docs/.vitepress/theme/custom.css` as semantic VitePress variables.

- `--vp-c-bg`: light reading canvas, near white with a faint green cast.
- `--vp-c-bg-alt`: sidebar and navigation surface.
- `--vp-c-bg-elv`: elevated documentation surface.
- `--vp-c-bg-soft`: inline code and quiet callout surface.
- `--vp-c-text-1`: near-black primary text.
- `--vp-c-text-2`: body and secondary copy.
- `--vp-c-text-3`: tertiary labels and metadata.
- `--vp-c-border` and `--vp-c-divider`: subtle documentation borders.
- `--vp-c-brand-1`, `--vp-c-brand-2`, `--vp-c-brand-3`: restrained green accent ramp for links, focus, and selected state.
- `--vp-c-brand-soft`: pale green selection and hover field.
- `--vdoc-focus-ring`: accessible green focus outline.

Color strategy is restrained: near-black text, white and off-white surfaces, subtle borders, and green below 10% of the page. No purple SaaS gradients, decorative glass, dark panels, or heavy shadows.

## Typography

The documentation uses a CJK-safe system stack rather than remote fonts:

- Base: `Avenir Next`, `Noto Sans SC`, `Source Han Sans SC`, `PingFang SC`, `system-ui`, sans-serif.
- Mono: `SFMono-Regular`, `SF Mono`, `ui-monospace`, `Consolas`, monospace.

Rules:

- Body copy targets 65-72 characters per line through the VitePress content container.
- Headings use balanced wrapping, near-black text, and restrained negative tracking no tighter than `-0.025em`.
- Body, list, and table text use generous line height for bilingual reading.
- Mono is reserved for code, commands, environment variables, paths, and technical identifiers.

## Layout

The site uses the official VitePress default theme with a small theme extension only:

- Source tree: `docs/.vitepress/config.ts`, `docs/.vitepress/theme/index.ts`, `docs/.vitepress/theme/custom.css`, `docs/index.md`, `docs/en/index.md`.
- Navigation stays compact: docs home, deployment, API, MCP, language link, and GitHub social link.
- Sidebars come from the former Markdown sidebar structure and are grouped as Understand, Follow, Reference, and Operate in both locales.
- Root Chinese docs and `/en/` English docs preserve matching slugs for every topic.
- Tables, code blocks, sidebars, and page outlines keep documentation-grade whitespace instead of card-heavy marketing sections.

## Components And States

- VitePress `VPNav`, `VPSidebar`, `VPDoc`, `VPButton`, `VPFeature`, local search, outline, and doc footer are the only UI primitives.
- Links use the green ramp and visible underline behavior.
- Buttons use near-black fills for primary actions and subtle border treatment for secondary actions.
- Code blocks use a dark code surface only inside fenced code, while the page itself remains light.
- Focus states use a 3px green outline with offset on every keyboard-focusable element.
- Motion is limited to small hover transforms on buttons and VitePress default transitions, with `prefers-reduced-motion` disabling transitions.

## Accessibility

- The root locale is `zh-CN`; English pages set `lang="en"` through VitePress locales.
- Text contrast targets WCAG AA or better: near-black text on a light canvas, darker green for links, and visible focus outlines.
- The theme preserves semantic headings, skip navigation, keyboard sidebars, local search, and screen-reader labels provided by VitePress.
- Documentation copy avoids secrets in examples and keeps command blocks readable on narrow screens.

## Non-Goals

- No React public app.
- No legacy hash-route runtime, copy-button scripts, or compatibility shims.
- No separate `/concepts` or `/workflows` marketing routes outside normal VitePress docs pages.
- No inherited dark presentation, document-artifact metaphors, approval-mark motifs, or manual-cover styling.
