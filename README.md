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
pnpm workspace:package --candidate
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

The website serves the [Compose archive](https://chnmig.github.io/Vdoc-site/downloads/vdoc-compose-bootstrap-v0.2.1.tar.gz) and [SHA-256 file](https://chnmig.github.io/Vdoc-site/downloads/vdoc-compose-bootstrap-v0.2.1.tar.gz.sha256) under `/downloads/` (or `/Vdoc-site/downloads/` for the subpath build). CI generates both files from [workspace/](workspace/README.md) before content tests and includes them in the static site deployment. Generated downloads and website build outputs are ignored by Git. The archive contains the exact allowlist in [workspace-distribution.json](workspace/workspace-distribution.json), including only the `.env.example` template, with no real `.env` or repository checkouts.

Maintain planning documents at the original workspace root, then run from Vdoc-site:

```sh
pnpm workspace:sync
pnpm workspace:check
pnpm workspace:package --candidate
pnpm test:content
pnpm build:root
pnpm check:budget
```

`workspace:sync` copies only the manifest's files, preserves executable modes, updates the exported lock's control-plane digest, and normalizes Site's own commit to `@release`. Other repository refs and commits remain pinned. `workspace:check` checks the exported inventory and digest; when the original workspace is present, it also detects source drift. Standalone Site clones can validate the committed export without the parent workspace.

Commit the updated `workspace/` sources after syncing. CI regenerates the downloads from that checkout; do not commit `.tar.gz`, `.sha256`, or the built site. For local content tests, download previews, and site builds before tag publication, run `workspace:package --candidate` first and rerun it after changing workspace sources. The content tests compare the generated files with the export, validate the resolved Site commit, and reject tracked build outputs. The source lock uses `@release` for Site to avoid embedding its own commit hash; published downloads always contain five exact commit hashes.

`workspace:package` requires Bash, Git, jq, tar (GNU or BSD), gzip, and shasum. It initializes a temporary workspace from the public locked refs, verifies all five checkouts, and invokes the strict package script before generating the two ignored files in `docs/public/downloads/`. Published packaging requires all five `v0.2.1` tags, verifies their exact commits, and preserves the developer's checkouts. `--candidate` performs no remote lookup, marks the archive as non-deployable, and is rejected by the initializer and `site:package`. Subsequent VitePress builds copy those generated files into the site output.

## Automated Releases

[Site CI](.github/workflows/ci.yml) generates and tests the Compose download, builds the root site, and runs browser and performance checks. After those checks pass, `site:package` bundles the verified site and its downloads. Every successful tag run uploads a `site-distribution` Actions artifact containing four files:

- `vdoc-site-static.tar.gz` and its `.sha256`: extract this archive into the static hosting directory.
- `vdoc-compose-bootstrap-v0.2.1.tar.gz` and its `.sha256`: the same Compose download included in the site.

Pushing a Site tag named `vMAJOR.MINOR.PATCH` matching the package and Compose manifest version runs the same checks, then automatically creates a [GitHub Release](https://github.com/ChnMig/Vdoc-site/releases) with those verified artifacts and generated release notes. The publish job downloads the exact CI artifacts, verifies their checksums, and uses the existing tag; it does not rebuild or overwrite an existing release. Ordinary branch pushes and pull requests validate marked candidates and do not upload deployable distribution artifacts. Tag distribution artifacts are retained for 14 days.

After a stable tag release succeeds, CI calls [the Pages workflow](.github/workflows/pages.yml) to deploy the public website to https://chnmig.github.io/Vdoc-site/. Branch pushes, pull requests, and prerelease tags do not deploy the website. The Compose archive resolves the Site `@release` marker and retains the other four reviewed commits in `workspace.lock.json`. Push their matching version tags first, then the Site tag; mismatched or missing tags stop publication. See [RELEASE_DEPLOY.md](workspace/RELEASE_DEPLOY.md) for application release checks.

### GitHub Pages

In repository **Settings → Pages**, choose **GitHub Actions** as the build source and leave the custom domain empty. The public site uses `/Vdoc-site/`; GitHub provides the domain and HTTPS. Backend and Admin are deployed separately.

Stable `vMAJOR.MINOR.PATCH` tag pushes run the release checks and publish the GitHub Release before starting Pages. The Pages job checks out that tag, downloads its published Compose archive and checksum, rejects candidate or mismatched source locks, and runs the content, browser, and performance checks against `pnpm build:pages`. It uploads and deploys that exact verified output. The publishing job alone receives Pages write and OIDC permissions; no personal token is stored in the repository.

Before building, the deployment tools replace the former `https://vibe-doc.com/` website origin in Markdown with the GitHub Pages origin. This also adapts older releases such as `v0.1.0`, so download links and command examples keep working after the old host is retired. The rewrite occurs only in the temporary deployment checkout, before formatting, content, browser, and performance checks; the published Compose archive and Git tags are unchanged.

The workflows are connected directly because a Release created with the workflow's `GITHUB_TOKEN` does not trigger a separate `release` event workflow. Keep the `needs: [verify, release]` dependency when editing CI.

For first-time setup with an already published version, or to rebuild and verify an older stable version, run **Actions → Publish release to GitHub Pages → Run workflow** on `main` and enter its tag, for example `v0.1.0`. This accepts existing stable Releases only and does not create or move a tag. A previously published tag keeps its original source and documentation. Manual builds receive the same Pages checks as automatic deployments. To retry a deployment while its verified artifact is retained, rerun the failed deployment job; retained Pages artifacts expire after 14 days.

The build budget reserves two files and 256 KiB for downloads. Page assets and shared JavaScript/CSS retain their existing limits; browsers fetch the archive only when a reader downloads it.

When using another static host, serve `.tar.gz` downloads as `application/gzip` without `Content-Encoding: gzip`, so browsers retain the archive bytes. VitePress's local preview marks `.gz` files as HTTP gzip; use the documented `curl -fLO` commands to check its original bytes. After deploying, verify the public archive against its checksum before announcing availability.

Use explicit `.md` paths for authored links between Markdown documents so they work on GitHub and VitePress. Use full repository URLs when linking to another repository; a parent-directory link cannot cross GitHub repository boundaries.

## Design Direction

The design system is documented in `DESIGN.md` and implemented in `docs/.vitepress/theme/custom.css`: lean VitePress help-center home pages, white documentation canvas, plain text navigation, blue brand actions, and default feature cards. Both locales lead from the product's value to a concrete workflow example, Docker Compose deployment, and a first published Markdown query. Advanced configuration and Admin AI follow the initial trial path.

The public site links to the project repository at <https://github.com/ChnMig/Vdoc>. It is not the authenticated management surface; that role belongs to `Vdoc-admin/`.

## Safety Boundary

Do not publish raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values in site docs, logs, screenshots, or examples.
