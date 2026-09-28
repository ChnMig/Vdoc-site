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

Next: [publish your first document and query it with an agent](admin-usage.md).

<div id="compose-example"></div>

## Complete Compose Example

This example includes all settings, four persistent services, a one-shot configuration check, health checks, and data volumes. It reads directly from the published YAML source and matches the download. Replace the placeholders before starting.

<<< @/../workspace/deploy/docker-compose.yml{yaml} [docker-compose.yml]

## Update versions

Keep the image names unchanged to follow stable releases. Read release notes, back up data, preserve the existing YAML, credentials, keys, domain settings and volumes, then run:

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

`docker compose down` removes containers and networks while preserving named volumes. Do not use `docker compose down -v` for data you need to keep: it deletes `postgres-data`, `rustfs-data`, and `rustfs-logs`. Keep the Compose project name `vdoc`; changing it selects different volumes.

PostgreSQL 18 mounts its data volume at `/var/lib/postgresql`. Vdoc application migrations do not upgrade the PostgreSQL major version. Older database majors require a separate `pg_upgrade` or dump/restore procedure.

## Use a domain with Caddy {#caddy-domain}

Keep frontend and backend on separate domains and ports: `docs.example.com` proxies to `127.0.0.1:8081`, while `api.example.com` proxies to `127.0.0.1:8080`. This example runs Caddy on the same host as Docker.

1. Point both domains' DNS A/AAAA records at the server and allow inbound ports 80/443 to Caddy. Keep only reachable IPv6 records. Caddy obtains and renews HTTPS certificates automatically.
2. Keep backend CORS set to `*` and set the frontend API URL to the backend HTTPS origin, without `/api` or a trailing slash:

   ```yaml
   VDOC_SERVER_CORS_ALLOWED_ORIGINS: '*'
   VDOC_ADMIN_API_BASE_URL: 'https://api.example.com'
   ```

   The first is under `x-backend-environment` and permits browser clients from any origin. The second is under `services.admin.environment`; Admin runtime config and CSP permit that backend origin. Open CORS retains login, permission, MCP Token and share-capability checks and does not enable cross-site cookies. CLI Skill/MCP clients normally are not subject to browser CORS; they also connect to the backend domain. Leaving the local defaults makes visitors' browsers call their own `127.0.0.1`. Run `docker compose up -d --wait` after changing configuration so Admin regenerates its runtime config.

3. Add this block to the external Caddyfile, replace both domains, then run `caddy validate --config /etc/caddy/Caddyfile` and `caddy reload --config /etc/caddy/Caddyfile`:

<<< @/../workspace/deploy/Caddyfile{caddyfile} [Caddyfile]

Caddy selects upstreams by hostname without path routing or rewriting. Backend retains the full `/api/v1/...` path. Admin serves the SPA fallback, so refreshing project pages, sign-in pages and share links works.

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

Start Vdoc first to create the network. If you changed its project name, use the actual network name. Preserve Caddy's other networks and configuration. The browser-facing API origin remains `https://api.example.com`, never a Docker service name.

For client-IP logging and rate limits, set Backend's `VDOC_SERVER_TRUSTED_PROXIES` to the trusted Caddy source IP or dedicated proxy subnet as seen by Backend; host forwarding may appear as the Docker gateway. Trust only controlled proxies, never `0.0.0.0/0`.

### Verify first use

```sh
curl -fsS https://api.example.com/api/v1/open/health
curl -fsS https://docs.example.com/runtime-config.js
```

The health response should have `code: 200`; `apiBaseUrl` should match the backend HTTPS domain. Sign in with the initial administrator, then:

1. Create a team, project and Markdown or OpenAPI document.
2. Create a draft, submit it for review, publish it and open the published content.
3. Create an MCP Token, connect using `https://api.example.com`, and query the published version with `get_latest_doc` or `get_latest_schema`.
4. If public sharing is needed, create a share link and open it in a signed-out window.

See [Workbench usage](admin-usage.md) for details. Core workflows need no AI provider; AI features require a usable Provider, model and API Key configured in the workbench. See [AI configuration](admin-ai.md).

<div id="engineering-and-release-checks"></div>

## Source Development and Advanced Settings

Application deployments do not require the source bootstrap archive. To modify code, run disposable E2E tests, or use external database/object storage services, see the [public workspace deployment guide](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/COMPOSE_DEPLOY.md). The source workspace retains `.env`, test database scripts, and exact source locks for development and release verification.

Key rotation must account for stored ciphertext; replacing a key alone is insufficient. Follow the [operations guide](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md) to configure historical KIDs and the keyring, and verify the rewrite before removing old keys.
