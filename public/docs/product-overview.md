# 产品概览

Vdoc 是给人和 Agent 共用的文档事实系统。团队把 OpenAPI 合约和 Markdown 知识放进 Vdoc，通过人工审核发布不可变 Version，再让 Admin、脚本、MCP 和 Agent 只读取已发布事实。

## Vdoc 解决什么问题

- API 字段、枚举、响应结构和鉴权说明散落在仓库、聊天记录和个人记忆里。
- Agent 写代码时容易根据训练记忆猜接口，而不是读取你团队审核过的事实。
- 文档变更缺少 Draft、review、diff 和可回滚版本。
- 后端 API、Admin、MCP 和 Skill 经常缺少清晰的启动顺序，试点用户不知道从哪一步开始。

Vdoc 的目标不是替代工程评审，而是把“哪些事实已经被批准”变成可以查询、可以审计、可以接入 Agent 的系统。

## 谁会使用 Vdoc

- 产品或平台团队，用 Vdoc 管理对外 API 和项目知识。
- 后端维护者，用 Vdoc 发布 OpenAPI 和 Markdown 文档版本。
- 前端开发者，用 Vdoc 查询 endpoint detail、request body、response body 和 diff。
- 文档维护者，用 Draft 和 review 管理 Markdown 变更。
- Agent 用户，用 MCP 和 Skill 要求 Agent 先查 Vdoc，再写代码、做迁移分析或提交 Draft。

## 核心对象

- Team：一组 Project 的归属边界。
- Project：一个产品或服务的文档集合，拥有成员和权限。
- Document：OpenAPI 或 Markdown 文档。`document_type=1` 表示 OpenAPI，`document_type=2` 表示 Markdown。
- `relative_path`：Document 的稳定身份，例如 `apis/petstore.yaml` 或 `docs/runbook.md`。显示名称可以变，`relative_path` 不应随意变。
- Branch：Document 的工作分支。创建 Document 后会有 `dev`、`test`、受保护的 `prod`，也可以创建 `feature/*`。
- Draft：待审核内容。Writer 或 Agent 可以创建和提交 Draft。
- Version：审核通过后生成的不可变发布结果。
- MCP Token：Agent 访问 Vdoc MCP 的凭据，由 Admin 流程创建，放在 Agent 环境变量或密钥管理中。

## 角色

- SuperAdmin：系统级管理和审核。
- Project Reader：查询项目内已发布事实。
- Project Writer：上传 Draft 并提交审核。
- Project Admin：审核、批准、要求修改或拒绝 Draft。

## v0.1 能做什么

- 在 Admin 中管理 Team、Project、Document、Branch、Draft、Review、Version、Diff、endpoint 浏览和 MCP Token。
- 管理 OpenAPI 和 Markdown 两类文档。
- 查询已发布 OpenAPI endpoint、字段、响应结构、diff 和 change summary。
- 查询已发布 Markdown 内容和版本差异。
- 让 Agent 通过 MCP 查询已发布事实，或创建、更新、提交 Draft。
- 用 Vdoc Skill 约束 Agent 在集成、迁移、文档变更前先查询 Vdoc。
- 用根目录 `docker-compose.yml` 启动 backend API、Admin 和本地依赖。

## v0.1 不做什么

- 不支持 MCP 直接发布 Version，发布必须由 Admin 或 SuperAdmin 审核。
- 不提供 CLI token store，token 保存在本地 Agent 配置或密钥管理中。
- 不包含邀请流、通知机器人、PR Bot、完整 SDK 或代码生成平台。
- 不包含商业计费或完整租户管理。

## 正确心智模型

1. Admin 创建 Team 和 Project。
2. Project 中创建 OpenAPI 或 Markdown Document。
3. Writer 或 Agent 在 Branch 上创建 Draft。
4. Admin 审核 Draft，批准后生成 Version。
5. 用户创建 MCP Token。
6. Agent 通过 `@vdoc/mcp` 查询 Version、endpoint、diff 或 Markdown 内容。
7. 如果 Agent 要修改内容，它只能提交 Draft，不能直接发布。

下一步读 [运行流程](how-it-works)，再按 [部署指南](deployment) 启动系统。
