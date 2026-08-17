# 部署指南

本页面向想把 Vdoc 跑起来的用户。先用 Docker Compose 启动 backend API、Admin 和本地依赖，再按需要改成直接部署 backend/Admin，或接入外部 PostgreSQL 和 S3 compatible storage。

## 你会部署什么

根目录 `docker-compose.yml` 会启动四个服务：

- `postgres`：PostgreSQL，保存用户、项目、审核流和版本元数据。
- `rustfs`：S3 compatible object storage，保存 raw 和 normalized 文档对象。
- `backend`：Vdoc API、MCP endpoint、迁移和对象存储写入。
- `admin`：人工工作台。

Backend 启动时，如果 `VDOC_DATABASE_ENABLED=true`，会连接 PostgreSQL 并自动运行 Vdoc migrations。连接或迁移失败会让启动失败，不会静默退回内存模式。如果 `VDOC_STORAGE_ENABLED=true`，backend 会连接对象存储，bucket 不存在时会自动创建。

## 获取已锁定的 workspace

`v0.1.0-rc.1` prerelease 提供 checksummed 单入口 bootstrap。不要从五个移动中的 `main` 分支手工拼 workspace；下载 archive 和 checksum，校验后让 initializer 按 `workspace.lock.json` 获取五个精确提交：

```sh
VDOC_BOOTSTRAP_BASE=https://github.com/ChnMig/Vdoc/releases/download/v0.1.0-rc.1
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-workspace-bootstrap-v0.2.tar.gz"
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-workspace-bootstrap-v0.2.tar.gz.sha256"
shasum -a 256 -c vdoc-workspace-bootstrap-v0.2.tar.gz.sha256
tar -xzf vdoc-workspace-bootstrap-v0.2.tar.gz
cd vdoc-workspace
scripts/vdoc-workspace-init.sh
```

发布页：<https://github.com/ChnMig/Vdoc/releases/tag/v0.1.0-rc.1>。这是 release candidate，不代表生产就绪或真实 Pilot 已完成。

## 方式 1：完整 Docker Compose

从 workspace root 执行命令，也就是包含 `docker-compose.yml`、`.env.example`、`Vdoc/`、`Vdoc-admin/`、`Vdoc-mcp/` 和 `Vdoc-skill/` 的目录。

```sh
scripts/vdoc-local-bootstrap.sh
```

Bootstrap 会写入本机一次性 `.env`，并且不会把 secret 打印到终端。如果你改为手工复制 `.env.example`，至少替换这些占位符：

- `VDOC_POSTGRES_PASSWORD`
- `VDOC_STORAGE_ACCESS_KEY`
- `VDOC_STORAGE_SECRET_KEY`
- `VDOC_JWT_KEY`
- `VDOC_MCP_TOKEN_CIPHER_KEY`
- `VDOC_INITIAL_ADMIN_EMAIL`
- `VDOC_INITIAL_ADMIN_PASSWORD`

Bootstrap 还会从当前 `Vdoc/` 和 `Vdoc-admin/` checkout 写入 build version、Git commit 和 build time。工作树有修改时 commit 会带 `-dirty`，这只适用于本机开发，不能作为发布或正式 Pilot 来源。手工维护 `.env.example` 时，这些 provenance 必须和 `workspace.lock.json` 一起更新。

当注册保持默认关闭（`VDOC_AUTH_ALLOW_REGISTRATION=false`）时，空数据库首次启动必须同时提供 `VDOC_INITIAL_ADMIN_EMAIL`、`VDOC_INITIAL_ADMIN_NAME` 和 `VDOC_INITIAL_ADMIN_PASSWORD`。Backend 只会在用户表为空时创建这个 SuperAdmin，密码入库前会做 bcrypt hash。只有可信的一次性环境显式开启注册、并计划在首个账号创建后立即关闭注册时，才可以留空这组三元组。

`.env.example` 故意把初始管理员字段留成空占位符，以便缺少引导入口时安全失败；它不是可直接启动的配置。请使用 `scripts/vdoc-local-bootstrap.sh` 生成完整值，或在启动前手工填写三元组。

不要提交 `.env`，也不要把原始 JWT、MCP Token、DB password、storage secret 或 `Authorization` header 值写入文档、日志、截图或 issue。

