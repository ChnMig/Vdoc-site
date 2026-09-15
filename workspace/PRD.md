# Vdoc 主 PRD

> 本文件是 Vdoc 主 PRD，合并了原 `PRD.md` 的精简 MVP 目标与 `PRD_new.md` 的完整产品方案。
> v0.1 MVP 范围以 Project 下的多类型文档管理为准：Project 可以包含多个文档，每个文档有名称、类型、项目内相对路径等通用信息。文档类型至少支持 OpenAPI 接口文档和 Markdown 纯文档。OpenAPI 文档保留语义 Diff、Breaking Change、Endpoint Index 和 MCP 查询；Markdown 文档支持纯文件 Diff。两类文档沿用同一套分支/环境、草稿审核发布、Promote 到目标草稿和用户权限体系。MCP 不允许直接发布正式版本；发布必须在 Vdoc 后台由 Project Admin 或 SuperAdmin 人工审核触发。后台内置 AI 模块是必要能力：管理员可配置 OpenAI-compatible 模型，系统自动基于 Diff 生成版本变更总结，审核人和查看者可在后台页面围绕草稿、版本和 Diff 与 AI 对话。公开文档链接分享也是 v0.1 MVP 的正式能力：Project Admin 或 SuperAdmin 可以为指定文档分支创建多个独立、可撤销的公开链接，并在创建时选择无密码或密码保护；匿名访问者无需账号即可安全查看已发布内容并下载原文件。公开分享不改变草稿审核和人工发布边界，只能暴露已发布版本。

## 1. 产品概述

### 1.1 产品名称

**Vdoc**

### 1.2 产品定位

Vdoc 是一个面向 AI 协作开发团队的文档协作中心。

它以 Project 为协作边界，在 Project 下管理多种类型的文档。OpenAPI 接口文档提供版本管理、语义 Diff、Breaking Change 检测、Endpoint Index、MCP 接入和官方 Skill 工作流；Markdown 纯文档面向 `AGENTS.md`、prompt 文档、runbook、guide 等 `.md` 文件，提供版本快照、纯文本 Diff、草稿审核发布和 MCP 查询/草稿写入。后台内置 AI 模块使用管理员配置的 OpenAI-compatible 模型，根据 Diff 自动总结版本变化，并支持审核页、版本页和 Diff 页内对话。项目管理员还可以把指定分支的已发布文档通过受控公开链接提供给项目外部人员查看和下载。Vdoc 让后端、前端、产品、运维、外部文档使用者和 AI Agent 始终围绕可信文档协作。

### 1.3 一句话介绍

**AI-friendly documentation collaboration hub with OpenAPI API docs, Markdown docs, MCP and Skill.**

中文：

**面向 AI 协作开发的文档协作中心，支持 OpenAPI API 文档、Markdown 纯文档、MCP 和 Skill。**

### 1.4 产品愿景

让使用 AI 编程的小团队不再依赖口头沟通或手动全量比对文档，而是通过版本化 API 契约、Markdown 文档快照、自动 Diff 和 AI 工作流完成接口、提示词、运行手册和项目知识协作。

### 1.5 名称解释

Vdoc 中的 V 可以代表：

- **Vibe**：面向 Vibe Coding / AI 编程团队
- **Versioned**：API 契约和 Markdown 文档版本化
- **Verified**：文档变更可验证，API 支持 Breaking Change 检测

---

## 2. 背景与问题

### 2.1 背景

AI 正在改变软件开发流程。

在小团队中，后端和前端都可能使用 AI 快速生成代码。
这提升了开发速度，但也放大了接口协作问题：

- 后端接口频繁变化
- 前端不知道接口发生了什么变化
- AI 生成接口后，接口文档未必同步
- 接口文档更新后，前端仍需要全量比对
- 接口改动是否破坏兼容性难以判断
- `AGENTS.md`、prompt 文档、运行手册和开发指南散落在仓库或聊天记录中，AI 难以拿到稳定版本
- AI 缺少一个可信的项目知识源
- 审核人虽然能看到 Diff，但仍需要人工组织“这个版本到底变了什么”和“哪些地方要重点看”

传统 API 文档工具和知识库主要解决“文档展示”，但没有很好解决：

```text
接口变更怎么同步？
AI 怎么读取真实接口契约？
前端怎么只消费增量变化？
AI 怎么读取被审核过的 Markdown 项目知识？
Markdown 文档变更怎么按环境流转到 prod？
```

Vdoc 的目标就是解决这些问题。

---

### 2.2 核心痛点

#### 后端痛点

1. 新增或修改接口后，不知道如何稳定同步前端
2. 更新接口文档后，前端仍然不知道具体变更点
3. 破坏性变更依赖人工判断
4. AI 生成接口代码后，文档和代码容易不同步
5. 缺少通过 AI 提交和更新接口契约草稿的统一入口
6. `AGENTS.md`、runbook 和工程约定变更后，缺少审核和环境流转

#### 前端痛点

1. 不想每次全量阅读接口文档
2. 不知道从版本 A 到版本 B 到底改了什么
3. 不知道哪些变更会影响当前页面
4. 对接接口时经常需要问后端字段含义
5. 希望 AI 能基于准确接口契约生成类型、请求代码和迁移建议
6. 希望 AI 能同时读取最新的项目说明、prompt 规范和接入指南

#### AI 使用痛点

1. AI 容易根据上下文猜接口
2. AI 没有稳定的 API Contract 和 Markdown 文档数据源
3. AI 不知道接口版本和纯文档版本变化
4. AI 不知道应该如何查询、比较和总结文档变更
5. 即使有 MCP Tools，也需要明确的工作流指导
6. 后台页面没有一个可配置、可审计的内置 AI 助手来解释 Diff、回答审核问题和沉淀版本总结

---

## 3. 产品目标

### 3.1 MVP 核心目标

MVP 要跑通两个文档模块的共同闭环。

API 文档模块：

```text
后端或 AI 提交 OpenAPI
  ↓
选择目标 OpenAPI 文档和文档分支 / 环境
  ↓
Vdoc 校验并生成 API 文档草稿
  ↓
人工审核后发布为不可变 Document Version
  ↓
Vdoc 解析接口结构
  ↓
Vdoc 对版本做语义 Diff
  ↓
Vdoc 标记 Breaking Changes
  ↓
Vdoc 使用后台配置的 AI 模型自动生成版本变更总结
  ↓
前端通过页面或 AI 查询变化
  ↓
AI 通过 MCP + Skill 输出对接/升级建议
```

纯文档模块：

```text
用户或 AI 提交 Markdown 文档
  ↓
选择目标 Markdown 文档和文档分支 / 环境
  ↓
Vdoc 保存 Markdown 草稿和快照
  ↓
Vdoc 生成纯文件 Diff Preview
  ↓
人工审核后发布为不可变 Markdown Document Version
  ↓
Vdoc 使用后台配置的 AI 模型自动生成文档变更总结
  ↓
团队或 AI 查询最新文档、历史版本和文件 Diff
```

公开分享模块：

```text
Project Admin 或 SuperAdmin 选择文档和目标分支
  ↓
选择仅最新版本或全部已发布版本，并设置有效期
  ↓
选择无密码，或由管理员输入访问密码
  ↓
Vdoc 创建一个策略不可变、可独立撤销的公开链接
  ↓
管理员复制链接，或重新显示仍有效的已有链接
  ↓
匿名访问者安全在线查看已发布内容并下载原文件
  ↓
仅全部版本链接可以查看该分支的已发布历史
  ↓
管理员可随时撤销，撤销后立即失效
```

### 3.2 MVP 关键验证点

MVP 要验证：

1. 小团队是否愿意把 OpenAPI 和关键 Markdown 文档上传到 Vdoc。
2. API 文档模块是否能解决接口追踪问题。
3. 纯文档模块是否能解决 `AGENTS.md`、prompt、runbook 等项目知识的审核和版本追踪问题。
4. API 语义 Diff 是否能减少前端全量比对成本。
5. Markdown 纯文件 Diff 是否足够支撑文档审核。
6. MCP 是否能让 AI 获取真实接口信息和被审核过的 Markdown 项目知识。
7. MCP 草稿提交是否能让 AI 稳定生成或更新 API 文档和 Markdown 文档。
8. 人工审核发布是否能控制 AI 写入风险。
9. Skill 是否能让 AI 稳定完成接口查询、版本升级分析、Markdown 文档查询和草稿提交。
10. 产品工作台是否能让新用户按引导完成 Team、Project、Document、Branch、草稿、审核、发布和 MCP Token 的首轮配置。
11. 开发者门户式 API 文档浏览是否能让前端通过搜索、分组、版本切换、Endpoint 详情和 Diff 视图完成日常对接。
12. 后台 AI 模块是否能让管理员配置 OpenAI-compatible 模型，并在草稿审核、版本查看和 Diff 查看时自动总结变化、回答用户问题。
13. 项目管理员是否能通过固定分支、明确版本范围、有效期和可选密码保护的公开链接，把已发布文档安全提供给项目外部人员，并在需要时立即收回访问。

### 3.3 MVP 成功标准

MVP 完成时应达到：

以下 14 项是产品验证标准，不是“测试通过即可自动完成”的工程状态。真实 Pilot 必须使用 workspace 根目录的 schema-v2 `PILOT_RESULT.template.json`：在 Pilot 开始前记录绑定 lock/commits/日志 SHA-256 的 release 与 live gate attestation；在真实 UTC 窗口内由目标用户逐项执行，并为 consent、观测结果和原话反馈保存 `{path, sha256}` 证据；结束后由不同的 Pilot operator 与 Product Owner 对同一冻结 payload 独立签字。`scripts/vdoc-pilot-result-verify.sh` 会复核实际文件、哈希、时间窗、当前 workspace 和双签绑定；未填写、staff 代打、未实测、证据漂移、同人双签或签后改 payload 时只能标记为待验证。

1. 后端开发能在 1 分钟内提交一个 OpenAPI 草稿，Project Admin 能在审核后发布为正式版本。
2. 团队成员能提交一个 Markdown 文档草稿，例如 `AGENTS.md`，Project Admin 能在审核后发布为正式版本。
3. 前端开发不再需要人工全量比对 API 文档。
4. 文档审核人可以看到 Markdown 文档相较上一版本的纯文件 Diff。
5. Vdoc 能展示 API 或 Markdown 文档相较上一版本发生了什么变化。
6. Vdoc 能识别常见 API Breaking Changes。
7. 前端可以通过 Web UI 或 MCP 查询接口详情、版本差异和变更摘要。
8. AI Agent 能通过 MCP 提交或更新 OpenAPI / Markdown 草稿，但不能绕过人工审核直接发布正式版本。
9. AI Agent 能基于 MCP 返回结果生成或更新前端对接代码、读取项目提示词规范，并且不编造接口字段或文档内容。
10. Web UI 提供产品级首轮体验：清晰的信息架构、引导式 onboarding、面向空状态的下一步指引、角色权限提示和审核协作入口。
11. Web UI 提供开发者门户式 API 文档浏览：按 tag / method / path 搜索和过滤 Endpoint，展示请求、响应、鉴权、服务地址、schema refs、版本内容和 breaking-change Diff。
12. Project Admin 或 SuperAdmin 可以在后台配置 OpenAI-compatible AI 模型，系统能自动基于 OpenAPI/Markdown Diff 生成版本变更总结，并支持用户在审核页、版本页或 Diff 页内与 AI 对话。
13. Project Admin 或 SuperAdmin 可以为同一文档分支创建多个彼此独立的公开链接，选择仅最新版本或全部已发布版本，从 1 个月、3 个月、6 个月、1 年和永久中选择有效期，并选择无密码或密码保护，默认有效期为 3 个月。
14. 匿名访问者无需账号即可通过有效链接安全查看已发布的 OpenAPI 或 Markdown 文档并下载原文件；密码保护链接必须先输入正确密码，全部版本链接才可查看该分支的已发布历史，撤销、过期或上级资源停用后访问立即失效。

---

## 4. 产品边界

### 4.1 MVP 要做

MVP 包含：

1. 用户登录
2. 系统成员 / Team / Project / Role
3. Project 文档管理
4. API 文档模块：OpenAPI 上传、草稿、审核、发布、版本管理
5. 纯文档模块：Markdown `.md` 文档上传、草稿、审核、发布、版本管理
6. API 文档展示
7. Markdown 文档展示
8. API 语义 Diff
9. Markdown 纯文件 Diff
10. Breaking Change 检测
11. Diff 页面
12. MCP Token 管理
13. MCP 查询工具
14. MCP OpenAPI 草稿提交、更新和提交审核
15. MCP Markdown 草稿提交、更新和提交审核
16. 人工审核并发布 API 文档和 Markdown 文档版本
17. 文档分支 / 环境管理，至少支持 `dev`、`test`、`prod`
18. 文档通用信息管理：名称、类型、项目内相对路径、描述、状态
19. 跨分支 Promote：例如把 `dev` 最新已发布 API 文档或 Markdown 文档合并到 `prod` 草稿，并走 Diff Preview 和人工审核
20. 官方 Vdoc Skill
21. Skill 工作流文档与模板
22. 产品级 Web 工作台：首轮引导、任务导向导航、空状态下一步、角色/权限说明、审核协作操作和 MCP 配置提示
23. 开发者门户式文档浏览：API Endpoint 分组、搜索、过滤、详情展示、版本内容、Markdown 内容和 Diff / Breaking Change 浏览
24. 后台内置 AI 模块：管理员配置 OpenAI-compatible 模型，系统自动基于 Diff 生成版本变更总结，并在审核页、版本页和 Diff 页提供上下文对话
25. 文档公开链接分享：Project Admin 或 SuperAdmin 为指定文档分支创建无密码或密码保护链接，重新显示和复制链接、查看历史并撤销链接，匿名访问者安全查看已发布内容和下载原文件

`create_api_version_draft`、`update_api_version_draft`、`submit_api_version_draft`、`create_doc_draft`、`update_doc_draft`、`submit_doc_draft` 进入 v0.1 MVP；绕过人工审核的 MCP 直接发布能力不进入 v0.1，也不作为路线图能力。正式版本发布必须在 Vdoc 后台由 Project Admin 或 SuperAdmin 人工审核触发。

---

### 4.2 MVP 不做

MVP 暂不做：

