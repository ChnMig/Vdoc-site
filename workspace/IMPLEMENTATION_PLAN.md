# Vdoc v0.1 工程实现计划

本文档把主 PRD 的 v0.1 MVP 拆成后端和 Web 工作台工程计划。主需求来源见 `PRD.md`。当前工程实现以 Project 下的多类型 Document 为准，不再以项目下的后端服务作为产品模型。

## 1. 范围

v0.1 必须跑通：

```text
用户登录
  -> 系统超级管理员 / 成员
  -> Team / Project / Role
  -> Project Document
  -> Document Branch / Environment
  -> OpenAPI 或 Markdown 上传并创建草稿
  -> 人工审核发布 Document Version
  -> OpenAPI Endpoint Index / Detail
  -> OpenAPI Semantic Diff 或 Markdown 文件 Diff
  -> Breaking Change 摘要（OpenAPI）
  -> 后台 AI Provider 配置、自动 Diff 总结和页面内对话
  -> 产品级 Web 工作台和开发者门户式文档浏览
  -> MCP 查询 / OpenAPI 与 Markdown 草稿提交
  -> Vdoc Skill
```

Web v0.1 必须补齐两个前端闭环：

- 产品工作台闭环：新用户能通过引导、空状态和任务导向导航完成 Team、Project、Document、Branch、草稿、审核、发布和 MCP Token 的首轮配置。
- 开发者门户闭环：前端开发能通过 Web UI 搜索、过滤、分组浏览 Endpoint，查看请求/响应/schema/鉴权/版本内容，并理解 Diff 与 Breaking Change。

产品验证闭环与工程门禁分离：workspace release dry-run 只证明候选版本通过自动化检查；真实 Pilot 结果必须按 schema-v2 `PILOT_RESULT.template.json` 保存 pre-Pilot gate attestations、目标用户在真实 UTC 窗口内完成的 PRD 3.3 十四项实测、consent/观测/原话反馈的 `{path, sha256}` 文件证据，以及不同人员对冻结 payload 的双签 approval record，并由 `scripts/vdoc-pilot-result-verify.sh` 反查实际文件、workspace lock 和当前远端来源。自动化不得代填用户反馈、由 staff 代打、把未执行项改写为通过，或把签名 helper 冒充身份认证。

v0.1 不做：

- MCP 绕过人工审核发布正式版本。
- 项目成员邀请流程，v0.1 由后台或 Project Admin 从现有系统用户手动加入项目。
- 复杂组织级 RBAC、多级审批流、通知、PR Bot、SDK/codegen 平台。
- GraphQL、gRPC、Postman、YApi、Apifox 导入。
- 自动修改前端仓库或字段级前端代码影响分析。
- 完整商业化运营后台，例如计费、组织层级租户、通知中心、外部集成市场和审计报表。

## 2. 当前工程约束

当前仓库是单 Go module：`vdoc`。

必须沿用：

- HTTP 框架：Gin。
- 配置：Viper，环境变量前缀 `VDOC_`。
- 日志：Zap，保留 dev/release 分流和 Gin 独立日志。
- 路由注册链：`api.InitApi -> app.RegisterRoutes -> v1.RegisterRoutes -> open/private -> module`。
- API 响应：统一 JSON envelope，语义结果放在 body 的 `code/status/message/detail`。
- 中间件顺序：`TraceID -> AccessLog -> Recovery -> optional IPRateLimit -> SecurityHeaders -> BodySizeLimit -> CORS`。
- JWT：使用 `utils/authentication`，JWT 只放必要身份标识。
- 测试：Go table-driven tests；修改全局配置的测试必须恢复状态。

当前业务代码位置：

```text
api/app/v1/open/auth/          # 注册 / 登录 / 公开认证入口
api/app/v1/open/mcp/           # MCP endpoint，使用 MCP Token 鉴权
api/app/v1/open/documentshare/ # 匿名公开分享 metadata、unlock、history、content、download
api/app/v1/private/identity/   # 当前用户、会话信息
api/app/v1/private/systemuser/ # 系统用户管理
api/app/v1/private/team/       # Team API
api/app/v1/private/project/    # Project API
api/app/v1/private/member/     # Project Member / Role API
api/app/v1/private/document/   # Project Document API
api/app/v1/private/branch/     # Document Branch API
api/app/v1/private/draft/      # OpenAPI 与 Markdown 草稿、审核和发布 API
api/app/v1/private/version/    # Document Version API
api/app/v1/private/endpoint/   # OpenAPI Endpoint 查询 API
api/app/v1/private/diff/       # OpenAPI 与 Markdown Diff 查询 API
api/app/v1/private/ai/         # AI Provider 配置、AI 总结和页面内 Chat API
api/app/v1/private/mcptoken/   # MCP Token 管理 API
api/app/v1/private/documentshare/ # Project Admin / SuperAdmin 分享管理 API
common/                        # 共享业务语义和枚举
db/                            # DB 连接、迁移、repository、对象存储适配
domain/<module>/               # 领域模型、领域错误、纯业务规则
services/                      # 长驻 cron、worker、consumer 生命周期层
utils/                         # token hash、schema hash、文件存储等基础工具
```

