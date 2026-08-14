# 故障排查

本页按用户会遇到的链路排查：Compose 是否启动、backend 是否健康、Admin 是否能登录、Draft/Version 是否能发布、MCP/Skill 是否能让 Agent 查询事实。

## 排查前先保护信息

- 记录失败的命令、URL、页面操作或 Agent action。
- 记录 response envelope 的 `code`、`status`、`message` 和 `trace_id`。
- 分享日志前遮盖 `.env`、JWT、MCP Token、database password、storage secret 和 `Authorization` header。
- 不要把 token 放进 CLI args 里复现问题。

## 完整 Compose 起不来

先在 workspace root 校验配置，不打印渲染后的 secret：

```sh
docker compose --env-file .env config --quiet
docker compose --env-file .env ps
```

常见原因：

- 没有运行 `scripts/vdoc-local-bootstrap.sh` 生成 `.env`，或手工复制 `.env.example` 后没有替换占位符。
- `VDOC_POSTGRES_PASSWORD`、`VDOC_STORAGE_ACCESS_KEY`、`VDOC_STORAGE_SECRET_KEY`、`VDOC_JWT_KEY` 或 `VDOC_MCP_TOKEN_CIPHER_KEY` 仍是占位符。
- 本机端口被占用，需要修改 `VDOC_BACKEND_HOST_PORT`、`VDOC_ADMIN_HOST_PORT`、`VDOC_POSTGRES_HOST_PORT`、`VDOC_RUSTFS_HOST_PORT` 或 `VDOC_RUSTFS_CONSOLE_HOST_PORT`。
- Docker 正在 build app images，第一次启动需要更久。

查看日志：

```sh
docker compose --env-file .env logs --tail=100 postgres rustfs backend admin
```

重新创建一次性本机 `.env` 时，用：

```sh
scripts/vdoc-local-bootstrap.sh
```

如果 `.env` 已存在，脚本会拒绝覆盖。只有确认要丢弃本机环境时才使用 `--force`。

## Backend health 失败

检查 health 路径：

```sh
curl http://127.0.0.1:8080/api/v1/open/health
```

如果 `.env` 改过 `VDOC_BACKEND_HOST_PORT`，用实际端口。

再检查：

- backend 日志是否显示 PostgreSQL 连接失败或 migrations 失败。
- backend 日志是否显示 storage 初始化失败。
- `VDOC_DATABASE_DSN` 是否使用正确 host。完整 Compose 内 backend 应使用 `postgres:5432`，不是 `127.0.0.1:5432`。
- `VDOC_STORAGE_ENDPOINT` 是否使用正确 endpoint。完整 Compose 内 backend 应使用 `rustfs:9000`，不是 `127.0.0.1:9000`。
- PostgreSQL password 放进 DSN 前是否需要 percent encode。

backend 启用 database 或 storage 后，依赖不可达会启动失败，不会静默切回内存模式。

## PostgreSQL 连接失败

- 完整 Compose：`VDOC_DATABASE_DSN` 使用 `postgres:5432`，并且用户名、密码、数据库名与 `.env` 中的 `VDOC_POSTGRES_*` 一致。
- 后端在宿主机直接运行：DSN 使用 `127.0.0.1` 和 `VDOC_POSTGRES_HOST_PORT` 暴露出来的端口。
- 外部 PostgreSQL：检查网络、SSL mode、用户名、密码、database name 和 provider host。
- 如果 password 有 `@`、`:`、`/`、`#`、`?` 等 URI 保留字符，必须 percent encode。
- 不要用 `docker compose down -v` 处理连接问题，除非你明确要删除本地数据。

## RustFS 或外部对象存储失败

- 完整 Compose：backend 使用 `VDOC_STORAGE_ENDPOINT=rustfs:9000`、`VDOC_STORAGE_USE_SSL=false`、`VDOC_STORAGE_PATH_STYLE=true`。
- 宿主机直接运行 backend：endpoint 使用 `127.0.0.1:9000` 或你修改后的 `VDOC_RUSTFS_HOST_PORT`。
- 外部对象存储：检查 endpoint、bucket、region、SSL、path style、access key、secret key 和 bucket 权限。
- backend 在 storage enabled 时会在 bucket 缺失时尝试创建 bucket。创建失败通常是 credential 或权限问题。
- RustFS console 默认是 `http://127.0.0.1:9001`，但 backend 连接的是 S3 API 端口 `9000`。

## Admin 打不开或调错后端