1. API 调试工具
2. Mock 平台
3. API 自动化测试平台 / 测试用例管理
4. 复杂多级审批流
5. 复杂 RBAC
6. 多协议支持
7. 全语言 SDK 生成
8. 自动修改前端代码
9. PR Bot
10. 通知机器人
11. 字段级前端代码影响分析
12. MCP 直接发布正式版本；Vdoc 的正式版本发布必须在后台人工审核触发
13. 复杂 Git 风格 merge、rebase、conflict resolution；v0.1 只做 source latest published -> target draft 的 Promote 流程
14. 项目成员邀请流程；v0.1 由后台或 Project Admin 从现有系统用户手动添加成员
15. Markdown AST 语义 Diff；纯文档模块 v0.1 只做纯文件 Diff
16. 自动修改用户代码仓库或自动提交 PR
17. 完整商业化运营能力，例如计费、组织层级租户管理、审计报表、通知中心和外部集成市场
18. 具名访客、按收件人邀请、邀请接受流程或成员外协作账号
19. 公开页面评论、批注或协作编辑
20. 分享链接访问次数、使用计数、访问分析看板或访问配额
21. 原地编辑已创建链接的分支、版本范围、有效期或密码，扩大已有链接权限，或在撤销后重新激活
22. 对象存储公开 ACL、对象存储直链或预签名下载链接
23. 公开页面中的交互式 Swagger 或 Redoc

---

## 5. 用户与角色

### 5.1 用户类型

#### SuperAdmin

系统级超级管理员。

负责：

- 创建、停用和管理系统成员
- 创建 Team 和 Project
- 指定或调整项目初始 Admin
- 从现有系统用户中把成员手动加入项目
- 在必要时兜底管理所有项目、成员和用户 MCP Token
- 兜底创建、查看、重新显示、复制和撤销任意项目的文档公开链接
- 查看系统级审计信息，MVP 可选

#### System Member

系统成员是已注册或被创建的用户账号。

规则：

- 成员本身不天然拥有任何项目权限
- 成员通过 `ProjectMember` 加入一个或多个 Project
- 同一个成员可以在不同 Project 中拥有不同角色
- 非 SuperAdmin 且未加入项目的成员不能访问该项目资源

#### Project Admin

项目管理员，权限只作用于所在 Project。

负责：

- 管理 Project 基本信息
- 创建和管理 Project 下的文档
- 从现有系统用户中添加、移除成员并分配项目角色
- 审核并发布 OpenAPI 文档草稿为正式 Document Version
- 审核并发布 Markdown 文档草稿为正式 Document Version
- 配置项目可用的 AI 模型，或使用 SuperAdmin 配置的系统默认模型
- 在草稿审核、版本查看和 Diff 查看时使用内置 AI 生成总结并进行对话
- 为项目内文档的指定分支创建多个无密码或密码保护链接，查看保留的链接历史，重新显示或复制有效链接，并立即撤销不再需要的链接
- 查看项目内审计日志，MVP 可选

#### Writer

项目可读写成员，通常是后端开发。

负责：

- 查看项目和文档
- 上传 OpenAPI 并创建草稿
- 上传或编辑 Markdown `.md` 文档并创建草稿
- 更新草稿并提交审核
- 查看本次接口变化和审核意见
- 通过 MCP `api:draft` / `doc:draft` Token 让 AI 提交或更新草稿

Writer 不能审核或发布 Document Version，也不能创建或管理文档公开链接；发布必须由 Project Admin 或 SuperAdmin 触发。

#### Reader

项目只读成员，通常是前端开发、测试或产品。

负责：

- 查看 API 文档
- 查看 Markdown 文档
- 查看版本 Diff
- 查询 Breaking Changes
- 查看 AI 变更总结，并在有权限的文档、版本和 Diff 上进行只读 AI 问答
- 使用 AI/MCP 查询接口、Markdown 文档和版本变化

Reader 不能创建或管理文档公开链接。

#### Anonymous Visitor

匿名访问者不是系统成员，不加入 Project RBAC，只能通过有效的文档公开链接访问被授权内容。

可以：

- 无需登录查看链接当前允许的已发布文档内容；密码保护链接需要先输入正确密码
- 下载对应已发布版本的原始文件
- 在链接范围为全部已发布版本时查看同一分支的版本历史并切换版本

不能：

- 访问草稿、审核内容、未发布版本或其他分支
- 进入项目后台、查看成员信息或使用 MCP、AI 设置等私有能力
- 通过猜测文档、分支或版本标识扩大链接权限

#### AI Agent

通过 MCP 和 Skill 使用 Vdoc。

负责：

- 查询接口定义
- 查询 Markdown 文档内容
- 查询版本列表
- 查询版本 Diff
- 生成前端对接建议
- 生成接口变更说明
- 提交或更新 OpenAPI 草稿
- 提交或更新 Markdown 文档草稿
- 查看草稿审核结果并按意见修订

AI Agent 不能绕过人工审核直接发布正式 Document Version。

#### Admin AI Assistant

Vdoc 后台内置的 AI 助手，不是外部 MCP Agent。它在 Vdoc 后台页面内运行，使用管理员配置的 OpenAI-compatible 模型，只基于用户当前有权限访问的草稿、版本、Diff、Endpoint 和 Markdown 内容生成总结或回答问题。

负责：

- 在 OpenAPI 或 Markdown 草稿提交、发布或比较版本后，根据 Diff 自动生成版本变更总结。
- 在草稿审核页提示审核重点、breaking changes、可能影响的端点或 Markdown 章节。
- 在 Version / Diff 页面回答用户关于本次变更、历史版本、Endpoint、Markdown 内容的问题。
- 明确区分事实数据、AI 总结和不确定项，不替代人工审核结论。

Admin AI Assistant 不能提交、批准、拒绝、发布或修改任何草稿和正式版本。

---

### 5.2 权限模型

MVP 使用“系统级超级管理员 + 项目级 RBAC”。

```text
System
  └── User
        └── is_super_admin

Team
  └── Project
        └── ProjectMember
              └── role: Admin | Writer | Reader
```

用户可以加入多个 Project，并在不同 Project 中拥有不同角色。项目权限以 `user_id + project_id` 查询 `project_members` 为准；JWT 只保存必要身份标识，不长期保存项目角色，避免成员角色变更后 token 权限不同步。

MVP 不做邀请、待接受或加入确认流程。成员必须先是系统用户，再由 SuperAdmin 或 Project Admin 手动加入目标 Project。

文档公开分享管理只向 Project Admin 和 SuperAdmin 开放。匿名访问不创建系统账号或项目角色，其权限只来自当前公开链接固定的文档分支、版本范围、密码保护要求和有效状态。

数据库中的状态、角色、分支类型、schema 格式、source type、actor type、HTTP method、diff 状态、diff 严重度、diff change type 和 MCP scopes 都使用从 1 开始的整数码保存，不使用 text enum。API 可以返回可读名称，存储层以 code map 为准。

#### SuperAdmin

系统级权限：

```text
system:manage
user:manage
project:manage:any
member:manage:any
mcp_token:manage:any
ai_provider:manage:any
ai_chat:use:any
api:read:any
api:draft:any
api:publish:any
doc:read:any
doc:draft:any
doc:publish:any
```

可以：

- 管理系统成员
- 创建和管理所有 Team / Project
- 指定项目 Admin
- 兜底访问、修改和发布任意项目资源
- 兜底吊销任意用户的 MCP Token
- 配置系统默认 AI Provider，或兜底管理任意项目的 AI Provider

#### Reader

项目级权限：

```text
api:read
doc:read
ai_chat:use
```

可以：

- 查看 Project
- 查看 Project 文档
- 查看 API 文档
- 查看 Markdown 文档
- 查看版本
- 查看 Diff
- 在可访问的文档、版本和 Diff 上使用 AI Chat
- 使用 `api:read` / `doc:read` MCP Token 查询接口和文档

#### Writer

项目级权限：

```text
api:read
api:draft
doc:read
doc:draft
```

可以：

- Reader 的全部能力
- 上传 OpenAPI 并创建草稿
- 上传或编辑 Markdown `.md` 并创建草稿
- 更新草稿
- 提交草稿审核

不能：

- 审核草稿
- 发布 Document Version
- 管理项目成员

#### Admin

项目级权限：

```text
api:read
api:draft
api:publish
doc:read
doc:draft
doc:publish
project:manage
member:manage
ai_provider:manage
ai_chat:use
```

可以：

- Writer 的全部能力
- 管理项目
- 管理成员
- 审核和发布项目内 API 文档草稿和 Markdown 文档草稿
- 配置项目 AI Provider，或选择使用系统默认 AI Provider
- 在项目文档、草稿、版本和 Diff 上使用 AI Chat
- 创建、查看、重新显示、复制和撤销项目内文档公开链接

---

## 6. 核心概念

### 6.1 Team

团队空间，用于组织多个项目。

示例：

```text
Acme Dev Team
```

### 6.2 Project

实际协作单元。

示例：

```text
Mall App
Admin Console
```

### 6.3 Document

Project 下的文档实体。一个 Project 可以有多个文档，每个文档都保存通用信息：

- `name`：展示名称，例如 `User Service API`、`AGENTS.md`、`Frontend Prompt Guide`。
- `document_type`：文档类型码，v0.1 至少支持 1 OpenAPI 接口文档、2 Markdown 纯文档。
- `relative_path`：在项目中的相对路径，例如 `docs/api/user-service.yaml`、`AGENTS.md`、`docs/prompts/frontend.md`。
- `description`：说明。
- `status`：状态码，使用从 1 开始的整数码。

文档类型决定后续处理方式。OpenAPI 接口文档会解析 Endpoint、生成 Semantic API Diff 和 Breaking Change；Markdown 纯文档只做 Markdown 快照和纯文件 Diff。

### 6.4 OpenAPI Interface Document

OpenAPI 接口文档是 `document_type = 1` 的文档，用于管理某个服务或接口域的 OpenAPI 契约。

示例：

```text
name: User Service API
relative_path: docs/api/user-service.yaml
document_type: OpenAPI Interface Document
```

### 6.5 Markdown Document

Markdown 纯文档是 `document_type = 2` 的文档，用于管理 `AGENTS.md`、prompt 规范、runbook、guide 等 `.md` 文件。

示例：

```text
name: AGENTS.md
relative_path: AGENTS.md
document_type: Markdown Document
```

```text
name: Frontend Prompt Guide
relative_path: docs/prompts/frontend.md
document_type: Markdown Document
```

### 6.6 Document Branch / Environment

每个 Document 都有自己的发布轨道，用于表达多环境或功能分支。它不是代码仓库分支，而是 Vdoc 内的文档发布环境。

MVP 默认初始化：

```text
dev
test
prod
```

可选支持 `feature/*`，例如 `feature/checkout-v2` 或 `feature/agent-prompt-v2`。`prod` 默认受保护，发布到 `prod` 必须由 Project Admin 或 SuperAdmin 审核。

不同分支下的版本互相隔离。同一 Document 下的版本唯一性按 `document_id + branch_id + version_name` 判断。

### 6.7 Document Version / Draft

Document Version 是某个 Document 在某个 Branch 下的一次不可变快照。修改文档必须创建新草稿，审核通过后发布为新的版本。

Document Draft 是待审核的文档草稿，始终写入目标 branch。AI 可以通过 MCP 创建、更新和提交草稿，但不能直接发布为正式版本。

OpenAPI 和 Markdown 草稿更新必须携带编辑快照的 `expected_revision`。版本标识由正文 hash、可编辑元数据和审核状态生成，不受数据库时间精度和缓存刷新影响。旧快照更新失败时保留本地修改，重新读取并合并后再保存；REST 正文响应同时返回同一快照的 `draft` 元数据。

已提交草稿还返回 `review_revision`。批准、要求修改和拒绝必须携带审核人实际查看的正文快照中 `detail.draft.review_revision`，请求字段名为 `expected_review_revision`。它绑定内容、提交轮次和预览使用的分支最新版本；缺失时返回 `INVALID_ARGUMENT`，内容修改、再次提交（包括相同内容）或分支已有新发布时返回 `FAILED_PRECONDITION`。此时保留审阅备注，重新加载正文和差异后再作决定；发布事务还会再次核对草稿和分支基线。已发布草稿保留历史审核基线。后端与 Admin 需同步升级。

跨分支 Promote 也落到草稿：例如把 `dev` 最新已发布文档合并到 `prod` 时，Vdoc 创建 `prod` 分支草稿，记录 `source_branch_id`、`source_version_id` 和目标分支的 `base_version_id`，生成 Diff Preview 后再走普通审核发布。

Document Draft 支持：

- `draft`
- `submitted`
- `changes_requested`
- `rejected`
- `published`

OpenAPI 文档草稿可由 Web 上传或 MCP `api:draft` tool 创建；Markdown 文档草稿可由 Web 上传、后台编辑或 MCP `doc:draft` tool 创建。发布前必须生成 Diff Preview，并由 Project Admin 或 SuperAdmin 审核。

### 6.8 Endpoint

OpenAPI 中的一个接口，仅属于 API 文档模块。

示例：

```text
GET /api/users/{id}
POST /api/orders
```

### 6.9 Semantic API Diff

基于接口契约结构的语义差异，不是文件文本 diff，仅用于 API 文档模块。

示例：

```text
GET /api/users/{id}
- response.name 删除，breaking
- response.age string -> number，breaking
- response.nickname 新增，compatible
```

### 6.10 Plain File Diff

基于 Markdown 文件文本的差异，用于纯文档模块。v0.1 只做纯文件 diff / unified diff，不做 Markdown AST 语义 diff。

示例：

```diff
- Use the old API client.
+ Use the Vdoc MCP tools as the source of truth.
```

### 6.11 Skill

Vdoc Skill 是官方 AI 工作流指导包。

它告诉 AI：

- 应该什么时候使用 Vdoc
- 应该调用哪些 MCP tools
- 调用顺序是什么
- 如何输出前端可理解的结果
- 不要编造接口字段
- 如何生成变更摘要和对接建议

### 6.12 Built-in Admin AI

Built-in Admin AI 是 Vdoc 后台内置的 AI 模块，和 MCP/Skill 面向外部 Agent 的能力不同。它的目标是减少审核人理解 Diff 的成本，并把版本变化解释留在 Vdoc 后台内。

配置方式：

- SuperAdmin 可以配置系统默认 AI Provider。
- Project Admin 可以为自己的 Project 配置或覆盖 AI Provider。
- Provider 使用统一 OpenAI-compatible 协议，必须支持可配置 API 模式：`chat_completions` 对应 `/v1/chat/completions`，`responses` 对应 `/v1/responses`。
- 配置字段包括 `base_url`、`api_mode`、`model`、`api_key`，可选 `temperature`、`timeout_ms`、`max_output_tokens`。

运行规则：

- OpenAPI 或 Markdown 草稿提交后，Vdoc 基于 Draft Diff Preview 生成审核总结。
- 草稿审核通过并发布版本后，Vdoc 基于正式 Diff 生成版本变更总结。
- 用户在 Draft Review、Version、Compare/Diff 页面可以打开 AI Chat 面板，围绕当前草稿、版本或 Diff 对话。
- AI 上下文必须来自 Vdoc 已保存的数据：Diff Summary、Diff Items、Endpoint Detail、Markdown snapshot、review comment、changelog 和版本 metadata。
- AI 总结和对话结果必须标记为 AI-generated，不能覆盖机器生成的 Diff Item，也不能作为发布权限判断。
- `api_key` 必须加密保存，后台列表和详情默认脱敏，只有具备配置权限的管理员可以更新。
- AI 调用、失败、重试和用户对话必须进入审计日志，且不得写入原始密钥。

