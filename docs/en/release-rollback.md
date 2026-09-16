# Upgrade and Rollback

For a single-file deployment, you update image versions in Compose and the backend runs migrations included in the new release at startup. Upgrades retain existing accounts, keys, and data volumes.

## 1. Back Up Configuration and Data

Keep your current private `docker-compose.yml`, image versions, and each Release's `container-image.json` (image digest and source commit). Stop application writes during a maintenance window:

```sh
docker compose stop backend admin
mkdir -p backups
docker compose exec -T postgres \
  sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > backups/vdoc-before-upgrade.sql
```

Also back up the RustFS `rustfs-data` volume or storage bucket. External databases and object storage can use provider snapshots or backup tools. Confirm backups can be restored before continuing.

## 2. Update the Two Image Versions

Read `docker-compose.yml` in the target [Site Release](https://github.com/ChnMig/Vdoc-site/releases). Copy its `x-backend-image` and `x-admin-image` lines into your existing private YAML, and merge any new settings described by the release. Do not overwrite your configured file with an unedited download.

Preserve PostgreSQL and storage credentials, JWT/MCP keys, administrator settings, ports, project name, and volumes. `v0.3.0` improves single-file deployment and image distribution without adding database migrations.

```sh
docker compose pull
docker compose up -d
docker compose ps
```

New containers mount the existing volumes. Backend checks `schema_migrations`, applies pending migrations in order, and validates previously applied migration contents. Migration failure aborts startup; it does not clear data or ignore errors. Completed migrations are not reapplied on each restart.

Vdoc migrations cover application data structures, not PostgreSQL major upgrades. Keep PostgreSQL and RustFS versions unchanged unless the target release includes specific upgrade instructions.

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

A completed configuration check normally shows `Exited (0)`. If it fails, correct the YAML before restarting; do not delete the database to retry. See [First Use](admin-usage.md), [Admin AI](admin-ai.md), and [MCP Tools](mcp-tools.md) for product checks.

## Rollback

Stop Backend and Admin first, preserving current data and logs. Read the target release's instructions to determine whether the previous version supports the migrated database:

1. Restore the previous image configuration and keep any keys and KID/keyring entries still needed to decrypt data.
2. Restore the pre-upgrade PostgreSQL backup if the migration is incompatible with the old backend. Restore the object storage backup when necessary.
3. Run `docker compose up -d` and verify health, existing account login, documents, and MCP queries again.

Automatic migration does not provide automatic downgrade. Rolling back a container does not reverse database changes. Do not delete data volumes with `docker compose down -v`.

## Website and Developer Releases

The marketing website deploys independently of user installations. A stable tag that passes CI and publishes its Release automatically deploys the matching site to [GitHub Pages](https://chnmig.github.io/Vdoc-site/). Branches and prerelease tags do not deploy automatically.

To roll back the website, manually run `Publish release to GitHub Pages` from `main` with an existing stable tag. The workflow verifies and deploys that version without moving tags or updating user application containers. Older versions may still offer the Compose archive used at the time.

Source builds, E2E tests, key rotation, and five-repository release checks are documented in the [maintainer operations guide](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md). Run those checks in disposable test environments; ordinary deployments do not require source checkouts or a test database.