Agent-facing distributions live outside the backend repository: `Vdoc-mcp/` contains the installable MCP stdio adapter, and `Vdoc-skill/` contains the installable Vdoc Skill package.

Web-facing implementation lives outside the backend repository: `Vdoc-admin/` is the product workbench and developer portal for v0.1, while `Vdoc-site/` remains the public marketing and documentation portal.

## 3. 数据与存储决策

MVP 使用 PostgreSQL 保存结构化数据。Raw、Normalized、Stable 内容快照和较大的 Diff 快照统一保存到 RustFS 或 S3-compatible 对象存储；后端在数据库中只保存 object key、hash、content type、size、etag 和 metadata。

Project 下直接管理多类型 Document。Document 通用字段包括：

- `name`
- `document_type`
- `relative_path`
- `description`
- `status`

`relative_path` 是文档在 Project 内的路径身份；不要引入第二套持久化路径/名称身份。

文档类型：

- `1` OpenAPI：校验 OpenAPI 3.x，生成 normalized snapshot、Endpoint Index、Endpoint Detail、语义 Diff 和 Breaking Change 摘要。
- `2` Markdown：校验 `.md` 内容，生成 raw/stable snapshot，支持最新内容查询和纯文件 Diff。

## 4. HTTP API 路由方向

公开路由：

```text
POST /api/v1/open/auth/register
POST /api/v1/open/auth/login
GET  /api/v1/open/auth/config
GET  /api/v1/open/health
GET  /api/v1/open/docs/openapi.yaml
POST /api/v1/open/mcp
GET  /api/v1/open/document-shares/:share_id
POST /api/v1/open/document-shares/:share_id/unlock
GET  /api/v1/open/document-shares/:share_id/versions
GET  /api/v1/open/document-shares/:share_id/versions/:version_id/content
GET  /api/v1/open/document-shares/:share_id/versions/:version_id/download
```

私有路由按 Document 组织：

