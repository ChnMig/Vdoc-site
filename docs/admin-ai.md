# Admin AI

Admin AI 是 Vdoc 后台内置的审核辅助能力。它读取 Vdoc 已生成的 Draft、Version 和 Diff 上下文，生成 AI 摘要并支持页面内对话。它与外部 MCP adapter 和 Vdoc Skill 不同，不向 Agent 提供发布捷径，也不替代机器 Diff 或人工审核。

## 权限和优先级

- SuperAdmin 配置系统默认 AI 提供商和系统提示词。
- Project Admin 可以配置项目级 AI 提供商和项目提示词覆盖。
- 系统配置的读取、更新和测试仅限 SuperAdmin；项目配置的读取、更新和测试仅限对应 Project Admin 或 SuperAdmin。Reader 和 Writer 不能读取 Provider/Prompt 配置，但在文档权限允许时仍可使用页面摘要和 Chat。
- 已启用的项目提供商优先于系统提供商。项目提供商不存在或已禁用时，回退到已启用的系统提供商。
- 项目提示词覆盖只影响对应项目。所有 AI 读取仍受当前用户的 Project 权限限制。

AI 只能解释、总结和提示审核重点。它不能 approve、request changes、reject、modify 或 publish。Project Admin 或 SuperAdmin 仍是人工审核和发布门禁。

## 配置提供商

Vdoc 使用 OpenAI-compatible 提供商，支持两种 API 模式：

- `chat_completions` 调用提供商的 `/v1/chat/completions`。
- `responses` 调用提供商的 `/v1/responses`。

| 字段                | 规则                                           |
| ------------------- | ---------------------------------------------- |
| `base_url`          | 提供商或私有网关的 HTTPS origin。              |
| `api_mode`          | `chat_completions` 或 `responses`。            |
| `model`             | 提供商支持的模型名。                           |
| `api_key`           | 必须设置，服务端加密保存，读取接口不返回明文。 |
| `enabled`           | 控制该配置是否可被调用。                       |
| `temperature`       | 默认 `0.2`，范围 `0` 到 `2`。                  |
| `timeout_ms`        | 默认 `30000`，范围 `1000` 到 `120000`。        |
| `max_output_tokens` | 默认 `1000`，范围 `1` 到 `32000`。             |

`name` 是可选显示名。读取提供商配置时，用 `api_key_set` 判断密钥是否已设置，只显示 `api_key_last4` 作为掩码状态。更新其他字段时可以保留已有加密密钥，不要把密钥复制到文档、日志或截图。

保存前或保存后都可以运行系统级或项目级 provider test。测试使用当前表单或已保存的有效配置发起短连接检查，返回 `ok` 和非敏感 `content`。项目没有启用的 override 时，空表单测试不会提交一个不完整配置，而是测试当前启用的系统回退 Provider。测试结果与失败状态会写入审计记录。

## 配置提示词

系统级和项目级都可以覆盖以下提示词：

- `draft_review_summary`
- `version_change_summary`
- `diff_change_summary`
- `page_chat`

每项包含 `system_prompt`、`user_prompt_template` 和 `enabled`。两个文本字段都不能为空；所有 `user_prompt_template` 必须保留字面量 `{{context}}`，`page_chat` 还必须保留 `{{message}}`。`prompt_key` 由请求路径确定，不在更新 body 中重复传递。项目覆盖优先于系统或内置模板。关闭摘要提示词会把对应生成结果记录为 `skipped`，不会阻塞 Draft 提交或 Version 发布。提示词覆盖是管理员维护的产品数据；日志和审计元数据必须排除提示词中嵌入的密钥、token 和其他秘密。

## 自动摘要和手动重新生成

- OpenAPI 或 Markdown Draft 提交后，Vdoc 自动尝试生成 Draft 审核摘要。
- Draft 更新并重新提交后，摘要会再次生成。
- Draft 审核通过并生成不可变 Version 后，Vdoc 自动尝试生成 Version 变更摘要。
- Draft、Version 和 Diff 都有摘要读取接口，也可以在权限允许时手动重新生成。