### 6.13 Public Document Share Link

Public Document Share Link 是由 Project Admin 或 SuperAdmin 为某个 Document 的指定 Branch 创建的公开访问能力。

核心规则：

- 同一文档分支可以创建多个链接，每个链接独立生效、独立过期、独立撤销。
- 链接创建后，其文档、分支、版本范围、有效期和密码保护策略不可修改；需要不同策略或更换密码时，必须撤销旧链接并创建新链接。
- 版本范围支持 `latest` 和 `all_versions`。`latest` 始终指向该分支当前最新的已发布版本；`all_versions` 可以访问该分支全部已发布版本，并随未来人工发布的新版本更新。
- 有效期支持 1 个月、3 个月、6 个月、1 年和永久，默认 3 个月。
- 创建时可以选择不设密码，或由管理员输入访问密码启用保护。系统只显示链接是 protected 或 unprotected，不返回或重新显示密码。
- 公开分享只暴露已发布版本，不暴露草稿、审核内容或未发布版本，也不改变现有人工审核发布要求。
- 链接密钥仍是 bearer capability。无密码链接凭完整链接访问；密码保护链接还必须先通过密码校验，才能访问元信息、内容、历史或下载。每个链接都必须可以立即撤销。
- 链接撤销、过期，或所属 Project、Document、Branch 等上级资源不再有效时，公开访问立即失效。
- 已撤销和已过期记录继续保留在管理历史中，不允许重新激活。

---

## 7. 核心使用流程

### 7.1 初始化流程

```text
用户注册/登录
  ↓
创建 Team
  ↓
创建 Project
  ↓
从现有系统用户中添加成员
  ↓
分配角色
  ↓
创建 Project 文档
  ↓
为文档填写名称、类型、项目内相对路径等信息
```

示例：

```text
Team: Acme Dev Team
Project: Mall App
Documents:
- User Service API: OpenAPI, docs/api/user-service.yaml
- Order Service API: OpenAPI, docs/api/order-service.yaml
- AGENTS.md: Markdown, AGENTS.md
- Deploy Runbook: Markdown, docs/runbooks/deploy.md
```

---

### 7.2 后端上传接口文档流程

```text
Writer 进入 Project 文档页面
  ↓
选择 OpenAPI 类型文档，例如 User Service API
  ↓
上传 OpenAPI JSON/YAML
  ↓
填写 branch_id、version_name、changelog，可选填写 source_git_commit_id
  ↓
Vdoc 校验 OpenAPI
  ↓
保存 Raw OpenAPI
  ↓
生成 Normalized OpenAPI
  ↓
计算 Hash
  ↓
创建 OpenAPI Document Draft
  ↓
人工审核草稿
  ↓
审核通过后发布 Document Version
  ↓
解析 Endpoint Index
  ↓
展示接口文档
```

首次上传输出：

```text
user-service@1.0.0 已发布
接口数量：23
```

---

### 7.3 后端更新接口文档流程

```text
Writer 或 AI 提交新的 OpenAPI 草稿
  ↓
Vdoc 和目标分支上一版本比较 hash
  ↓
如果无变化，提示 No Changes
  ↓
如果有变化，创建或更新草稿
  ↓
人工审核草稿
  ↓
审核通过后发布新版本
  ↓
Vdoc 执行语义 Diff
  ↓
Vdoc 生成 Diff Summary
  ↓
Vdoc 标记 Breaking Changes
  ↓
Vdoc 调用后台配置的 AI Provider 生成版本变更总结
  ↓
审核人或查看者可在页面上继续追问本次变更
```

输出示例：

```text
user-service@1.1.0 已发布

变更摘要：
- 新增接口：1
- 修改接口：2
- 删除接口：0
- Breaking Changes：2
```

---

### 7.4 前端查看接口文档流程

```text
Reader 进入 Project
  ↓
选择 OpenAPI 类型文档
  ↓
选择版本
  ↓
查看接口列表
  ↓
查看 Endpoint 详情
```

Endpoint 详情展示：

- method
- path
- summary
- request parameters
- request body
- response body
- status codes
- required fields
- enum values

---

### 7.5 前端查看版本变化流程

```text
Reader 进入 OpenAPI 类型文档
  ↓
点击 Compare Versions
  ↓
选择 fromVersion
  ↓
选择 toVersion
  ↓
查看 Diff Summary
  ↓
查看 Breaking Changes
  ↓
查看每个 Endpoint 的变更
  ↓
查看 AI 变更总结，必要时在页面上追问
```

输出示例：

```text
Compare user-service@1.0.0 → user-service@1.1.0

Summary:
- Added endpoints: 1
- Modified endpoints: 2
- Removed endpoints: 0
- Breaking changes: 2

Breaking:
1. GET /api/users/{id}
   response.name removed
2. GET /api/users/{id}
   response.age changed from string to number
```

---

### 7.6 前端通过 AI 查询接口流程

前端在 AI 工具中输入：

```text
帮我查询 Mall App 项目下 user-service 的 GET /api/users/{id} 接口定义，并生成 TypeScript 类型。
```

Skill 指导 AI：

```text
1. 使用 Vdoc MCP 作为接口事实来源
2. 调用 list_projects
3. 调用 list_documents
4. 调用 list_api_versions
5. 调用 get_endpoint_detail
6. 根据返回结果生成 TS 类型和请求示例
```

输出示例：

```ts
type UserDetail = {
  id: string
  nickname: string
  age: number
  email?: string
}
```

---

### 7.7 前端通过 AI 查询版本变化流程

前端输入：

```text
帮我看一下 user-service 从 1.0.0 到 1.1.0 前端要改什么。
```

Skill 指导 AI：

```text
1. 调用 compare_api_versions
2. 调用 get_change_summary
3. 优先输出 breaking changes
4. 按 endpoint 分组
5. 明确区分必须处理和可选关注
```

AI 输出：

```markdown
## user-service 1.0.0 → 1.1.0 前端影响

### 必须处理

1. GET /api/users/{id}
   - response.name 被删除
   - 请改用 response.nickname

2. GET /api/users/{id}
   - response.age 从 string 改为 number
   - 请检查年龄格式化逻辑

### 可选关注

1. response.email 新增
   - 兼容变化，可按需展示
```

---

### 7.8 后端通过 AI 提交接口文档草稿流程

v0.1 MVP 支持 AI 通过 MCP 创建、更新和提交 OpenAPI 草稿。发布仍由后台人工审核触发，AI 不能直接发布正式版本。

后端输入：

```text
帮我把当前 OpenAPI 提交到 Vdoc，项目 Mall App，文档 User Service API，版本号 1.2.0，等待审核发布。
```

Skill 指导 AI：

```text
1. 确认 project 和 service
2. 检查 OpenAPI 基本结构
3. 调用 create_api_version_draft 或 update_api_version_draft
4. 调用 submit_api_version_draft 提交审核
5. 输出草稿状态和 diff preview
6. 如果有 breaking changes，提醒审核人重点关注
```

AI 输出：

```markdown
已提交 user-service@1.2.0 草稿，等待人工审核发布。

## 本次接口变化

- 新增接口：1
- 修改接口：2
- 删除接口：0
- Breaking Changes：1

## 需要同步前端

- POST /api/orders 新增必填参数 addressId
```

---

### 7.9 提交 Markdown 纯文档草稿流程

v0.1 MVP 支持用户或 AI 提交 `.md` 文档草稿，例如 `AGENTS.md`、prompt 规范、runbook 或开发指南。发布仍由后台人工审核触发，AI 不能直接发布正式版本。

```text
Writer 进入 Project 文档页面
  ↓
选择 Markdown 类型文档，例如 AGENTS.md
  ↓
选择目标 branch，例如 dev
  ↓
上传或编辑 Markdown 文件
  ↓
填写 relative_path、version_name、changelog，可选填写 source_git_commit_id
  ↓
Vdoc 保存 Raw Markdown 到 RustFS
  ↓
计算 content hash
  ↓
判断是否和目标分支最新版本相同
  ↓
创建 Markdown Document Draft
  ↓
生成纯文件 Diff Preview
  ↓
人工审核草稿
  ↓
审核通过后发布 Markdown Document Version
  ↓
Vdoc 调用后台配置的 AI Provider 生成文档变更总结
```

示例：

```text
AGENTS.md@1.2.0 已提交草稿，等待人工审核发布。
```

---

### 7.10 后台 AI 自动总结和对话流程

该流程发生在 Vdoc 后台页面，不通过 MCP 发布版本，也不让 AI 代替审核人做批准动作。

```text
SuperAdmin 或 Project Admin 在后台配置 AI Provider
  ↓
填写 base_url、api_mode、model、api_key 等 OpenAI-compatible 配置
  ↓
Writer 或 AI 提交 OpenAPI / Markdown 草稿
  ↓
Vdoc 生成 Draft Diff Preview
  ↓
Vdoc 调用配置的 AI Provider 生成审核总结
  ↓
Project Admin 在草稿审核页查看机器 Diff、AI 总结和审核重点
  ↓
Project Admin 可在页面内向 AI 追问，例如“这次最可能影响前端的是哪几个接口？”
  ↓
Project Admin 人工 approve / request changes / reject
  ↓
发布后 Vdoc 基于正式 Diff 保存版本 AI 总结
  ↓
Reader 在 Version / Compare 页面查看 AI 总结，或围绕当前版本继续对话
```

AI 对话示例：

```text
用户：这个版本相比上个 prod 版本，前端必须处理什么？
AI：根据 Vdoc Diff，有 2 个必须处理项：...
```

```text
用户：AGENTS.md 这次主要改了哪些开发约定？
AI：本次 Markdown Diff 显示主要修改了 MCP 使用规则和 review checklist：...
```

### 7.11 文档分支间 Promote / Merge 流程

API 文档模块和纯文档模块都支持把一个分支最新已发布版本提升到另一个分支。v0.1 不做复杂 Git merge，不直接覆盖目标分支。

```text
Project Admin 选择 source_branch，例如 dev
  ↓
选择 target_branch，例如 prod
  ↓
Vdoc 读取 source_branch 最新 published version
  ↓
Vdoc 读取 target_branch 最新 published version 作为 base_version
  ↓
在 target_branch 创建 promote draft
  ↓
生成 Diff Preview
  ↓
Project Admin 或 SuperAdmin 审核
  ↓
审核通过后在 target_branch 发布新的不可变版本
```

API 文档 Promote 使用语义 Diff Preview；Markdown 文档 Promote 使用纯文件 Diff Preview。

### 7.12 创建和管理文档公开链接流程

```text
Project Admin 或 SuperAdmin 进入文档公开分享管理页
  ↓
选择 Document 和目标 Branch
  ↓
确认该 Branch 已有至少一个人工发布的版本
  ↓
选择 latest 或 all_versions
  ↓
选择 1 个月、3 个月、6 个月、1 年或永久，默认 3 个月
  ↓
选择不设密码，或输入访问密码启用保护
  ↓
创建新的不可变公开链接
  ↓
复制链接，或以后重新显示仍有效的链接
  ↓
在历史列表中查看 active、expired、revoked 状态
  ↓
不再需要时确认撤销，链接立即失效
```

### 7.13 匿名访问公开文档流程

```text
访问者打开公开链接
  ↓
Vdoc 在发起请求前读取并移除 URL fragment 中的分享密钥
  ↓
如果链接受密码保护，访问者输入密码
  ↓
Vdoc 校验链接、密码、有效期、撤销状态和上级资源状态
  ↓
展示安全的 Markdown 内容或转义后的 OpenAPI 文本
  ↓
访问者可下载当前版本的原始文件
  ↓
如果是 all_versions 链接，可查看并切换同一 Branch 的已发布历史
```

密码保护链接在正确密码校验前不得返回文档元信息、内容、历史或下载。密码缺失、密码错误、链接无效、未知、过期、已撤销、越权或上级资源失效时，页面统一显示不可用状态，不说明具体原因。

---

## 8. 功能需求

### 8.1 登录与用户

#### 描述

用户可以登录 Vdoc 并访问自己有权限的项目。

#### MVP 支持

至少支持一种：

- 邮箱密码
- GitHub OAuth
- 本地开发模式账号

#### 验收标准

- 未登录用户无法访问项目数据
- 登录后可以查看自己加入的 Project
- 用户可以退出登录

---

### 8.2 Team 管理

#### 描述

用户可以创建 Team，并在 Team 下创建 Project。

#### 功能

- 创建 Team
- 查看 Team
- 查看 Team 下的 Project

#### 验收标准

- SuperAdmin 可以创建 Team / Project，并指定 Project Admin
- Team 下可以有多个 Project

---

### 8.3 Project 管理

#### 描述

Project 是权限和协作的基本单位。

#### 功能

- 创建 Project
- 查看 Project
- 编辑 Project 名称和描述
- 查看 Project 下的文档列表

#### 验收标准

- 用户只能看到自己加入的 Project
- Project Admin 可以编辑所在 Project

---

### 8.4 成员和角色管理

#### 描述

Project Admin 可以管理项目成员。

#### 功能

- 添加成员
- 移除成员
- 修改角色
- 查看成员列表

#### 验收标准

- Reader 不能上传 API 文档或 Markdown 文档
- Writer 可以上传 API 文档或 Markdown 文档并提交草稿，但不能发布版本
- Admin 可以管理成员并审核发布
- SuperAdmin 可以管理系统成员和所有项目的初始 Admin

---

### 8.5 Project 文档管理

#### 描述

Document 是 Project 下的文档管理基本单位。一个 Project 可以有多个文档，每个文档有名称、类型、项目内相对路径等通用信息。

#### 功能

- 创建文档
- 查看文档列表
- 编辑文档名称、描述、类型和相对路径
- 查看文档版本
- 按文档类型筛选，例如 OpenAPI 接口文档或 Markdown 纯文档

#### 验收标准

- Project 下可以有多个 Document。
- Document 名称在 Project 内唯一。
- Document `relative_path` 在 Project 内唯一。
- Document `document_type` 使用整数码保存，v0.1 至少支持 1 OpenAPI 接口文档、2 Markdown 纯文档。
- Document 下可以有多个 Document Version。

---

### 8.5.1 Document Branch / Environment 管理

#### 描述

每个 Document 下维护独立的文档分支 / 环境，用于区分 `dev`、`test`、`prod` 和可选 `feature/*` 文档版本。

#### 功能

- 创建 Document 时自动初始化 `dev`、`test`、`prod`。
- Project Admin 可以创建 `feature/*` 分支。
- `prod` 默认受保护。
- Document Version、Draft、Endpoint、Diff 查询必须能按 branch 过滤。
- 同一 Document 下分支名唯一。
- 同一 Document 同一 Branch 下 `version_name` 唯一。

