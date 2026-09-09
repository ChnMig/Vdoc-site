# 运行流程

从一处接口变化开始，看文档如何经过审核，再成为团队和 Agent 都能查询的已发布版本。

<div id="example"></div>

## 示例：订单金额字段变了

假设团队在 `apis/orders.yaml` 中管理订单接口。下面是一个讲解用的示例，同一条 `GET /orders/{id}` 的响应字段发生了变化：

| 对照项                  | 已发布的 v1    | 待审核的 v2                    |
| ----------------------- | -------------- | ------------------------------ |
| `total` 的 OpenAPI 类型 | `number`       | `string`                       |
| 示例响应中的值          | `42.5`         | `"42.50"`                      |
| 前端需要检查什么        | 按数值处理金额 | 检查类型定义、计算和格式化代码 |

1. **提交修改。** 后端开发者或 Agent 把新的 OpenAPI 内容提交为草稿，此时已发布的 v1 仍保持不变。
2. **查看差异。** Vdoc 的 OpenAPI 语义 Diff 展示 `total` 的类型变化和兼容性影响。审核人可以继续查看原始文档及接口详情。
3. **人工发布。** Project Admin 或 SuperAdmin 检查并批准草稿，生成不可变的 v2。MCP 不能跳过这一步直接发布。
4. **Agent 查询。** 前端让 Agent 通过 MCP 比较已发布的 v1 与 v2，并读取新版接口详情，再据此提出代码修改建议。

两个版本都发布后，可以这样要求 Agent（把项目和版本替换为你实际发布的对象）：

```text
先查询 Vdoc 中 apis/orders.yaml 的已发布 v1 和 v2，
比较 GET /orders/{id} 的变化，再读取 v2 的接口详情。
说明 total 字段的类型变化会影响哪些对接代码，并给出修改建议。
请注明文档、分支和版本；如果找不到对应版本，不要猜测字段。
```

文档变更和代码修改不会自动完成同步：Vdoc 提供版本、Diff 和接口内容，Agent 基于查询结果提出建议，由团队验证代码。

Markdown 也走同样的草稿、审核、发布流程，变化用文件 Diff 展示。想亲自跑一次，可以先 **[部署 Vdoc](deployment.md#quick-start)**，再按 **[首次使用](admin-usage.md)** 发布更短的 Markdown 示例。

## 人、MCP 和 Skill 的分工

- **团队在 Admin 中管理和发布。** 创建 Team、Project、Document 和 Branch，检查草稿内容与 Diff，审核后生成版本，再为 Agent 配置 MCP Token。Writer 可以创建和提交草稿，Project Admin 或 SuperAdmin 批准发布。
- **MCP 提供文档和操作工具。** `@vdoc/mcp` 将 Agent 的请求转发到 Backend `/api/v1/open/mcp`，查询已发布接口、Markdown、版本和 Diff，也可按令牌权限创建、更新和提交草稿。它不在本地保存 Vdoc 文档，也没有直接发布工具。
- **Skill 指导 Agent 何时查询。** 在接口集成、版本迁移或 Markdown 修改前，先调用 MCP，基于返回内容回答或提交草稿。Skill 本身不保存实时文档。详见 [Skill 工作流](skill-workflows.md)。
- **后台 AI 辅助审核。** 可选的 [Admin AI](admin-ai.md) 使用管理员配置的模型生成摘要、解释 Diff 和进行页面内对话。摘要标为 AI-generated，不能覆盖机器 Diff，也不能批准、拒绝、修改或发布内容。提供商未配置或调用失败时，原始 Diff 和人工审核仍可用。

## 查询时，明确文档和版本

同一份文档在 `dev`、`test` 和 `prod` 可以有不同的已发布内容。使用 Project、文档的稳定 `relative_path`、Branch 和 Version 定位目标；显示名称可以变化，相对路径用于持续引用。

查询接口时，先用 `get_endpoint_detail` 读取完整定义；比较已发布接口版本时，用 `compare_api_versions`；读取 Markdown 时，用 `get_latest_doc`。工具所需的 ID 和内容应来自实际查询结果。如果目标不存在或尚未发布，Agent 应说明缺少什么，而不是补写字段。

想让 Agent 修改文档时，它应先读取当前版本，再提交新的 Draft，等待人工审核。只有版本页确实出现新的 Version，才算完成发布。

## 从哪里开始

1. [部署 Vdoc](deployment.md#quick-start)：启动 Backend、Admin、PostgreSQL 和 RustFS。
2. [首次使用](admin-usage.md)：发布一份示例文档，完成一次 MCP 查询。
3. [MCP 接入与工具](mcp-tools.md)：查阅连接配置、读取范围和草稿操作。

浏览器访问 Admin，Agent 通过 MCP 访问 Backend；两者都不直接访问数据库或对象存储。容器内部使用 Compose 服务名，浏览器与 Agent 使用自己能访问的地址，具体配置见 [部署指南](deployment.md)。
