# Vdoc 文档

Vdoc 文档面向想评估、部署和使用 Vdoc 的团队。它先说明 Vdoc 能解决什么问题，再带你完成部署、首次发布、Agent 接入、升级和排障。

## 你可以从这里完成什么

- 了解 Vdoc 如何把 OpenAPI、Markdown、人工审核和 Agent 查询放进同一条链路。
- 用 Docker Compose 在本机启动 PostgreSQL、RustFS、backend API 和 Admin。
- 改用外部 PostgreSQL 和 S3 compatible storage。
- 通过 Admin 创建 Project、Document、Draft、Version 和 MCP Token。
- 把 `@vdoc/mcp` 和 Vdoc Skill 接进 Agent，让 Agent 先查已发布事实再回答。
- 备份、升级、验证和回滚 Vdoc 环境。

## 推荐阅读路线

1. 先读 [产品概览](product-overview)，确认 Vdoc 是否适合你的团队。
2. 再读 [运行流程](how-it-works)，理解 Admin review、Draft、Version、MCP、Skill 和 Agent 的关系。
3. 按 [部署指南](deployment) 选择完整 Compose、直接部署或外部依赖。
4. 用 [首次使用](admin-usage) 完成从初始管理员登录到 MCP Token 的第一条数据链路。
5. 用 [MCP 工具](mcp-tools) 和 [Skill 工作流](skill-workflows) 接入 Agent。
6. 升级前看 [升级与回滚](release-rollback)，出错时看 [故障排查](troubleshooting)。

## 语言和路由

- `/docs/index.html` 默认打开中文文档。
- 英文文档使用 `/docs/index.html#/en/...`，例如 `/docs/index.html#/en/deployment`。
- 顶部语言切换会尽量跳到同一主题的另一种语言。
- 每篇文章都有 `复制本页 Markdown` 按钮，只复制当前页面对应的 Markdown 文件。

## 安全边界

- 示例只使用占位符，不要提交真实 `.env`、JWT key、MCP Token、database password、storage secret 或 `Authorization` header。
- Private REST 请求的 `Authorization` header 放原始 JWT，不加 `Bearer` 前缀。
- MCP 配置通过环境变量放 `VDOC_MCP_TOKEN`，不要把 token 放进命令行参数。
- v0.1 不提供 MCP 直接发布能力，Agent 可以提交 Draft，发布必须经过 Admin 或 SuperAdmin 审核。