先校验 Compose 配置，不打印渲染后的 secret：

```sh
docker compose --env-file .env config --quiet
```

启动完整系统：

```sh
docker compose --env-file .env up -d --build
```

查看状态和日志：

```sh
docker compose --env-file .env ps
docker compose --env-file .env logs -f backend
docker compose --env-file .env logs --tail=100 admin postgres rustfs
```

默认本机访问地址：

- Backend health：`http://127.0.0.1:8080/api/v1/open/health`
- Admin：`http://127.0.0.1:8081`
- PostgreSQL host port：`127.0.0.1:5432`
- RustFS S3 API：`http://127.0.0.1:9000`
- RustFS console：`http://127.0.0.1:9001`

健康检查示例：

```sh
curl http://127.0.0.1:8080/api/v1/open/health
curl -I http://127.0.0.1:8081/
docker compose --env-file .env exec backend /app/vdoc --version
jq -r '.repositories[] | select(.path == "Vdoc") | .commit' workspace.lock.json
```

不要只检查 HTTP 200；Vdoc 的业务 envelope 在依赖异常时仍可能返回 HTTP 200。部署探针必须确认 `.detail.healthy == true`。官方 backend image 的 healthcheck 已执行该语义检查。版本输出不能是 `dev`/`unknown`，正式候选的 Git commit 必须和 lock 完全一致且不能带 `-dirty`。受支持 Dockerfile、Compose 和 backend CI service 的基础镜像都同时固定 tag 与 OCI digest。

可选：backend 健康后写入 demo 数据：

```sh
cd Vdoc && go run ./tools/vdoc-demo-seed
```

可选：用正在运行的 root Compose 做 live E2E：

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E 会重置选中的一次性 `VDOC_TEST_POSTGRES_DB`，默认是 `vdoc_e2e`。它不会使用或重置 `VDOC_POSTGRES_DB` 指向的应用数据库。不要把 `VDOC_TEST_POSTGRES_DB` 指向应用数据库。

本机发布门禁使用 release dry-run：

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

这个 dry-run 只运行本机检查，不会发布 package、部署服务、push image 或创建 git ref。

停止但保留容器和数据：

```sh
docker compose --env-file .env stop
```

删除容器和网络，但保留 named volumes：

```sh
docker compose --env-file .env down
```

PostgreSQL 18 会把数据放在带主版本号的子目录中，因此 Compose 把 named volume 挂载到 `/var/lib/postgresql`。如果 `postgres-data` 是由 PostgreSQL 17 或更早版本创建的，必须先通过 `pg_upgrade` 或 dump/restore 完成迁移，再启动 PostgreSQL 18。Compose 不会自动执行数据库主版本迁移，升级过程中也不要使用 `down -v`。

不要在非一次性环境运行 `docker compose down -v`，它会删除 `postgres-data`、`rustfs-data` 和 `rustfs-logs`。

## 本机地址和 Compose 服务名

`localhost`、`127.0.0.1` 和你的域名用于宿主机命令或浏览器访问。Docker Compose 内部容器互相访问时使用服务名。

完整 Compose 中已经按这个规则配置：

- backend 连接 PostgreSQL：`postgres:5432`
- backend 连接 RustFS：`rustfs:9000`
- Admin 浏览器访问 backend：`VDOC_ADMIN_API_BASE_URL=http://127.0.0.1:8080`

不要把 `VDOC_ADMIN_API_BASE_URL` 设置成 `http://backend:8080`，因为用户浏览器不能解析 Compose 服务名。

## `.env` 常用配置

本机端口可以在 `.env` 中改：

```sh
VDOC_POSTGRES_HOST_PORT=5432
VDOC_PUBLISH_ADDRESS=127.0.0.1
VDOC_RUSTFS_HOST_PORT=9000
VDOC_RUSTFS_CONSOLE_HOST_PORT=9001
VDOC_BACKEND_HOST_PORT=8080
VDOC_ADMIN_HOST_PORT=8081
```

backend 安全和持久化配置：

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

完整 Compose 已把 `http://127.0.0.1:8081` 和 `http://localhost:8081` 加入 backend 的精确 CORS allowlist。修改 `VDOC_ADMIN_HOST_PORT` 或使用正式域名时，必须同步更新 `VDOC_SERVER_CORS_ALLOWED_ORIGINS` 并重建 backend container。