#### 验收标准

- Document 创建后自动存在 `dev`、`test`、`prod`。
- Reader 可以查看 Document 分支列表。
- Writer 创建 OpenAPI 或 Markdown 草稿时必须指定目标 branch。
- Admin 可以从 source branch 创建 target branch promote draft。
- `prod` 发布必须走 Project Admin 或 SuperAdmin 审核。

---

### 8.6 OpenAPI 上传

#### 描述

Writer 或 Project Admin 可以上传 OpenAPI JSON/YAML，并生成待审核草稿。

#### 支持格式

MVP 支持：

```text
OpenAPI 3.0
OpenAPI 3.1
```

#### 上传字段

- document_id
- branch_id
- version_name
- changelog
- source_git_commit_id，可选，表示用户应用或代码仓库的 Git commit ID，不是 Vdoc 自身 Git commit，也不是 Vdoc 契约分支
- schema_content 或 schema_file

#### 系统处理

```text
校验 OpenAPI
保存 Raw OpenAPI
生成 Normalized OpenAPI
计算 hash
判断是否和目标分支最新版本相同
创建 OpenAPI Document Draft
生成 Diff Preview
等待人工审核发布
```

#### 验收标准

- 非法 OpenAPI 上传失败并提示原因
- 合法 OpenAPI 上传成功后生成草稿，不直接生成版本
- 草稿记录目标 `document_id`、`branch_id`，可选记录 `source_git_commit_id`
- 重复上传相同内容时提示 No Changes
- 审核发布后生成不可变 Document Version。OpenAPI 类型文档需要解析 Endpoint Index 并触发语义 Diff。

---

### 8.7 Document Version 管理

#### 描述

每次审核发布形成一个文档版本。上传只创建或更新草稿，不能直接生成正式版本。

#### 字段

- version_no
- version_name
- document_id
- branch_id
- status code: 1 published
- changelog
- source_git_commit_id，可选，从来源草稿复制
- source_draft_id
- source_type
- source_branch_id
- source_version_id
- base_version_id
- published_by
- published_at
- schema_hash
- content_hash

#### MVP 状态

MVP 存储状态可以只支持 code 1：

```text
1 published
```

后续如果增加版本状态，也继续使用整数码保存，不引入 text enum。

#### 验收标准

- 可以按 document 和 branch 查看版本列表
- 可以查看版本详情
- 可以查看指定版本文档内容
- 可以比较两个版本
- 同一 Document 下 `version_name` 按 branch 隔离，唯一约束为 `document_id + branch_id + version_name`

---

### 8.8 API 文档展示

#### 描述

展示指定版本的 API 文档。

#### 展示内容

- endpoint 列表
- tag 分类
- method
- path
- summary
- request params
- request body
- responses
- schema fields

#### 验收标准

- Reader 可以查看接口文档
- 可以按 path 搜索接口
- 可以查看 endpoint 详情
- 可以切换不同版本查看

---

### 8.8.1 Markdown 文档展示

#### 描述

展示指定版本的 Markdown 文档。

#### 展示内容

- 文档名称
- 文档类型
- 项目内相对路径
- branch
- version_name
- Markdown 内容预览
- changelog
- source_git_commit_id

#### 验收标准

- Reader 可以查看 Markdown 文档。
- 可以切换不同版本查看。
- 可以查看文档原始 Markdown 内容。
- Markdown 文档只支持 `.md` 文件。

---

### 8.9 语义 Diff

#### 描述

Vdoc 进行的是语义 Diff，不是文件文本 Diff。

系统先解析 OpenAPI，再比较接口契约。

#### MVP Diff 范围

Endpoint 层：

- endpoint added
- endpoint removed
- endpoint modified

Request 层：

- query/path/header param added
- query/path/header param removed
- param type changed
- request body field added
- request body field removed
- request body field type changed
- request required changed
- request enum changed

Response 层：

- response status code added
- response status code removed
- response field added
- response field removed
- response field type changed
- response required changed
- response enum changed

#### Diff Item 字段

```text
change_type
severity
method
path
location
old_value
new_value
message
frontend_impact
```

#### 验收标准

- 能比较同一 OpenAPI 类型 Document 任意两个版本
- 能识别接口新增/删除/修改
- 能识别字段删除
- 能识别字段类型变化
- 能识别新增必填请求参数
- 能生成结构化 diff items

---

### 8.9.1 Markdown 纯文件 Diff

#### 描述

Markdown 文档只做纯文件 Diff，不做 Markdown AST 语义 Diff。Diff Preview 和正式 Diff 可以使用 unified diff / line diff 表示。

#### MVP Diff 范围

- 新增行
- 删除行
- 修改行
- 文件整体 hash 变化
- diff summary，例如新增行数、删除行数、修改块数量

#### 验收标准

- 能比较同一 Markdown 类型 Document 任意两个版本。
- 能展示 unified diff。
- 能在草稿审核页展示 Diff Preview。
- 不识别标题层级、代码块语义或 Markdown AST 结构变化。

---

### 8.10 Breaking Change 检测

#### 描述

根据规则判断变更是否破坏兼容。

#### MVP Breaking 规则

请求侧 breaking：

- endpoint 删除
- 新增必填 query 参数
- 新增必填 header 参数
- 新增 request body 必填字段
- 请求字段类型变化，包括 query、header、cookie、path 参数中的数组元素和嵌套属性
- 请求字段 enum 删除值，以及从无限制变为有限枚举；取消枚举限制属于兼容变更
- request content-type 删除

响应侧 breaking：

- 删除响应字段
- 响应字段类型变化
- 响应结构层级变化
- 删除 2xx 响应状态码
- 响应字段 enum 删除值，以及取消枚举限制后可能返回更多值；为原本无限制的响应增加枚举限制属于兼容变更

通常兼容：

- 新增 endpoint
- 新增可选请求参数
- 新增响应字段
- description 变化
- summary 变化
- example 变化

#### 验收标准

- Diff Item 可以标记 severity
- Breaking Changes 可以单独展示
- Diff Summary 包含 breaking_count

---

### 8.11 Diff 页面

#### 描述

用户可以在页面上比较两个版本。

#### 页面内容

- fromVersion selector
- toVersion selector
- summary cards
- breaking changes
- added endpoints
- removed endpoints
- modified endpoints
- diff item list

#### 验收标准

- 可以选择两个版本比较
- 可以查看统计数据
- 可以查看 Breaking Changes
- 可以按 endpoint 分组展示
- 可以筛选 severity

---

### 8.12 MCP Token 管理

#### 描述

MCP Token 默认绑定用户，用于用户在自己的 AI 工具、IDE 或本地 MCP 客户端中全局配置。Token 不直接绑定单个 Project；调用具体 Project 资源时，Vdoc 根据 token 所属用户在该 Project 的 `ProjectMember` 角色实时计算权限。

用户可以在后台创建、查看、复制和废弃自己的 MCP Token。Token 明文允许在后台重复查看和复制；为支持这个能力，后端需要保存可解密的 `token_ciphertext`，同时保留 `token_hash` 用于调用时快速校验。SuperAdmin 可以兜底废弃任意用户的 MCP Token。Project Admin 不直接管理成员的个人 MCP Token；如果需要收回某个项目的 MCP 访问能力，应移除成员或调整该成员在项目内的角色。

v0.1 不做项目绑定的机器人/CI Token。单项目自动化、CI、Bot 场景可作为 v0.2 扩展，避免影响个人 MCP 客户端“一次配置，多项目使用”的体验。

#### Token 字段

- name
- user_id
- token_hash
- token_ciphertext
- scopes: smallint[]，1 api:read、2 api:draft、3 doc:read、4 doc:draft
- status_code: smallint，1 active、2 revoked、3 expired
- created_at
- expires_at
- last_used_at
- revoked_at

#### Scopes

```text
1 api:read
2 api:draft
3 doc:read
4 doc:draft
```

`api:read` 用于查询 OpenAPI 类型文档、endpoint 和语义 diff。`api:draft` 用于 MCP 创建、更新和提交 OpenAPI 草稿。`doc:read` 用于查询 Markdown 类型文档和纯文件 diff。`doc:draft` 用于创建、更新和提交 Markdown 草稿。`api:publish` / `doc:publish` 只作为 Project Admin 或 SuperAdmin 的项目角色权限，用于人工审核发布动作；v0.1 不作为 MCP Token scope，也不给 MCP Token 开放直接发布能力。

MCP tool 的有效权限按以下规则计算：

```text
effective_permissions = token.scopes ∩ user_project_role.permission_codes
```

如果 token 所属用户是 SuperAdmin，可在项目资源上按项目 Admin 权限兜底处理，但仍不能通过 MCP 直接发布正式 Document Version。

#### 鉴权流程

```text
1. 校验 token hash 是否存在，且 status code 为 1、未过期、未废弃。
2. 解析 token.user_id。
3. list_projects 返回该用户可访问的项目；SuperAdmin 返回全部项目。
4. 带 projectId 的 tool 查询用户在该 Project 的 ProjectMember 角色；SuperAdmin 走兜底授权。
5. 计算 token scope codes 与项目角色 permission codes 的交集。
6. tool 所需权限必须在有效权限内，否则拒绝。
7. 更新 last_used_at，并记录 audit log。
```

#### 验收标准

- 用户可以创建新的 MCP Token。
- 用户可以在后台查看并复制自己 status code 为 1 的完整 MCP Token 明文。
- 用户可以废弃自己的旧 MCP Token，废弃后不可恢复使用。
- SuperAdmin 可以废弃任意用户的 MCP Token。
- Token 使用 `token_hash` 做鉴权匹配，使用加密保存的 `token_ciphertext` 支持后台查看和复制。
- Token 可以限制 scope。
- 无效、过期、废弃 Token 不能访问 MCP。
- `api:read` Token 不能创建或更新草稿。
- `api:draft` Token 只有在用户具备该项目 Writer/Admin/SuperAdmin 权限时才能提交草稿。
- `doc:read` Token 不能创建或更新 Markdown 草稿。
- `doc:draft` Token 只有在用户具备该项目 Writer/Admin/SuperAdmin 权限时才能提交 Markdown 草稿。
- 用户被移出 Project 或角色被降级后，已有 MCP Token 立刻失去对应项目能力。
- MCP Token 不能发布正式版本。

---

### 8.13 后台内置 AI 模块

#### 描述

Vdoc 后台需要内置一个 AI 模块。管理员在后台配置 OpenAI-compatible 模型后，Vdoc 自动基于 OpenAPI 语义 Diff 或 Markdown 纯文件 Diff 生成版本变更总结；用户在草稿审核、版本详情和 Diff 页面可以与该 AI 进行上下文对话。

该模块是后台产品能力，不是 MCP 直接发布能力。AI 可以解释、总结、提醒审核重点，但不能 approve、request changes、reject、publish，也不能修改草稿或正式版本。

#### AI Provider 配置

配置入口：

- SuperAdmin：配置系统默认 Provider。
- Project Admin：配置项目级 Provider，优先级高于系统默认 Provider。
- 系统 Provider 与系统 Prompt 的读取、更新、测试仅限 SuperAdmin；项目 Provider 与项目 Prompt 的读取、更新、测试仅限对应 Project Admin 或 SuperAdmin。Reader 和 Writer 不读取配置，但在目标文档权限允许时仍可使用页面 AI 总结和 Chat。
- 项目没有启用的 Provider 覆盖时，运行项目测试连接应测试启用的系统回退 Provider；不能把空项目表单当成一次性 Provider 配置提交。

MVP 使用统一 OpenAI-compatible 协议，必须支持两种 API 模式：

- `chat_completions`：调用 `/v1/chat/completions`。
- `responses`：调用 `/v1/responses`，兼容 OpenAI Responses API 形态。

必填字段：

- `base_url`：例如 `https://api.openai.com` 或私有网关地址。
- `api_mode`：`chat_completions` 或 `responses`。
- `model`：例如 `gpt-4.1`、`gpt-4o-mini` 或自托管兼容模型名。
- `api_key`：密钥必须加密保存，列表和详情默认脱敏。

可选字段：

- `name`
- `temperature`
- `timeout_ms`
- `max_output_tokens`
- `enabled`

Prompt 配置规则：

- Prompt 更新请求由 path 中的 `prompt_key` 指定目标，body 只包含 `system_prompt`、`user_prompt_template` 和 `enabled`。
- `system_prompt` 与 `user_prompt_template` 均不能为空。
- 所有 `user_prompt_template` 必须保留 `{{context}}`；`page_chat` 还必须保留 `{{message}}`。
- Project 归档后，Project Admin 或 SuperAdmin 仍可只读查看历史 Provider/Prompt 配置，但不能更新配置或测试 Provider。

#### 自动总结触发点

Vdoc 需要在以下场景生成或刷新 AI 总结：

- OpenAPI 或 Markdown 草稿提交后，基于 Draft Diff Preview 生成审核总结。
- 草稿被更新并重新提交后，重新生成审核总结。
- 草稿审核通过并发布正式版本后，基于正式 Diff 生成版本总结。
- 用户手动在 Diff / Version 页面点击“重新生成 AI 总结”时，在权限允许且 Provider 可用的情况下重新生成。

#### 总结内容要求

OpenAPI 文档总结至少包含：

- 本次版本范围和文档名称。
- 新增、删除、修改 endpoint 数量。
- breaking changes 数量和必须审核项。
- 按 endpoint 分组的重点变化。
- 面向前端或调用方的注意事项。
- AI 无法判断或需要人工确认的内容。

Markdown 文档总结至少包含：

- 本次版本范围和文档路径。
- 新增、删除、修改行数或修改块数量。
- 主要章节或主题变化。
- 对开发流程、prompt、runbook 或项目知识的影响。
- AI 无法判断或需要人工确认的内容。

#### 页面内对话

支持对话的页面：

- Draft Review 页面。
- Version 页面。
- Compare / Diff 页面。

对话上下文必须限制在当前用户有权限访问的资源内，包括：

- 当前 Project、Document、Branch、Draft、Version metadata。
- Diff Summary 和 Diff Items。
- OpenAPI Endpoint Detail。
- Markdown snapshot 和 line diff。
- changelog、review comment、source_git_commit_id。

对话回答必须展示为 AI-generated，不得伪装成机器 Diff 或人工审核结论。若 Provider 未配置、调用失败、超时或返回内容不可用，页面需要清楚提示，并保留原始 Diff 和人工审核流程可用。

#### 安全和审计

- `api_key` 必须使用服务端加密能力保存，不能明文落库、不能进入日志、不能通过普通详情接口返回。
- AI 请求日志不得记录完整 prompt 中的密钥、JWT、MCP Token 或 Authorization header。
- AI 调用、自动总结生成、手动重新生成、Chat 消息发送和失败原因都需要写入 audit log。
- AI 只能读取当前用户有权限访问的 Vdoc 数据，不能跨 Project 泄漏内容。
- AI 输出不能触发发布动作；正式版本发布仍必须由 Project Admin 或 SuperAdmin 在后台人工点击。

