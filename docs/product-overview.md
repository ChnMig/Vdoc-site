# 产品概览

Vdoc 是面向 AI 协作开发团队的文档协作中心。把 OpenAPI 接口、AGENTS.md 和运行手册放在同一个项目中，查看每次变更，审核后发布，再让团队和 Agent 查询同一份已发布内容。

## 什么时候用 Vdoc

| 你遇到的情况                                 | 在 Vdoc 中怎么做                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| 后端改了接口，前端需要判断对接影响           | 比较 OpenAPI 版本，查看字段变化和 Breaking Changes，再读取完整接口定义。 |
| Agent 需要项目约定，但上下文里的文档已经过时 | 通过 MCP 查询已发布的 Markdown，使用 Skill 引导 Agent 先查文档再回答。   |
| 团队或 Agent 修改了文档，需要有人检查        | 先提交草稿，查看 Diff，由管理员审核后发布；历史版本保持不可变。          |

先看 **[一个接口变更如何流转](how-it-works#example)**，或直接 **[用 Docker Compose 部署试用](deployment#quick-start)**。部署后可跟随 [首次使用](admin-usage)，发布一份示例文档并让 Agent 查询。

## 谁适合使用

使用 AI 编程的产品和平台团队：后端维护接口契约，前端检查对接影响，文档维护者审核项目约定，Agent 通过 MCP 获取已发布内容。团队可以在自己的基础设施上部署 Vdoc。

## 文档怎样组织

- **Project（项目）**：一个产品或服务的文档集合，按成员与角色管理访问。
- **Document（文档）**：OpenAPI 或 Markdown，以稳定的 `relative_path` 定位，例如 `apis/orders.yaml` 或 `docs/team-guide.md`。
- **Branch（分支）**：同一份文档可以分别维护 `dev`、`test` 和受保护的 `prod` 内容，也可创建自定义分支。
- **Draft 与 Version（草稿与版本）**：修改先进入草稿；Project Admin 或 SuperAdmin 审核通过后生成不可变版本。Writer 和 Agent 可以提交草稿。

团队在 Admin 工作台管理这些内容。Agent 使用 MCP Token 获得授权范围内的读取或草稿操作权限，Vdoc Skill 提供先查询再协作的工作流。

## 首次试用之后

用 [Admin AI](admin-ai) 配置 OpenAI-compatible 模型，可以获得自动变更摘要和页面内对话；通过 [公开分享](admin-usage#创建和管理公开分享)，可以让项目外的人查看已发布文档，按需设置密码并撤销链接。

## 当前版本边界

发布必须由人审核：MCP 不能直接发布，Admin AI 不能批准、拒绝、修改或发布内容，也不能替代机器 Diff。

当前提供 Docker Compose 自部署候选版本，能力和限制见 [版本说明](version-notes)。邀请流、通知机器人、PR Bot、完整 SDK、代码生成平台和商业计费不在当前范围内。

准备试用时，从 [部署指南](deployment#quick-start) 开始，再完成 [第一次 Agent 查询](admin-usage)。
