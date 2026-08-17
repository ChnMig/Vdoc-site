# Deployment Guide

This page is for users who want to run Vdoc. Start with Docker Compose for backend API, Admin, and local dependencies, then move to direct backend/Admin deployment or external PostgreSQL and S3 compatible storage when needed.

## What You Will Run

The root `docker-compose.yml` starts four services:

- `postgres`: PostgreSQL for users, projects, review workflow, and version metadata.
- `rustfs`: S3 compatible object storage for raw and normalized document objects.
- `backend`: Vdoc API, MCP endpoint, migrations, and object storage writes.
- `admin`: human workbench.

When `VDOC_DATABASE_ENABLED=true`, backend connects to PostgreSQL and runs Vdoc migrations at startup. Connection or migration failure stops startup instead of falling back to memory mode. When `VDOC_STORAGE_ENABLED=true`, backend connects to object storage and creates the bucket if it is missing.

## Acquire the Locked Workspace

The `v0.1.0-rc.1` prerelease provides the checksummed, single-entry bootstrap. Do not assemble a workspace from five moving `main` branches. Download the archive and checksum, verify it, and let the initializer fetch the five exact commits from `workspace.lock.json`:

```sh
VDOC_BOOTSTRAP_BASE=https://github.com/ChnMig/Vdoc/releases/download/v0.1.0-rc.1
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-workspace-bootstrap-v0.2.tar.gz"
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-workspace-bootstrap-v0.2.tar.gz.sha256"
shasum -a 256 -c vdoc-workspace-bootstrap-v0.2.tar.gz.sha256
tar -xzf vdoc-workspace-bootstrap-v0.2.tar.gz
cd vdoc-workspace
scripts/vdoc-workspace-init.sh
```

Release page: <https://github.com/ChnMig/Vdoc/releases/tag/v0.1.0-rc.1>. This is a release candidate, not a production-readiness or completed-Pilot claim.

## Option 1: Full Docker Compose

Run commands from the workspace root, the directory that contains `docker-compose.yml`, `.env.example`, `Vdoc/`, `Vdoc-admin/`, `Vdoc-mcp/`, and `Vdoc-skill/`.

```sh
scripts/vdoc-local-bootstrap.sh
```

Bootstrap writes a disposable local `.env` and does not print secrets. If you choose to copy `.env.example` by hand instead, replace at least these placeholders:

- `VDOC_POSTGRES_PASSWORD`
- `VDOC_STORAGE_ACCESS_KEY`
- `VDOC_STORAGE_SECRET_KEY`
- `VDOC_JWT_KEY`
- `VDOC_MCP_TOKEN_CIPHER_KEY`
- `VDOC_INITIAL_ADMIN_EMAIL`
- `VDOC_INITIAL_ADMIN_PASSWORD`

Bootstrap also records build version, Git commit, and build time from the current `Vdoc/` and `Vdoc-admin/` checkouts. A modified worktree produces a `-dirty` commit, which is local-development provenance only and cannot identify a release or formal Pilot. When `.env.example` is maintained manually, update these values together with `workspace.lock.json`.

When registration remains disabled by default (`VDOC_AUTH_ALLOW_REGISTRATION=false`), the first startup against an empty database must provide all three of `VDOC_INITIAL_ADMIN_EMAIL`, `VDOC_INITIAL_ADMIN_NAME`, and `VDOC_INITIAL_ADMIN_PASSWORD`. Backend creates that SuperAdmin only when the user table is empty, and bcrypt hashes the password before storage. The triplet may be blank only in a trusted disposable environment that explicitly enables registration and will disable it immediately after the first account is created.

`.env.example` intentionally leaves the initial-admin placeholders blank so a deployment without a bootstrap path fails closed; it is not a ready-to-run configuration. Use `scripts/vdoc-local-bootstrap.sh` to generate complete values, or fill the triplet manually before startup.

