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
pnpm workspace:package
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

The website serves the [Compose archive](https://vibe-doc.com/downloads/vdoc-compose-bootstrap-v0.3.tar.gz) and [SHA-256 file](https://vibe-doc.com/downloads/vdoc-compose-bootstrap-v0.3.tar.gz.sha256) under `/downloads/` (or `/Vdoc-site/downloads/` for the subpath build). CI generates both files from [workspace/](workspace/README.md) before content tests and includes them in the static site deployment. Generated downloads and website build outputs are ignored by Git. The archive contains the exact allowlist in [workspace-distribution.json](workspace/workspace-distribution.json), including only the `.env.example` template, with no real `.env` or repository checkouts.

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

Commit the updated `workspace/` sources after syncing. CI regenerates the downloads from that checkout; do not commit `.tar.gz`, `.sha256`, or the built site. For local content tests, download previews, and site builds, run `workspace:package` first and rerun it after changing workspace sources. The content tests compare every generated file with the export and reject tracked build outputs.

`workspace:package` requires Bash, Git, jq, tar (GNU or BSD), gzip, and shasum. It initializes a temporary workspace from the public locked refs, verifies all five checkouts, and invokes the strict package script before generating the two ignored files in `docs/public/downloads/`. Packaging requires network access and preserves the developer's checkouts. Subsequent VitePress builds copy those generated files into the site output.

## Automated Releases

[Site CI](.github/workflows/ci.yml) generates and tests the Compose download, builds the root site, and runs browser and performance checks. After those checks pass, `site:package` bundles the verified site and its downloads. Every successful run uploads a `site-distribution` Actions artifact containing four files:

- `vdoc-site-static.tar.gz` and its `.sha256`: extract this archive into the static hosting directory.
- `vdoc-compose-bootstrap-v0.3.tar.gz` and its `.sha256`: the same Compose download included in the site.

Pushing a Site tag named `vMAJOR.MINOR.PATCH` or `vMAJOR.MINOR.PATCH-prerelease` runs the same checks, then automatically creates a [GitHub Release](https://github.com/ChnMig/Vdoc-site/releases) with those verified artifacts and generated release notes. Prerelease tags create prereleases. The publish job downloads the exact CI artifacts, verifies their checksums, and uses the existing tag; it does not rebuild or overwrite an existing release. Ordinary branch pushes and pull requests upload Actions artifacts only, retained for 14 days.

The workflow publishes release downloads; deployment to the self-hosted website remains separate. The mutable website snapshot and each tagged release are distinct. The Compose archive retains the application commits in `workspace.lock.json`; a new Site tag alone does not upgrade Backend or Admin. See [RELEASE_DEPLOY.md](workspace/RELEASE_DEPLOY.md) for application release checks.

The build budget reserves two files and 256 KiB for downloads. Page assets and shared JavaScript/CSS retain their existing limits; browsers fetch the archive only when a reader downloads it.

Serve `.tar.gz` downloads as `application/gzip` without `Content-Encoding: gzip` on the production static host, so browsers retain the archive bytes. VitePress's local preview marks `.gz` files as HTTP gzip; use the documented `curl -fLO` commands to check its original bytes. After deploying, verify the public archive against its checksum before announcing availability.

Use explicit `.md` paths for authored links between Markdown documents so they work on GitHub and VitePress. Use full repository URLs when linking to another repository; a parent-directory link cannot cross GitHub repository boundaries.

## Design Direction

The design system is documented in `DESIGN.md` and implemented in `docs/.vitepress/theme/custom.css`: lean VitePress help-center home pages, white documentation canvas, plain text navigation, blue brand actions, and default feature cards. Both locales lead from the product's value to a concrete workflow example, Docker Compose deployment, and a first published Markdown query. Advanced configuration and Admin AI follow the initial trial path.

The public site links to the project repository at <https://github.com/ChnMig/Vdoc>. It is not the authenticated management surface; that role belongs to `Vdoc-admin/`.

## Safety Boundary

Do not publish raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values in site docs, logs, screenshots, or examples.
