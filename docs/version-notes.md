# 版本说明

本页说明 v0.2 的能力边界。规划试点、写 Agent 指令、发布包或升级前，先确认这里的边界没有被误读。

## v0.3.0

- 通过单个 [docker-compose.yml](deployment.md) 部署和更新，配置与密钥直接写在 YAML 中，无需 `.env` 或安装脚本。
- 从 GHCR 直接拉取通过验证的 Backend/Admin 镜像，支持 Linux amd64 和 arm64。
- 数据库初始化前检查必填配置；后端启动时自动处理数据库迁移、首个管理员和存储桶。
- 补充旧 Compose 压缩包迁移说明，升级时沿用原密钥和数据卷。

本版不新增数据库迁移，MCP API 契约保持 v0.2.0。升级步骤见[升级与回滚](release-rollback.md)。

## v0.2.1

本次补丁包含[完整 Compose 示例](deployment.md#compose-example)和 Admin 小屏幕 MCP 配置框修复，五个仓库及部署下载统一为 v0.2.1。

后端接口、22 项 MCP 工具契约与 v0.2.0 兼容，无新增数据库迁移。已有部署可按[升级与回滚](release-rollback.md)更新发行文件并加载新镜像，保留现有 `.env`、Compose 项目名和数据卷。

## v0.2.0

- MCP 新增 `get_schema_version` 和 `get_doc_version`，读取指定已发布版本全文。
- 最新内容查询必须明确分支；未知参数会报错。升级后请重新加载 MCP 工具清单，并为 `get_latest_schema` / `get_latest_doc` 补上 `branch_id`。
- OpenAPI 草稿读取增加原始正文，与 revision 来自同一快照；原有元数据字段保留。
- Backend/Admin 提供 Linux amd64 和 arm64 预构建 Docker 镜像，安装器校验下载与源码来源；无需先获取五个源码仓库。
- 工作台和首次使用指南提供 Codex / Cursor 配置；官网改善中文搜索、语言切换、正文地标与卡片链接名称。
- 官网统一为 [GitHub Pages](https://chnmig.github.io/Vdoc-site/)，仅正式 Site 标签通过检查后自动上线。

本版不新增数据库迁移。人工审核发布、不可变版本和令牌权限保持原有边界。升级前备份数据库与对象存储，并同步升级五仓发行包。

## v0.1 已包含

- 一个 Go backend，提供 REST API、MCP endpoint、持久化、认证、审核流、自动 migrations 和对象存储写入。
- PostgreSQL persistence 和 S3 compatible object storage 支持。
- root `docker-compose.yml`，可启动 PostgreSQL、RustFS、backend 和 Admin。
- `scripts/vdoc-local-bootstrap.sh`，用于生成一次性本机 `.env`，secret 只写入文件不打印。
- `Vdoc/scripts/vdoc-e2e.sh live-compose`，可从 root `.env` 派生 live E2E 配置。
- `scripts/vdoc-release-dry-run.sh`，作为本机 release gate，不发布、不部署。
- Admin UI，用于管理 Team、Project、Document、Branch、Draft、Review、Version、Diff、endpoint detail 和 MCP Token。
- 后台 [Admin AI](admin-ai.md)，包含系统和项目级 OpenAI-compatible provider、prompt 覆盖、provider test、Draft/Version 自动摘要、Draft/Version/Diff 摘要读取和重新生成、页面内对话及审计。
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

## 当前仍不包含

- MCP direct publish tools。
- AI 直接 approve、request changes、reject、修改或 publish 的能力。
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
7. 发布说明中明确写出 v0.2 不支持 MCP 直接发布。
8. Admin AI provider test 成功，Draft 和 Version 摘要可读取，失败场景不阻塞机器 Diff 和人工审核。