Do not commit `.env`, and do not put raw JWTs, MCP Tokens, DB passwords, storage secrets, or `Authorization` header values in docs, logs, screenshots, or issues.

Validate the Compose config without printing interpolated values:

```sh
docker compose --env-file .env config --quiet
```

Start the full stack:

```sh
docker compose --env-file .env up -d --build
```

Inspect status and logs:

```sh
docker compose --env-file .env ps
docker compose --env-file .env logs -f backend
docker compose --env-file .env logs --tail=100 admin postgres rustfs
```

Default local URLs:

- Backend health: `http://127.0.0.1:8080/api/v1/open/health`
- Admin: `http://127.0.0.1:8081`
- PostgreSQL host port: `127.0.0.1:5432`
- RustFS S3 API: `http://127.0.0.1:9000`
- RustFS console: `http://127.0.0.1:9001`

Health examples:

```sh
curl http://127.0.0.1:8080/api/v1/open/health
curl -I http://127.0.0.1:8081/
docker compose --env-file .env exec backend /app/vdoc --version
jq -r '.repositories[] | select(.path == "Vdoc") | .commit' workspace.lock.json
```

Do not check HTTP 200 alone: the Vdoc envelope may still use HTTP 200 when a dependency is unavailable. Deployment probes must require `.detail.healthy == true`. The official backend image healthcheck performs this semantic check. Version output must not be `dev`/`unknown`; a release candidate's Git commit must equal the lock exactly and must not carry `-dirty`. Supported Dockerfiles, Compose files, and the backend CI service pin both the human-readable tag and OCI digest for every base image.

Optional: seed demo data after backend health succeeds:

```sh
cd Vdoc && go run ./tools/vdoc-demo-seed
```

Optional: run live E2E against the running root Compose stack:

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E resets the selected disposable `VDOC_TEST_POSTGRES_DB`, `vdoc_e2e` by default. It does not use or reset the application database from `VDOC_POSTGRES_DB`. Never point `VDOC_TEST_POSTGRES_DB` at the application database.

Use the release dry-run as the local gate:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

This dry-run runs local checks only. It does not publish packages, deploy services, push images, or create git refs.

Stop while keeping containers and data:

```sh
docker compose --env-file .env stop
```

Remove containers and networks while keeping named volumes:

```sh
docker compose --env-file .env down
```

PostgreSQL 18 stores data below a major-version-specific directory, so the Compose volume is mounted at `/var/lib/postgresql`. If `postgres-data` was created by PostgreSQL 17 or earlier, migrate it with `pg_upgrade` or dump/restore before starting PostgreSQL 18. Compose does not perform major-version migrations automatically; do not use `down -v` during an upgrade.

Do not run `docker compose down -v` outside disposable environments. It deletes `postgres-data`, `rustfs-data`, and `rustfs-logs`.

## Localhost and Compose Service Names

`localhost`, `127.0.0.1`, and your domain are for host commands and browser access. Containers in Docker Compose use service names to reach each other.

The full Compose stack already follows this rule:

- backend connects to PostgreSQL at `postgres:5432`
- backend connects to RustFS at `rustfs:9000`
- Admin browser calls backend through `VDOC_ADMIN_API_BASE_URL=http://127.0.0.1:8080`

Do not set `VDOC_ADMIN_API_BASE_URL` to `http://backend:8080`, because user browsers cannot resolve Compose service names.

## Common `.env` Settings

Host ports can be changed in `.env`:

```sh
VDOC_POSTGRES_HOST_PORT=5432
VDOC_PUBLISH_ADDRESS=127.0.0.1
VDOC_RUSTFS_HOST_PORT=9000
VDOC_RUSTFS_CONSOLE_HOST_PORT=9001
VDOC_BACKEND_HOST_PORT=8080
VDOC_ADMIN_HOST_PORT=8081
```

Backend security and persistence settings:

