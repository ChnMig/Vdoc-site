# 版本说明

本页说明 v0.1 的能力边界。规划试点、写 Agent 指令、发布包或升级前，先确认这里的边界没有被误读。

## v0.1 已包含

- 一个 Go backend，提供 REST API、MCP endpoint、持久化、认证、审核流、自动 migrations 和对象存储写入。
- PostgreSQL persistence 和 S3 compatible object storage 支持。
- root `docker-compose.yml`，可启动 PostgreSQL、RustFS、backend 和 Admin。
- `scripts/vdoc-local-bootstrap.sh`，用于生成一次性本机 `.env`，secret 只写入文件不打印。
- `Vdoc/scripts/vdoc-e2e.sh live-compose`，可从 root `.env` 派生 live E2E 配置。
- `scripts/vdoc-release-dry-run.sh`，作为本机 release gate，不发布、不部署。
- Admin UI，用于管理 Team、Project、Document、Branch、Draft、Review、Version、Diff、endpoint detail 和 MCP Token。
- `@vdoc/mcp` package，用于 Agent runtime 通过 MCP 查询 Vdoc backend。
- `Vdoc-skill` package，用于要求 Agent 在依赖 API 或 Markdown 事实前先查询 Vdoc。

## 生产式依赖

- PostgreSQL 保存元数据、用户、权限和工作流状态。
- RustFS、MinIO 或托管 S3 compatible storage 保存 raw 和 normalized 文档对象。
- 稳定 backend origin，供 Admin 浏览器和 Agent runtime 访问。
- Secret management，用于 JWT keys、MCP token cipher keys、database passwords、storage credentials 和 Agent MCP tokens。

## 运行行为

- `VDOC_DATABASE_ENABLED=true` 时，backend 启动会连接 PostgreSQL 并自动运行 migrations。
- database 连接或 migration 失败会让 backend 启动失败，不会静默回退到内存模式。
- `VDOC_STORAGE_ENABLED=true` 时，backend 会连接对象存储，bucket 缺失时会尝试自动创建。
- Admin Docker 在 container 启动时读取 `VDOC_ADMIN_API_BASE_URL` 并写入 `/runtime-config.js`。
- 完整 Compose 内 backend 使用 `postgres:5432` 和 `rustfs:9000`，浏览器和宿主机使用 `127.0.0.1` 或域名。
- Live E2E 会重置一次性 `VDOC_TEST_POSTGRES_DB`，默认 `vdoc_e2e`，不会重置应用数据库 `VDOC_POSTGRES_DB`。

## v0.1 不包含

- MCP direct publish tools。
- Invitation flows 和 notification robots。
- PR bot automation。
- Full SDK 或 code generation platform。
- Commercial billing 或完整 tenant management。

## 兼容性规则

- Admin private API 请求把 JWT 原样放进 `Authorization` header，不加 `Bearer` 前缀。
- REST 返回 envelope，关键字段包括 `code`、`status`、`message`、`detail`、`total`、`trace_id` 和 `timestamp`。
- MCP adapter 转发到 `/api/v1/open/mcp`，不在本地实现 Vdoc 业务逻辑。
- Published Version 视为不可变事实。
- `relative_path` 是 Document 的稳定身份。

## 如何验证试点版本

1. Backend health 返回成功。
2. Admin 能创建或查看 Team、Project、Document、Draft、Version、Diff 和 MCP Token。
3. Live E2E 通过 `./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only` 和 `./scripts/vdoc-e2e.sh live-compose --env-file ../.env`。
4. `scripts/vdoc-release-dry-run.sh --list` 和 `scripts/vdoc-release-dry-run.sh` 通过。
5. MCP `tools/list` 返回来自已部署 backend 的 tool schemas。
6. Skill package 测试通过，并且 Agent 在回答 endpoint 或 migration 问题前会调用 Vdoc MCP。
7. 发布说明中明确写出 v0.1 不支持 MCP 直接发布。
