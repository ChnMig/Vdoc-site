# Upgrade and Rollback

This page is for users already running Vdoc. The goal is to back up data before upgrades, verify backend, Admin, MCP, and Skill after upgrades, and return to the previous version if something fails.

## Before Upgrading

- Know the currently running source version, image tag, or build source.
- Keep the current `.env`, but never paste real secrets into issues, chat, or release notes.
- Confirm PostgreSQL and object storage are reachable.
- Record the current Admin URL, backend health URL, Agent MCP config, Site URL, source SHA, workflow run ID, static-artifact identifier/checksum, deployment base path, and QA report references.
- Use a maintenance window so users are not submitting Drafts during restart.
- Before a local upgrade, inspect and run the local release gate:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

The release dry-run runs local checks only. It does not publish packages, deploy services, push images, or create git refs.

## 1. Back Up PostgreSQL

Full Compose example:

```sh
mkdir -p backups
docker compose --env-file .env exec -T postgres \
  sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > backups/vdoc-$(date +%Y%m%d%H%M%S).sql
```

If you use external PostgreSQL, use the provider snapshot flow or `pg_dump`. Do not upgrade production or long-running pilots before you know the backup can be restored.

## 2. Back Up Object Storage

RustFS or S3 compatible storage keeps raw and normalized document objects. Before upgrading, keep a bucket snapshot or copy the bucket contents.

Full Compose uses the `rustfs-data` named volume, which can be backed up with infrastructure-level snapshots. For external storage, use provider bucket versioning, snapshots, replication, or object copy tools.

Do not print storage access keys or secret keys in backup script logs.

## 3. Pull or Build the New Version

If you use the workspace root Compose package, run from the workspace root:

```sh
docker compose --env-file .env config --quiet
docker compose --env-file .env pull
docker compose --env-file .env up -d --build
```

For a fresh disposable local environment, run `scripts/vdoc-local-bootstrap.sh` first to create `.env`. Do not overwrite an existing upgrade environment just to run the upgrade. The current root Compose builds app services from local `./Vdoc` and `./Vdoc-admin`. `pull` mainly pulls base images such as `postgres`, `rustfs`, `caddy`, and `node`; app updates come from your current workspace content.

If you deploy components directly, rebuild and publish each one:

```sh
cd Vdoc
make build
```

```sh
cd Vdoc-admin
pnpm install --frozen-lockfile
pnpm build
```

If Site is deployed below `/Vdoc-site/`, the candidate must use the Pages-compatible base build and verify the same output before upload:

```sh
cd Vdoc-site
pnpm install --frozen-lockfile
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:content
pnpm build:pages
pnpm check:budget
PLAYWRIGHT_BASE_PATH=/Vdoc-site/ pnpm test:browser
PLAYWRIGHT_BASE_PATH=/Vdoc-site/ pnpm test:performance
```

The artifact path is `docs/.vitepress/dist/` inside the repository, or `Vdoc-site/docs/.vitepress/dist/` from the workspace root. Do not rebuild after the browser and performance gates pass; retain its checksum and deploy that exact output through the operator-owned static-hosting process. The current repository workflow verifies only the self-hosted `/` base: it does not upload an artifact, configure GitHub Pages, or deploy. The workspace release dry-run verifies `/Vdoc-site/` compatibility.

Test MCP and Skill packages before upgrading them:

```sh
cd Vdoc-mcp
npm ci
npm test
```

```sh
cd Vdoc-skill
npm ci
npm test
```

## 4. Wait for Migrations and Health

When `VDOC_DATABASE_ENABLED=true`, backend runs migrations at startup. Do not restart repeatedly or delete the database while migrations run. Watch backend logs:

```sh
docker compose --env-file .env logs -f backend
```

Check container status:

```sh
docker compose --env-file .env ps
```

Check health:

```sh
curl http://127.0.0.1:8080/api/v1/open/health
curl -I http://127.0.0.1:8081/
```

If you changed `.env` host ports, replace the ports in these commands. In deployed environments, use your backend and Admin domains.

