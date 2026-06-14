# Vdoc 文档

这套 Docsify 文档面向需要理解、部署、使用或接入 Vdoc 的开发者、试点管理员、维护者和 Agent 使用者。说明以中文为主，命令、路径、环境变量、接口名保持原始英文标识。

## 本页目标

- 帮你选择正确的操作页面，避免先配置 Agent 却还没有发布版本。
- 串起部署、Admin 审核、MCP Token、Agent 查询、Skill 工作流这一条完整链路。
- 明确 v0.1 的边界，特别是 MCP 不能直接发布版本，发布仍由 Admin 或 SuperAdmin 审核完成。

## 适用场景

- 在本地或试点环境启动 Vdoc 后端、Admin、站点、MCP adapter 和 Skill package。
- 为团队创建 Project、Document、Branch、Draft、Version 和 MCP Token。
- 给 Agent 配置 `@vdoc/mcp`，让 Agent 从 Vdoc 查询已审核的 API 和 Markdown 事实。
- 发布前做检查，发布后做健康验证，失败时按组件回滚。

## 推荐阅读路线

1. 先读 [产品概览](product-overview)，确认 Team、Project、Document、Branch、Draft、Version、MCP Token 的关系。
2. 按 [部署](deployment) 选择 Docker Compose 依赖栈、完整 Compose 部署或外部 PostgreSQL / S3-compatible storage。
3. 用 [Admin 使用](admin-usage) 完成第一次从登录到发布 Version 的操作。
4. 用 [MCP 工具](mcp-tools) 把 Agent 接到 Vdoc 后端。
5. 用 [Skill 工作流](skill-workflows) 约束 Agent 在集成、迁移、文档变更前先查询 Vdoc。
6. 发布时看 [发布与回滚](release-rollback)，出问题时看 [故障排查](troubleshooting)。

## 安全边界

- 示例只使用占位符，不要把真实 `.env`、`.env.compose`、JWT key、MCP token、database password、storage secret、`Authorization` header 写进文档、日志或仓库。
- Private REST 请求的 `Authorization` header 放原始 JWT，不加 `Bearer` 前缀。
- MCP 配置通过环境变量放 `VDOC_MCP_TOKEN`，不要把 token 放进命令行参数。
- v0.1 不提供 MCP 直接发布能力，Agent 可以提交 Draft，发布必须经过人工 Admin 或 SuperAdmin 审核。

## 如何验证文档站

1. 打开 `/docs/index.html`，默认应直接显示 [产品概览](product-overview)，而不是再出现一个跳转首页。
2. 点击左侧 [部署](deployment) 和 [MCP 工具](mcp-tools)，URL 应变成 Docsify hash route，例如 `/docs/index.html#/deployment`。
3. 每篇文章顶部应出现 `复制本页 Markdown` 按钮。
4. 点击复制按钮后，状态文本应显示 `已复制 product-overview.md` 或当前页面对应的 Markdown 文件名。

## 常见问题

- 如果直接打开 `/docs` 或 `/docs/` 被 React fallback 接管，改用 `/docs/index.html`。
- 如果刷新子页面后侧边栏或返回官网按钮消失，确认 `_sidebar.md` 和 `_navbar.md` 仍在 `public/docs/` 根目录。
- 如果复制失败，先检查浏览器剪贴板权限，再看控制台是否无法读取当前 Markdown 文件。