```sh
VDOC_JWT_KEY=replace-with-at-least-32-characters-jwt-key
VDOC_DATABASE_ENABLED=true
VDOC_DATABASE_DSN=postgres://vdoc:replace-with-password@postgres:5432/vdoc?sslmode=disable
VDOC_STORAGE_ENABLED=true
VDOC_STORAGE_ENDPOINT=rustfs:9000
VDOC_STORAGE_BUCKET=vdoc
VDOC_STORAGE_ACCESS_KEY=replace-with-local-rustfs-access-key
VDOC_STORAGE_SECRET_KEY=replace-with-local-rustfs-secret-key
VDOC_STORAGE_USE_SSL=false
VDOC_STORAGE_PATH_STYLE=true
VDOC_MCP_TOKEN_CIPHER_KEY=replace-with-at-least-32-characters-mcp-key
VDOC_MCP_TOKEN_CIPHER_KID=local-aes-gcm-v1
VDOC_MCP_TOKEN_CIPHER_KEYRING={}
```

The full Compose setup adds `http://127.0.0.1:8081` and `http://localhost:8081` to the backend's exact CORS allowlist. If `VDOC_ADMIN_HOST_PORT` changes or a production domain is used, update `VDOC_SERVER_CORS_ALLOWED_ORIGINS` and recreate the backend container.

All host ports bind only to `127.0.0.1` by default so disposable registration, PostgreSQL, and RustFS are not accidentally exposed to the LAN. Change `VDOC_PUBLISH_ADDRESS` only after firewall, TLS, and external access controls are in place. Keep RustFS CORS restricted to the exact Console origin; never use `*`.

Leave `VDOC_SERVER_TRUSTED_PROXIES` unset when browsers connect directly to the backend. When Caddy, Nginx, or an Ingress terminates TLS, set it to the exact proxy IP/CIDR seen by the backend; separate multiple values with commas. Never use `0.0.0.0/0` or `::/0`. Configuration-file changes are validated but running configuration changes require a safe restart.

Admin Docker runtime setting:

```sh
VDOC_ADMIN_API_BASE_URL=http://127.0.0.1:8080
```

The admin container writes this value to `/runtime-config.js` at startup. It must be a backend origin that the browser can reach.

## Cipher KID Rotation

`VDOC_MCP_TOKEN_CIPHER_KEY` protects MCP Token reveal ciphertext, AI Provider API keys, and public-share capabilities. Rotate all three classes as one unit. `VDOC_MCP_TOKEN_CIPHER_KEYRING` is a secret JSON map of historical `KID -> key` entries. The active KID must not also appear in the historical keyring, and one KID must never identify two different keys.

1. Back up PostgreSQL and reduce backend writers to one instance.
2. Put the old active KID/key in the historical keyring and configure a new unique active KID/key, for example `VDOC_MCP_TOKEN_CIPHER_KEYRING={"local-aes-gcm-v1":"<old-key>"}`.
3. Start one backend. Startup first decrypts and validates every record in all three classes, then rewrites historical KIDs to the active KID in one repository transaction. An unknown KID, wrong key, or hash mismatch aborts startup without saving a partial rotation.
4. Confirm `mcp_tokens`, `ai_providers`, and `document_shares` contain only the active KID, then exercise one MCP Token, Provider, and share.
5. Clear the historical keyring, restart and verify again, and only then restore normal backend concurrency.

Do not remove the old key before step 5 succeeds. Never put keyring JSON in command arguments, Git, logs, screenshots, or issues. See workspace-root `RELEASE_DEPLOY.md` for the complete SQL check and release gate.

## Option 2: Run Backend and Admin Directly

Direct deployment fits development, single-host pilots, or environments with their own process manager.

Backend example:

