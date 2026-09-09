# Vdoc brand artwork

`vdoc-original.png` is the designer-supplied artwork, retained unchanged from the owner's `Vdoc.png` on 2026-09-09. Keep its shape, transparent background, blue document body, and cyan folded corner.

The shipped exports remove only near-transparent export noise (alpha at or below 16), crop the visible mark with a 4px guard, and center it on an 855px transparent square. The visible source bounds are `(261, 252, 996, 1059)`; the crop before centering is `(257, 248, 1000, 1063)`. Resize with Lanczos and save optimized PNGs with a 256-color RGBA palette:

- `docs/public/vdoc-logo.png`: 256 × 256, used by the site navigation and README.
- `docs/public/favicon.png`: 64 × 64, used by browser tabs.

The Admin repository carries the same exports under `public/images/`. Workspace, Backend, MCP, and Skill READMEs carry the same logo under their own `assets/` directories so each repository and its distributed README can render independently. Do not substitute a traced or recolored approximation.
