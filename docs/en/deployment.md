# Deployment

Deploy Vdoc with one `docker-compose.yml`. Settings, accounts, passwords, and internal keys all live in this file. No `.env`, initialization scripts, or source checkout is required.

Install Docker Engine / Docker Desktop and Docker Compose v2. Published Linux images support amd64 and arm64. The example below runs locally; existing installations should read [Upgrade and Rollback](release-rollback.md) first.

<div id="quick-start"></div>

## 1. Download the Compose File

Download [docker-compose.yml](https://chnmig.github.io/Vdoc-site/downloads/docker-compose.yml) into a dedicated deployment directory, or run:

```sh
mkdir vdoc-deploy
cd vdoc-deploy
curl -fLO https://chnmig.github.io/Vdoc-site/downloads/docker-compose.yml
chmod 600 docker-compose.yml
```

The website serves the current stable release. For a specific version, download the same YAML from the [v0.3.0 Release](https://github.com/ChnMig/Vdoc-site/releases/tag/v0.3.0). Its `docker-compose.yml.sha256` attachment can verify the downloaded bytes.

<div id="initial-admin"></div>

## 2. Fill In Settings and Your Login

Edit `docker-compose.yml`, replace every `CHANGE_ME` value, and set the administrator email and name. Quote passwords in YAML. Write a literal `$` as `$$` so Compose does not interpret it as an environment variable.

| Setting                                                | Purpose                                                                                                                |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| `VDOC_DATABASE_PASSWORD`                               | PostgreSQL password, shared with its container through a YAML anchor                                                   |
| `VDOC_STORAGE_ACCESS_KEY` / `VDOC_STORAGE_SECRET_KEY`  | RustFS account and password, also shared through anchors                                                               |
| `VDOC_JWT_KEY`                                         | Signs and verifies login credentials; use an independent random key of at least 32 characters                          |
| `VDOC_MCP_TOKEN_CIPHER_KEY`                            | Encrypts stored MCP tokens, AI Provider keys, and share capabilities; use another random key of at least 32 characters |
| `VDOC_INITIAL_ADMIN_EMAIL` / `VDOC_INITIAL_ADMIN_NAME` | Initial administrator email and name                                                                                   |
| `VDOC_INITIAL_ADMIN_PASSWORD`                          | Initial administrator password, 12–72 bytes                                                                            |

RustFS requires an access key of at least 3 characters and a secret key of at least 8 characters. Generate values with a password manager, or run `openssl rand -hex 32` separately for the JWT and MCP keys.

You supply these values and keep them in Compose; the backend does not create a separate key file. Preserve them during upgrades. Changing the JWT key invalidates existing login credentials; losing the MCP encryption key prevents reading affected stored ciphertext. Keep your completed YAML private.

The initial administrator is created only when the user table is empty. Restarting or upgrading does not create duplicates or overwrite passwords changed later by users. Public registration is disabled by default; the backend refuses to start with an empty database and no usable administrator configuration.

## 3. Start Vdoc

```sh
docker compose pull
docker compose up -d
docker compose ps
```

Compose first runs `config-check` once. If placeholders remain or required settings are invalid, validation fails before PostgreSQL or RustFS initializes. Correct the YAML and run `docker compose up -d` again.

After validation, Compose starts PostgreSQL, RustFS, Backend, and Admin. Backend creates tables, applies pending database migrations, creates the storage bucket, and initializes the first administrator during startup. An `Exited (0)` status for the completed `config-check` container is expected.

Open the [Vdoc workbench](http://127.0.0.1:8081) and sign in with your configured administrator account. Backend health is available at `http://127.0.0.1:8080/api/v1/open/health`.

Next: [publish your first document and query it with an agent](admin-usage.md).

<div id="compose-example"></div>

## Complete Compose Example

This example includes all settings, four persistent services, a one-shot configuration check, health checks, and data volumes. It reads directly from the published YAML source and matches the download. Replace the placeholders before starting.

<<< @/../workspace/deploy/docker-compose.yml{yaml} [docker-compose.yml]

## Update the Version

Back up your data, update the `x-backend-image` and `x-admin-image` version tags in your existing YAML, and preserve all other settings. Then run:

```sh
docker compose pull
docker compose up -d
```

Backend applies migrations included in the new version; completed migrations are not repeated. This does not track the latest release automatically: the deployer chooses when to update. A failed migration prevents normal backend startup. Follow [Upgrade and Rollback](release-rollback.md) to inspect failures and recover.

## Daily Management and Persistence

Run these commands from the directory containing your YAML:

```sh
docker compose ps
docker compose logs --tail=100 backend admin postgres rustfs
docker compose stop
docker compose up -d
```

`docker compose down` removes containers and networks while preserving named volumes. Do not use `docker compose down -v` for data you need to keep: it deletes `postgres-data`, `rustfs-data`, and `rustfs-logs`. Keep the Compose project name `vdoc`; changing it selects different volumes.

PostgreSQL 18 mounts its data volume at `/var/lib/postgresql`. Vdoc application migrations do not upgrade the PostgreSQL major version. Older database majors require a separate `pg_upgrade` or dump/restore procedure.

## Deploy on a Server

Ports bind to `127.0.0.1` by default, suitable for local access or an HTTPS reverse proxy on the same server. PostgreSQL and RustFS are available only inside the Compose network.

For server domains, set `VDOC_ADMIN_API_BASE_URL` to the browser-accessible HTTPS backend URL and `VDOC_SERVER_CORS_ALLOWED_ORIGINS` to the exact HTTPS workbench origin in YAML. If your proxy runs in another container or host, also adjust ports or networking so it can reach Backend and Admin.

Backend uses `postgres:5432` and `rustfs:9000` internally. Do not use `http://backend:8080` as the browser API URL: browsers cannot resolve Compose service names. Apply configuration edits with `docker compose up -d`.

<div id="engineering-and-release-checks"></div>

## Source Development and Advanced Settings

Application deployments do not require the source bootstrap archive. To modify code, run disposable E2E tests, or use external database/object storage services, see the [public workspace deployment guide](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/COMPOSE_DEPLOY.md). The source workspace retains `.env`, test database scripts, and exact source locks for development and release verification.

Key rotation must account for stored ciphertext; replacing a key alone is insufficient. Follow the [operations guide](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md) to configure historical KIDs and the keyring, and verify the rewrite before removing old keys.