```text
GET  /api/v1/private/identity/me
GET  /api/v1/private/system/users
POST /api/v1/private/system/users
PATCH /api/v1/private/system/users/:user_id
GET  /api/v1/private/system/users/:user_id/mcp-tokens
POST /api/v1/private/system/users/:user_id/mcp-tokens/:token_id/revoke

GET  /api/v1/private/teams
POST /api/v1/private/teams
GET  /api/v1/private/teams/:team_id
PATCH /api/v1/private/teams/:team_id
POST /api/v1/private/teams/:team_id/archive

GET  /api/v1/private/projects
POST /api/v1/private/projects
GET  /api/v1/private/projects/:project_id
PATCH /api/v1/private/projects/:project_id
POST /api/v1/private/projects/:project_id/archive
GET  /api/v1/private/projects/:project_id/members
GET  /api/v1/private/projects/:project_id/member-candidates
POST /api/v1/private/projects/:project_id/members
PATCH /api/v1/private/projects/:project_id/members/:user_id/role
DELETE /api/v1/private/projects/:project_id/members/:user_id

GET  /api/v1/private/projects/:project_id/documents
POST /api/v1/private/projects/:project_id/documents
GET  /api/v1/private/projects/:project_id/documents/:document_id
PATCH /api/v1/private/projects/:project_id/documents/:document_id
POST /api/v1/private/projects/:project_id/documents/:document_id/archive

GET  /api/v1/private/projects/:project_id/documents/:document_id/branches
POST /api/v1/private/projects/:project_id/documents/:document_id/branches
GET  /api/v1/private/projects/:project_id/documents/:document_id/branches/:branch_id
PATCH /api/v1/private/projects/:project_id/documents/:document_id/branches/:branch_id
POST /api/v1/private/projects/:project_id/documents/:document_id/branches/:branch_id/archive

GET  /api/v1/private/projects/:project_id/documents/:document_id/drafts
POST /api/v1/private/projects/:project_id/documents/:document_id/drafts
GET  /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id
PATCH /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id
GET  /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id/content/:content_kind
POST /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id/submit
POST /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id/approve
POST /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id/request-changes
POST /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id/reject
POST /api/v1/private/projects/:project_id/documents/:document_id/drafts/promote

GET  /api/v1/private/projects/:project_id/documents/:document_id/versions
GET  /api/v1/private/projects/:project_id/documents/:document_id/versions/:version_id
GET  /api/v1/private/projects/:project_id/documents/:document_id/versions/:version_id/content/:content_kind
GET  /api/v1/private/projects/:project_id/documents/:document_id/versions/:version_id/endpoints
GET  /api/v1/private/projects/:project_id/documents/:document_id/versions/:version_id/endpoints/:endpoint_id
POST /api/v1/private/projects/:project_id/documents/:document_id/diffs
GET  /api/v1/private/projects/:project_id/documents/:document_id/diffs
GET  /api/v1/private/projects/:project_id/documents/:document_id/diffs/:diff_id
GET  /api/v1/private/projects/:project_id/documents/:document_id/diffs/:diff_id/summary

GET  /api/v1/private/projects/:project_id/documents/:document_id/shares
POST /api/v1/private/projects/:project_id/documents/:document_id/shares
POST /api/v1/private/projects/:project_id/documents/:document_id/shares/:share_id/reveal
POST /api/v1/private/projects/:project_id/documents/:document_id/shares/:share_id/revoke

GET  /api/v1/private/audit-logs

GET  /api/v1/private/ai/provider
PUT  /api/v1/private/ai/provider
POST /api/v1/private/ai/provider/test
GET  /api/v1/private/ai/prompts
PUT  /api/v1/private/ai/prompts/:prompt_key
GET  /api/v1/private/projects/:project_id/ai/provider
PUT  /api/v1/private/projects/:project_id/ai/provider
POST /api/v1/private/projects/:project_id/ai/provider/test
GET  /api/v1/private/projects/:project_id/ai/prompts
PUT  /api/v1/private/projects/:project_id/ai/prompts/:prompt_key
POST /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id/ai-summary/regenerate
GET  /api/v1/private/projects/:project_id/documents/:document_id/drafts/:draft_id/ai-summary
POST /api/v1/private/projects/:project_id/documents/:document_id/versions/:version_id/ai-summary/regenerate
GET  /api/v1/private/projects/:project_id/documents/:document_id/versions/:version_id/ai-summary
POST /api/v1/private/projects/:project_id/documents/:document_id/diffs/:diff_id/ai-summary/regenerate
GET  /api/v1/private/projects/:project_id/documents/:document_id/diffs/:diff_id/ai-summary
GET  /api/v1/private/projects/:project_id/ai/chat-sessions
POST /api/v1/private/projects/:project_id/ai/chat-sessions
GET  /api/v1/private/projects/:project_id/ai/chat-sessions/:session_id
POST /api/v1/private/projects/:project_id/ai/chat-sessions/:session_id/messages

GET  /api/v1/private/mcp-tokens
POST /api/v1/private/mcp-tokens
GET  /api/v1/private/mcp-usage
GET  /api/v1/private/mcp-tokens/:token_id
POST /api/v1/private/mcp-tokens/:token_id/revoke
```

## 5. MCP v0.1 工具

MCP 只提供查询和草稿写入能力。正式版本发布必须由 Admin 或 SuperAdmin 通过后台审核动作触发。

```text
VDOC_MCP_TOOL_INVENTORY_START
list_projects
list_documents
list_document_branches
list_api_endpoints
list_api_versions
list_doc_versions
get_latest_schema
get_endpoint_detail
compare_api_versions
get_change_summary
create_api_version_draft
update_api_version_draft
submit_api_version_draft
get_api_version_draft
get_latest_doc
compare_doc_versions
create_doc_draft
update_doc_draft
submit_doc_draft
get_doc_draft
VDOC_MCP_TOOL_INVENTORY_END
```

MCP Token 创建响应返回可复制 token 值；token 所属用户可以通过详情接口重复查看 active token 明文，列表、已撤销和已过期响应必须脱敏。后端同时保存不可逆 `token_hash` 和加密 `token_ciphertext`。MCP tools 绝不能返回 JWT、MCP token 或 Authorization header。`mcp-usage` 只返回 owner（或指定 token 时的 SuperAdmin）可见的脱敏工具调用证据，成功读取已发布内容时记录精确实体 ID，不记录请求参数、schema/Markdown 内容、IP 或 User-Agent。

## 5.2 文档公开分享

