# 版本说明

本页说明 v0.1 的能力边界。规划试点、写 Agent 指令、发布包之前，先确认这里的边界没有被误读。

## 本页目标

- 列出 v0.1 已包含的能力。
- 列出 v0.1 明确不包含的能力。
- 说明兼容性要求和试点验收方式。

## 适用场景

- 准备给团队演示或上线 v0.1 试点。
- 编写 MCP 或 Skill 的使用说明。
- 判断某个需求是否属于 v0.1，还是应进入后续版本。

## v0.1 已包含

- User、Team、Project、membership、typed Document、Branch、Draft、Version、Endpoint Index、Diff、MCP Token 和 JSON-RPC MCP tool surfaces。
- OpenAPI 和 Markdown Draft、Review、Published Version 工作流。
- Admin 页面覆盖首次设置、文档内容、开发者 endpoint 浏览、version content、Markdown 查看、Diff 和 Breaking Change 审核。
- MCP read tools 覆盖 projects、documents、API versions、endpoint detail、API diffs、Markdown docs 和 change summaries。
- MCP draft tools 覆盖 OpenAPI 和 Markdown Draft 提交。
- Skill workflows 要求 Agent 在 endpoint integration 或 migration 建议前先查询 Vdoc facts。

## v0.1 不包含

- MCP direct publish tools。
- Invitation flows 和 notification robots。
- PR bot automation。
- Full SDK 或 code generation platform。
- Commercial billing 或完整 tenant management。

## 兼容性要求

- Admin private API 请求把 JWT 原样放进 `Authorization` header，不加 `Bearer` 前缀。
- REST 返回 HTTP 200 envelope，关键字段包括 `code`、`status`、`message`、`detail`、`total`、`trace_id` 和 `timestamp`。
- MCP adapter 转发到 `/api/v1/open/mcp`，不在本地实现 Vdoc 业务逻辑。
- 后端健康检查路径是 `/api/v1/open/health`。

## 如何验证试点版本

1. Backend health 返回健康结果，并在启用数据库和存储时显示依赖可用。
2. Admin 能创建或查看 Team、Project、Document、Draft、Version、Diff 和 MCP Token。
3. MCP `tools/list` 返回来自已部署后端的 tool schemas。
4. Skill package 的测试通过，并且 Agent 在回答 endpoint 或 migration 问题前会调用 Vdoc MCP。
5. 发布说明中明确写出 v0.1 不支持 MCP 直接发布。

## 注意事项

- 试点期间建议固定 backend、Admin、site、MCP 和 Skill 的版本，方便快速回滚。
- 在试点验收通过前，保留上一版 backend binary 或 container、Admin `dist/`、site `dist/`、MCP package 和 Skill package。
- 不要把后续版本候选能力写成当前能力，尤其是 direct publish、PR bot、SDK 和 billing。