#### 验收标准

- SuperAdmin 可以配置、更新、禁用系统默认 AI Provider。
- Project Admin 可以配置、更新、禁用项目级 AI Provider。
- Reader 和 Writer 无法读取系统或项目 Provider/Prompt 配置，但在资源权限允许时仍可使用页面总结与 Chat。
- 无项目 Provider 覆盖时，项目测试连接使用系统回退 Provider。
- 非空 Prompt 必须满足 `{{context}}` / `{{message}}` 占位符约束。
- `base_url`、`api_mode`、`model`、`api_key` 支持 OpenAI-compatible 配置，其中 `api_mode` 至少支持 `/v1/chat/completions` 和 `/v1/responses`，`api_key` 存储和展示均符合脱敏要求。
- 提交 OpenAPI 草稿后，审核页能展示基于 Diff Preview 生成的 AI 审核总结。
- 发布 OpenAPI 新版本后，Version / Diff 页面能展示 AI 版本变更总结。
- 提交或发布 Markdown 文档后，页面能展示基于 Markdown Diff 的 AI 文档变更总结。
- 用户可以在 Draft Review、Version、Compare / Diff 页面围绕当前上下文与 AI 对话。
- AI Provider 未配置或调用失败时，原始 Diff、人工审核和版本查看仍可正常使用。
- AI 不能 approve、request changes、reject、publish 或修改草稿内容。

---

### 8.14 文档公开链接分享

#### 描述

Vdoc 需要允许 Project Admin 或 SuperAdmin 把指定文档分支中已经人工发布的内容，通过可控、可撤销的公开链接提供给项目外部人员。公开分享是发布后的读取能力，不是新的发布渠道，也不能暴露草稿或绕过人工审核。

#### 管理端功能

- Project Admin 和 SuperAdmin 可以为同一 Document 的同一 Branch 创建多个公开链接。
- 创建时必须明确选择 Branch，链接创建后永久绑定该 Branch。
- 版本范围支持 `latest` 和 `all_versions`。
- `latest` 只允许访问该 Branch 当前最新的已发布版本，并在未来发布新版本后自动指向新的最新版本。
- `all_versions` 允许访问该 Branch 的全部已发布版本，并在未来发布新版本后把新版本加入历史。
- 有效期只提供 1 个月、3 个月、6 个月、1 年和永久五种选择，默认 3 个月。
- 创建时可以选择 unprotected，或由管理员输入密码创建 protected 链接。
- 文档分支至少存在一个已发布版本时才能创建公开链接。
- 每个链接的 Branch、版本范围、有效期和密码保护策略在创建后不可编辑。需要更换密码或改变策略时，必须撤销旧链接并创建新链接。
- 管理员可以重新显示并复制仍处于 active 状态的已有链接，但系统不得返回或重新显示密码。
- 管理列表保留全部链接历史，包括 active、expired 和 revoked，不因过期或撤销删除记录。
- 管理列表必须明确显示 protected 或 unprotected 状态，但不展示密码。
- 管理员可以撤销 active 链接，撤销后必须立即阻止新的查看和下载。
- 已撤销链接不能恢复或重新激活。

#### 匿名查看和下载

- 匿名访问者无需 Vdoc 账号，也不需要加入 Team 或 Project。
- 有效链接提供安全在线查看和原始发布文件下载。
- protected 链接必须先输入正确密码，才能访问文档元信息、内容、版本历史或下载；unprotected 链接不要求密码。
- `latest` 链接不展示完整版本历史，只展示当前最新已发布版本。
- `all_versions` 链接展示该 Branch 的已发布版本历史，默认打开最新版本，并允许切换到历史版本。
- 公开访问只能选择链接绑定 Branch 内允许范围的已发布版本，不得访问其他 Branch、草稿、审核内容或未发布版本。
- OpenAPI 和 Markdown 的下载都必须经过 Vdoc 后端授权，不提供对象存储公开地址。

#### 安全与隐私

- 每个链接都有可独立撤销的链接密钥；protected 链接在链接密钥之外还要求正确密码，一个链接泄漏不应影响其他链接。
- 完整分享密钥只放在 URL fragment 中，不放在 path 或 query。匿名页面读取后必须先从当前地址和浏览历史条目中移除，再发起任何网络请求。
- 公开请求使用分享能力本身鉴权，不要求账号登录，也不得附带账号 Cookie 或 JWT 作为访问依据。
- 密码不得放入 URL、普通日志、分析数据或浏览器存储。
- 密码缺失、密码错误、未知链接、格式错误、过期、已撤销、越权、上级资源失效和内容不可用等场景必须返回相同的通用不可用结果，不暴露资源是否存在或具体失败原因。
- 密码校验必须限制尝试频率，降低暴力猜测风险。
- 公开页面和公开响应必须禁止搜索引擎索引、禁止 referrer 泄漏并禁止缓存。
- Markdown 在线查看必须禁用原始 HTML、远程图片和不安全链接，只允许安全的文本、格式和明确允许的外部链接。
- OpenAPI 在线查看必须把文档作为转义后的只读文本展示，不执行其中的 HTML 或脚本，也不提供交互式 Swagger 或 Redoc。
- 公开页面和公开接口不得暴露 Project、Document、Branch 等内部标识、对象存储 key、发布者标识、来源版本标识、提交信息或内部 hash。
- 完整分享密钥、完整公开链接和密码不得进入普通日志、分析数据、浏览器存储或公开接口列表响应。
- 链接过期、被撤销，或所属 Project、Document、Branch 被停用、归档、删除时，查看、历史和下载都必须失效。

#### 数据与接口边界

- 分享记录需要保存所属文档和 Branch、版本范围、密码保护状态、有效状态、过期时间、创建人与创建时间，以及撤销人与撤销时间。
- 系统需要同时保存用于访问校验的不可逆摘要，以及用于管理员重新显示 active 链接的加密密文；不得保存可直接读取的明文密钥。
- protected 链接的密码只保存安全的单向校验信息，不得保存可读取或恢复的密码。
- 管理端接口只在创建时接受可选密码，列表、重新显示和撤销均不得返回密码；每次操作都必须重新确认当前用户仍是对应 Project 的 Project Admin 或 SuperAdmin。
- 匿名接口提供最小化的文档元信息、允许范围内的版本历史、指定版本内容和原始文件下载；protected 链接在密码校验成功前不得返回这些信息，也不复用包含私有字段的后台响应结构。
- 匿名内容和下载必须读取不可变的已发布版本快照，并通过 Vdoc 后端完成授权和返回，不暴露底层存储位置。

#### 审计要求

- 成功创建公开链接必须记录审计事件。
- 成功重新显示已有 active 链接必须记录审计事件。
- 成功撤销公开链接必须记录审计事件。
- 成功打开公开文档必须记录匿名查看审计事件。
- 成功下载原始文件必须记录匿名下载审计事件。
- 审计信息可以记录 Branch、版本范围、密码保护状态、有效期、状态和被访问版本，但不得记录完整分享密钥、完整公开链接或密码。

#### 验收标准

- Project Admin 和 SuperAdmin 可以创建多个彼此独立的 Branch 绑定链接，Writer 和 Reader 不能创建或管理链接。
- 创建表单提供 `latest`、`all_versions`、五种有效期以及 unprotected / protected 选择，默认有效期为 3 个月；选择 protected 时由管理员输入密码。
- 管理员可以查看保留的链接历史及 protected / unprotected 状态，重新显示或复制 active 链接，并立即撤销任一 active 链接；任何管理响应都不返回密码。
- 撤销一个链接不会影响同一文档分支上的其他链接，撤销后的链接不能恢复。
- 匿名访问者无需登录即可安全查看允许的 OpenAPI 或 Markdown 内容并下载原始文件；protected 链接必须先输入正确密码。
- `latest` 链接始终只访问绑定 Branch 的最新已发布版本，`all_versions` 链接只能查看该 Branch 的已发布历史。
- 手工发布新版本后，`latest` 链接指向新版本，`all_versions` 链接的历史加入新版本；草稿和未发布版本始终不可见。
- 密码缺失、密码错误、无效、未知、过期、已撤销、越权或上级资源失效的链接显示相同的通用不可用结果，且密码尝试受到频率限制。
- 密码不出现在 URL、日志、浏览器存储、链接列表或重新显示结果中，也不能原地修改；更换密码必须撤销旧链接并创建新链接。
- Markdown、OpenAPI、浏览器历史、缓存、referrer、搜索引擎索引和公开响应都满足本节的安全与隐私要求。
- create、reveal、revoke、view、download 五类成功动作都有审计记录，且审计中不包含完整密钥、完整链接或密码。

---

## 9. MCP Server 需求

### 9.1 MCP 定位

MCP 是 AI 和 Vdoc 交互的工具层。

AI 通过 MCP 可以：

- 查询项目
- 查询 Project 下的文档列表
- 按文档类型查询版本
- 查询 endpoint 详情
- 查询版本 diff
- 查询前端变更摘要
- 创建、更新和提交 OpenAPI 草稿
- 创建、更新和提交 Markdown 文档草稿
- 查询草稿状态和审核意见
- v0.2 起可选支持项目绑定机器人/CI Token；正式版本发布仍必须由后台人工审核触发

---

### 9.2 MCP Tools 规划

v0.1 MVP 必做查询工具和草稿写入工具。MCP 不提供绕过后台人工审核的直接发布工具；正式版本发布必须在 Vdoc 后台由 Project Admin 或 SuperAdmin 触发。

后端 `tools/list` 是运行时事实源，workspace 的机器可读契约是 `contracts/mcp-tools-v0.1.json`。所有工具都通过 JSON-RPC `tools/call` 调用，以下“输入”均指 `params.arguments`；字段名统一使用 `snake_case`，版本、endpoint 和 diff 一律使用稳定 ID，不能用显示名称、版本名或 `method + path` 代替。

<!-- VDOC_MCP_TOOL_INVENTORY_START -->
```text
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
```
<!-- VDOC_MCP_TOOL_INVENTORY_END -->

响应约束：列表和 Draft/Version 摘要只返回 metadata 与 hash，不内嵌正文或对象存储 key；`get_latest_schema`、`get_latest_doc` 和 `get_doc_draft` 仅通过单一 `content` 对象返回正文。`list_documents` 必须按 token scope 过滤文档类型，且 API/Markdown read tools 必须再次校验目标文档类型。

#### 9.2.1 `list_projects`

获取 token 所属用户可访问的项目。普通用户返回自己加入的 Project；SuperAdmin 返回全部 Project。

权限：

```text
api:read 或 doc:read
```

输入：

```json
{}
```

输出：

