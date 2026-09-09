<p>
  <img src="docs/public/vdoc-logo.png" width="96" height="96" alt="Vdoc logo" />
</p>

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

The workspace root is not a Git repository. Public copies of its product documents and deployment resources are versioned in [workspace/](workspace/README.md); the original planning documents remain at the maintainer's workspace root.

- [Product PRD](workspace/PRD.md)
- [Implementation plan](workspace/IMPLEMENTATION_PLAN.md)
- [Database schema](workspace/DATABASE_SCHEMA.md)
- [Roadmap](workspace/IMPROVEMENTS.md) / [中文路线图](workspace/IMPROVEMENTS.zh-CN.md)
- [Pilot runbook](workspace/PILOT_RUNBOOK.md)
- [Release and rollback](workspace/RELEASE_DEPLOY.md)
- [Compose deployment](workspace/COMPOSE_DEPLOY.md), [docker-compose.yml](workspace/docker-compose.yml), and [.env.example](workspace/.env.example)
- [Backend README](https://github.com/ChnMig/Vdoc/blob/main/README.md) and [API reference](https://github.com/ChnMig/Vdoc/blob/main/docs/api/API.md)
- [MCP README](https://github.com/ChnMig/Vdoc-mcp/blob/main/README.md)
- [Skill README](https://github.com/ChnMig/Vdoc-skill/blob/main/README.md) and [SKILL.md](https://github.com/ChnMig/Vdoc-skill/blob/main/SKILL.md)

## Public Workspace Resources

The website serves the [Compose archive](docs/public/downloads/vdoc-compose-bootstrap-v0.3.tar.gz) and [SHA-256 file](docs/public/downloads/vdoc-compose-bootstrap-v0.3.tar.gz.sha256) under `/downloads/` (or `/Vdoc-site/downloads/` for the subpath build). Both files are included in the static site deployment. The archive contains the exact allowlist in [workspace-distribution.json](workspace/workspace-distribution.json), including only the `.env.example` template, with no real `.env` or repository checkouts.

Maintain planning documents at the original workspace root, then run from Vdoc-site:

```sh
pnpm workspace:sync
pnpm workspace:check
pnpm workspace:package
pnpm test:content
pnpm build:root
pnpm check:budget
```

`workspace:sync` copies only the manifest's files, preserves executable modes, and updates the exported lock's control-plane digest without changing its repository refs or commits. `workspace:check` checks the exported inventory and digest; when the original workspace is present, it also detects source drift. Standalone Site clones can validate the committed export without the parent workspace.

`workspace:package` requires Bash, Git, jq, tar, gzip, and shasum. It initializes a temporary workspace from the public locked refs, verifies all five checkouts, and invokes the existing strict package script before updating the two download files. It preserves the developer's checkouts. Packaging requires network access; normal site builds use the committed archive and do not clone repositories. Publish the source changes and deploy the new Site build before announcing the new links. The website snapshot is mutable; a formal immutable release follows [RELEASE_DEPLOY.md](workspace/RELEASE_DEPLOY.md).

The build budget reserves two files and 256 KiB for downloads. Page assets and shared JavaScript/CSS retain their existing limits; browsers fetch the archive only when a reader downloads it.

Serve `.tar.gz` downloads as `application/gzip` without `Content-Encoding: gzip` on the production static host, so browsers retain the archive bytes. VitePress's local preview marks `.gz` files as HTTP gzip; use the documented `curl -fLO` commands to check its original bytes. After deploying, verify the public archive against its checksum before announcing availability.

Use explicit `.md` paths for authored links between Markdown documents so they work on GitHub and VitePress. Use full repository URLs when linking to another repository; a parent-directory link cannot cross GitHub repository boundaries.

## Design Direction

The design system is documented in `DESIGN.md` and implemented in `docs/.vitepress/theme/custom.css`: lean VitePress help-center home pages, white documentation canvas, plain text navigation, blue brand actions, and default feature cards. Both locales lead from the product's value to a concrete workflow example, Docker Compose deployment, and a first published Markdown query. Advanced configuration and Admin AI follow the initial trial path.

The public site links to the project repository at <https://github.com/ChnMig/Vdoc>. It is not the authenticated management surface; that role belongs to `Vdoc-admin/`.

## Safety Boundary

Do not publish raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values in site docs, logs, screenshots, or examples.
