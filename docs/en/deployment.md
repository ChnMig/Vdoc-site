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

Backend and Admin use `latest`, tracking published stable releases. PostgreSQL uses `18`, tracking 18.x patch updates, while RustFS uses `1.0.0`. The download URL and application image names stay the same across releases. Docker resolves `latest` when you run `docker compose pull`; running containers do not update by themselves.

If you already run PostgreSQL, choose the [external database variant](#external-postgresql), which does not start a database container. Both YAML files include field comments. Use either file on its own.

[Site Releases](https://github.com/ChnMig/Vdoc-site/releases) retain each YAML and its `docker-compose.yml.sha256` sidecar to verify the configuration source. A versioned YAML containing `latest` still follows rolling images. To pin an application release, replace both application aliases with the same desired `vX.Y.Z` tag or recorded digests.

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

Both Compose files default to `VDOC_ADMIN_API_BASE_URL: 'same-origin'`. Browsers request `/api/v1/...` on the current workbench origin, and Admin's built-in Caddy forwards those requests to `backend:8080`. For local access, the API origin is `http://127.0.0.1:8081`. The separate backend port remains available for direct Skill, MCP and CLI access.

Next: [publish your first document and query it with an agent](admin-usage.md).

<div id="compose-example"></div>

## Complete Compose Example

This example includes all settings, four persistent services, a one-shot configuration check, health checks, and data volumes. It reads directly from the published YAML source and matches the download. Replace the placeholders before starting.

<<< @/../workspace/deploy/docker-compose.yml{yaml} [docker-compose.yml]

## Connect to existing PostgreSQL {#external-postgresql}

Download [docker-compose.external-postgres.yml](https://chnmig.github.io/Vdoc-site/downloads/docker-compose.external-postgres.yml) and save it as the only `docker-compose.yml` in a dedicated deployment directory. Do not layer it over the bundled database variant: Compose merging does not remove the original `postgres` service.

```sh
mkdir vdoc-external-db
cd vdoc-external-db
curl -fL https://chnmig.github.io/Vdoc-site/downloads/docker-compose.external-postgres.yml -o docker-compose.yml
chmod 600 docker-compose.yml
```

This variant starts RustFS, Backend, Admin and the one-shot configuration check. It creates no PostgreSQL service or database volume. Your existing database service controls its version, backups, availability and upgrades; this example is tested with PostgreSQL 18. Application images still use `latest`, and RustFS stays on `1.0.0`.

1. Prepare a **dedicated Vdoc database** and login. Backend creates tables and applies migrations inside that database, but does not create the database itself. The login needs connection, read/write, and application table/index creation and alteration permissions. For a new database, make this login its owner and allow `USAGE` and `CREATE` on the `public` schema. Do not reuse another application's database. If these do not exist, a database administrator can run in `psql`:

   ```sql
   CREATE ROLE vdoc LOGIN;
   \password vdoc
   CREATE DATABASE vdoc OWNER vdoc;
   ```

   `\password` sets the password interactively. Use existing database/login settings if already prepared; do not recreate them.

2. Edit the connection fields in `x-backend-environment`, and replace all storage, JWT, MCP and initial administrator placeholders:

   | Field                                                           | Value                                                                                                                                                                                                                                                     |
   | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `VDOC_DATABASE_HOST`                                            | Database hostname or IP reachable from the container, without a scheme or port                                                                                                                                                                            |
   | `VDOC_DATABASE_PORT`                                            | Actual database port, default `5432`                                                                                                                                                                                                                      |
   | `VDOC_DATABASE_NAME` / `VDOC_DATABASE_USER`                     | Prepared dedicated database and login                                                                                                                                                                                                                     |
   | `VDOC_DATABASE_PASSWORD`                                        | Login password; no URL encoding needed, but write literal `$` as `$$`                                                                                                                                                                                     |
   | `VDOC_DATABASE_SSL_MODE`                                        | Default `require` encrypts traffic using TLS without verifying server identity. Use `disable` only for a trusted local/private instance explicitly running without TLS. Follow your managed database provider's certificate and verification requirements |
   | `VDOC_DATABASE_MAX_OPEN_CONNS` / `VDOC_DATABASE_MAX_IDLE_CONNS` | Default `20` / `5`; fit the database connection quota, with idle connections no greater than the total                                                                                                                                                    |

   For a database on the Docker host, use `host.docker.internal` and the host's database port. Backend includes the Linux `host-gateway` mapping. Container `127.0.0.1` points to that container; the database must listen on a container-reachable address, and `pg_hba.conf` and the firewall must allow the actual container source.

   If the database runs on another Compose network, attach Backend to that existing network to use its database service name. Retain Backend's default network for RustFS access. A service name alone does not connect separate networks.

3. For domain access, retain `VDOC_ADMIN_API_BASE_URL: 'same-origin'`; use the same [two-domain Caddy setup](#caddy-domain) as the bundled database variant. Once the existing database is ready, run:

   ```sh
   docker compose config --quiet
   docker compose pull
   docker compose up -d --wait
   docker compose logs --tail=100 backend admin rustfs
   ```

`config-check` validates configuration without connecting to the database. Backend performs the real connection, authentication, TLS negotiation and migrations at startup; inspect its logs if connection fails. This project's `depends_on` cannot manage readiness of an external database.

Here, `docker compose down` does not stop the external database. `down -v` still deletes this project's RustFS volumes and document objects. Moving an existing Vdoc installation requires transferring its database contents and preserving object storage and original keys; pointing HOST at an empty database is not a data migration.

### Complete external PostgreSQL Compose example {#external-compose-example}

The full example below reads directly from the published external-database YAML, including every service, setting and field comment, and matches the download. Copy the entire block into `docker-compose.yml`, fill in your existing database connection details, replace every placeholder, and follow the startup steps above.

<<< @/../workspace/deploy/docker-compose.external-postgres.yml{yaml} [docker-compose.external-postgres.yml]

## Update versions

Keep the image names unchanged to follow stable releases. Read release notes, back up data, preserve the existing YAML, credentials, keys, domain settings and volumes, then run:

If the existing `VDOC_ADMIN_API_BASE_URL` points to a separate backend domain or `127.0.0.1:8080`, first change it to `'same-origin'` and recreate Admin as described in [Upgrade and Rollback](release-rollback.md). The new mode uses Admin's built-in `/api/*` proxy; pulling an image does not update an existing cross-origin API setting.

```sh
docker compose pull
docker compose up -d --wait
```

The two `latest` aliases follow stable application releases, `postgres:18` receives 18.x patches, and RustFS stays on 1.0.0. These commands update containers; there is no unattended update process. Add any new configuration required by the release notes. Backend applies pending application migrations once; migration failures stop startup. See [Upgrade and Rollback](release-rollback.md).

## Daily Management and Persistence

Run these commands from the directory containing your YAML:

```sh
docker compose ps
docker compose logs --tail=100 backend admin postgres rustfs
docker compose stop
docker compose up -d
```

For the external database variant, omit `postgres` from the logs command. `pull` does not update the external database.

`docker compose down` removes containers and networks while preserving named volumes. Do not use `docker compose down -v` for data you need to keep: it deletes `postgres-data`, `rustfs-data`, and `rustfs-logs`. Keep the Compose project name `vdoc`; changing it selects different volumes.

PostgreSQL 18 mounts its data volume at `/var/lib/postgresql`. Vdoc application migrations do not upgrade the PostgreSQL major version. Older database majors require a separate `pg_upgrade` or dump/restore procedure.

## Use a domain with Caddy {#caddy-domain}

Keep frontend and backend on separate domains and ports: `docs.example.com` proxies to `127.0.0.1:8081`, while `api.example.com` proxies to `127.0.0.1:8080`. Browsers use `docs.example.com/api/v1/...`; Skill, MCP and CLI clients use `api.example.com`. This example runs Caddy on the same host as Docker.

1. Point both domains' DNS A/AAAA records at the server and allow inbound ports 80/443 to Caddy. Keep only reachable IPv6 records. Caddy obtains and renews HTTPS certificates automatically.
2. Retain these settings from either Compose file:

   ```yaml
   VDOC_SERVER_ENABLE_CORS: 'true'
   VDOC_ADMIN_API_BASE_URL: 'same-origin'
   ```

   The first is under `x-backend-environment`; the second is under `services.admin.environment`. `same-origin` makes the runtime config use `window.location.origin`, with `'self'` allowed in CSP `connect-src`. Browser authentication requests reach Backend through Admin's built-in proxy.

   Backend currently returns `Access-Control-Allow-Headers: *` without explicitly allowing `Authorization`, so this response cannot be relied on for authenticated cross-origin browser requests. Skill, MCP and CLI clients normally are not subject to browser CORS and continue to use `https://api.example.com`. When upgrading from a cross-origin configuration, change the API setting to `'same-origin'` and run `docker compose up -d --wait --force-recreate admin` to regenerate Admin's runtime config.

3. Add this block to the external Caddyfile, replace both domains, then run `caddy validate --config /etc/caddy/Caddyfile` and `caddy reload --config /etc/caddy/Caddyfile`:

<<< @/../workspace/deploy/Caddyfile{caddyfile} [Caddyfile]

The outer Caddy still selects upstreams by hostname and needs no additional path routing or rewriting. Admin's built-in Caddy forwards `/api/*` to `backend:8080`, retaining the full `/api/v1/...` path. Admin serves the SPA fallback for other paths, so refreshing project pages, sign-in pages and share links works.

Backend/Admin ports bind only to host loopback. PostgreSQL and RustFS need no public port; Backend reads document content from storage.

**If external Caddy also runs in Docker**, its `127.0.0.1` is not the host. Attach it to the existing `vdoc_default` network, and change the frontend upstream to `admin:8080` and the backend upstream to `backend:8080`. Add this persistent network to Caddy's own Compose configuration:

```yaml
services:
  caddy:
    networks:
      - vdoc
networks:
  vdoc:
    external: true
    name: vdoc_default
```

Start Vdoc first to create the network. If you changed its project name, use the actual network name. Preserve Caddy's other networks and configuration. Keep Admin's API setting at `'same-origin'`; browsers use `https://docs.example.com`, never a Docker service name.

Browser API requests pass through both external Caddy and Admin's built-in Caddy. Admin does not trust incoming `X-Forwarded-For` by default, and Backend also trusts no proxies by default. For real client-IP logging or rate limits, configure the external proxy as `trusted_proxies` in the `servers` block of a custom Admin Caddyfile, and set Backend's `VDOC_SERVER_TRUSTED_PROXIES` to the Admin source IP or dedicated proxy subnet as seen by Backend. Direct requests to the separate API domain pass through external Caddy alone; host forwarding may appear as the Docker gateway. Verify the full forwarding chain and trust only controlled proxies, never `0.0.0.0/0`.

### Verify first use

```sh
curl -fsS https://api.example.com/api/v1/open/health
curl -fsS https://docs.example.com/api/v1/open/health
curl -fsS https://docs.example.com/runtime-config.js
```

Both health responses should have `code: 200`; the runtime config should contain `apiBaseUrl: window.location.origin`. When browsers execute this JavaScript, the API origin is `https://docs.example.com`, rather than the separate backend domain. Sign in with the initial administrator, then:

1. Create a team, project and Markdown or OpenAPI document.
2. Create a draft, submit it for review, publish it and open the published content.
3. Create an MCP Token, connect using `https://api.example.com`, and query the published version with `get_latest_doc` or `get_latest_schema`.
4. If public sharing is needed, create a share link and open it in a signed-out window.

See [Workbench usage](admin-usage.md) for details. Core workflows need no AI provider; AI features require a usable Provider, model and API Key configured in the workbench. See [AI configuration](admin-ai.md).

<div id="engineering-and-release-checks"></div>

## Source Development and Advanced Settings

Application deployments do not require the source bootstrap archive; existing PostgreSQL instances can use the [external database variant](#external-postgresql) directly. To modify code, run disposable E2E tests, or use external object storage, see the [public workspace deployment guide](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/COMPOSE_DEPLOY.md). The source workspace retains `.env`, test database scripts, and exact source locks for development and release verification.

Key rotation must account for stored ciphertext; replacing a key alone is insufficient. Follow the [operations guide](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md) to configure historical KIDs and the keyring, and verify the rewrite before removing old keys.
