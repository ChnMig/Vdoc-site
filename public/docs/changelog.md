# 变更记录

本页记录当前 Docsify 文档覆盖的 v0.1 交付状态。它不是营销列表，而是试点前需要知道的可操作变化。

## 本页目标

- 说明 v0.1 目前已经串起来的运行面。
- 标出用户在部署、Admin、MCP、Skill 和站点上会看到的变化。
- 给发布前检查提供入口。

## 当前 v0.1 状态

- Backend CI 覆盖 build、vet、tests 和 v0.1 E2E smoke 路径。
- 本地试点可以用 Docker Compose 启动 PostgreSQL 和 RustFS/S3-compatible storage。
- Admin 是 Vite、React、TypeScript 工作台，覆盖 Team、Project、Document、Branch、Draft、Review、Version、Diff、Endpoint 浏览和 MCP Token 设置。
- Public site 在 `public/docs/` 下提供独立 Docsify 文档，访问路径为 `/docs/index.html`。
- `@vdoc/mcp` 是可安装的 stdio MCP adapter，负责把 Agent 的 MCP 请求转发到后端。
- `Vdoc-skill` 是可安装的 Agent 工作流包，要求 Agent 使用 Vdoc MCP 查询事实后再给结论。

## 对使用者的变化

- 文档路由使用 Docsify hash route，例如 `/docs/index.html#/deployment` 和 `/docs/index.html#/mcp-tools`。
- React 站点不再渲染 `/docs` 或 `/docs/<id>`，这些路径交给静态 Docsify app。
- 每个 Docsify 页面都有 `复制本页 Markdown` 按钮，只复制当前页面对应的 Markdown 文件。
- 文档默认中文说明，保留命令、路径、环境变量、接口名的英文原文。

## 发布前检查

按组件确认 CI 或本地命令已经通过：

```sh
cd Vdoc-site
pnpm format:check
pnpm build
pnpm lint
pnpm test
```

完整发布还要确认后端 live smoke、Admin build、MCP package test、Skill package test，步骤见 [发布与回滚](release-rollback)。

## 如何验证

1. 打开 `/docs/index.html`，确认页面为中文侧边栏和中文导航。
2. 点击 [版本说明](version-notes)，确认 v0.1 不支持项被明确列出。
3. 点击 [部署](deployment)，确认能按顺序找到 `.env.compose`、`Vdoc/.env`、后端 health、Admin、MCP 和 Skill 的验证步骤。
4. 点击复制按钮，确认状态显示 `已复制 changelog.md`。

## 注意事项

- 不要把站点 build 成功当成后端、Admin、MCP 或 Skill 可发布的证明，每个组件都要单独验证。
- 不要在 changelog、截图、日志或示例中放真实 token、JWT、database password、storage secret 或 `Authorization` header。
- 如果 v0.1 能力边界变化，先更新 [版本说明](version-notes)，再更新本页。
