# Workspace Docker Compose Deployment

The [website download](https://vibe-doc.com/en/deployment) is a Docker Compose bootstrap, not an application binary
or a container-image bundle. It supplies the Compose/configuration files and a
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

`dev`, `unknown`, and a `-dirty` Git commit are not release provenance. All base images in the supported Dockerfiles, Compose files, and backend CI service are pinned with OCI digests.

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
