# Upgrade and Rollback

This page is for users already running Vdoc. The goal is to back up data before upgrades, verify backend, Admin, MCP, and Skill after upgrades, and return to the previous version if something fails.

## Before Upgrading

- Know the currently running source version, image tag, or build source.
- Keep the current `.env`, but never paste real secrets into issues, chat, or release notes.
- Confirm PostgreSQL and object storage are reachable.
- Record the current Admin URL, backend health URL, and Agent MCP config.
- Use a maintenance window so users are not submitting Drafts during restart.

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
docker compose --env-file .env config
docker compose --env-file .env pull
docker compose --env-file .env up -d --build
```

The current root Compose builds app services from local `./Vdoc` and `./Vdoc-admin`. `pull` mainly pulls base images such as `postgres`, `rustfs`, `caddy`, and `node`; app updates come from your current workspace content.

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

For direct deployments, restore the previous backend binary or container, Admin `dist/`, MCP package, and Skill package. Do not delete database or object storage unless you are restoring from backup.

## Release Notes Template

```text
Version:
Backend source or image:
Admin source or image:
MCP package version:
Skill package version:
Backup location:
Upgrade command:
Health check result:
Admin smoke result:
MCP smoke result:
Known limitations:
Rollback artifact:
```

Known limitations should mention at least: no direct MCP publish, no invitation flow, no notification bot, no PR bot, no complete SDK/codegen platform, and no commercial billing or tenant administration.

## Avoid These Actions

- Do not run `docker compose down -v` outside disposable environments.
- Do not print `.env`, JWTs, MCP Tokens, database passwords, storage secrets, or `Authorization` headers in upgrade logs.
- Do not declare the whole Vdoc system upgraded just because the Admin page opens.
- If MCP or Skill versions do not match backend behavior, do not blame the Agent first. Verify that `tools/list` comes from the current backend.
