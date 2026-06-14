# 部署

本页把 Vdoc 从依赖选择、后端配置、Admin 运行、站点运行、MCP 验证到 Skill 验证串成一条可执行路径。你可以用仓库内 Docker Compose 启动本地依赖，也可以把后端连到外部 PostgreSQL 和 S3-compatible storage。所有示例都使用占位符，请换成目标环境的值，不要提交到仓库。

## 本页目标

- 选择 Docker Compose 依赖栈、完整 Compose 部署或外部依赖部署。
- 配置 Vdoc 后端持久化、对象存储和 token 加密环境变量。
- 启动 Admin 和站点，完成部署后的基本验证，不把端口或连接串写死在文档外。
- 为后续 [Admin 使用](admin-usage)、[MCP 工具](mcp-tools)、[Skill 工作流](skill-workflows) 做准备。

## 适用场景

- 本地 pilot，需要用 Docker Compose 快速启动 PostgreSQL 和 RustFS。
- 测试环境或预发布环境，需要连接外部 PostgreSQL、RustFS、MinIO、AWS S3 或其他 S3-compatible storage。
- 需要把 backend、Admin、site 和依赖放进同一套 Compose 时，按同一组变量注入 app services。
- 发布前需要跑 live backend smoke。

## 前置条件

- Go 版本与 `Vdoc/go.mod` 匹配。
- Node.js 20 或更新版本。
- `pnpm` 11.x，用于 `Vdoc-admin/` 和 `Vdoc-site/`。
- `npm`，用于 `Vdoc-mcp/` 和 `Vdoc-skill/`。
- Docker with Compose v2。
- 从 workspace root 执行命令，也就是包含 `Vdoc/`、`Vdoc-admin/`、`Vdoc-site/`、`Vdoc-mcp/`、`Vdoc-skill/` 的目录。

## 1. 选择部署模式并准备环境文件

Vdoc 的部署入口不是固定端口，而是一组可配置环境变量。先选择模式，再生成对应的本地环境文件：

| 模式              | 适用场景                                           | 连接方式                                                                                                                                      |
| ----------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Compose 依赖栈    | 本机开发或 pilot，后端在宿主机运行                 | 使用仓库内 `Vdoc/docker-compose.yml` 启动 PostgreSQL 和 RustFS，后端 `.env` 指向这些服务暴露出来的 host/port。                                |
| 完整 Compose 部署 | 想把 backend、Admin、site 和依赖放进同一套 Compose | 在你的 Compose app service 中注入同样的 `VDOC_*` 和 `VITE_*` 变量；数据库 host 通常是 Compose service name，例如 `postgres`，不是宿主机地址。 |
| 外部依赖部署      | 测试、预发布或生产已有托管数据库和对象存储         | `VDOC_DATABASE_DSN` 指向外部 PostgreSQL，`VDOC_STORAGE_*` 指向外部 S3-compatible storage。                                                    |

`Vdoc/.env.compose` 只给仓库内 Docker Compose 依赖栈使用。它应该是本地文件，不要提交。可以用 `openssl rand -hex 24` 生成 PostgreSQL password，用 `openssl rand -base64 32` 生成 JWT key 和 MCP token cipher key。

```sh
cd Vdoc
cat > .env.compose <<'EOF'
VDOC_DOCKER_POSTGRES_PASSWORD=replace-with-pilot-password
VDOC_DOCKER_RUSTFS_ACCESS_KEY=replace-with-pilot-access-key
VDOC_DOCKER_RUSTFS_SECRET_KEY=replace-with-pilot-secret-key
EOF
```

安全要求：不要把 `.env.compose`、database password、storage access key、storage secret key 提交到 git，也不要复制到 issue、聊天记录或截图里。

## 2. 用仓库内 Compose 启动本地依赖

```sh
cd Vdoc
docker compose --env-file .env.compose up -d postgres rustfs
```

