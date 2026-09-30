# Workspace Docker Compose Deployment

## Recommended installation: one Compose file

Download [docker-compose.yml](https://chnmig.github.io/Vdoc-site/downloads/docker-compose.yml), put it in a dedicated directory, and fill every `CHANGE_ME` value in the YAML. All accounts, passwords, JWT/MCP keys, and connection settings stay in this private file. Then run:

```sh
docker compose pull
docker compose up -d
```

Open `http://127.0.0.1:8081` and sign in with your configured initial administrator. Backend automatically creates its schema, applies pending migrations, and creates the storage bucket and initial administrator. Ordinary deployments need no `.env`, source lock, installer, or test database script. Backend/Admin follow the newest stable `latest` images, PostgreSQL follows `18` patch updates, and RustFS uses `1.0.0`. Back up data, keep the existing configuration and volumes, then repeat `pull` / `up -d --wait` to update. Running containers are not updated automatically. For a public domain, use the two-domain [Caddy configuration](https://chnmig.github.io/Vdoc-site/en/deployment#caddy-domain). See the [deployment guide](https://chnmig.github.io/Vdoc-site/en/deployment) and [upgrade guide](https://chnmig.github.io/Vdoc-site/en/release-rollback).

The standalone sources are `deploy/docker-compose.yml` (bundled PostgreSQL) and `deploy/docker-compose.external-postgres.yml` (existing PostgreSQL). Both include field comments. The root `docker-compose.yml` and instructions below support source development and release verification.

## Use an existing PostgreSQL service

Download [docker-compose.external-postgres.yml](https://chnmig.github.io/Vdoc-site/downloads/docker-compose.external-postgres.yml) and save it as `docker-compose.yml` in a dedicated directory. Use it alone; do not merge it with the bundled database file. It starts only RustFS, Backend, Admin and the one-shot configuration check, with no PostgreSQL service or database volume.

Prepare a dedicated Vdoc database and login first. The login should own the application database/tables and have `USAGE` / `CREATE` on its `public` schema so startup migrations can create and alter tables and indexes. Backend creates its schema inside an existing database; it does not create the database itself. Set `VDOC_DATABASE_HOST`, `PORT`, `NAME`, `USER`, `PASSWORD` and `SSL_MODE`, then replace the remaining storage, JWT, MCP and initial-administrator placeholders. The default TLS mode `require` encrypts traffic without verifying server identity. Use `disable` only for an explicitly non-TLS trusted local/private database, and follow managed providers' certificate/verification requirements. Configure pool limits to fit the server's connection quota.

For a database on the Docker host, use `host.docker.internal` and the host's database port. Backend includes the Linux `host-gateway` mapping. The database must listen on a container-reachable address and permit the connection in `pg_hba.conf` and the firewall. Container `127.0.0.1` is not the host. Alternatively, attach Backend to an existing database container network, retaining its default network for RustFS.

Set `VDOC_ADMIN_API_BASE_URL` to the backend HTTPS origin when using Caddy. The frontend/backend ports remain 8081/8080 and CORS remains `*`. Once the existing database is ready, run `docker compose config --quiet`, `docker compose pull`, and `docker compose up -d --wait`. The configuration check is read-only and does not test connectivity; actual connection, TLS and migration errors appear in Backend logs. See the full [external PostgreSQL guide](https://chnmig.github.io/Vdoc-site/en/deployment#external-postgresql).

Database backups, maintenance and version upgrades stay with the existing service. Stopping this Compose project does not stop that database; deleting this project's RustFS volumes still destroys document objects. Moving an existing Vdoc installation requires transferring database contents and retaining object data and original keys, not just changing its host to an empty database.

## Source workspace deployment

The optional [source workspace archive](https://chnmig.github.io/Vdoc-site/downloads/vdoc-compose-bootstrap-v0.3.9.tar.gz) is a Docker Compose bootstrap, for source builds and offline installation. It supplies the Compose/configuration files and a
lock that fetches reviewed source commits; `docker compose ... up -d --build`
builds Backend/Admin locally and starts the four-service self-hosted stack.

First download, verify, and initialize the workspace using [the acquisition instructions](README.md#docker-compose-bootstrap-artifact). The [public source files](https://github.com/ChnMig/Vdoc-site/tree/main/workspace) are maintained in Vdoc-site; cloning only the backend repository does not provide the root Compose files.

From the initialized workspace root, generate a local-only `.env` with disposable secrets:

```sh
scripts/vdoc-local-bootstrap.sh
docker compose --env-file .env up -d --build
```

The bootstrap script writes secrets to `.env` and does not print them. Do not commit `.env`, raw JWTs, MCP tokens, DB passwords, storage secrets, or `Authorization` header values.

The disposable local bootstrap explicitly sets `VDOC_AUTH_ALLOW_REGISTRATION=true` so the demo can create its first user. For any persistent or network-accessible deployment, set it back to `false` and provide `VDOC_INITIAL_ADMIN_EMAIL`, `VDOC_INITIAL_ADMIN_NAME`, and `VDOC_INITIAL_ADMIN_PASSWORD` before first startup.

The root `docker-compose.yml` builds and runs PostgreSQL, RustFS, the Vdoc backend API, and the Admin workbench. All published ports bind to `127.0.0.1` by default; set `VDOC_PUBLISH_ADDRESS` to another address only when external access and the corresponding firewall/TLS controls are intentional. Backend-to-dependency traffic uses Docker Compose service names: `postgres:5432` for PostgreSQL and `rustfs:9000` for object storage.

Repository baselines are pinned in `workspace.lock.json` by remote ref and commit, and the same lock binds the distributed root control plane by SHA-256. Run `scripts/vdoc-workspace-verify.sh` before building. It queries the configured remotes directly and rejects dirty worktrees; local `origin/*` refs are not trusted as publication proof. On a fresh machine, `scripts/vdoc-workspace-init.sh` clones only missing repositories at the locked ref/commit; it does not mutate an existing repository or discard a dirty worktree.

The bootstrap writes backend/Admin version, Git commit, and build time into `.env`; Compose passes them as required Docker build arguments and both images retain OCI provenance labels. After startup, verify the backend binary and compare it with the lock:

```sh
docker compose --env-file .env exec backend /app/vdoc --version
jq -r '.repositories[] | select(.path == "Vdoc") | .commit' workspace.lock.json
```

`dev`, `unknown`, and a `-dirty` Git commit are not release provenance. Source-build Dockerfiles, the root development Compose, and backend CI retain OCI digest pins. The ordinary standalone deployment follows Backend/Admin `latest`, PostgreSQL `18`, and RustFS `1.0.0`.

PostgreSQL 18 stores data below a major-version-specific directory, so the named volume is mounted at `/var/lib/postgresql`, not `/var/lib/postgresql/data`. If an existing `postgres-data` volume was created by PostgreSQL 17 or earlier, do not start it with PostgreSQL 18 and do not delete it with `down -v`. Back it up and complete a documented `pg_upgrade` or dump/restore migration first; Compose does not migrate database major versions automatically.

Published ports and credentials are configured in `.env`. `VDOC_ADMIN_API_BASE_URL` must be a browser-facing backend origin such as `http://127.0.0.1:8080`; do not set it to `http://backend:8080`, because that name is only resolvable from other containers.

`VDOC_MCP_TOKEN_CIPHER_KEYRING` is a secret JSON map used only while rotating historical encryption KIDs. It covers MCP token reveal ciphertext, AI Provider keys, and public-share capabilities together. Follow the transaction-safe rotation procedure in `RELEASE_DEPLOY.md`; never remove an old key until the one-writer startup rewrite and the restart without the historical keyring both succeed.

Validate the rendered deployment without printing interpolated values or starting containers:

```sh
docker compose --env-file .env config --quiet
```

Optionally seed demo data after the backend is healthy:

```sh
cd Vdoc && go run ./tools/vdoc-demo-seed
```

Run live E2E against the running root Compose stack from the backend directory:

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not reset the application database from `VDOC_POSTGRES_DB`.

Use the release dry-run as the local closure gate:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

The dry-run covers all five repositories and both supported Site base paths. It does not publish, deploy, push images, create git refs, or start the Compose stack. Live PostgreSQL/RustFS E2E remains opt-in via `--include-live` and requires already-running disposable services.

To verify the documented two-domain Caddy deployment with real browser login, publishing, MCP and anonymous sharing, install the Admin development dependencies and Chromium, then run `node scripts/test-caddy-deployment.mjs`. It creates isolated containers and volumes, uses local HTTPS certificates only for the test, and removes its resources afterward. Image overrides `--backend-image` and `--admin-image` allow testing candidates before publication.

Run `python3 scripts/test-external-postgres-compose.py` to verify the existing-database variant with a separately managed, disposable PostgreSQL 18 instance, TLS and a non-superuser application owner. It checks migrations, login, publication, persistence after app recreation and preservation of the external service after app teardown. Docker and OpenSSL are required; it uses no production connection settings and removes only its isolated test resources.