```json
[
  {
    "id": "proj_xxx",
    "team_id": "team_xxx",
    "name": "Mall App",
    "status": 1,
    "created_by": "user_xxx",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

---

#### 9.2.2 `list_documents`

获取 Project 下、当前 token scope 可见的文档列表。输入不接受类型过滤器：只有 `api:read` 时仅返回 OpenAPI，只有 `doc:read` 时仅返回 Markdown，同时具备两者时返回全部。

权限：

```text
api:read 或 doc:read
```

输入：

```json
{
  "project_id": "proj_xxx"
}
```

输出：

```json
[
  {
    "id": "doc_user_api",
    "project_id": "proj_xxx",
    "name": "User Service API",
    "document_type": 1,
    "relative_path": "docs/api/user-service.yaml",
    "status": 1,
    "created_by": "user_xxx",
    "created_at": "2026-01-01T00:00:00Z",
    "updated_at": "2026-01-01T00:00:00Z"
  }
]
```

---

#### 9.2.3 `list_api_versions`

获取指定文档的版本列表。

权限：

```text
api:read
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api"
}
```

输出：

```json
[
  {
    "id": "ver_002",
    "project_id": "proj_xxx",
    "document_id": "doc_user_api",
    "branch_id": "branch_dev",
    "version_name": "1.1.0",
    "document_format": 2,
    "raw_content_hash": "sha256_hex",
    "normalized_content_hash": "sha256_hex",
    "status": 1,
    "published_at": "2026-01-02T00:00:00Z"
  }
]
```

---

#### 9.2.4 `list_doc_versions`

获取指定 Markdown 文档的已发布版本摘要。权限为 `doc:read`，输入字段与 `list_api_versions` 相同，返回相同的 metadata-only Version 摘要，其中稳定 Markdown hash 使用 `stable_content_hash`。

---

#### 9.2.5 `get_latest_schema`

获取指定 OpenAPI 类型文档最新版本的完整 OpenAPI 契约。该工具是 v0.1 已实现的事实读取路径。

权限：

```text
api:read
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "branch_id": "branch_dev"
}
```

输出：

```json
{
  "version": {
    "id": "ver_002",
    "version_name": "1.1.0",
    "raw_content_hash": "sha256_hex"
  },
  "content": {
    "owner_type": "version",
    "version_id": "ver_002",
    "content_kind": "raw",
    "content": "openapi: 3.1.0\n...",
    "hash": "sha256_hex"
  }
}
```

---

#### 9.2.6 `get_endpoint_detail`

获取指定接口详情。

权限：

```text
api:read
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "version_id": "ver_002",
  "endpoint_id": "endpoint_xxx"
}
```

输出：

```json
{
  "id": "endpoint_xxx",
  "version_id": "ver_002",
  "method": "GET",
  "path": "/api/users/{id}",
  "operation_id": "getUser",
  "summary": "Get user detail",
  "parameters": [
      {
        "name": "id",
        "in": "path",
        "required": true,
        "schema": { "type": "string" }
      }
  ],
  "responses": {
    "200": {
      "description": "ok"
    }
  }
}
```

---

#### 9.2.7 `compare_api_versions`

比较两个版本。

权限：

```text
api:read
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "from_version_id": "ver_001",
  "to_version_id": "ver_002"
}
```

输出：

```json
{
  "id": "diff_xxx",
  "document_id": "doc_user_api",
  "from_version_id": "ver_001",
  "to_version_id": "ver_002",
  "diff_status": 3,
  "summary": {
    "added_endpoints": 1,
    "removed_endpoints": 0,
    "modified_endpoints": 2,
    "breaking_changes": 2
  },
  "items": [
    {
      "id": "diff_item_xxx",
      "change_type": 7,
      "severity": 3,
      "method": "GET",
      "path": "/api/users/{id}",
      "location": "response.200.data.name",
      "message": "响应字段 name 被删除",
      "frontend_impact": "前端如使用 user.name，需要改为 user.nickname",
      "is_breaking": true,
      "must_handle": true,
      "sort_order": 1
    }
  ]
}
```

---

#### 9.2.8 `get_change_summary`

按 `compare_api_versions` 返回的 diff ID 获取分组摘要。

权限：

```text
api:read
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "diff_id": "diff_xxx"
}
```

输出：

```json
{
  "summary": {
    "added_endpoints": 1,
    "removed_endpoints": 0,
    "modified_endpoints": 2,
    "breaking_changes": 2
  },
  "must_handle": [
    {
      "method": "GET",
      "path": "/api/users/{id}",
      "message": "response.name 被删除，请改用 response.nickname"
    }
  ],
  "breaking": [],
  "optional": [
    {
      "method": "GET",
      "path": "/api/users/{id}",
      "message": "response.email 新增，可按需展示"
    }
  ],
  "non_breaking": []
}
```

---

#### 9.2.9 `create_api_version_draft`

创建 OpenAPI 文档草稿。v0.1 MVP 实现，供 AI 或后端通过 MCP 提交待审核契约。

权限：

```text
api:draft
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "branch_id": "branch_dev",
  "version_name": "1.2.0",
  "changelog": "调整用户详情接口",
  "source_git_commit_id": "8f4d2a1c9b0e7f6a5d4c3b2a19087654321abcd0",
  "schema_content": "openapi: 3.1.0\n..."
}
```

输出：

```json
{
  "id": "draft_003",
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "branch_id": "branch_dev",
  "version_name": "1.2.0",
  "raw_content_hash": "sha256_hex",
  "normalized_content_hash": "sha256_hex",
  "status": 1,
  "diff_preview": {
    "summary": { "breaking_changes": 1 }
  }
}
```

---

#### 9.2.10 `update_api_version_draft`

更新尚未发布的 OpenAPI 草稿。用于 AI 根据审核意见修订 schema、changelog 或版本说明。

权限：

```text
api:draft
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "draft_id": "draft_003",
  "expected_revision": "revision_from_read",
  "version_name": "1.2.0",
  "schema_content": "openapi: 3.1.0\n...",
  "source_git_commit_id": "8f4d2a1c9b0e7f6a5d4c3b2a19087654321abcd0",
  "changelog": "根据审核意见补充响应字段说明"
}
```

输出：

```json
{
  "id": "draft_003",
  "revision": "new_revision",
  "status": 1,
  "raw_content_hash": "sha256_hex",
  "normalized_content_hash": "sha256_hex",
  "diff_preview": {
    "summary": { "breaking_changes": 0 }
  }
}
```

---

#### 9.2.11 `submit_api_version_draft`

提交草稿进入人工审核。提交后 AI 不能直接发布，只能等待审核意见或继续修订。

权限：

```text
api:draft
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "draft_id": "draft_003"
}
```

输出：

```json
{
  "id": "draft_003",
  "status": 2,
  "submitted_at": "2026-01-03T00:00:00Z"
}
```

---

#### 9.2.12 `get_api_version_draft`

查询草稿状态、diff preview 和审核意见。

权限：

```text
api:read
```

输入：

```json
{
  "project_id": "proj_xxx",
  "document_id": "doc_user_api",
  "draft_id": "draft_003"
}
```

输出为 metadata-only Draft 摘要，必须包含数值 `status`；如果状态是 changes requested 或 rejected，必须包含 `review_comment`。正文不随摘要返回，私有工作台正文读取走 content endpoint。

---

#### 9.2.13 Markdown 文档 tools

v0.1 MVP 支持以下 Markdown 文档 tools。它们只读或写草稿，不能直接发布正式版本。

| Tool | 权限 | 说明 |
|---|---|---|
| `list_doc_versions` | `doc:read` | 获取指定 Markdown Document 的已发布版本 ID 与 metadata；比较前必须先用它解析版本 ID。 |
| `get_latest_doc` | `doc:read` | 获取指定 Markdown 类型 Document 在指定 branch 下的最新发布内容。 |
| `compare_doc_versions` | `doc:read` | 比较同一 Markdown 类型 Document 的两个版本，返回纯文件 Diff。 |
| `create_doc_draft` | `doc:draft` | 创建 Markdown 文档草稿，入参包含 `document_id`、`branch_id`、`version_name`、`markdown_content`、可选 `source_git_commit_id`。 |
| `update_doc_draft` | `doc:draft` | 更新尚未发布的 Markdown 草稿。 |
| `submit_doc_draft` | `doc:draft` | 提交 Markdown 草稿进入人工审核。 |
| `get_doc_draft` | `doc:read` | 查询 Markdown 草稿状态、纯文件 diff preview 和审核意见。 |

---

`get_latest_doc` 返回 metadata-only `version` 与唯一 `content` 对象；`get_doc_draft` 返回 metadata-only `draft` 与唯一 `content` 对象，不再额外重复 `stable_content`。

#### 9.2.14 MCP 发布边界

MCP 不提供直接发布 OpenAPI 或 Markdown 正式版本的 tool。`api:publish` / `doc:publish` 是后台 Project Admin 或 SuperAdmin 的人工审核权限，不是 MCP Token scope。

安全边界：

- MCP 可以创建、更新和提交草稿。
- MCP 可以查询草稿状态、审核意见、版本、Diff 和内容。
- MCP 不能 approve、request changes、reject 或 publish。
- 即使未来支持项目绑定机器人/CI Token，也不能绕过后台审核发布正式 Document Version。

---

## 10. Vdoc Skill 需求

### 10.1 Skill 定位

Vdoc Skill 是 AI 的使用指导包。

它不负责存储数据，也不负责计算 Diff。
它负责指导 AI 正确使用 Vdoc MCP Tools，并按照稳定格式输出结果。

一句话：

```text
MCP 提供工具，Skill 提供工作流。
```

---

### 10.2 Skill 目标

Vdoc Skill 要解决：

1. AI 不知道什么时候使用 Vdoc
2. AI 不知道如何调用 MCP Tools
3. AI 容易编造接口字段
4. AI 输出的接口变更摘要不稳定
5. AI 对前端影响分析不够结构化

---

### 10.3 Skill 文件结构

MVP 可以提供：

```text
vdoc-skill/
  SKILL.md
  templates/
    frontend-change-summary.md
    endpoint-integration.md
    backend-publish-summary.md
  examples/
    compare-versions-example.md
    endpoint-query-example.md
```

如果要极简，MVP 只提供：

```text
vdoc-skill/SKILL.md
```

---

### 10.4 Skill 核心规则

Skill 必须包含以下规则：

```text
1. Always use Vdoc MCP tools as the source of truth.
2. Do not invent API paths, request fields, response fields or versions.
3. If project/document/version/endpoint is ambiguous, ask the user to clarify.
4. For endpoint integration, call get_endpoint_detail before generating code.
5. For version comparison, call compare_api_versions before summarizing changes.
6. For frontend impact, prioritize breaking changes.
7. Clearly separate must-handle changes from optional changes.
8. Do not expose raw MCP token values.
9. If an endpoint is not found in Vdoc, say it is not found.
10. When creating or updating an OpenAPI draft, call create_api_version_draft or update_api_version_draft and then submit_api_version_draft.
11. For Markdown documents, call get_latest_doc or compare_doc_versions before summarizing document state or changes.
12. When creating or updating a Markdown draft, call create_doc_draft or update_doc_draft and then submit_doc_draft.
13. Never claim a draft is published before human approval.
14. If review requests changes, revise the draft instead of creating a production version.
```

---

### 10.5 Skill 工作流

#### Workflow 1：前端接口对接

用户输入示例：

```text
帮我对接 user-service 的 GET /api/users/{id} 接口。
```

AI 执行步骤：

```text
1. 确认 Project 和 OpenAPI 类型 Document
2. 调用 list_documents，必要时按 documentType=openapi 查找文档
3. 调用 list_api_versions，默认使用 latest
4. 调用 get_endpoint_detail
5. 输出：
   - 接口说明
   - 请求参数
   - 响应结构
   - TypeScript 类型
   - 请求函数示例
   - 注意事项
```

输出模板：

```markdown
## 接口对接：GET /api/users/{id}

### 请求参数

### 响应字段

### TypeScript 类型

### 请求示例

### 注意事项
```

---

#### Workflow 2：前端版本升级分析

用户输入示例：

```text
帮我分析 user-service 从 1.0.0 到 1.1.0 前端要改什么。
```

AI 执行步骤：

```text
1. 确认 Project、OpenAPI 类型 Document、fromVersion、toVersion
2. 调用 compare_api_versions
3. 调用 get_change_summary
4. 按 endpoint 分组
5. 优先输出 breaking changes
6. 输出 must-handle 和 optional
```

输出模板：

```markdown
# user-service 1.0.0 → 1.1.0 前端升级说明

## 总览

- 新增接口：
- 删除接口：
- 修改接口：
- Breaking Changes：

## 必须处理

## 可选关注

## 建议验证点
```

---

#### Workflow 3：后端提交接口文档草稿

该工作流依赖 `create_api_version_draft`、`update_api_version_draft` 和 `submit_api_version_draft`，v0.1 MVP 需要支持。发布仍由后台人工审核触发。

用户输入示例：

```text
帮我把这份 OpenAPI 提交到 Mall App / User Service API，版本号 1.2.0，等待审核发布。
```

AI 执行步骤：

```text
1. 确认 Project 和 OpenAPI 类型 Document
2. 检查是否提供 schemaContent
3. 调用 create_api_version_draft 或 update_api_version_draft
4. 调用 submit_api_version_draft
5. 输出草稿状态和 diff preview
6. 如果有 breaking changes，提醒审核人重点关注
```

输出模板：

```markdown
# API 文档草稿提交结果

文档：
版本：
草稿状态：

## Diff Preview

## Breaking Changes

## 建议审核重点
```

---

#### Workflow 4：生成接口变更说明

用户输入示例：

```text
帮我生成一份发给前端的接口变更说明。
```

AI 执行步骤：

```text
1. 确认 OpenAPI 类型 Document 和版本范围
2. 调用 compare_api_versions
3. 调用 get_change_summary
4. 输出面向前端的变更说明
```

输出模板：

```markdown
# 接口变更说明

## 文档

## 版本

## 变更概览

## 前端必须处理

## 前端可选关注

## 兼容性说明
```

---

#### Workflow 5：提交或查询 Markdown 文档

用户输入示例：

```text
帮我把这份 AGENTS.md 提交到 Mall App，版本号 1.2.0，等待审核发布。
```

AI 执行步骤：

```text
1. 确认 Project 和 Markdown 类型 Document
2. 检查是否提供 Markdown content
3. 调用 create_doc_draft 或 update_doc_draft
4. 调用 submit_doc_draft
5. 输出草稿状态和纯文件 diff preview
6. 明确说明仍需 Project Admin 或 SuperAdmin 人工审核发布
```

输出模板：

```markdown
# Markdown 文档草稿提交结果

文档：
相对路径：
版本：
草稿状态：

## File Diff Preview