```sh
cd Vdoc
export VDOC_SERVER_PORT=8080
export VDOC_JWT_KEY="replace-with-at-least-32-characters-jwt-key"
export VDOC_DATABASE_ENABLED=true
export VDOC_DATABASE_DSN="postgres://vdoc:replace-with-password@127.0.0.1:5432/vdoc?sslmode=disable"
export VDOC_STORAGE_ENABLED=true
export VDOC_STORAGE_ENDPOINT="127.0.0.1:9000"
export VDOC_STORAGE_BUCKET="vdoc"
export VDOC_STORAGE_ACCESS_KEY="replace-with-storage-access-key"
export VDOC_STORAGE_SECRET_KEY="replace-with-storage-secret-key"
export VDOC_STORAGE_REGION="us-east-1"
export VDOC_STORAGE_USE_SSL=false
export VDOC_STORAGE_PATH_STYLE=true
export VDOC_MCP_TOKEN_CIPHER_KEY="replace-with-at-least-32-characters-mcp-key"
export VDOC_MCP_TOKEN_CIPHER_KID="local-aes-gcm-v1"
export VDOC_MCP_TOKEN_CIPHER_KEYRING='{}'
export VDOC_INITIAL_ADMIN_EMAIL="admin@example.com"
export VDOC_INITIAL_ADMIN_NAME="Vdoc Admin"
export VDOC_INITIAL_ADMIN_PASSWORD="replace-with-initial-admin-password"
make build
./bin/vdoc
```

Admin local development example:

```sh
cd Vdoc-admin
cp .env.example .env
printf 'VITE_VDOC_API_BASE_URL=http://127.0.0.1:8080\n' > .env
pnpm install
pnpm dev
```

Admin Docker direct run example:

```sh
test -z "$(git -C Vdoc-admin status --porcelain=v1 --untracked-files=all)"
ADMIN_COMMIT="$(git -C Vdoc-admin rev-parse HEAD)"
ADMIN_VERSION="$(git -C Vdoc-admin describe --tags --always HEAD)"
ADMIN_BUILD_TIME="$(git -C Vdoc-admin show -s --format=%cI HEAD)"
docker build -t vdoc-admin \
  --build-arg VERSION="$ADMIN_VERSION" \
  --build-arg GIT_COMMIT="$ADMIN_COMMIT" \
  --build-arg BUILD_TIME="$ADMIN_BUILD_TIME" \
  ./Vdoc-admin
docker run --rm -p 8081:8080 \
  -e VDOC_ADMIN_API_BASE_URL=http://127.0.0.1:8080 \
  vdoc-admin
```

## Option 3: External PostgreSQL and Object Storage

If you already run PostgreSQL, RustFS, MinIO, or managed S3 compatible storage, point backend at those dependencies.

External PostgreSQL example:

```sh
VDOC_DATABASE_ENABLED=true
VDOC_DATABASE_DSN=postgres://vdoc:replace-with-password@db.example.internal:5432/vdoc?sslmode=require
```

External object storage example:

```sh
VDOC_STORAGE_ENABLED=true
VDOC_STORAGE_ENDPOINT=s3.example.internal:9000
VDOC_STORAGE_BUCKET=vdoc
VDOC_STORAGE_ACCESS_KEY=replace-with-access-key
VDOC_STORAGE_SECRET_KEY=replace-with-secret-key
VDOC_STORAGE_REGION=us-east-1
VDOC_STORAGE_USE_SSL=true
VDOC_STORAGE_PATH_STYLE=true
```

Percent encode PostgreSQL passwords before putting them in `VDOC_DATABASE_DSN` if they contain URI-reserved characters. Path style depends on your storage provider.

## Next Step After Deployment

1. Open backend health and confirm success.
2. Open Admin and log in with the initial admin. Anonymous registration is disabled by default; only a trusted disposable or pilot environment should temporarily set `VDOC_AUTH_ALLOW_REGISTRATION=true` to register the first user, then disable it and recreate the backend container immediately after bootstrap.
3. Follow [First Use](admin-usage) to create Project, Document, Draft, Version, and MCP Token.
4. Connect Agents with [MCP Tools](mcp-tools) and [Skill Workflows](skill-workflows).
