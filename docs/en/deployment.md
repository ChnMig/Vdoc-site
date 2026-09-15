---
outline: [3, 3]
---

# Deployment Guide

Run Vdoc on your own machine with Docker Compose, open the workbench, then let your agent query its first document. Follow the four steps below for a first trial. Already running Vdoc? Go to [First Use](admin-usage.md).

## Before You Start

- Docker is running on macOS, Linux, or Windows with WSL and Linux containers.
- Bash, curl, jq, tar, and `shasum` are installed.
- GitHub and container registries are reachable. The recommended path downloads Linux amd64/arm64 images and requires no application source checkout or local Go/Node.js build.

The Compose bootstrap contains configuration, installer scripts, and the source lock. Backend/Admin images are separate GitHub Release assets; the installer verifies checksums, architecture and source identity. The five source repositories and download package share the `v0.2.0` release. Read [Version Notes](version-notes.md) and [Upgrade and Rollback](release-rollback.md) before upgrading.

<div id="quick-start"></div>

## Quick Start (Recommended)

### 1. Download and Initialize

Download the [Compose archive](https://chnmig.github.io/Vdoc-site/downloads/vdoc-compose-bootstrap-v0.2.0.tar.gz) and [SHA-256 file](https://chnmig.github.io/Vdoc-site/downloads/vdoc-compose-bootstrap-v0.2.0.tar.gz.sha256), or use the commands below. Keep both files for reproducing your deployment; website snapshots may be replaced.

Run this in a new working directory. Verify and extract the bootstrap; the prebuilt path does not require source checkouts.

```sh
VDOC_BOOTSTRAP_BASE=https://chnmig.github.io/Vdoc-site/downloads
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-compose-bootstrap-v0.2.0.tar.gz"
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-compose-bootstrap-v0.2.0.tar.gz.sha256"
shasum -a 256 -c vdoc-compose-bootstrap-v0.2.0.tar.gz.sha256
```

Continue only after the checksum reports `OK`:

```sh
tar -xzf vdoc-compose-bootstrap-v0.2.0.tar.gz
cd vdoc-workspace
```

Run the remaining commands from this workspace root. For an existing workspace, check its version and retain its configuration. Do not assemble a release from five moving `main` branches.

<div id="initial-admin"></div>

### 2. Generate Configuration and Set Your Login

```sh
scripts/vdoc-local-bootstrap.sh --prebuilt
```

The script writes local runtime secrets to `.env` without printing them. **The prebuilt mode disables registration and leaves the initial-admin fields blank.** For the fixed-account login used in this guide, open `.env` in a local editor and change these existing fields to your own email, name, and password:

```dotenv
VDOC_AUTH_ALLOW_REGISTRATION=false
VDOC_INITIAL_ADMIN_EMAIL=admin@example.com
VDOC_INITIAL_ADMIN_NAME=Vdoc Admin
VDOC_INITIAL_ADMIN_PASSWORD=replace-with-your-own-password
```

Replace the example password. Use a unique password of 12–72 bytes with no leading or trailing whitespace. Enclose the full password in single quotes if it contains Compose special characters such as `$` or `#`. Save `.env` before starting, and use this email and password to log in.

With registration disabled, the first startup against an empty database must provide all three of `VDOC_INITIAL_ADMIN_EMAIL`, `VDOC_INITIAL_ADMIN_NAME`, and `VDOC_INITIAL_ADMIN_PASSWORD` to create the initial SuperAdmin. Backend creates this account only when the user table is empty; changing these fields does not reset an existing account.

`.env.example` keeps blank placeholders so startup without a bootstrap path fails closed; it is not a ready-to-run configuration. Do not commit `.env` or put passwords, JWTs, MCP Tokens, storage secrets, or `Authorization` values in screenshots, logs, or docs. The script also refuses to overwrite an existing `.env`; check your existing configuration instead.

### 3. Start Vdoc

Validate the configuration, then download, verify and load the application images before starting:

```sh
docker compose --env-file .env config --quiet
```

```sh
scripts/vdoc-prebuilt-install.sh
docker compose --env-file .env up -d --no-build
```

Compose starts the workbench (Admin), Backend, PostgreSQL, and RustFS object storage. The database stores users, projects, and version metadata; object storage holds document content.

### 4. Confirm It Is Running

```sh
docker compose --env-file .env ps
curl -fsS http://127.0.0.1:8080/api/v1/open/health | jq -e '.detail.healthy == true'
```

The health check should print `true`. HTTP 200 alone does not prove dependency health; require `.detail.healthy == true`. Allow the services to become ready before checking.

Open the [Vdoc workbench](http://127.0.0.1:8081) and sign in with the account from step 2. Once the workbench opens and health passes, continue to **[publish your first document and query it with an agent](admin-usage.md)**. Admin AI configuration and engineering release checks can follow later.

If the page does not open, check `docker compose --env-file .env ps` and the Backend logs. See [Troubleshooting](troubleshooting.md) for health failures, port conflicts, or login issues.

## Everyday Operations

Continue to run these commands from the workspace root.

Inspect status and logs:

```sh
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=100 backend admin postgres rustfs
```

Default local addresses:

| Purpose        | Address                                    |
| -------------- | ------------------------------------------ |
| Workbench      | `http://127.0.0.1:8081`                    |
| Backend health | `http://127.0.0.1:8080/api/v1/open/health` |
| PostgreSQL     | `127.0.0.1:5432`                           |
| RustFS S3 API  | `http://127.0.0.1:9000`                    |
| RustFS Console | `http://127.0.0.1:9001`                    |

Stop services while retaining containers and data:

```sh
docker compose --env-file .env stop
```

Remove containers and networks, but retain named volumes:

```sh
docker compose --env-file .env down
```

PostgreSQL 18 uses a major-version subdirectory, so Compose mounts its named volume at `/var/lib/postgresql`. If `postgres-data` was created by PostgreSQL 17 or earlier, migrate with `pg_upgrade` or dump/restore first. Compose does not automatically perform major-version database migrations.

Do not run `docker compose down -v` outside a disposable environment: it deletes `postgres-data`, `rustfs-data`, and `rustfs-logs`.

## Manual Configuration and Runtime Behavior

If you copy `.env.example` instead of using the bootstrap script, replace `VDOC_POSTGRES_PASSWORD`, `VDOC_STORAGE_ACCESS_KEY`, `VDOC_STORAGE_SECRET_KEY`, `VDOC_JWT_KEY`, and `VDOC_MCP_TOKEN_CIPHER_KEY`, then complete the initial-admin setup above.

Prebuilt bootstrap records version and source provenance from the release lock and public configuration template. Source-build bootstrap reads them from the `Vdoc/` and `Vdoc-admin/` checkouts. Modified worktrees produce a `-dirty` commit for local development only. When maintaining provenance manually, update it together with `workspace.lock.json`.

With `VDOC_DATABASE_ENABLED=true`, Backend connects to PostgreSQL and runs migrations on startup. Connection or migration failure stops startup instead of falling back to memory mode. With `VDOC_STORAGE_ENABLED=true`, Backend connects to object storage and tries to create a missing bucket.

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

Do not remove the old key before step 5 succeeds. Never put keyring JSON in command arguments, Git, logs, screenshots, or issues. See [RELEASE_DEPLOY.md](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md) for the complete SQL check and release gate.

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

## Engineering and Release Checks

After the first trial, maintainers can run these checks as needed. They are not prerequisites for the first login or agent query.

Check runtime version and locked provenance:

```sh
docker compose --env-file .env exec backend /app/vdoc --version
jq -r '.repositories[] | select(.path == "Vdoc") | .commit' workspace.lock.json
```

A release candidate must not report `dev`/`unknown`, and its Git commit must match the lock without `-dirty`. Supported Dockerfiles, Compose files, and the Backend CI service pin base images by tag and OCI digest.

Optional demo seeding requires Go on the host and a healthy Backend. Parentheses keep your shell in the workspace root afterward:

```sh
(cd Vdoc && go run ./tools/vdoc-demo-seed)
```

Maintainers can run live E2E against a disposable test database:

```sh
(cd Vdoc && ./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only)
(cd Vdoc && ./scripts/vdoc-e2e.sh live-compose --env-file ../.env)
```

Live E2E resets `VDOC_TEST_POSTGRES_DB` (`vdoc_e2e` by default), not the application database `VDOC_POSTGRES_DB`. Never point the test database setting at the application database.

Run the local release gate from the workspace root:

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

These commands do not publish packages, deploy services, push images, or create Git refs. Passing automation does not prove a completed real Pilot. See [Upgrade and Rollback](release-rollback.md) for release requirements.

Next for your trial: [First Use](admin-usage.md), where you publish a Markdown document and let your agent read it.

## Build from Source (Optional for Developers)

To modify Vdoc, install Git and build dependencies, then initialize the locked source checkouts. Preserve the secrets and account in an existing `.env`; confirm its build provenance matches the locked source before running:

```sh
scripts/vdoc-workspace-init.sh
docker compose --env-file .env up -d --build
```

Image installation loads application images only. It stops on a checksum, architecture, or source-lock mismatch and does not start or reset the database. Read [Upgrade and Rollback](release-rollback.md) before upgrading existing data.