## 建议审核重点
```

---

### 10.6 Skill 验收标准

MVP Skill 应满足：

- AI 可以根据 Skill 正确查询 endpoint
- AI 在生成代码前会调用 `get_endpoint_detail`
- AI 在分析版本变化前会调用 `compare_api_versions`
- AI 不会在 Vdoc 没有返回字段时编造字段
- AI 输出区分 must-handle 和 optional
- AI 可以生成稳定格式的接口变更说明
- AI 可以提交或更新 OpenAPI 草稿，并明确说明仍需人工审核发布
- AI 可以查询、比较、提交或更新 Markdown 文档草稿，并明确说明仍需人工审核发布

---

## 11. 页面需求

### 11.1 登录页

功能：

- 登录
- 注册，MVP 可选

---

### 11.2 项目首页

展示：

- 用户加入的 Project
- Project 所属 Team
- 用户角色

---

### 11.3 Team 页面

展示：

- Team 信息
- Project 列表
- 创建 Project 入口

---

### 11.4 Project 页面

展示：

- Project 信息
- 文档列表
- 文档类型筛选
- 成员入口
- MCP Token 入口
- Skill 安装说明入口

---

### 11.5 Document 页面

展示：

- 文档名称
- 文档类型
- 项目内相对路径
- 文档说明
- 最新版本
- 版本列表
- branch / environment
- 创建草稿入口
- 公开分享入口，仅 Project Admin 和 SuperAdmin 可见
- OpenAPI 类型文档显示接口数量
- Markdown 类型文档显示文件大小和最近 diff summary

---

### 11.6 Version 页面

展示：

- 版本信息
- changelog
- 上传人
- 上传时间
- 文档内容
- OpenAPI 类型文档显示接口列表和 endpoint 详情
- Markdown 类型文档显示 Markdown 预览和原文

---

### 11.7 Endpoint 详情页

展示：

- method
- path
- summary
- request params
- request body
- response status codes
- response schema

---

### 11.8 Compare 页面

展示：

- fromVersion selector
- toVersion selector
- summary cards
- breaking changes
- diff item list
- endpoint 分组
- Markdown line diff 分组
- severity 筛选

---

### 11.9 MCP Token 页面

展示：

- token 列表
- 创建 token
- scope 选择
- token 过期时间
- MCP 配置示例

示例：

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["--yes", "github:ChnMig/Vdoc-mcp#22e58a252cce7512b4cf2649e3a67916d2825bea"],
      "env": {
        "VDOC_BASE_URL": "https://your-vdoc.example.com",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

---

### 11.10 AI 设置页面

展示：

- 系统默认 AI Provider（SuperAdmin 可见和可配置）
- 项目级 AI Provider（Project Admin 可见和可配置）
- `base_url`
- `api_mode`，至少支持 `chat_completions` 和 `responses`
- `model`
- `api_key` 脱敏展示和更新入口
- `temperature`、`timeout_ms`、`max_output_tokens`
- 启用 / 禁用状态
- 测试连接按钮
- 最近一次调用状态和错误摘要

规则：

- Reader 和 Writer 不能查看 Provider 或 Prompt 配置，而不只是不能查看密钥；其页面 Summary/Chat 能力按文档权限独立授权。
- Project Admin 只能管理自己有 `ai_provider:manage` 权限的 Project 配置。
- SuperAdmin 可以配置系统默认 Provider，并可兜底管理项目配置。
- Project 归档后，Project Admin 或 SuperAdmin 只能查看历史 Provider/Prompt 配置；测试与修改入口禁用。
- Prompt 表单必须保留 `{{context}}`，`page_chat` 还必须保留 `{{message}}`。
- 测试连接不得把 API Key 打印到页面、日志或审计 metadata 中。

---

### 11.11 Skill 页面

展示：

- Vdoc Skill 简介
- Skill 下载或安装方式
- 支持的工作流
- 示例提示词
- MCP + Skill 配置说明

示例提示词：

```text
帮我查询 user-service 的 GET /api/users/{id} 接口定义并生成 TS 类型。
```

```text
帮我比较 user-service 1.0.0 到 1.1.0 的变化，告诉我前端要改什么。
```

---

### 11.12 AI 总结和对话面板

出现位置：

- Draft Review 页面
- Version 页面
- Compare / Diff 页面

展示：

- 当前上下文标题，例如 `User Service API 1.0.0 -> 1.1.0`
- AI-generated 标识
- 自动生成的版本变更总结
- 重新生成按钮（需要权限）
- 对话消息列表
- 用户输入框
- Provider 未配置、调用中、失败、超时等状态

对话面板必须同时保留机器 Diff 和人工审核按钮，不能让 AI 总结取代原始事实来源。

---

### 11.13 文档公开分享管理页

仅 Project Admin 和 SuperAdmin 可访问。

展示：

- Project、Document 和 Branch 上下文
- `latest` / `all_versions` 版本范围选择
- 1 个月、3 个月、6 个月、1 年和永久有效期选择，默认 3 个月
- unprotected / protected 选择；选择 protected 时由管理员输入密码
- 创建公开链接
- active、expired、revoked 链接历史及 protected / unprotected 状态
- active 链接的重新显示和复制操作
- active 链接的撤销确认操作
- 密码创建后不再展示，也不出现在链接重新显示结果中

### 11.14 匿名公开查看页

该页面无需登录，不展示登录后工作台导航。

展示：

- protected 链接在其他信息加载前展示密码输入；密码正确后才进入查看页
- 文档名称、类型和当前版本
- 安全渲染的 Markdown 或转义后的 OpenAPI 文本
- 原始文件下载入口
- 仅 `all_versions` 链接展示的已发布版本历史
- 密码缺失、密码错误、链接无效、过期、已撤销或上级资源失效时的统一不可用状态

---

## 12. 数据存储设计

### 12.1 存储原则

Vdoc 存完整文档快照。OpenAPI 类型文档基于解析后的接口结构做语义 Diff；Markdown 类型文档基于文件文本做纯文件 Diff。公开分享只读取不可变的已发布版本快照，底层对象存储保持私有。

推荐：

```text
Raw OpenAPI：RustFS 对象存储
Normalized OpenAPI：RustFS 对象存储
Raw Markdown：RustFS 对象存储
Normalized Markdown / stable text snapshot：RustFS 对象存储
Endpoint Index：PostgreSQL
Endpoint Detail：PostgreSQL JSONB
Diff Summary：PostgreSQL
Full Diff：RustFS 对象存储
Diff Items：PostgreSQL
Skill 文件：代码仓库或 RustFS 对象存储
```

---

### 12.2 核心数据表

详细字段、code map、约束和索引以 `DATABASE_SCHEMA.md` 为准。PRD 只保留核心表和关键字段，避免和 schema 文档重复发散。

所有有限集合字段在 DB 中使用从 1 开始的整数码保存，不使用 text enum。

| 表 | 关键字段 / 说明 |
|---|---|
| `users` | `email`、`password_hash`、`display_name`、`is_super_admin`、`status`。不设计头像字段。 |
| `teams` | `name`、`slug`、`description`、`created_by`。 |
| `projects` | `team_id`、`name`、`slug`、`description`、`status`、`created_by`。 |
| `project_members` | `project_id`、`user_id`、`role`、`status`、`added_by`、`added_at`。MVP 不做邀请状态和邀请字段。 |
| `documents` | `project_id`、`name`、`document_type`、`relative_path`、`description`、`status`、`created_by`。v0.1 类型至少包含 OpenAPI 接口文档和 Markdown 纯文档。 |
| `document_branches` | `document_id`、`name`、`kind`、`is_default`、`is_protected`、`status`。默认 `dev`、`test`、`prod`，`prod` 受保护。 |
| `document_drafts` | `document_id`、`branch_id`、`version_name`、`status`、`document_type`、RustFS object keys、hash、`source_git_commit_id`、`source_type`、`source_branch_id`、`source_version_id`、`base_version_id`、Diff Preview、审核字段。 |
| `document_versions` | `document_id`、`branch_id`、`version_name`、`version_no`、`status`、`source_draft_id`、`source_git_commit_id`、`source_type`、`source_branch_id`、`source_version_id`、`base_version_id`、RustFS object keys、hash、`published_by`、`published_at`。 |
| `api_endpoints` | `document_version_id`、`document_id`、`branch_id`、`method`、`path`、`operation_id`、`summary`、`tags`、hash 字段。仅 OpenAPI 类型文档写入。 |
| `api_endpoint_details` | `endpoint_id`、`parameters_json`、`request_body_json`、`responses_json`、`normalized_operation_json`。 |
| `document_version_diffs` | `document_id`、`from_branch_id`、`to_branch_id`、`from_version_id`、`to_version_id`、`diff_type`、`diff_status`、RustFS diff object key、统计字段和摘要。 |
| `document_diff_items` | `diff_id`、`endpoint_id`、`change_type`、`severity`、`method`、`path`、`location`、`old_value`、`new_value`、`message`、`frontend_impact`、`line_no`、`hunk_header`。OpenAPI 使用语义条目，Markdown 使用文件 diff 条目。 |
| `document_shares` | `project_id`、`document_id`、`branch_id`、版本范围、密码保护状态、状态、过期时间、创建和撤销信息、访问校验摘要、用于 active 链接重新显示的加密密文，以及 protected 链接的安全单向密码校验信息。不得保存明文分享密钥或可读取密码。 |
| `mcp_tokens` | `user_id`、`name`、`token_hash`、`token_ciphertext`、`cipher_kid`、`scopes`、`status`、`expires_at`、`last_used_at`、`revoked_at`。不包含 `project_id`。 |
| `ai_provider_configs` | `scope_type`、`project_id`、`name`、`base_url`、`api_mode`、`model`、加密后的 `api_key_ciphertext`、`cipher_kid`、参数 JSON、`enabled`、`created_by`、`updated_by`。 |
| `ai_change_summaries` | `project_id`、`document_id`、`draft_id`、`diff_id`、`from_version_id`、`to_version_id`、`provider_config_id`、`summary_markdown`、`status`、错误摘要、token usage、生成时间。 |
| `ai_chat_sessions` / `ai_chat_messages` | 页面上下文、用户消息、AI 回复、引用的 draft/version/diff、provider_config_id、状态、token usage 和审计字段。 |
| `audit_logs` | `actor_type`、`actor_user_id`、`actor_token_id`、`action`、`resource_type`、`resource_id`、`project_id`、`document_id`、`metadata`、请求上下文。覆盖公开链接 create、reveal、revoke、view、download，且不记录完整密钥、完整链接或密码。 |

关键约束：

- `document_versions` 发布后不可变。
- `documents` 在 Project 内约束 `name` 和 `relative_path` 唯一。
- `document_versions` 分支内版本名唯一：`document_id + branch_id + version_name`。
- `document_drafts.source_git_commit_id` 表示用户应用或代码仓库 Git commit ID，发布后复制到 `document_versions.source_git_commit_id`。
- Promote 只创建目标分支草稿，记录 `source_branch_id`、`source_version_id` 和 `base_version_id`，再走普通 Diff Preview、审核、发布流程。
- 文档公开链接创建后固定绑定一个 Branch、一个版本范围、一个有效期策略和一种密码保护策略，不允许原地编辑或重新激活；更换密码必须撤销旧链接并创建新链接。
- protected 链接只保存密码的安全单向校验信息，不能查看、重新显示、恢复或返回密码。
- 已撤销和已过期的公开链接记录必须保留；公开访问只返回链接范围内的已发布版本和匿名查看所需最小信息。
- 公开下载通过 Vdoc 后端读取已发布版本快照，不生成对象存储公开地址。
- MCP Token 绑定用户，不绑定 Project；有效权限 = token scope codes 与用户目标项目角色权限取交集。
- AI Provider API Key 必须加密保存并脱敏展示；AI 总结和 Chat 只能引用用户有权限访问的 Vdoc 资源。

---

## 13. 系统架构

### 13.1 组件

```text
Web App
  - 项目管理
  - 文档列表和类型筛选
  - API 文档展示
  - Markdown 文档展示
  - 版本 Diff 页面
  - MCP Token 管理
  - Skill 安装说明
  - AI Provider 设置
  - AI 变更总结和页面内对话
  - 文档公开分享管理
  - 匿名公开查看和原始文件下载

API Server
  - 用户权限
  - 文档管理
  - OpenAPI / Markdown 上传
  - 草稿审核和发布
  - 版本管理
  - Endpoint 查询
  - Diff 查询
  - AI Provider 配置、AI 总结和 Chat API
  - 公开链接创建、列表、重新显示和撤销
  - 公开文档元信息、版本历史、内容和下载

MCP Server
  - AI Tools
  - 查询文档
  - 查询 API Contract
  - 查询 Diff
  - 提交和更新 OpenAPI / Markdown 草稿
  - 不提供直接发布正式版本能力

Diff Engine
  - OpenAPI Parse
  - Normalize
  - Contract Model
  - Semantic Diff
  - Breaking Rules
  - Markdown file diff

Vdoc Skill
  - AI 工作流说明
  - 输出模板
  - MCP tools 使用规则

Admin AI Module
  - OpenAI-compatible Provider 调用
  - Diff 总结生成
  - 页面内 Chat
  - AI 调用审计

Storage
  - PostgreSQL
  - RustFS object storage（S3-compatible）
  - Redis/Queue 可选
```

---

### 13.2 处理链路

#### OpenAPI 上传链路

```text
上传 OpenAPI
  ↓
读取 document_id、branch_id 和可选 source_git_commit_id
  ↓
校验
  ↓
保存 Raw Schema
  ↓
Normalize
  ↓
计算 Hash
  ↓
创建 OpenAPI Document Draft
  ↓
人工审核发布 Document Version
  ↓
解析 Endpoint
  ↓
生成 Endpoint Index
  ↓
触发 Diff
  ↓
保存 Diff Summary 和 Items
```

#### Markdown 文档上传链路

```text
上传或编辑 Markdown
  ↓
读取 document_id、branch_id、relative_path 和可选 source_git_commit_id
  ↓
校验 `.md` 文件
  ↓
保存 Raw Markdown
  ↓
Normalize / stable text snapshot
  ↓
计算 Hash
  ↓
创建 Document Draft
  ↓
生成纯文件 Diff Preview
  ↓
人工审核发布 Document Version
  ↓
保存 Diff Summary 和 Items
```

#### MCP 查询链路

```text
AI 根据 Skill 判断要查询接口或 Markdown 文档
  ↓
调用 Vdoc MCP Tool
  ↓
MCP Server 校验 Token
  ↓
API Server 查询数据库
  ↓
返回结构化接口数据或 Markdown 文档内容
  ↓
AI 按 Skill 模板输出
```

#### API 版本 Diff 链路

```text
选择 from/to 版本
  ↓
读取两个版本 Endpoint Index
  ↓
比较 method + path
  ↓
识别新增/删除接口
  ↓
共同接口比较 hash
  ↓
深入比较 request/response schema
  ↓
生成 Diff Items
  ↓
应用 Breaking Rules
  ↓
生成 Summary
```

#### Markdown 版本 Diff 链路

```text
选择 from/to 版本
  ↓
读取两个版本的 Markdown snapshot
  ↓
比较文本行
  ↓
生成 unified diff / line diff
  ↓
统计新增行、删除行和修改块
  ↓
生成 Summary
```

#### 后台 AI 总结链路

```text
草稿提交、版本发布或用户点击重新生成
  ↓
解析当前用户权限和 Project AI Provider
  ↓
读取 Draft Diff Preview 或正式 Diff
  ↓
构造 OpenAI-compatible 请求
  ↓
调用配置的 AI Provider
  ↓
保存 AI-generated summary、状态、错误摘要和 token usage
  ↓
页面展示 AI 总结，并允许用户在当前上下文继续对话
```

#### 文档公开分享链路

```text
Project Admin 或 SuperAdmin 选择 Document 和 Branch
  ↓
创建固定版本范围、有效期和可选密码保护的公开链接
  ↓
匿名页面读取并移除 URL fragment 中的分享密钥
  ↓
protected 链接要求访问者输入密码
  ↓
API Server 校验链接、可选密码、范围、有效期和上级资源状态
  ↓
读取允许范围内的已发布版本快照
  ↓
安全在线展示或返回原始文件下载
  ↓
