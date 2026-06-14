# Skill 工作流

Vdoc Skill 是安装到 Agent runtime 的工作流包。它不存数据、不算 diff、不直接调用后端，而是教 Agent 什么时候必须通过 Vdoc MCP 查询事实。

## 本页目标

- 安装 `Vdoc-skill/` 到目标 Agent。
- 说明 Skill 和 MCP 的分工。
- 给出 endpoint integration、migration analysis、docs draft 的标准动作。

## 适用场景

- Agent 要写前端或后端 endpoint integration。
- Agent 要判断 API 版本之间是否有 breaking change。
- Agent 要引用 Markdown 文档原文或提交文档 Draft。
- 团队希望减少 Agent 根据记忆编造字段、参数、响应结构或文档内容。

## 前置条件

- Agent 已配置 [MCP 工具](mcp-tools)，并能成功调用 Vdoc `tools/list`。
- 目标 runtime 支持安装技能或自定义工作流说明。
- 你知道 runtime 要求的 skill folder 位置。
- 不要把 MCP Token、JWT 或 `Authorization` header 写进 Skill 文件或示例。

## 安装

把 `Vdoc-skill/` 目录安装、复制或链接到目标 Agent 的 skills folder，并让 `SKILL.md` 位于 skill root。

目录内容应包含：

```text
SKILL.md
templates/
  endpoint-integration.md
  frontend-change-summary.md
examples/
  endpoint-query-example.md
  compare-versions-example.md
```

Skill 必须和 `@vdoc/mcp` 配套使用。Skill 是工作流说明，MCP 才是实时 tool surface 和事实来源。

## 安全规则

- Vdoc MCP 是 API contract facts 和 Markdown document content 的事实来源。
- Agent 不能推断 endpoint fields、parameters、response properties、enum values、auth schemes、servers、breaking-change claims 或 Markdown text。
- 不要打印、复制或记录 MCP tokens 和 JWTs。
- v0.1 不提供 direct publish tools，版本发布由人类 Admin 或 SuperAdmin 审核。

## 工作流 1：endpoint 集成

1. 用户提出集成某个 endpoint。
2. Agent 加载 Vdoc Skill。
3. Agent 通过 MCP 调用 `list_projects`、`list_documents` 或 `list_api_versions` 定位目标版本。
4. Agent 调用 `get_endpoint_detail` 获取 method、path、parameters、request body、response body 和 auth 信息。
5. Agent 根据查询结果写代码或说明。
6. Agent 在回答中说明事实来自 Vdoc，而不是猜测。

## 工作流 2：迁移分析

1. 用户询问两个 API 版本的迁移影响。
2. Agent 通过 MCP 定位 `from_version_id` 和 `to_version_id`。
3. Agent 调用 `compare_api_versions` 或 `get_change_summary`。
4. Agent 只基于返回结果说明 breaking change、兼容变化和迁移动作。
5. 如果 Vdoc 没有对应版本，Agent 应要求先在 Admin 中发布版本，而不是编造结论。

## 工作流 3：Markdown 文档 Draft

1. 用户要求修改已托管的 Markdown 文档。
2. Agent 调用 `get_latest_doc` 读取已发布内容。
3. Agent 基于用户要求生成修改稿。
4. Agent 使用 `create_doc_draft` 或 `update_doc_draft` 创建 Draft。
5. Agent 使用 `submit_doc_draft` 提交人工审核。
6. Admin 或 SuperAdmin 在 Admin 中审核并发布。

## 如何验证

先跑 package 测试：

```sh
cd Vdoc-skill
npm test
```

再做一次小型 Agent 任务：

1. 让 Agent 说明某个 endpoint 的请求字段。
2. 观察 Agent 是否先调用 Vdoc MCP。
3. 检查回答是否引用 `get_endpoint_detail` 或相关 Vdoc tool 的结果。
4. 要求 Agent 发布版本，确认它只提交 Draft，并提示需要 Admin 或 SuperAdmin 审核。

## 常见问题

- 只安装 Skill 不配置 MCP 不够，Skill 没有实时数据能力。
- Agent 如果跳过 MCP 直接回答，需要重新加载 Skill 并明确要求使用 Vdoc MCP。
- 不要把 Skill 当发布权限，v0.1 的发布门禁仍在 Admin。
- 示例文件中不能出现真实 token、JWT、database password、storage secret 或 `Authorization` header。
