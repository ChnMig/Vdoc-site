# 运行流程

本页把 Vdoc 的人工作业面和 Agent 作业面串起来。读完后，你应该知道内容如何进入 Vdoc，什么时候变成可查询事实，Agent 可以做什么，不能做什么。

## 一句话流程

Draft 先进入审核，Admin 批准后生成不可变 Version，MCP 只把已发布事实和允许的 Draft 操作暴露给 Agent，Skill 要求 Agent 在回答前先查询 Vdoc。

## 从内容到事实

1. Admin 创建 Team、Project 和 Document。
2. Document 使用 `relative_path` 作为稳定身份，例如 `apis/billing.yaml`。
3. Writer 或 Agent 在 Branch 上创建 Draft。
4. Draft 进入 review。
5. 后台 Admin AI 在可用时尝试生成 Draft 审核摘要，失败或跳过不会阻塞流程。
6. Project Admin 或 SuperAdmin 检查机器 Diff、内容、endpoint detail、Markdown 变化和 AI 辅助摘要。
7. 审核通过后，后端创建不可变 Version，并尝试生成 Version 摘要。
8. 之后 Admin、API、MCP 和 Agent 都读取这个已发布 Version。

## Admin 在流程中的职责

- 初始化 Team、Project、成员和权限。
- 创建 OpenAPI 或 Markdown Document。
- 审核 Draft，批准、拒绝或要求修改。
- 查看 Version、Diff、endpoint detail 和 Markdown 内容。
- 创建 MCP Token，并把 token 安全交给使用 Agent 的人。

Admin 是发布门禁。v0.1 中，MCP 和 Skill 都不能绕过 Admin 直接发布 Version。

## Admin AI 在流程中的职责

[Admin AI](admin-ai) 是后台产品能力。SuperAdmin 配置系统提供商，Project Admin 可以设置项目覆盖。它基于 Draft、Version 或 Diff 上下文生成 AI-generated 摘要，并在对应页面提供限定上下文的对话。

Admin AI 不修改文档，不覆盖机器 Diff，也不能 approve、request changes、reject 或 publish。提供商未配置、提示词禁用、调用失败或超时时，状态会记录为 `skipped` 或 `failed`，原始 Diff 和人工审核继续可用。

## MCP 在流程中的职责

`@vdoc/mcp` 是 Agent runtime 使用的 stdio MCP adapter。它不保存 Vdoc 数据，也不在本地实现业务逻辑。它把 `tools/list` 和 `tools/call` 转发到后端 `/api/v1/open/mcp`。

MCP 能做两类事：

- 读取已发布事实，例如 Project、Document、API Version、endpoint detail、diff、change summary 和 Markdown 内容。
- 创建、更新、查看和提交 Draft，让后续人类审核继续处理。

MCP 不能直接发布 Version。Agent 如果声称已经发布了内容，除非 Admin 审核页面已有新 Version，否则应视为错误。

## Skill 在流程中的职责

Vdoc Skill 是 Agent 的工作流说明。它不存数据，也不直接访问后端。它告诉 Agent 在这些场景必须先用 MCP 查询 Vdoc：

- 写 endpoint 集成代码。
- 判断字段、枚举、鉴权、server 或响应结构。
- 比较两个 API 或 Markdown Version。
- 根据已发布 Markdown 回答问题。
- 创建或更新 Draft。

Skill 的价值是减少 Agent 猜测。实时事实仍来自 MCP 返回结果。

## Agent 使用时的好路径

1. 用户要求 Agent 集成一个 endpoint、做迁移分析或修改文档。
2. Agent 根据 Skill 先调用 Vdoc MCP。
3. Agent 用 `relative_path`、Project、Document、Branch 或 Version 定位目标。
4. Agent 调用读取工具，例如 `get_endpoint_detail`、`compare_api_versions` 或 `get_latest_doc`。
5. Agent 基于返回结果写代码、写说明或创建 Draft。
6. 如果需要变更 Vdoc 内容，Agent 提交 Draft。
7. Admin 审核并发布后，新事实才进入 Version。

## 运行面和访问方式

- Backend 提供 REST、MCP endpoint、持久化和对象存储写入。
- Admin 是人工工作台，浏览器访问它。
- PostgreSQL 保存元数据和工作流状态。
- RustFS 或其他 S3 compatible storage 保存 raw 和 normalized 文档对象。
- Agent 通过 MCP adapter 访问 backend，不直接访问数据库或对象存储。

在 Docker Compose 中，容器互相访问时使用服务名，例如 backend 连接 `postgres:5432` 和 `rustfs:9000`。浏览器和宿主机命令访问时使用 `127.0.0.1` 或你的域名，例如 `http://127.0.0.1:8081` 打开 Admin。

下一步按 [部署指南](deployment) 启动系统，再用 [首次使用](admin-usage) 创建第一条数据链路并配置 [Admin AI](admin-ai)。