## 5. Post-Upgrade Verification

1. Admin can log in.
2. `GET /api/v1/private/identity/me` succeeds with raw JWT `Authorization`, no `Bearer` prefix.
3. Existing Project, Document, Draft, Version, and Diff pages open.
4. A test Draft can still move through review.
5. MCP `tools/list` succeeds, and at least one read-only tool call succeeds.
6. An Agent using the Skill queries Vdoc MCP before answering endpoint or Markdown questions.
7. Follow [Admin AI](admin-ai) to run a system or project provider test, submit a test Draft, and confirm Draft/Version summaries and page chat work.
8. With a disabled test prompt or unavailable provider, confirm the AI result is `skipped` or `failed` while machine Diff, human review, and publishing still work.
9. Check that AI audit data contains no raw API keys, JWTs, MCP Tokens, `Authorization` headers, or secrets embedded in prompts; prompt override, summary, and chat records remain available as defined by the product.
10. If local root Compose is available, live E2E passes:

    ```sh
    cd Vdoc
    ./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
    ./scripts/vdoc-e2e.sh live-compose --env-file ../.env
    ```

    Live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not reset the application database from `VDOC_POSTGRES_DB`.

11. If `/Vdoc-site/` is the selected base, check `/Vdoc-site/`, `/Vdoc-site/en/`, `/Vdoc-site/admin-ai`, `/Vdoc-site/en/admin-ai`, `/Vdoc-site/release-rollback`, and `/Vdoc-site/en/release-rollback`. Navigation, scripts, styles, fonts, and the favicon must stay under that base instead of resolving to broken root-level assets.

## Rollback Strategy

If backend health fails or a core workflow is unusable after upgrade, stop additional writes first, then roll back.

Full Compose rollback approach:

1. Return to the previous workspace content or previous image tag.
2. Keep `.env` unchanged unless the failure is a configuration mistake.
3. Run:

   ```sh
   docker compose --env-file .env up -d --build
   ```

4. If migration wrote an incompatible schema, restore the PostgreSQL backup from before the upgrade.
5. If object writes were corrupted, restore object storage from the bucket backup.
6. Re-run backend health, Admin login, and MCP read-only call checks.
7. Re-run the Admin AI provider test. If only the AI provider or prompt is broken, roll back that configuration without modifying or deleting published Versions.

For direct deployments, restore the previous backend binary or container, Admin `dist/`, MCP package, and Skill package. Do not delete database or object storage unless you are restoring from backup.

For a Site rollback, select the previous retained static artifact that passed verification. Verify its source SHA, artifact checksum, base path, and QA evidence, then repoint the operator-owned static-hosting release to that exact artifact. Do not rebuild during rollback, because rebuilt output is not the artifact that passed verification. After rollback, recheck both locale entry points, the Admin AI pages, the release rollback pages, and all base-safe static assets. If the artifact expired, use another retained verified artifact, or rerun the full gate at the target source SHA and treat the output as a new candidate.

## Release Notes Template

```text
Version:
Backend source or image:
Admin source or image:
Site source SHA:
Site workflow run ID:
Site artifact ID and checksum:
Site deployment URL and base path:
Site QA report references:
MCP package version:
Skill package version:
Backup location:
Upgrade command:
Health check result:
Admin smoke result:
Site smoke result:
MCP smoke result:
Known limitations:
Rollback artifact:
```

Known limitations should mention at least: AI cannot replace machine Diff or human review, no direct MCP publish, no invitation flow, no notification bot, no PR bot, no complete SDK/codegen platform, and no commercial billing or tenant administration.

## Avoid These Actions

- Do not run `docker compose down -v` outside disposable environments.
- Do not print `.env`, JWTs, MCP Tokens, database passwords, storage secrets, or `Authorization` headers in upgrade logs.
- Do not declare the whole Vdoc system upgraded just because the Admin page opens.
- If MCP or Skill versions do not match backend behavior, do not blame the Agent first. Verify that `tools/list` comes from the current backend.
