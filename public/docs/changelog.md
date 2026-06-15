# 变更记录

本页记录当前 Docsify 文档覆盖的 v0.1 用户可见状态。它不是营销列表，而是评估、部署和试点前需要知道的变化。

## 当前文档变化

- 文档阅读路线从“运维手册”调整为“认识 Vdoc、理解运行流程、部署、首次使用、Agent 接入、升级排障”。
- 中文默认入口仍是 `/docs/index.html`。
- 英文文档仍使用 `/docs/index.html#/en/...`，并保持同名主题路由。
- 新增 [运行流程](how-it-works)，解释 Admin review、Draft、Version、MCP、Skill 和 Agent 的关系。
- [部署指南](deployment) 已按 root Compose、直接部署、外部 PostgreSQL/S3 compatible storage 三种方式重写。
- [首次使用](admin-usage) 已覆盖初始管理员、Project、Document、Draft、Version、MCP Token、MCP adapter 和 Skill 的第一条链路。
- [升级与回滚](release-rollback) 已覆盖 PostgreSQL/object storage 备份、`docker compose --env-file .env up -d --build`、健康验证和回滚。

## 当前产品面

- Backend 提供 public health/auth/docs/MCP routes 和 private Admin routes。
- Backend 在启用 database 时自动运行 migrations，在启用 storage 时会尝试创建缺失 bucket。
- Admin Docker 支持 runtime `VDOC_ADMIN_API_BASE_URL`，用于生成浏览器可用的 backend API base URL。
- `@vdoc/mcp` 是可安装 stdio MCP adapter，负责把 Agent MCP 请求转发到 backend。
- `Vdoc-skill` 是可安装 Agent 工作流包，要求 Agent 使用 Vdoc MCP 查询事实后再给结论。

## 仍需记住的边界

- MCP 不能直接发布 Version。
- Agent 可以提交 Draft，发布必须由 Admin 或 SuperAdmin 审核。
- 不要把 Compose service name 用在浏览器配置里；浏览器使用 `127.0.0.1` 或域名，容器内部才使用 `postgres`、`rustfs`、`backend` 等服务名。
- 不要把真实 secret 写入文档、日志、截图或 Git history。

## 如何验证文档

1. 打开 `/docs/index.html`，确认默认中文页面加载。
2. 打开 `/docs/index.html#/en/product-overview`，确认英文页面加载。
3. 点击 [运行流程](how-it-works)、[部署指南](deployment)、[MCP 工具](mcp-tools) 和 [升级与回滚](release-rollback)，确认侧边栏路径连贯。
4. 点击复制按钮，确认状态显示当前 Markdown 文件已复制。
