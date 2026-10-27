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
| `base_url`          | 提供商 HTTPS 根地址或含 `/v1` 的网关地址。     |
| `api_mode`          | `responses`（新建默认）或 `chat_completions`。 |
| `model`             | 提供商支持的模型名。                           |
| `api_key`           | 必须设置，加密保存；普通配置响应不返回明文。   |
| `enabled`           | 控制该配置是否可被调用。                       |
| `temperature`       | 滑块范围 `0` 到 `2`，可重置为 `0.2`。          |
| `timeout_ms`        | 默认 `30000`，范围 `1000` 到 `120000`。        |
| `max_output_tokens` | 默认 `1000`，范围 `1` 到 `32000`。             |

`name` 是可选显示名。读取提供商配置时，用 `api_key_set` 判断密钥是否已设置，只显示 `api_key_last4` 作为掩码状态。更新其他字段时可以保留已有加密密钥，不要把密钥复制到文档、日志或截图。

API Key 放在模型字段之前。已保存的 Key 默认显示掩码，点击眼睛查看，或点**替换密钥**填写新值；隐藏时清除已查看明文。仅查看不会把原 Key 作为新凭证提交，也不会把它发送到更改后的模型查询地址。系统 Key 仅超级管理员可查看；项目管理员只能查看自己有权限管理的有效项目覆盖 Key，不会读到系统回退 Key。每次查看都会产生不含密钥的审计记录，响应不缓存。

地址支持 `https://host`、`https://host/v1`、`https://host/gateway/v1/`，模型查询和推理共用路径规则，不会重复添加 `/v1`。若仍出现 404，请核对上游是否支持所选 API 模式和模型；能拉取模型列表不代表必然支持 Responses。新配置默认 Responses，已有配置保持原 API 模式。

模型可手填，或展开列表按当前地址／凭证查询、搜索后选择。系统和项目均支持，无须先保存；查询不覆盖模型、不保存表单。后端调用 `/v1/models`，同一地址可复用已存凭证，换地址须另填凭证。连接参数变化会清除旧列表；可刷新重试，失败或无结果时仍可手填。

保存前或保存后都可以运行系统级或项目级 provider test。测试使用当前表单或已保存的有效配置发起短连接检查，返回 `ok` 和非敏感 `content`。项目没有启用的 override 时，空表单测试不会提交一个不完整配置，而是测试当前启用的系统回退 Provider。测试结果与失败状态会写入审计记录。

## 配置提示词

系统级和项目级都可以覆盖以下提示词：

- `draft_review_summary`
- `version_change_summary`
- `diff_change_summary`
- `page_chat`

每项包含 `system_prompt`、`user_prompt_template` 和 `enabled`。两个文本字段都不能为空；所有 `user_prompt_template` 必须保留字面量 <code v-pre>{{context}}</code>，`page_chat` 还必须保留 <code v-pre>{{message}}</code>。`prompt_key` 由请求路径确定，不在更新 body 中重复传递。项目覆盖优先于系统或内置模板。关闭摘要提示词会把对应生成结果记录为 `skipped`，不会阻塞 Draft 提交或 Version 发布。提示词覆盖是管理员维护的产品数据；日志和审计元数据必须排除提示词中嵌入的密钥、token 和其他秘密。

## 自动摘要和手动重新生成

- OpenAPI 或 Markdown Draft 提交后，Vdoc 自动尝试生成 Draft 审核摘要。
- Draft 更新并重新提交后，摘要会再次生成。
- Draft 审核通过并生成不可变 Version 后，Vdoc 自动尝试生成 Version 变更摘要。
- Draft、Version 和 Diff 都有摘要读取接口，也可以在权限允许时手动重新生成。

摘要上下文由后端按目标构建并限制长度：Draft 包含长度受限的规范化内容，以及 `ID`、版本名、状态和 `changelog`；Version 包含长度受限的规范化内容，以及 `ID`、版本名和 `changelog`；Diff 包含 Diff `ID`、来源版本 `ID`、目标版本 `ID`，以及 `added`、`removed`、`modified`、`breaking` 汇总计数；每个 item 包含 `method`、`path`、`location`、`breaking` 和 `message`。摘要是 AI-generated 辅助文本。机器 Diff 始终是变更事实，人类审核决定是否发布。

自动任务的状态包括生成中的 `pending`，以及 `succeeded`、`skipped` 和 `failed`。未配置可用提供商或提示词已禁用时记录 `skipped`，调用错误记录 `failed`。Provider 返回前，Vdoc 会再次核对权限、目标内容、Provider 和 Prompt；过期结果不会覆盖更新后的状态。这些结果都是不阻塞的，不会回滚 Draft 提交或 Version 发布，原始 Diff、版本查看和人工审核仍可用。

页面 AI Chat 会携带有长度上限的当前会话历史。会话使用持久化生成 token 保证多实例下只有最新请求可以写入，较旧的延迟响应不会乱序追加到会话。管理端会列出当前页面上下文的历史会话，刷新后仍能恢复并切换已有对话。

## 页面内对话

从**工作空间**打开文档，再打开**文档 AI**。摘要跟随所选版本／草稿；聊天固定当前文档，按问题检索所有分支的正式版本与已保存草稿，区分分支、版本和草稿来源。每轮最多选 16 份正文、48,000 字符，另附最多 12,000 字符目录；长文截取相关片段并注明省略。不会读取其他文档。旧 Draft／Version／Diff 对话 API 保持兼容。

回答必须标记为 AI-generated。页面对话不能跨 Project 读取内容，也不能把回答伪装成机器 Diff 或人工审核结论。

Project 或 Document 归档后只能读取历史，不能新建会话或发消息；旧分支绑定会话同样受该分支状态限制。活动文档聊天可检索归档分支历史。Reader 可聊天；Provider／Prompt 配置读取、测试和手动摘要重生成仍要求管理员权限。

## API 路由

完整路由和鉴权说明见 [API 参考](api-reference.md#admin-ai-路由)。主要接口分为：

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
5. 打开独立文档页，选定测试草稿或正式版本，在**文档 AI**中发送一条无敏感信息的 chat 消息，核对所选修订。
6. 确认失败或禁用场景显示 `skipped` 或 `failed`，同时 Diff 和人工审核仍可用。
7. 检查审计中有状态和 token usage，但没有原始凭据、credential header 或提示词中嵌入的秘密；prompt override、summary 和 chat 记录仍按产品定义可用。

外部 Agent 接入请读 [MCP 工具](mcp-tools.md) 和 [Skill 工作流](skill-workflows.md)。它们可以查询事实或提交 Draft，但同样不能替代人类审核和发布。
