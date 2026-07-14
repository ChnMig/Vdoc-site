# 变更记录

本页记录当前 VitePress 文档覆盖的 v0.1 用户可见状态。它不是营销列表，而是评估、部署和试点前需要知道的变化。

## 当前文档变化

- 文档阅读路线从“运维手册”调整为“认识 Vdoc、理解运行流程、部署、首次使用、Agent 接入、升级排障”。
- 中文默认入口是 `/`。
- 英文文档使用 `/en/...`，并保持同名主题路由。
- 新增 [运行流程](how-it-works)，解释 Admin review、Draft、Version、MCP、Skill 和 Agent 的关系。
- [部署指南](deployment) 已按 `scripts/vdoc-local-bootstrap.sh`、root Compose、可选 demo seed、live-compose E2E、release dry-run、直接部署和外部 PostgreSQL/S3 compatible storage 重写。
- [首次使用](admin-usage) 已覆盖初始管理员、Project、Document、Draft、Version、MCP Token、MCP adapter 和 Skill 的第一条链路。
- 新增 [Admin AI](admin-ai)，记录系统和项目 provider、两种 OpenAI-compatible API 模式、prompt 覆盖、自动摘要、页面对话、审计和人工发布边界。
- [升级与回滚](release-rollback) 已覆盖 PostgreSQL/object storage 备份、`docker compose --env-file .env up -d --build`、live E2E、`scripts/vdoc-release-dry-run.sh`、健康验证和回滚。

## 当前产品面

- Backend 提供 public health/auth/docs/MCP routes 和 private Admin routes。
- Backend 在启用 database 时自动运行 migrations，在启用 storage 时会尝试创建缺失 bucket。
- Admin Docker 支持 runtime `VDOC_ADMIN_API_BASE_URL`，用于生成浏览器可用的 backend API base URL。
- `@vdoc/mcp` 是可安装 stdio MCP adapter，负责把 Agent MCP 请求转发到 backend。
- `Vdoc-skill` 是可安装 Agent 工作流包，要求 Agent 使用 Vdoc MCP 查询事实后再给结论。
- 后台 Admin AI 可以辅助解释 Draft、Version 和 Diff，但不替代外部 MCP/Skill Agent、机器 Diff 或人类发布门禁。
- Live E2E 使用 `./scripts/vdoc-e2e.sh live-compose --env-file ../.env`，只重置一次性 `VDOC_TEST_POSTGRES_DB`，默认 `vdoc_e2e`。

## 仍需记住的边界

- MCP 不能直接发布 Version。
- Agent 可以提交 Draft，发布必须由 Admin 或 SuperAdmin 审核。
- 不要把 Compose service name 用在浏览器配置里；浏览器使用 `127.0.0.1` 或域名，容器内部才使用 `postgres`、`rustfs`、`backend` 等服务名。
- 不要把真实 secret 写入文档、日志、截图或 Git history。

## 如何验证文档

1. 打开 `/`，确认默认中文页面加载。
2. 打开 `/en/product-overview`，确认英文页面加载。
3. 点击 [运行流程](how-it-works)、[Admin AI](admin-ai)、[部署指南](deployment)、[MCP 工具](mcp-tools) 和 [升级与回滚](release-rollback)，确认主题路径连贯。
