# 部署指南

本页面向想把 Vdoc 跑起来的用户。先用 Docker Compose 启动 backend API、Admin 和本地依赖，再按需要改成直接部署 backend/Admin，或接入外部 PostgreSQL 和 S3 compatible storage。

## 你会部署什么

根目录 `docker-compose.yml` 会启动四个服务：

- `postgres`：PostgreSQL，保存用户、项目、审核流和版本元数据。
- `rustfs`：S3 compatible object storage，保存 raw 和 normalized 文档对象。
- `backend`：Vdoc API、MCP endpoint、迁移和对象存储写入。
- `admin`：人工工作台。

Backend 启动时，如果 `VDOC_DATABASE_ENABLED=true`，会连接 PostgreSQL 并自动运行 Vdoc migrations。连接或迁移失败会让启动失败，不会静默退回内存模式。如果 `VDOC_STORAGE_ENABLED=true`，backend 会连接对象存储，bucket 不存在时会自动创建。

## 方式 1：完整 Docker Compose

从 workspace root 执行命令，也就是包含 `docker-compose.yml`、`.env.example`、`Vdoc/`、`Vdoc-admin/`、`Vdoc-mcp/` 和 `Vdoc-skill/` 的目录。

```sh
cp .env.example .env
```

编辑 `.env`，至少替换这些占位符：

- `VDOC_POSTGRES_PASSWORD`
- `VDOC_STORAGE_ACCESS_KEY`
- `VDOC_STORAGE_SECRET_KEY`
- `VDOC_JWT_KEY`
- `VDOC_MCP_TOKEN_CIPHER_KEY`
- `VDOC_INITIAL_ADMIN_EMAIL`
- `VDOC_INITIAL_ADMIN_PASSWORD`

`VDOC_INITIAL_ADMIN_EMAIL` 和 `VDOC_INITIAL_ADMIN_PASSWORD` 可留空。如果填写，backend 只会在用户表为空时创建这个 SuperAdmin，密码入库前会做 bcrypt hash。

先检查 Compose 渲染结果：

```sh
docker compose --env-file .env config
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
```

停止但保留容器和数据：

```sh
docker compose --env-file .env stop
```

删除容器和网络，但保留 named volumes：

```sh
docker compose --env-file .env down
```

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
```

Admin Docker runtime 配置：

```sh
VDOC_ADMIN_API_BASE_URL=http://127.0.0.1:8080
```

这个值会在 admin container 启动时写入 `/runtime-config.js`。它必须是浏览器能访问的 backend origin。

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
docker build -t vdoc-admin ./Vdoc-admin
docker run --rm -p 8081:80 \
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
2. 打开 Admin，使用初始管理员登录，或在可信试点环境注册第一个用户。
3. 按 [首次使用](admin-usage) 创建 Project、Document、Draft、Version 和 MCP Token。
4. 按 [MCP 工具](mcp-tools) 和 [Skill 工作流](skill-workflows) 连接 Agent。
