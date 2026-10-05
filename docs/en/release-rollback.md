# Upgrade and Rollback

For a single-file deployment, Backend/Admin follow stable `latest` images. You run `docker compose pull` and `docker compose up -d --wait` to update containers, and the backend runs migrations included in the new release at startup. Upgrades retain existing accounts, keys, and data volumes.

## 1. Back Up Configuration and Data

Keep your current private `docker-compose.yml`, actual running image digests (rolling tags alone cannot identify the previous image), and each Release's `container-image.json` (image digest and source commit). Stop application writes during a maintenance window:

```sh
docker compose stop backend admin
mkdir -p backups
docker compose exec -T postgres \
  sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > backups/vdoc-before-upgrade.sql
```

Also back up the RustFS `rustfs-data` volume or storage bucket. External databases and object storage can use provider snapshots or backup tools. Confirm backups can be restored before continuing.

## 2. Pull updates and recreate containers

Keep Backend/Admin on `latest` to follow stable application releases. Read [Site Releases](https://github.com/ChnMig/Vdoc-site/releases) and merge any new settings without overwriting the private YAML. To pin or roll back, change both application aliases to the intended release tags or previously recorded digests. Rolling tags alone do not identify the prior running image.

Preserve PostgreSQL and storage credentials, JWT/MCP keys, administrator settings, ports, project name, and volumes. `v0.3.10` adds no application database migration beyond v0.3.6. Upgrades from v0.3.0 or earlier apply the pending `007_parser_facts_and_history_pages.sql`, adding parser metadata, history query indexes, and the Diff `must_handle` field. Complete the backup above before upgrading; this release does not automatically downgrade the database.

If the existing `services.admin.environment.VDOC_ADMIN_API_BASE_URL` points to a separate backend domain or `127.0.0.1:8080`, change it to `'same-origin'`. Current Admin's built-in Caddy forwards `/api/*` to `backend:8080` on the same origin, and the runtime config uses `window.location.origin`. Browsers access the API through the workbench domain; Skill, MCP and CLI clients can still use the backend domain directly. Remove the old CORS origin setting and retain `VDOC_SERVER_ENABLE_CORS: 'true'`. Both single-file Compose variants, with bundled or external PostgreSQL, use this default.

```sh
docker compose pull
docker compose up -d --wait
docker compose up -d --wait --force-recreate admin
docker compose ps
```

Explicitly recreating Admin regenerates its runtime config; restarting an existing container does not apply edited Compose environment variables. New containers mount the existing volumes. Backend checks `schema_migrations`, applies pending migrations in order, and validates previously applied migration contents. Migration failure aborts startup; it does not clear data or ignore errors. Completed migrations are not reapplied on each restart.

Vdoc migrations cover application data structures, not PostgreSQL major upgrades. The default `postgres:18` receives 18.x patches, while `rustfs/rustfs:1.0.0` stays fixed. Follow the relevant migration instructions before changing the PostgreSQL major or RustFS version.

## Migrate from v0.2.1 or Older Archives {#legacy-compose}

The first switch to a single-file deployment requires these steps:

1. Back up existing data and `.env`, and record the actual Compose project and volume names. The old default project name is also `vdoc`; preserve any custom name in the new YAML.
2. Keep the old Compose file, download the new YAML into the existing deployment directory, and transfer accounts, passwords, JWT/MCP keys, encryption KID/keyring, database name, bucket, and URLs from the old `.env`.
3. Old `VDOC_POSTGRES_PASSWORD` maps to new `VDOC_DATABASE_PASSWORD`; YAML anchors share database settings. If you previously overrode `VDOC_DATABASE_DSN` or used external services, preserve the actual connection settings. The backend still supports an explicit DSN and gives it precedence.
4. Confirm `name`, `postgres-data`, `rustfs-data`, and `rustfs-logs` still select the original volumes, then run the `pull` / `up -d` commands above.

If the old deployment did not set a separate MCP encryption key, it used the JWT key at the time. Put that original value in `VDOC_MCP_TOKEN_CIPHER_KEY`. Do not rotate keys while switching deployment formats. Once migrated, deployment and updates use only the new Compose file; `.env`, installer scripts, and `workspace.lock.json` are no longer required.

## 3. Verify the Upgrade

```sh
docker compose logs --tail=100 backend
curl -fsS http://127.0.0.1:8080/api/v1/open/health
docker compose exec backend /app/vdoc --version
```

Use your configured ports if different. Confirm backend health and version, then check:

- Existing administrator login and Project, Document, Draft, Version, and Diff pages.
- An existing MCP token can call `tools/list` and a read-only tool; an agent can read existing documents.
- A new draft can still be submitted, reviewed, and published.
- Existing Provider settings and share links still work if you use AI or public sharing.

For domain deployments, verify that `https://docs.example.com/api/v1/open/health` returns `code: 200` and `https://docs.example.com/runtime-config.js` contains `apiBaseUrl: window.location.origin`. When browsers execute it, the API must use the actual workbench origin (`https://docs.example.com` in this example). Then verify authenticated flows such as login and publishing.

A completed configuration check normally shows `Exited (0)`. If it fails, correct the YAML before restarting; do not delete the database to retry. See [First Use](admin-usage.md), [Admin AI](admin-ai.md), and [MCP Tools](mcp-tools.md) for product checks.

## Rollback

When rolling back to an Admin without the built-in same-origin `/api/*` proxy, restore that version's API and proxy configuration; those images cannot directly use `'same-origin'`. If restoring cross-origin access, configure the gateway to explicitly allow the actual workbench origin and request headers such as `Authorization`, or use an origin configuration supported by that old version, and verify browser preflight and authenticated requests. A wildcard CORS response alone does not confirm that cross-origin login works.

Stop Backend and Admin first, preserving current data and logs. Read the target release's instructions to determine whether the previous version supports the migrated database:

1. Restore the previous image configuration and keep any keys and KID/keyring entries still needed to decrypt data.
2. Restore the pre-upgrade PostgreSQL backup if the migration is incompatible with the old backend. Restore the object storage backup when necessary.
3. Run `docker compose up -d` and verify health, existing account login, documents, and MCP queries again.

Automatic migration does not provide automatic downgrade. Rolling back a container does not reverse database changes. Do not delete data volumes with `docker compose down -v`.

## Website and Developer Releases

The marketing website deploys independently of user installations. A stable tag that passes CI and publishes its Release automatically deploys the matching site to [GitHub Pages](https://chnmig.github.io/Vdoc-site/). Branches and prerelease tags do not deploy automatically.

To roll back the website, manually run `Publish release to GitHub Pages` from `main` with an existing stable tag. The workflow verifies and deploys that version without moving tags or updating user application containers. Older versions may still offer the Compose archive used at the time.

Source builds, E2E tests, key rotation, and four-repository release checks are documented in the [maintainer operations guide](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md). Run those checks in disposable test environments; ordinary deployments do not require source checkouts or a test database.