仓库内 Compose 默认把依赖暴露给宿主机，方便后端用 `make dev` 直接连接。这些端口是本地默认值，不是协议要求；如果你的机器端口冲突，可以改 `Vdoc/docker-compose.yml` 的 host 端口，并同步修改后端 `.env`。

| 服务           | 端口   | 用途            |
| -------------- | ------ | --------------- |
| PostgreSQL     | `5432` | 后端数据库。    |
| RustFS         | `9000` | S3 API。        |
| RustFS Console | `9001` | RustFS 控制台。 |

必须存在的 Compose env vars：

- `VDOC_DOCKER_POSTGRES_PASSWORD`
- `VDOC_DOCKER_RUSTFS_ACCESS_KEY`
- `VDOC_DOCKER_RUSTFS_SECRET_KEY`

验证容器状态：

```sh
cd Vdoc
docker compose --env-file .env.compose ps
```

## 3. 配置后端运行环境

```sh
cd Vdoc
cp .env.example .env
```

在 `Vdoc/.env` 中设置以下值。示例仍然是占位符，请按你的部署模式替换 host、port、bucket、SSL 和 credential。不要把 `127.0.0.1:5432`、`127.0.0.1:9000` 或某个固定 DSN 当成唯一部署方式。

```sh
VDOC_JWT_KEY="replace-with-32-byte-base64-secret"
VDOC_DATABASE_ENABLED=true
VDOC_DATABASE_DSN="postgres://vdoc:replace-with-password@replace-with-db-host:5432/vdoc?sslmode=require-or-disable"
VDOC_STORAGE_ENABLED=true
VDOC_STORAGE_ENDPOINT="replace-with-storage-endpoint"
VDOC_STORAGE_BUCKET="vdoc"
VDOC_STORAGE_ACCESS_KEY="replace-with-pilot-access-key"
VDOC_STORAGE_SECRET_KEY="replace-with-pilot-secret-key"
VDOC_STORAGE_USE_SSL=true-or-false
VDOC_STORAGE_PATH_STYLE=true-or-false
VDOC_MCP_TOKEN_CIPHER_KEY="replace-with-32-byte-base64-secret"
VDOC_MCP_TOKEN_CIPHER_KID="local-aes-gcm-v1"
```

常见取值方式：

- 后端跑在宿主机、依赖用仓库内 Compose：database host 可用 `127.0.0.1` 和你映射的 PostgreSQL host port；storage endpoint 可用 `127.0.0.1` 和你映射的 RustFS S3 API host port；本地 RustFS 通常 `VDOC_STORAGE_USE_SSL=false`、`VDOC_STORAGE_PATH_STYLE=true`。
- 后端作为同一套 Compose 的 app service：database host 通常用 Compose service name，例如 `postgres`；storage endpoint 通常用对象存储 service name 和 container port，例如 `rustfs:9000`。
- 外部数据库或对象存储：使用供应商给出的 host、port、SSL、bucket 和 credential；生产环境通常启用 SSL，并按供应商要求决定 path-style 或 virtual-hosted-style。

注意：如果 PostgreSQL password 包含 URI 保留字符，放进 `VDOC_DATABASE_DSN` 前要 percent-encode。启用 `VDOC_DATABASE_ENABLED=true` 或 `VDOC_STORAGE_ENABLED=true` 后，依赖不可达时后端不会静默回退到内存模式。

启动后端：

```sh
cd Vdoc
make dev
```

## 4. 验证后端健康

```sh
curl http://replace-with-backend-origin/api/v1/open/health
```

当数据库和存储启用时，健康结果应能反映这些依赖可用。生产或试点域名的路径相同，例如：

```sh
curl https://your-vdoc.example.com/api/v1/open/health
```

## 5. 创建 live E2E 数据库并运行 smoke

`make test-e2e-live` 会重置配置的测试数据库 schema，只能使用一次性数据库。下面示例使用 `vdoc_e2e`。

