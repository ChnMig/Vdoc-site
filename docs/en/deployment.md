# Deployment Guide

This page is for users who want to run Vdoc. Start with Docker Compose for backend API, Admin, and local dependencies, then move to direct backend/Admin deployment or external PostgreSQL and S3 compatible storage when needed.

## What You Will Run

The root `docker-compose.yml` starts four services:

- `postgres`: PostgreSQL for users, projects, review workflow, and version metadata.
- `rustfs`: S3 compatible object storage for raw and normalized document objects.
- `backend`: Vdoc API, MCP endpoint, migrations, and object storage writes.
- `admin`: human workbench.

When `VDOC_DATABASE_ENABLED=true`, backend connects to PostgreSQL and runs Vdoc migrations at startup. Connection or migration failure stops startup instead of falling back to memory mode. When `VDOC_STORAGE_ENABLED=true`, backend connects to object storage and creates the bucket if it is missing.

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

`VDOC_INITIAL_ADMIN_EMAIL` and `VDOC_INITIAL_ADMIN_PASSWORD` may stay blank. If set, backend creates that SuperAdmin only when the user table is empty. The password is bcrypt hashed before storage.

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
```

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
```

Admin Docker runtime setting:

```sh
VDOC_ADMIN_API_BASE_URL=http://127.0.0.1:8080
```

The admin container writes this value to `/runtime-config.js` at startup. It must be a backend origin that the browser can reach.

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
docker build -t vdoc-admin ./Vdoc-admin
docker run --rm -p 8081:80 \
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
2. Open Admin and log in with the initial admin, or register the first user in a trusted pilot environment.
3. Follow [First Use](admin-usage) to create Project, Document, Draft, Version, and MCP Token.
4. Connect Agents with [MCP Tools](mcp-tools) and [Skill Workflows](skill-workflows).
