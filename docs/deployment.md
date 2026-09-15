# 部署指南

用 Docker Compose 在自己的机器上运行 Vdoc，打开工作台，再让 Agent 查询第一份文档。首次试用按下面四步完成；已有环境可直接去 [首次使用](admin-usage.md)。

## 开始前准备

- macOS、Linux 或 Windows 的 WSL 环境，已启动 Docker，且 `docker compose version` 可用。
- 已安装 Bash、Git、curl、jq、tar 和 `shasum`（初始化脚本也会调用它）。
- 能访问 GitHub、容器镜像仓库和构建依赖源。首次启动会在本机构建 Backend/Admin，耗时取决于网络与机器性能。

这仍然是 Docker 部署。下载的是 Docker Compose bootstrap，不是 Backend 二进制，也不包含预构建镜像；它提供 Compose、配置模板、初始化脚本和精确源码锁。

[公开工作区文件](https://github.com/ChnMig/Vdoc-site/tree/main/workspace)和 Compose 下载均由 Vdoc-site 提供。部署包名称和五个仓库的源码标签统一使用 `v0.1.0`。正式打包时会核对全部标签，并在包内锁定五个精确提交号。正式使用前请阅读 [版本说明](version-notes.md) 和 [升级与回滚](release-rollback.md)。

<div id="quick-start"></div>

## 快速开始（推荐）

### 1. 下载并初始化

可直接下载 [Compose 压缩包](https://vibe-doc.com/downloads/vdoc-compose-bootstrap-v0.1.0.tar.gz)和 [SHA-256 校验文件](https://vibe-doc.com/downloads/vdoc-compose-bootstrap-v0.1.0.tar.gz.sha256)，也可使用下面的命令。官网快照可能更新，复现部署时请保留压缩包和校验文件。

在一个新的工作目录里执行。先校验下载文件，再让初始化脚本按 `workspace.lock.json` 获取五个仓库的精确提交：

```sh
VDOC_BOOTSTRAP_BASE=https://vibe-doc.com/downloads
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-compose-bootstrap-v0.1.0.tar.gz"
curl -fLO "$VDOC_BOOTSTRAP_BASE/vdoc-compose-bootstrap-v0.1.0.tar.gz.sha256"
shasum -a 256 -c vdoc-compose-bootstrap-v0.1.0.tar.gz.sha256
```

看到校验结果 `OK` 后，再继续：

```sh
tar -xzf vdoc-compose-bootstrap-v0.1.0.tar.gz
cd vdoc-workspace
scripts/vdoc-workspace-init.sh
```

后续命令都在这个 workspace 根目录执行。已有 workspace 请核对原有版本，不要用五个移动中的 `main` 分支拼装，也不要覆盖原配置。

<div id="initial-admin"></div>

### 2. 生成配置，设置登录账号

```sh
scripts/vdoc-local-bootstrap.sh
```

脚本把本机运行密钥写入 `.env`，不会在终端打印密钥。**当前脚本会开启本机注册，并将初始管理员字段留空。** 首次试用按这里的固定账号方式登录：在本机编辑器打开 `.env`，修改以下已有字段，填写你自己的邮箱、名称和密码：

```dotenv
VDOC_AUTH_ALLOW_REGISTRATION=false
VDOC_INITIAL_ADMIN_EMAIL=admin@example.com
VDOC_INITIAL_ADMIN_NAME=Vdoc Admin
VDOC_INITIAL_ADMIN_PASSWORD=replace-with-your-own-password
```

示例密码必须替换。使用 12–72 字节的独立密码，首尾不要留空格；如果值包含 `$` 或 `#` 等 Compose 特殊字符，请用单引号包住完整密码。保存 `.env` 后再启动，登录时使用这里填写的邮箱和密码。

空数据库首次启动必须同时提供 `VDOC_INITIAL_ADMIN_EMAIL`、`VDOC_INITIAL_ADMIN_NAME` 和 `VDOC_INITIAL_ADMIN_PASSWORD`，以便在注册关闭时创建初始 SuperAdmin。Backend 只在用户表为空时创建该账号；已有数据时修改这些字段不会重置现有账号。

`.env.example` 保留空占位符，在缺少引导入口时安全失败；它不是可直接启动的配置。不要提交 `.env`，或把密码、JWT、MCP Token、存储密钥和 `Authorization` 值放进截图、日志或文档。脚本也不会覆盖已有 `.env`，已有环境请直接检查原配置。

### 3. 启动 Vdoc

先校验配置，通过后再构建并启动：

```sh
docker compose --env-file .env config --quiet
```

```sh
docker compose --env-file .env up -d --build
```

Compose 会启动工作台（Admin）、后端（Backend）、PostgreSQL 数据库和 RustFS 对象存储。数据库保存用户、项目和版本元数据，对象存储保存文档内容。

### 4. 确认启动成功

```sh
docker compose --env-file .env ps
curl -fsS http://127.0.0.1:8080/api/v1/open/health | jq -e '.detail.healthy == true'
```

健康检查应输出 `true`。仅 HTTP 200 不足以说明依赖正常；必须确认 `.detail.healthy == true`。首次构建后，等待服务就绪再检查。

在浏览器打开 [Vdoc 工作台](http://127.0.0.1:8081)，用第 2 步设置的账号登录。能打开工作台且健康检查通过后，继续 **[发布第一份文档并让 Agent 查询](admin-usage.md)**。无需先配置 Admin AI 或执行工程发布检查。

如果页面打不开，先查看 `docker compose --env-file .env ps` 和 Backend 日志。健康检查失败、端口冲突或登录失败时，参阅 [故障排查](troubleshooting.md)。

## 部署后的日常管理

以下命令仍从 workspace 根目录执行。

查看状态和日志：

```sh
docker compose --env-file .env ps
docker compose --env-file .env logs --tail=100 backend admin postgres rustfs
```

默认本机访问地址：

| 用途             | 地址                                       |
| ---------------- | ------------------------------------------ |
| 工作台           | `http://127.0.0.1:8081`                    |
| Backend 健康检查 | `http://127.0.0.1:8080/api/v1/open/health` |
| PostgreSQL       | `127.0.0.1:5432`                           |
| RustFS S3 API    | `http://127.0.0.1:9000`                    |
| RustFS Console   | `http://127.0.0.1:9001`                    |

停止服务并保留容器和数据：

```sh
docker compose --env-file .env stop
```

删除容器和网络，但保留 named volumes：

```sh
docker compose --env-file .env down
```

PostgreSQL 18 会把数据放在带主版本号的子目录中，因此 Compose 把 named volume 挂载到 `/var/lib/postgresql`。如果 `postgres-data` 来自 PostgreSQL 17 或更早版本，必须先通过 `pg_upgrade` 或 dump/restore 完成迁移。Compose 不会自动执行数据库主版本迁移。

不要在非一次性环境运行 `docker compose down -v`，它会删除 `postgres-data`、`rustfs-data` 和 `rustfs-logs`。

## 手工配置和运行行为

如果不使用初始化脚本，手工复制 `.env.example` 后，还需替换 `VDOC_POSTGRES_PASSWORD`、`VDOC_STORAGE_ACCESS_KEY`、`VDOC_STORAGE_SECRET_KEY`、`VDOC_JWT_KEY` 和 `VDOC_MCP_TOKEN_CIPHER_KEY`，并完成上面的初始管理员设置。

Bootstrap 会从 `Vdoc/` 和 `Vdoc-admin/` checkout 写入 build version、Git commit 和 build time。工作树有修改时 commit 会带 `-dirty`，只适用于本机开发；手工维护来源信息时，需要与 `workspace.lock.json` 一起更新。

`VDOC_DATABASE_ENABLED=true` 时，Backend 启动会连接 PostgreSQL 并自动运行 migrations；连接或迁移失败会停止启动，不会静默退回内存模式。`VDOC_STORAGE_ENABLED=true` 时，Backend 会连接对象存储，bucket 不存在时会尝试创建。

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

不要在完成第 5 步前删除旧 key，也不要把 keyring JSON 放进命令参数、Git、日志、截图或 issue。完整 SQL 检查和发布门禁见 [RELEASE_DEPLOY.md](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md)。

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

## 工程验证与发布检查

首次试用完成后，维护者可按需执行这些检查。它们不属于首次登录和 Agent 查询的必经步骤。

检查运行版本与锁定来源：

```sh
docker compose --env-file .env exec backend /app/vdoc --version
jq -r '.repositories[] | select(.path == "Vdoc") | .commit' workspace.lock.json
```

正式候选版本不能是 `dev`/`unknown`，Git commit 必须与 lock 一致且不带 `-dirty`。受支持 Dockerfile、Compose 和 Backend CI service 的基础镜像均固定 tag 与 OCI digest。

可选 demo 数据需要宿主机安装 Go，并在 Backend 健康后执行；括号让命令结束后仍留在 workspace 根目录：

```sh
(cd Vdoc && go run ./tools/vdoc-demo-seed)
```

维护者可在一次性测试数据库中执行 live E2E：

```sh
(cd Vdoc && ./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only)
(cd Vdoc && ./scripts/vdoc-e2e.sh live-compose --env-file ../.env)
```

Live E2E 会重置 `VDOC_TEST_POSTGRES_DB`（默认 `vdoc_e2e`），不会重置应用数据库 `VDOC_POSTGRES_DB`。不要把测试数据库指向应用数据库。

从 workspace 根目录运行本机发布门禁：

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

这些命令不会发布 package、部署服务、推送镜像或创建 Git ref；通过自动化检查不代表真实 Pilot 已完成。完整发布要求见 [升级与回滚](release-rollback.md)。

部署试用的下一步是 [首次使用](admin-usage.md)：发布一份 Markdown，再让 Agent 读到它。
