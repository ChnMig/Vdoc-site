# Design

## Surface

Vdoc-site is a docs-only VitePress portal. The root `/` is the Simplified Chinese help home, and `/en/` is the English help home. Topic pages stay in VitePress Markdown under matching Chinese and English slugs.

## Visual Contract

Match the lean help-center style captured from `https://help.router-for.me/`: plain text VitePress nav, white background, left-aligned hero, compact CTA row, and a three-card `VPFeature` strip. The site should feel like default VitePress documentation that has been carefully configured, not like a custom marketing app.

Physical scene: a platform engineer opens Vdoc docs beside an Admin session and an Agent terminal during daytime setup work. The page is bright, quiet, and fast to scan because the task is choosing the next trusted documentation step.

## Color Tokens

All color customization uses VitePress theme variables in `docs/.vitepress/theme/custom.css`.

- Brand blue: `#3451b2` for links, primary actions, and the Vdoc hero name.
- Hover blue: `#3f63c7` for active navigation and hover states.
- Solid accent blue: `#5c73d6` for VitePress brand tier 3 and default-theme solid accent surfaces.
- Active blue: `#2b459a` for pressed primary-action backgrounds and borders.
- Soft blue: `rgba(52, 81, 178, 0.14)` for VitePress soft brand fields and selected surfaces.
- Selection blue: `rgba(52, 81, 178, 0.16)` for browser text selection.
- Code language label, light: `#5f5f66` on VitePress code background `#f6f6f7`, measured at `5.86:1`.
- Code language label, dark: `#a6a6ad` on VitePress dark code background `#161618`, measured at `7.47:1`.
- Light Shiki red override: `#c12a3a` replaces only generated light token `#D73A49` on `#f6f6f7`, measured at `5.31:1`; the generated dark token remains unchanged.
- Light Shiki comment override: `#666f79` replaces only generated light token `#6A737D` on `#f6f6f7`, measured at `4.73:1`; the generated dark token remains unchanged.
- Background: VitePress white defaults.
- Text, borders, remaining code syntax, code surfaces, feature cards, navigation, and sidebars: VitePress default theme values.

No custom hero background, no decorative gradient, no custom color-token namespace, and no dark or green article-home direction.

## Typography

Use default VitePress typography, which follows system and Inter-like documentation conventions without external font loading. Do not define custom font stacks. Preserve VitePress heading scale, home hero sizing, body rhythm, code typography, and CJK fallback behavior.

## Layout

- Home pages use only VitePress `layout: home` frontmatter with `hero`, three `actions`, and three `features`.
- Desktop follows the captured reference: 64px navigation, left-aligned content near the default VitePress gutter, a concise hero, and three feature columns.
- Tablet keeps the three-feature strip when space allows.
- Mobile uses VitePress hamburger navigation, wrapped CTA buttons, and stacked feature cards.
- There are no extra custom home sections beyond the hero/actions/features structure.

## Components And States

- UI primitives are VitePress default theme components: `VPNav`, `VPButton`, `VPFeature`, `VPDoc`, sidebar, local search, outline, footer, and social link.
- The nav title is plain text; `themeConfig.logo` is intentionally absent.
- Primary actions use the VitePress brand button with the blue brand variable.
- Secondary actions use VitePress alternate buttons.
- Feature cards use default `VPFeature` treatment.
- Motion and focus states stay with VitePress defaults; do not add hover transforms or custom runtime behavior.

## Vdoc Semantics

The home copy must keep the trust loop concrete in both locales: human-reviewed facts / 人工复核事实, Draft, Version, Diff, MCP Token, Skill, and Admin. Agents are described as reading approved facts through MCP and Skill workflows, while publishing remains a human/Admin responsibility.

## Accessibility

- Primary persona: technical readers scanning shell and API examples while moving between documentation, Admin, and an Agent terminal.
- Keyboard users need the framework-owned skip link, navigation, sidebar, and local-search focus behavior to remain intact. Low-vision readers need WCAG AA contrast in compact code labels and syntax without a typography or layout redesign.
- Root locale is `zh-CN`; `/en/` uses `en` through VitePress locales.
- Use semantic VitePress home data rather than custom HTML so landmarks, links, focus, responsive navigation, and local search stay framework-owned.
- Maintain WCAG AA contrast with blue `#3451b2` on white and VitePress default text colors.
- Measured overrides are scoped to `--vp-code-lang-color` in light/dark themes and the generated light Shiki `#D73A49` and `#6A737D` tokens. They do not alter code layout, font sizing, wrapping, or dark-theme syntax.
- Browser verification uses dev-only `@playwright/test` and `@axe-core/playwright`. They add no production runtime or UI dependency.
- No critical or serious accessibility debt is accepted; browser axe checks must report zero serious or critical WCAG A/AA violations.
- Keep examples free of real JWT, MCP Token, DB password, storage secret, or `Authorization` header values.

## Non-Goals

- No custom app runtime or additional runtime/UI dependency.
- No external fonts, image assets, utility CSS layer, legacy docs route layer, or extra runtime dependencies.
- No generic SaaS landing sections, metrics bands, screenshots, diagrams, or bespoke cards outside VitePress home frontmatter.