- 完整 Compose 默认 Admin 是 `http://127.0.0.1:8081`。
- Admin Docker 使用 `VDOC_ADMIN_API_BASE_URL` 生成 `/runtime-config.js`。
- 这个值必须是浏览器能访问的 backend origin，例如 `http://127.0.0.1:8080` 或你的域名。
- 不要设置成 `http://backend:8080`，因为浏览器不能解析 Compose service name。
- 本地开发 Admin 使用 `VITE_VDOC_API_BASE_URL`。
- Private API 使用 raw JWT `Authorization` header，不加 `Bearer`。

## 登录后接口显示 HTTP 200 但仍失败

Vdoc REST 使用 envelope。不要只看 HTTP status，要看 body：

- `code`
- `status`
- `message`
- `detail`
- `trace_id`

如果 `code` 不是 `200` 或 `status` 不是 `OK`，按业务错误处理。

## Draft 或 Version 流程失败

- 当前用户必须有对应角色：Writer 创建和提交 Draft，Project Admin 或 SuperAdmin 审核。
- `document_type=1` 表示 OpenAPI，`document_type=2` 表示 Markdown。
- OpenAPI 内容应是 OpenAPI 3.0 或 3.1。
- `relative_path` 是 Document 身份，不要用显示名称跨系统查询。
- 发布必须走 approve。v0.1 不支持 MCP direct publish。

## Admin AI 摘要或页面对话失败

- 先读 [Admin AI](admin-ai)，确认当前 Project 使用已启用的项目 provider，或能回退到已启用的系统 provider。
- 运行对应 scope 的 provider test，检查 `base_url`、`api_mode`、`model` 和 timeout，不要在日志中打印 `api_key`。
- 确认 provider 详情只返回 `api_key_set` 和 `api_key_last4`。如果未设置加密密钥，先由有权限的管理员保存配置。
- 检查对应 `draft_review_summary`、`version_change_summary`、`diff_change_summary` 或 `page_chat` prompt 是否启用。
- `pending` 表示最新请求仍在生成；`skipped` 通常表示没有可用 provider 或 prompt 已禁用，`failed` 表示调用失败或请求完成前上下文已变化。这些状态都不应阻塞 Draft 提交、Version 发布、机器 Diff 或人工审核。
- 页面 chat 必须绑定当前 Draft、Version 或 Diff。跨 Project、无读取权限或空消息会失败。
- 用 `trace_id` 和 audit 状态排查。审计可以包含失败原因和 token usage，prompt override、summary 和 chat content 也属于受管产品记录；日志和审计元数据不得包含原始 API key、JWT、MCP Token、`Authorization` header 或提示词中嵌入的秘密。

## Live E2E 失败

从 backend 目录检查 root Compose 派生配置：

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E 会重置选中的一次性 `VDOC_TEST_POSTGRES_DB`，默认是 `vdoc_e2e`。它不会重置 `VDOC_POSTGRES_DB` 指向的应用数据库。常见原因是 root Compose 没有运行、`.env` 路径不对、host port 被改过但容器未重启，或把 `VDOC_TEST_POSTGRES_DB` 错指向了应用数据库。

## MCP adapter 启动失败

- Agent MCP config 必须设置 `VDOC_MCP_TOKEN`。
- 设置 `VDOC_BASE_URL` 或 `VDOC_MCP_URL`，二者有一个即可。
- 如果使用 `VDOC_BASE_URL`，adapter 会追加 `/api/v1/open/mcp`。
- 不要把 token 放进 `args`，应放在 `env`。
- stdout 是 MCP protocol 专用通道，普通诊断看 stderr。
- 从 Agent 所在机器确认 backend `/api/v1/open/mcp` 可达。

## Agent 没有使用 Vdoc 事实

- 确认 `@vdoc/mcp` 的 `tools/list` 成功。
- 确认 `Vdoc-skill/` 已安装为目标 runtime 的 `vdoc` skill folder，且 `SKILL.md` 在 skill root。
- 给 Agent 明确任务，例如“先查询 Vdoc 的 `get_endpoint_detail`，再说明请求字段”。
- 如果 Agent 仍然猜字段、枚举、响应结构或 Markdown 原文，重新加载 Skill 并要求它先查 Vdoc MCP。

## 什么时候回滚

- backend health 失败且短时间无法修复：先回到上一版 backend 或上一版 workspace。
- Admin 页面失败但 backend 健康：优先回滚 Admin build 或 container。
- MCP tools/list 失败：先检查 token 和 backend，再考虑回滚 MCP package。
- Agent 不遵守 Vdoc facts：先检查 MCP 和 Skill 安装，再回滚 Skill package。
- Admin AI 失败但机器 Diff 和人工审核正常：先回滚 provider 或 prompt 配置，不要回滚已发布 Version，也不要让 AI 代替审核。

回滚前先看 [升级与回滚](release-rollback)，不要删除 PostgreSQL 或对象存储数据。

本机门禁可以先列出再运行：

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

它只运行本机检查，不会发布或部署。