记录 view 或 download 审计事件
```

---

## 14. 非功能需求

### 14.1 性能

- 上传 5MB OpenAPI 文件应能完成处理
- 解析和 Diff 可异步
- 接口列表查询不应读取完整 OpenAPI 文件
- 常用 Diff 结果应缓存

### 14.2 安全与隐私

- MCP Token 保存 `token_hash` 和加密的 `token_ciphertext`
- 用户可在后台查看和复制自己的 active Token，也可生成新 Token 并废弃旧 Token
- Token 支持 scope
- 项目数据隔离
- 写操作必须鉴权
- MCP token 查看/复制、废弃、使用和草稿写入必须记录审计日志
- MCP tools 不返回完整 token，只有后台 token 管理接口可以向 token 所属用户返回完整 token
- Skill 中明确禁止暴露 token
- 公开链接按 bearer capability 管理，每个链接独立撤销，撤销或过期后立即失效
- 分享密钥只存在于 URL fragment，匿名页面必须在请求前将其从当前地址和浏览历史条目移除
- 公开链接可以是 unprotected 或 protected；protected 链接只保存密码的安全单向校验信息，密码不能查看或恢复
- 密码不得进入 URL、普通日志、分析数据或浏览器存储
- 公开页面和响应禁止搜索引擎索引、referrer 泄漏和缓存
- 公开 Markdown 禁止原始 HTML、远程图片和不安全链接；OpenAPI 只展示转义后的文本
- 公开接口返回最小信息，不暴露 Project、Document、Branch 等内部标识或对象存储 key
- 密码缺失、密码错误、未知、无效、越权、过期、已撤销和上级资源失效统一返回不可用结果
- 密码校验必须限制尝试频率，降低暴力猜测风险
- 公开查看和下载必须经过 Vdoc 授权及审计，不提供公共对象存储地址

### 14.3 可部署性

MVP 支持自部署：

- Docker Compose
- PostgreSQL
- RustFS
- Web/API/MCP 可单体部署，后续拆分

### 14.4 可扩展性

后续应支持：

- 通知
- CLI
- CI
- PR Bot
- Codegen
- Draft/Review
- 多协议

---

## 15. MVP 技术建议

### 15.1 前端

建议：

- Next.js
- React
- Tailwind CSS
- shadcn/ui

### 15.2 后端

当前仓库以 Go 为主，MVP 后端应沿用现有技术栈：

- Go module：`vdoc`
- HTTP API：Gin
- 配置：Viper，环境变量前缀 `VDOC_`
- 日志：Zap，沿用当前 dev/release 日志策略
- 数据库：PostgreSQL
- 数据访问：优先选择与 Go 生态和项目复杂度匹配的轻量方案，例如 `pgx`、`database/sql` + `sqlc` 或 GORM，具体实现前再定
- 后台任务：先用进程内 worker 或队列抽象，后续按负载引入 Redis/Queue

### 15.3 Diff Engine

MVP 可先集成：

- oasdiff
- openapi-diff

同时保留内部 Diff Item 模型，方便后续替换或增强。

### 15.4 MCP Server

MVP 优先与当前 Go API Server 协同实现，保证鉴权、权限和数据模型一致。用户 Agent 安装 `Vdoc-mcp/` 中的本地 stdio adapter，由 adapter 转发到后端 `/api/v1/open/mcp`，避免在 agent 侧重复实现业务工具。

部署形态：

```text
vdoc-api      # 当前 Go API Server，v0.1 可内置 MCP endpoint
vdoc-mcp      # 用户 Agent 安装的 MCP stdio adapter，转发到 vdoc-api
```

可通过环境变量配置：

```text
VDOC_BASE_URL
VDOC_MCP_TOKEN
```

### 15.5 Skill

Skill 作为独立目录发布：

```text
Vdoc-skill/SKILL.md
```

也可以在 Web 页面提供复制和下载。

### 15.6 后端模块规划（当前仓库）

建议在现有 Go/Gin 模板上按领域逐步补齐模块：

1. `identity`：用户、登录、JWT 集成。
2. `team`：Team 管理。
3. `project`：Project、成员、角色。
4. `document`：Project 下的多类型文档、文档分支、草稿、版本和 Promote 管理。
5. `contract`：OpenAPI 类型文档的上传、校验、归一化和接口契约处理。
6. `endpoint`：OpenAPI 类型文档的 Endpoint Index 和 Endpoint Detail 查询。
7. `diff`：OpenAPI 语义 Diff、Markdown 纯文件 Diff、Diff Item 和 Breaking Change 识别。
8. `mcp_token`：MCP Token、scope、token hash 和加密 token ciphertext。
9. `mcp`：MCP tools 与 API Server 集成。
10. `audit`：审计日志，v0.1 支持必要读写记录，v0.2 强化 MCP 写入审计。
11. `ai`：OpenAI-compatible Provider 配置、Diff 自动总结、页面内 Chat、AI 调用审计。

---

## 16. MVP 里程碑

### Milestone 1：基础协作模型

目标：

- 登录
- Team
- Project
- Member
- Role
- Document

完成标准：

```text
用户可以创建项目、从现有系统用户添加成员、创建 Project 文档。
```

---

### Milestone 2：文档草稿、审核与展示

目标：

- 上传 OpenAPI
- 上传 Markdown
- 校验
- 创建草稿
- 人工审核后创建版本
- 解析 endpoint
- 展示接口列表和详情
- 展示 Markdown 文档内容

完成标准：

```text
用户可以创建 OpenAPI 类型文档并上传 user-service@1.0.0 草稿，也可以创建 Markdown 类型文档并上传 AGENTS.md 草稿；审核通过后查看文档内容。
```

---

### Milestone 3：Diff 和 Breaking 检测

目标：

- 上传第二个版本
- 比较版本
- 生成 Diff Summary
- 生成 Diff Items
- 标记 Breaking Changes
- 展示 Compare 页面
- Markdown 文档生成纯文件 Diff

完成标准：

```text
用户可以看到 OpenAPI 文档 `1.0.0 -> 1.1.0` 的语义变更，也可以看到 Markdown 文档两个版本之间的纯文件 Diff。
```

---

### Milestone 4：后台内置 AI 总结和对话

目标：

- AI Provider 配置
- OpenAI-compatible `/v1/chat/completions` 和 `/v1/responses` 调用
- OpenAPI Diff 自动总结
- Markdown Diff 自动总结
- Draft Review / Version / Compare 页面 AI 对话
- AI 调用和对话审计
- Provider 未配置或调用失败时的降级提示

完成标准：

```text
Project Admin 配置 AI Provider 后，提交或发布 OpenAPI / Markdown 文档时，后台能自动生成 AI 变更总结；审核人和 Reader 可以在有权限的页面围绕当前 Diff 与 AI 对话，但 AI 不能执行发布动作。
```

---

### Milestone 5：MCP 查询和草稿提交

目标：

- MCP Token
- list_projects
- list_documents
- list_api_versions
- list_doc_versions
- get_endpoint_detail
- compare_api_versions
- get_change_summary
- create_api_version_draft
- update_api_version_draft
- submit_api_version_draft
- get_api_version_draft
- get_latest_doc
- compare_doc_versions
- create_doc_draft
- update_doc_draft
- submit_doc_draft
- get_doc_draft

完成标准：

```text
AI 可以查询接口定义、Markdown 文档和版本变化，也可以提交 OpenAPI 或 Markdown 草稿等待人工审核。
```

---

### Milestone 6：Vdoc Skill

目标：

- SKILL.md
- 前端接口对接工作流
- 前端版本升级工作流
- 后端草稿提交工作流
- Markdown 文档查询和草稿提交工作流
- 变更摘要模板
- Skill 安装说明页

完成标准：

```text
AI 可以按照 Skill 稳定使用 MCP 查询接口和 Markdown 文档、总结变更、提交草稿，并清楚提示人工审核发布边界。
```

---

### Milestone 7：人工审核发布

目标：

- 草稿列表和草稿详情
- approve / reject / request changes
- publish 权限校验，仅 Project Admin / SuperAdmin 可发布
- 发布后返回 diff summary
- 审计日志

完成标准：

```text
Project Admin 或 SuperAdmin 可以查看 AI 提交的草稿，批准后发布为不可变 Document Version，并返回变更摘要。
```

---

### Milestone 8：文档公开链接分享

目标：

- 管理员创建、查看、重新显示、复制和撤销公开链接
- `latest` / `all_versions` 范围和五种有效期
- unprotected / protected 选择，密码只在创建时输入且不能返回或修改
- 匿名安全查看和原始文件下载
- 公开访问安全与 create、reveal、revoke、view、download 审计

完成标准：

```text
Project Admin 或 SuperAdmin 可以把指定 Branch 的已发布文档通过多个独立的 unprotected 或 protected 链接提供给匿名访问者，并能立即撤销任一链接；protected 链接只有在密码正确后才允许访问，匿名访问始终只看到链接允许的已发布内容。
```

---

## 17. MVP 验收 Demo

### Demo 1：上传初始接口文档

```text
SuperAdmin 创建 Team / Project，并指定 Project Admin
Project Admin 创建 OpenAPI 类型文档：User Service API，relative_path=docs/api/user-service.yaml
Writer 上传 openapi-v1.yaml
Project Admin 批准草稿
系统生成 User Service API@1.0.0
页面展示接口列表
```

---

### Demo 2：上传新版本并生成 Diff

```text
Writer 上传 openapi-v2.yaml
Project Admin 批准草稿
系统生成 User Service API@1.1.0
系统自动比较 1.0.0 → 1.1.0
页面展示：
- 新增接口
- 修改接口
- Breaking Changes
```

---

### Demo 3：前端查看版本差异

```text
Reader 进入 Compare 页面
选择 1.0.0 → 1.1.0
看到：
- response.name 删除
- response.age string -> number
- response.email 新增
```

---

### Demo 4：AI 查询接口

用户对 AI 说：

```text
查询 user-service 的 GET /api/users/{id} 接口定义，并生成 TS 类型。
```

AI 根据 Skill：

```text
调用 get_endpoint_detail
生成 TypeScript 类型
不编造字段
```

---

### Demo 5：AI 查询版本变化

用户对 AI 说：

```text
比较 user-service 1.0.0 到 1.1.0 的变化，告诉我前端要改什么。
```

AI 根据 Skill：

```text
调用 compare_api_versions
调用 get_change_summary
输出 must-handle 和 optional
```

---

### Demo 6：AI 提交接口文档草稿并人工审核发布

用户对 AI 说：

```text
把这份 OpenAPI 提交为 user-service@1.2.0 草稿。
```

AI 根据 Skill：

```text
调用 create_api_version_draft
调用 submit_api_version_draft
返回草稿状态和 diff preview
提醒 breaking changes 需要 Project Admin 关注
```

Project Admin 进入后台查看草稿，确认 diff preview 和 breaking changes 后手动发布。

---

### Demo 7：上传 Markdown 文档并生成纯文件 Diff

```text
Project Admin 创建 Markdown 类型文档：AGENTS.md，relative_path=AGENTS.md
Writer 上传 AGENTS.md v1 草稿
Project Admin 批准草稿
Writer 上传 AGENTS.md v2 草稿
系统生成纯文件 Diff Preview
Project Admin 查看 diff 后批准发布
Reader 或 AI 查询最新 AGENTS.md
```

---

### Demo 8：后台 AI 自动总结和审核页对话

```text
SuperAdmin 或 Project Admin 在 AI 设置页配置 OpenAI-compatible Provider：base_url、api_mode、model、api_key
Writer 上传 openapi-v2.yaml 并提交草稿
系统生成 Draft Diff Preview
系统调用 AI Provider 生成审核总结
Project Admin 在草稿审核页看到：
- 机器 Diff Summary
- Breaking Changes
- AI-generated 变更总结
- AI 建议审核重点
Project Admin 在页面上追问：这次前端必须处理什么？
AI 基于当前 Diff 回答，不执行发布动作
Project Admin 人工 approve 后，系统发布新版本并保存正式版本 AI 总结
```

---

### Demo 9：创建并撤销文档公开链接

```text
Project Admin 为 User Service API 的 prod Branch 创建一个默认 3 个月的 unprotected latest 链接
Project Admin 复制链接，并可在管理页重新显示该 active 链接
匿名访问者无需登录即可查看 prod 最新已发布版本并下载原始 OpenAPI 文件
Project Admin 再创建一个 protected all_versions 链接并输入密码，管理页只显示 protected 状态，不显示密码
匿名访问者输入正确密码后可以查看 prod 的已发布历史；密码缺失或错误时只看到统一不可用状态
Project Admin 撤销 protected 链接
匿名访问者再次打开被撤销链接时，即使密码正确也只看到统一不可用状态
系统记录 create、reveal、revoke、view、download 审计事件
```

---

## 18. 风险与应对

### 18.1 风险：产品被理解成普通文档平台

应对：

- 强调 Project 下的多类型文档管理和审核发布流
- 强调 API Contract 是核心文档类型之一
- 强调 Semantic Diff
- 强调 Markdown 文档也有版本、分支、审核和纯文件 Diff
- 强调 MCP + Skill
- 首页 Demo 展示版本变化和 AI 查询

---

### 18.2 风险：Skill 没有发挥作用

应对：

- Skill 必须绑定具体 MCP tools
- 提供真实提示词示例
- 提供稳定输出模板
- 在 README 中展示 AI 使用流程

---

### 18.3 风险：AI 编造接口字段

应对：

- Skill 明确要求以 Vdoc MCP 为事实来源
- endpoint 不存在时必须提示 not found
- 生成代码前必须调用 get_endpoint_detail

---

### 18.4 风险：Diff 不准确

应对：

- MVP 覆盖最常见 breaking rules
- 允许查看原始 OpenAPI
- 后续支持规则配置
- 可集成成熟 diff 工具

---

### 18.5 风险：MCP 写入安全

应对：

- token scope
- `api:draft` / `doc:draft` 和发布权限分离
- MCP v0.1 只允许写草稿，不允许直接发布
- 人工审核后才生成不可变 Document Version
- 审计日志
- 可关闭写入工具
- token 过期时间
- 内置 AI 只给总结、解释和审核建议，不自动批准发布

---

### 18.6 风险：AI Provider 密钥泄漏或 AI 总结误导审核

应对：

- API Key 必须服务端加密保存，列表和详情脱敏展示
- AI 请求和审计日志禁止记录密钥、JWT、MCP Token 和 Authorization header
- AI 总结必须标记 AI-generated，并保留机器 Diff 作为事实来源
- AI 总结不能覆盖 Diff Item，不能触发 approve / reject / publish
- Provider 调用失败时，原始 Diff 和人工审核流程必须可用

---

## 19. 后续路线图

### v0.1 MVP

- Team / Project / Role
- Project Document
- OpenAPI 上传
- Markdown 文档上传
- 版本管理
- API 文档展示
- Markdown 文档展示
- 语义 Diff
- 纯文件 Diff
- Breaking Changes
- MCP 查询
- MCP OpenAPI / Markdown 草稿提交和更新
- 人工审核发布
- 支持可选密码保护的文档公开链接分享，以及匿名安全查看和下载
- 后台内置 AI Provider 配置、自动 Diff 总结和页面内对话
- Vdoc Skill

### v0.2

- 审计日志增强
- 前端变更摘要增强
- Skill 示例增强
- Docker Compose 完善

### v0.3

- TypeScript types/client 生成
- CLI
- CI 集成
- 通知集成

### v0.4

- 高级 Draft / Review / Publish 流程
- PR Bot
- 前端代码影响分析
- 更复杂 diff rules

### v1.0

- 稳定自部署
- 可配置 Diff Rules
- 多项目订阅
- 生产级权限和审计
- 更完整 AI Agent 工作流

---

## 20. README 首屏建议

```markdown
# Vdoc

AI-friendly documentation hub with OpenAPI contracts, Markdown docs, diff, MCP and Skill.

Vdoc helps AI-native teams keep backend APIs, Markdown project knowledge, frontend code and AI agents in sync.

## Features

- OpenAPI contract versioning
- Markdown document versioning
- Semantic API diff
- Plain file diff for Markdown docs
- Breaking change detection
- Frontend-friendly change summaries
- MCP tools for AI agents
- Official Vdoc Skill for API collaboration workflows
- Team / Project / Role collaboration
- Self-hosted for small teams
```

中文：

```markdown
# Vdoc

面向 AI 协作开发的文档协作中心，支持 OpenAPI 接口文档、Markdown 纯文档、Diff、MCP 和 Skill。

Vdoc 帮助使用 AI 编程的小团队同步后端接口、Markdown 项目知识、前端对接代码和 AI Agent 上下文。

## 核心能力

- OpenAPI 契约版本管理
- Markdown 文档版本管理
- 接口语义 Diff
- Markdown 纯文件 Diff
- Breaking Change 检测
- 面向前端的变更摘要
- MCP AI Agent 接入
- 官方 Vdoc Skill 工作流
- Team / Project / Role 协作
- 支持小团队自部署
```

---

## 21. 最终总结

Vdoc MVP 的核心不是做一个新的普通文档展示平台，而是做一个：

```text
Project Documents + OpenAPI Semantic Diff + Markdown File Diff + MCP + Skill
```

的 AI-native 文档协作工具。

MVP 最重要的闭环是：

```text
创建 Project 文档
  ↓
上传 OpenAPI 或 Markdown 草稿
  ↓
人工审核发布不可变版本
  ↓
OpenAPI 语义 Diff 或 Markdown 纯文件 Diff
  ↓
AI 通过 MCP 查询真实文档数据
  ↓
Skill 指导 AI 输出前端对接、升级建议或项目知识说明
```

只要这个闭环成立，Vdoc 就能和传统接口文档工具、普通知识库形成明显差异。