所有 host ports 默认只绑定 `127.0.0.1`，避免本地一次性环境、公开注册、PostgreSQL 或 RustFS 意外暴露到局域网。只有在已经配置防火墙、TLS 和外部访问控制时才显式修改 `VDOC_PUBLISH_ADDRESS`；RustFS CORS 也应保持精确 Console origin，禁止使用 `*`。

Backend 直连浏览器时不要设置 `VDOC_SERVER_TRUSTED_PROXIES`。若 TLS 由 Caddy、Nginx 或 Ingress 终止，应将该变量设置为 backend 实际连接到的代理 IP/CIDR，多个值使用逗号分隔。禁止使用 `0.0.0.0/0` 或 `::/0`；配置文件变化只会被校验，运行配置需要安全重启后才生效。

Admin Docker runtime 配置：

```sh
VDOC_ADMIN_API_BASE_URL=http://127.0.0.1:8080
```

这个值会在 admin container 启动时写入 `/runtime-config.js`。它必须是浏览器能访问的 backend origin。

## 密文 KID 轮换

`VDOC_MCP_TOKEN_CIPHER_KEY` 同时保护 MCP Token reveal 密文、AI Provider API key 和 public-share capability，三类数据必须作为一个轮换单元处理。`VDOC_MCP_TOKEN_CIPHER_KEYRING` 是历史 `KID -> key` 的 secret JSON map；active KID 不能在历史 keyring 中重复，同一个 KID 也绝不能换成另一把 key。

1. 备份 PostgreSQL，并把 backend writer 缩到一个实例。
2. 把旧 active KID/key 放进历史 keyring，设置全新 active KID 和 key。例如：`VDOC_MCP_TOKEN_CIPHER_KEYRING={"local-aes-gcm-v1":"<old-key>"}`。
3. 启动一个 backend。启动阶段会先解密并验证全部三类记录，再在一个 repository transaction 中改写为新 active KID。未知 KID、错误 key 或 hash 不一致会中止启动，不会保存一半轮换结果。
4. 核对 `mcp_tokens`、`ai_providers` 和 `document_shares` 只剩 active KID，并分别验证一个 MCP Token、Provider 和 share。
5. 清空历史 keyring 后再次重启和验证，成功后再恢复正常实例数。

不要在完成第 5 步前删除旧 key，也不要把 keyring JSON 放进命令参数、Git、日志、截图或 issue。完整 SQL 检查和发布门禁见 workspace root 的 `RELEASE_DEPLOY.md`。

## 方式 2：直接运行 backend 和 Admin

直接运行适合开发、单机试点或你已经有自己的进程管理方式。

Backend 示例：

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

Admin 本地开发示例：

```sh
cd Vdoc-admin
cp .env.example .env
printf 'VITE_VDOC_API_BASE_URL=http://127.0.0.1:8080\n' > .env
pnpm install
pnpm dev
```

Admin Docker 直接运行示例：

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

## 方式 3：外部 PostgreSQL 和对象存储

如果你已有 PostgreSQL、RustFS、MinIO 或托管 S3 compatible storage，只需要让 backend 指向外部依赖。

外部 PostgreSQL 示例：

```sh
VDOC_DATABASE_ENABLED=true
VDOC_DATABASE_DSN=postgres://vdoc:replace-with-password@db.example.internal:5432/vdoc?sslmode=require
```

外部对象存储示例：

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

如果 PostgreSQL password 包含 URI 保留字符，放进 `VDOC_DATABASE_DSN` 前要 percent encode。外部对象存储是否使用 path style 取决于供应商要求。

## 部署完成后的下一步

1. 打开 backend health，确认返回成功。
2. 打开 Admin，使用初始管理员登录。匿名注册默认关闭；只有可信的一次性或试点环境才可显式设置 `VDOC_AUTH_ALLOW_REGISTRATION=true` 后注册第一个用户，并应在引导完成后立即关闭并重建 backend container。
3. 按 [首次使用](admin-usage) 创建 Project、Document、Draft、Version 和 MCP Token。
4. 按 [MCP 工具](mcp-tools) 和 [Skill 工作流](skill-workflows) 连接 Agent。