摘要上下文由后端按目标构建并限制长度：Draft 包含长度受限的规范化内容，以及 `ID`、版本名、状态和 `changelog`；Version 包含长度受限的规范化内容，以及 `ID`、版本名和 `changelog`；Diff 包含 Diff `ID`、来源版本 `ID`、目标版本 `ID`，以及 `added`、`removed`、`modified`、`breaking` 汇总计数；每个 item 包含 `method`、`path`、`location`、`breaking` 和 `message`。摘要是 AI-generated 辅助文本。机器 Diff 始终是变更事实，人类审核决定是否发布。

自动任务的状态包括生成中的 `pending`，以及 `succeeded`、`skipped` 和 `failed`。未配置可用提供商或提示词已禁用时记录 `skipped`，调用错误记录 `failed`。Provider 返回前，Vdoc 会再次核对权限、目标内容、Provider 和 Prompt；过期结果不会覆盖更新后的状态。这些结果都是不阻塞的，不会回滚 Draft 提交或 Version 发布，原始 Diff、版本查看和人工审核仍可用。

页面 AI Chat 会携带有长度上限的当前会话历史。会话使用持久化生成 token 保证多实例下只有最新请求可以写入，较旧的延迟响应不会乱序追加到会话。管理端会列出当前页面上下文的历史会话，刷新后仍能恢复并切换已有对话。

## 页面内对话

Draft Review、Version 和 Compare / Diff 页面可以创建 page-scoped chat。会话固定到当前 Project、Document 和 Draft、Version 或 Diff，只能读取当前用户有权访问的上下文。页面内对话复用同一 Draft、Version 和 Diff 上下文构建器，不会追加其他页面数据。

回答必须标记为 AI-generated。页面对话不能跨 Project 读取内容，也不能把回答伪装成机器 Diff 或人工审核结论。

Project、Document 或目标 Branch 归档后，Project Admin 或 SuperAdmin 仍可只读查看 Provider/Prompt 历史配置，已有摘要和 Chat 历史也仍可读取；Provider 更新/测试、Prompt 更新、摘要重新生成、新会话和新消息都会被阻止。Reader 和 Writer 不会因为归档而获得配置读取权。Reader 在有效上下文中可以使用 Chat，但手动重新生成摘要仅限 Project Admin 或 SuperAdmin。

## API 路由

完整路由和鉴权说明见 [API 参考](api-reference#admin-ai-路由)。主要接口分为：

- 系统和项目 provider 的读取、更新与测试。
- 系统和项目 prompt 的读取与覆盖。
- Draft、Version、Diff 摘要的读取与重新生成。
- 页面 chat session 的列表恢复、创建、读取和消息发送。

## 审计和安全

- AI API key 使用服务端加密能力保存，普通响应只返回掩码状态。
- Provider test、自动摘要、手动重新生成、chat 消息和失败原因都会审计。
- 提供商返回 usage 时，审计元数据记录 `prompt_tokens`、`completion_tokens` 和 `total_tokens`。
- 日志和审计元数据不得记录原始 API key、JWT、MCP Token、`Authorization` header，或提示词中嵌入的秘密。Prompt override、生成的 summary 和 chat content 按产品模型作为受管记录保存。
- 不要把秘密放进 URL、shell 参数、日志、截图或工单。

## 操作检查

1. 由 SuperAdmin 配置并测试系统提供商。
2. 如果项目需要独立模型、网关或提示词，由 Project Admin 配置项目覆盖并测试。
3. 提交测试 Draft，确认 Draft 摘要状态可读取。
4. 由人类审核并发布测试 Version，确认 Version 摘要可读取。
5. 在 Draft、Version 或 Diff 页面发送一条无敏感信息的 chat 消息。
6. 确认失败或禁用场景显示 `skipped` 或 `failed`，同时 Diff 和人工审核仍可用。
7. 检查审计中有状态和 token usage，但没有原始凭据、credential header 或提示词中嵌入的秘密；prompt override、summary 和 chat 记录仍按产品定义可用。

外部 Agent 接入请读 [MCP 工具](mcp-tools) 和 [Skill 工作流](skill-workflows)。它们可以查询事实或提交 Draft，但同样不能替代人类审核和发布。