```sh
cd Vdoc
docker compose --env-file .env.compose exec postgres sh -lc '
  psql -U "$POSTGRES_USER" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '\''vdoc_e2e'\''" | grep -q 1 ||
  createdb -U "$POSTGRES_USER" vdoc_e2e
'
export VDOC_TEST_DATABASE_DSN="postgres://vdoc:replace-with-password@replace-with-test-db-host:5432/vdoc_e2e?sslmode=require-or-disable"
export VDOC_TEST_STORAGE_ENDPOINT="replace-with-test-storage-endpoint"
export VDOC_TEST_STORAGE_BUCKET="vdoc-e2e"
export VDOC_TEST_STORAGE_ACCESS_KEY="replace-with-pilot-access-key"
export VDOC_TEST_STORAGE_SECRET_KEY="replace-with-pilot-secret-key"
export VDOC_TEST_STORAGE_USE_SSL=false
export VDOC_TEST_STORAGE_PATH_STYLE=true
make test-e2e-live
```

## 6. 启动 Admin

```sh
cd Vdoc-admin
cp .env.example .env
pnpm install
pnpm dev
```

在 `Vdoc-admin/.env` 中设置后端 origin。开发时可以指向本机，部署时必须指向已部署后端；这个值是 build-time 配置，不应写死在代码中。

```sh
VITE_VDOC_API_BASE_URL="https://replace-with-backend-origin"
```

Admin private API 请求会把 JWT 原样放在 `Authorization` header 中，不加 `Bearer` 前缀。不要把 JWT 或完整 `Authorization` header 贴进日志、文档或仓库。

## 7. 启动公共站点和 Docsify 文档

```sh
cd Vdoc-site
pnpm install
pnpm dev
```

打开 `/docs/index.html`，确认 Docsify 文档能加载，左侧目录完整、顶部只有返回官网入口，页面按钮显示 `复制本页 Markdown`。

## 8. 验证 MCP adapter

先在 Admin 中创建 MCP Token，再验证 package 和 Agent 配置。不要把 token 放进 CLI 参数。

```sh
cd Vdoc-mcp
npm ci
npm test
VDOC_BASE_URL="https://replace-with-backend-origin" \
VDOC_MCP_TOKEN="replace-with-local-mcp-token" \
npm start
```

实际 Agent 配置中应使用环境变量 `VDOC_BASE_URL` 或 `VDOC_MCP_URL`，并设置 `VDOC_MCP_TOKEN`。`VDOC_MCP_TIMEOUT_MS` 可选，默认 `30000`。stdout 保留给 MCP protocol，诊断信息看 stderr。

## 9. 验证 Skill package

```sh
cd Vdoc-skill
npm test
```

把 `Vdoc-skill/` 安装或链接为目标 Agent runtime 的 `vdoc` skill folder，并确保 `SKILL.md` 在 skill root。Skill 只提供工作流约束，实时事实来自 Vdoc MCP。

## 如何验证整条链路

1. `curl http://replace-with-backend-origin/api/v1/open/health` 成功。
2. Admin 能注册或登录，并能打开 Dashboard。
3. Admin 能创建 Team、Project、Document、Draft，提交并审核发布 Version。
4. Admin 能创建 MCP Token。
5. Agent 的 MCP `tools/list` 能返回来自后端的 tool schemas。
6. Skill 测试通过，Agent 在回答 endpoint 或 migration 问题前会调用 Vdoc MCP。

## 常见问题

- 不要在 `.env` 或 `.env.compose` 中使用生产密钥做本地测试。
- 不要提交 `.env`、`.env.compose`、JWT key、MCP token、database password、storage secret 或 `Authorization` header。
- `VDOC_DATABASE_DSN` 中的 password 如果有特殊字符，必须 percent-encode。
- `make test-e2e-live` 会重置测试 schema，不能指向非一次性数据。
- 停止本地服务用 `docker compose --env-file .env.compose down`。只有一次性环境才使用 `docker compose --env-file .env.compose down -v`，因为它会删除本地数据库和 RustFS 数据。