- 只有 Project Admin / SuperAdmin 能为已有发布版本的 Document Branch 创建、重新显示和撤销链接。
- 分享能力由随机 secret 的 hash 校验和加密 ciphertext 重显共同支持；完整 URL 只把 secret 放在 fragment。
- 匿名 API 使用 `VdocShare` capability header；密码保护通过 bcrypt verifier 和 15 分钟 share-bound proof 实现。
- `latest` scope 动态跟随最新发布版本；`all_versions` scope 可读取分支发布历史。
- 撤销、到期或 Project / Document / Branch 停用后立即统一返回 unavailable。
- Markdown 公共页面禁 raw HTML、远程图片和危险链接；OpenAPI 只渲染转义文本；下载必须经后端授权。

## 5.1 后台内置 AI 模块

后台 AI 模块是 v0.1 必要产品能力，不属于 MCP 发布能力。它使用管理员配置的 OpenAI-compatible Provider，总结 Vdoc 已生成的 Diff，并在后台页面提供对话。

工程要求：

- SuperAdmin 可配置系统默认 Provider；Project Admin 可配置项目级 Provider。
- 系统 Provider/Prompt 的读取、更新和测试仅限 SuperAdmin；项目 Provider/Prompt 的读取、更新和测试仅限对应 Project Admin 或 SuperAdmin。Reader/Writer 不读取配置，但在资源权限允许时可使用页面 Summary/Chat。
- Provider 字段至少包含 `base_url`、`api_mode`、`model`、加密保存的 `api_key`，可选 `temperature`、`timeout_ms`、`max_output_tokens`、`enabled`。
- `api_mode` 必须至少支持 `chat_completions` 和 `responses`：前者调用 `/v1/chat/completions`，后者调用 `/v1/responses`。
- 项目 Provider test 省略 request body 时测试有效配置；没有启用的项目覆盖时测试系统回退 Provider，不构造空配置。
- Prompt 更新 body 只包含 `system_prompt`、`user_prompt_template` 和 `enabled`；两个文本字段不能为空，所有 user template 必须包含 `{{context}}`，`page_chat` 还必须包含 `{{message}}`。
- Project 归档后 Project Admin/SuperAdmin 仍可只读查看 Provider/Prompt 历史配置，但更新、Provider test 和 Prompt 更新均被阻止。
- OpenAPI / Markdown 草稿提交后基于 Draft Diff Preview 自动生成审核总结。
- 草稿发布后基于正式 Diff 自动生成版本总结。
- Draft Review、Version、Compare / Diff 页面可以围绕当前上下文发起 Chat。
- AI 总结和 Chat 必须标记 AI-generated，不能覆盖机器 Diff，不能触发 approve / reject / publish。
- Provider 未配置或调用失败时，原始 Diff、人工审核和版本查看必须继续可用。
- AI 调用、重新生成、Chat 消息和失败原因写入 audit log；日志不得包含 API Key、JWT、MCP Token 或 Authorization header。

## 6. 验收测试方向

- API 文档和 OpenAPI spec 必须覆盖 Gin 注册路由。
- OpenAPI spec 的 MCP tool enum 必须与实现保持一致。
- 文档测试必须阻止回退到旧的项目模型、旧路径、旧 ID 字段、旧工具名和持久化路径副本字段。
- Markdown 文档流必须覆盖草稿、提交、审核、发布、latest lookup、纯文件 Diff 和 no-change 检测。
- 公开分享必须覆盖角色权限、无发布版本、密码 proof 隔离/过期、latest/all_versions、撤销、上级资源停用、安全响应头和无敏感审计。
- AI 模块测试必须覆盖 Provider 配置脱敏、OpenAI-compatible Chat Completions/Responses 请求构造、Diff 总结生成、Provider 失败降级、Chat 权限边界和 AI 不能发布。
- 原型分层 audit 必须继续阻止 transport/domain/background runtime 直接依赖 DB 细节。

## 7. 里程碑

| 阶段 | 目标 |
|---|---|
| 1 | 清理旧模型残留，建立共享语义和错误码 |
| 2 | PostgreSQL schema、migration、repository 和对象快照 |
| 3 | Project Document、Branch、Draft、Version 领域流 |
| 4 | OpenAPI 上传、normalize、hash、Endpoint Index 和语义 Diff |
| 5 | Markdown 上传、stable snapshot、latest lookup 和文件 Diff |
| 6 | 后台 AI Provider 配置、自动 Diff 总结和页面内 Chat |
| 7 | Private REST routes、OpenAPI spec 和 API docs |
| 8 | MCP tools、token scope、审计和 Vdoc Skill |
| 9 | 公开分享管理、匿名安全查看与下载 |
| 10 | 文档、schema docs、测试和最终验证 |
