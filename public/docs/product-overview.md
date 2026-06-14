# 产品概览

Vdoc 是一个带审核流程的文档协作系统。它把 OpenAPI 合约、Markdown 项目知识、版本差异、Admin 审核、MCP 工具和 Agent Skill 工作流放在一条链路里，目标是让人和 Agent 都只使用已审核的事实。

## 本页目标

- 说明 Vdoc 的核心对象和角色。
- 明确 v0.1 能支持的操作和不支持的能力。
- 帮你在部署前判断自己的使用场景是否匹配。

## 适用场景

- 团队需要集中维护 API 合约和 Markdown 文档。
- 前端、后端或 Agent 需要查询某个已发布版本的 endpoint、字段、响应结构和变更摘要。
- 管理员希望 Draft 经过人工审核后再发布为不可变 Version。
- 试点环境需要后端、Admin、站点、MCP adapter、Skill package 一起交付。

## 核心对象模型

| 对象            | 作用                              | 关键点                                                                        |
| --------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| Team            | 管理一组 Project                  | Team 是项目归属边界。                                                         |
| Project         | 管理一个产品或服务的文档集合      | Project 拥有成员和权限。                                                      |
| Document        | 表示一个 OpenAPI 或 Markdown 文档 | `document_type` 为 `1` 表示 OpenAPI，为 `2` 表示 Markdown。                   |
| `relative_path` | Document 的稳定身份               | 示例为 `apis/petstore.yaml` 或 `docs/runbook.md`，显示名称变化不应改变身份。  |
| Branch          | 文档的工作分支                    | 创建 Document 后会有 `dev`、`test`、受保护的 `prod`，也可按需建 `feature/*`。 |
| Draft           | 待审核内容                        | Writer 或 Agent 创建 Draft，再提交审核。                                      |
| Version         | 已发布的不可变版本                | Admin 或 SuperAdmin 审核通过后生成。                                          |
| MCP Token       | Agent 访问 Vdoc MCP 的凭据        | 由 Admin 流程创建，放在 Agent 环境变量中。                                    |

## 角色和权限

- SuperAdmin 可以做系统级管理和审核。
- Project Reader 可以查询项目内已发布事实。
- Project Writer 可以上传 Draft 并提交审核。
- Project Admin 可以审核、批准、要求修改或拒绝 Draft。

## v0.1 可以做什么

- 在 Admin 中完成 Team、Project、Document、Branch、Draft、Version、Diff、Endpoint 浏览和 MCP Token 创建。
- 管理 OpenAPI 和 Markdown 两类文档。
- 查询已发布 OpenAPI 版本中的 endpoint 列表、endpoint detail、diff 和 change summary。
- 查询已发布 Markdown 文档内容和版本差异。
- 让 Agent 通过 MCP 创建或更新 Draft，并提交给人工审核。
- 用 Skill 要求 Agent 在写集成代码、做迁移分析或改文档前先查 Vdoc。

## v0.1 不做什么

- 不支持 MCP 直接发布版本，发布必须由人类 Admin 或 SuperAdmin 审核。
- 不提供 CLI token store，token 保存在本地 Agent 配置或密钥管理中。
- 不包含邀请流、通知机器人、PR Bot、完整 SDK 或代码生成平台。
- 不包含商业计费或完整租户管理。

## 如何验证理解是否正确

在接入 Agent 前，确认你能说清下面的链路：

1. SuperAdmin 或 Project Admin 创建 Team 和 Project。
2. Project 中创建 OpenAPI 或 Markdown Document。
3. Writer 在 Branch 上创建 Draft 并提交审核。
4. Admin 审核通过后生成 Version。
5. 用户创建 MCP Token。
6. Agent 通过 `@vdoc/mcp` 查询 Version、endpoint、diff 或 Markdown 内容。
7. 如果 Agent 要修改内容，只能提交 Draft，不能直接发布。

## 注意事项

- 不要把 Document 的显示名称当身份，跨系统引用应使用 `relative_path`。
- 不要让 Agent 根据记忆猜字段、枚举、鉴权方式或 Markdown 原文，Vdoc MCP 才是事实来源。
- 不要把 v0.1 当成自动发布系统，它的发布门禁仍然是人工审核。
