# Vdoc v0.1 PostgreSQL 数据库表设计

本文档定义 Vdoc v0.1 MVP 的 Project Document 持久化设计。Project 下直接管理多类型文档，文档类型至少包括 OpenAPI 和 Markdown。PostgreSQL 保存结构化数据、索引和对象引用；RustFS 通过 S3-compatible API 保存 Raw、Normalized、Stable 快照以及大型 Diff 快照。

## 1. 设计边界

| 项目 | v0.1 决策 |
|---|---|
| 结构化数据 | 使用 PostgreSQL 保存用户、团队、项目、项目成员、文档、文档分支、草稿、版本、Endpoint 索引、Endpoint 详情、Diff 摘要、Diff Items、MCP Token 和审计日志。 |
| 对象存储 | 使用 RustFS/S3-compatible API 保存 Raw、Normalized、Stable 内容快照和大型 Diff。 |
| 数据库中的对象引用 | PostgreSQL 只保存 object key、hash、content type、size、etag、metadata 等引用和校验数据。 |
| Endpoint 查询 | OpenAPI Endpoint 列表走 `api_endpoints`，详情走 `api_endpoint_details`，不读取 Raw 快照。 |
| Diff 查询 | 摘要和机器可读条目存 PostgreSQL，大型完整 Diff 快照存 RustFS。 |
| MCP Token | v0.1 只做用户绑定 Token，不做 Project 绑定 Token。 |
| Merge 和 Promote | v0.1 建模跨分支提升草稿，不设计复杂 Git 风格 merge、rebase、conflict 表。 |

## 2. 通用列和命名约定

所有业务表使用 PostgreSQL 原生类型，字段使用 `snake_case`。主键使用 UUID，建议由数据库端 `gen_random_uuid()` 生成。

| 列名 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | `uuid` | 是 | 主键，默认 `gen_random_uuid()`。 |
| `created_at` | `timestamptz` | 是 | 创建时间，默认 `now()`。 |
| `updated_at` | `timestamptz` | 是 | 更新时间，默认 `now()`。 |
| `deleted_at` | `timestamptz` | 否 | 软删除时间。适用于用户、团队、项目、成员、文档、分支、草稿和 Token。不可变版本、Diff 和审计日志默认不软删。 |

唯一约束如果需要忽略软删除记录，使用 partial unique index，例如 `WHERE deleted_at IS NULL`。

## 3. 状态值、类型码和权限值

有限集合字段都使用从 1 开始的整数码，不使用 text enum。共享业务码由 `common/vdoc` 维护，DB 表名和 check 约束常量由 `db/pgdb/vdoc/constants.go` 维护。

| 对象 | 字段 | 类型 | Code map |
|---|---|---|---|
| `users` | `status` | `smallint` | 1 active、2 disabled |
| `projects` | `status` | `smallint` | 1 active、2 archived |
| `project_members` | `role` | `smallint` | 1 reader、2 writer、3 admin |
| `project_members` | `status` | `smallint` | 1 active、2 disabled |
| `documents` | `document_type` | `smallint` | 1 openapi、2 markdown |
| `documents` | `status` | `smallint` | 1 active、2 archived |
| `document_branches` | `kind` | `smallint` | 1 environment、2 feature |
| `document_branches` | `status` | `smallint` | 1 active、2 archived |
| `document_drafts` | `status` | `smallint` | 1 draft、2 submitted、3 changes_requested、4 rejected、5 published |
| `document_versions` | `status` | `smallint` | 1 published |
| `document_drafts`、`document_versions` | `document_format` | `smallint` | 1 openapi-3.0、2 openapi-3.1、3 markdown |
| `document_drafts`、`document_versions` | `source_type` | `smallint` | 1 web_upload、2 mcp_upload、3 promote、4 web_edit |
| `document_version_diffs` | `diff_status` | `smallint` | 1 pending、2 running、3 succeeded、4 failed |
| `document_diff_items` | `severity` | `smallint` | 1 info、2 warning、3 breaking |
| `document_shares` | `version_scope` | `smallint` | 1 latest、2 all_versions |
| `document_shares` | `status` | `smallint` | 1 active、2 revoked；expired 为运行时有效状态 |
| `audit_logs` | `actor_type` | `smallint` | 1 user、2 mcp_token、3 system、4 anonymous |

## 4. 表清单

| 表 | 说明 |
|---|---|
| `schema_migrations` | 已应用 migration 记录。 |
| `users` | 用户账户。 |
| `teams` | 团队。 |
| `projects` | Project 协作边界。 |
| `project_members` | Project 成员和角色。 |
| `documents` | Project 下的文档元数据。字段包括 `name`、`document_type`、`relative_path`、`description`、`status`、`created_by`。不存储路径之外的第二套名称身份。 |
| `document_branches` | 文档环境/功能分支。 |
| `document_drafts` | 待审核文档草稿，快照 `relative_path` 以保证审计可追溯。 |
| `document_versions` | 已发布不可变版本，快照 `relative_path` 以保证历史稳定。 |
| `api_endpoints` | OpenAPI 文档版本解析出的 Endpoint 索引。 |
| `api_endpoint_details` | Endpoint 参数、请求体、响应、安全和规范化 operation JSON。 |
| `document_version_diffs` | 文档版本 Diff 摘要和大对象引用。 |
| `document_diff_items` | 机器可读 Diff 条目。 |
| `ai_providers` | 系统级和项目级 OpenAI-compatible Provider 配置。保存加密后的 API Key、`api_key_last4`、`api_mode`、`temperature`、`timeout_ms`、`max_output_tokens` 和启用状态。 |
| `ai_prompt_overrides` | 系统级和项目级 AI Prompt 覆盖。 |
| `ai_summaries` | Draft、Version、Diff 的 AI 总结记录。状态使用 `pending`、`skipped`、`succeeded`、`failed`，失败摘要存 `error_message`；生成 token 防止旧请求乱序回写。 |
| `ai_chat_sessions` / `ai_chat_messages` | 页面级 AI Chat 会话和消息，关联 draft、version 或 diff 上下文；会话生成 token 在多实例下提供 latest-request-wins 顺序。 |
| `mcp_tokens` | MCP Token 哈希、密文和状态。 |
| `document_shares` | 文档公开分享能力。保存 Project / Document / Branch、版本范围、到期/撤销信息、secret hash、加密 ciphertext 和可选 bcrypt password verifier；不保存明文 secret、完整 URL 或密码。 |
| `audit_logs` | 审计日志。 |
| `vdoc_schema_objects` | RustFS/S3 对象引用表，记录 raw、normalized、stable 和 diff snapshot 的对象 key/hash/元数据。 |

## 5. 关键约束

| 约束 | 说明 |
|---|---|
| `documents_project_name_active_uidx` | 同一 Project 下 active 文档名称唯一。 |
| `documents_project_relative_path_active_uidx` | 同一 Project 下 active 文档 `relative_path` 唯一。 |
| `document_branches_document_name_uidx` | 同一文档下分支名唯一。 |
| `document_branches_default_uidx` | 同一文档只允许一个 active 默认分支。 |
| `document_drafts_active_version_uidx` | 同一文档、分支、版本名只允许一个 active 草稿。 |
| `document_versions_document_branch_version_name_uidx` | 同一文档、分支、版本名唯一。 |
| `document_versions_document_branch_version_no_uidx` | 同一文档、分支、版本序号唯一。 |
| `api_endpoints_version_method_path_uidx` | 同一文档版本下 method + path 唯一。 |
| `document_version_diffs_versions_uidx` | 同一 from/to 版本组合只生成一条 Diff 摘要。 |
| `document_diff_items_breaking_consistency_check` | breaking severity 必须对应 `is_breaking = true`。 |
| `ai_providers_scope_project_check` | system Provider 不带 `project_id`，project Provider 必须带 `project_id`。 |
| `ai_providers_system_uidx` | 系统级 Provider 只能有一条。 |
| `ai_providers_project_uidx` | 每个 Project 只能有一条项目级 Provider 覆盖。 |
| `ai_summaries_owner_uidx` | 同一 Project、Document、owner_type、owner_id 只保存一条当前 AI 总结。 |
| `document_shares_token_hash_uidx` | 分享能力摘要全局唯一。 |
| `document_shares_scope_check` | `version_scope` 只能是 latest 或 all_versions。 |
| `document_shares_revocation_check` | active/revoked 状态与 `revoked_by`、`revoked_at` 必须一致。 |

## 6. 对象快照字段

`document_drafts` 和 `document_versions` 均保存：

| 字段 | 说明 |
|---|---|
| `raw_schema_object_key`、`raw_schema_hash` | 原始上传内容快照。Markdown 使用原始 Markdown 文本。 |
| `normalized_schema_object_key`、`normalized_schema_hash` | OpenAPI 规范化内容；Markdown 可与 raw 或 stable 策略保持一致。 |
| `stable_schema_object_key`、`stable_schema_hash` | 审核/发布稳定快照，供后续纯文档 diff 或 canonical 内容查询使用。 |
| `source_git_commit_id` | 草稿或版本来源 Git commit，可为空。 |
| `relative_path` | 文档路径快照，保证文档后续重命名后历史记录仍可审计。 |

## 7. Endpoint 与 Diff 关系

`api_endpoints.document_version_id` 指向 `document_versions.id`，`api_endpoints.document_id` 指向 `documents.id`。Endpoint 表只对 OpenAPI 文档版本有数据，Markdown 文档版本不写 Endpoint 索引。

`document_version_diffs` 使用 `from_version_id`、`to_version_id` 指向 `document_versions.id`。OpenAPI Diff 可填充 Endpoint 级语义条目；Markdown Diff 的 `diff_summary_json` 保存 `document_format`、`added_lines`、`removed_lines`、`modified_lines` 和 `modified_blocks`，Endpoint 统计保持为零。

## 8. 文档公开分享

`document_shares` 只引用已经存在的 Project、Document 和 Branch。创建时业务层要求分支至少有一个 published version，但不把草稿或具体 version secret 化。`latest` 在读取时解析当前最新发布版本；`all_versions` 查询同一 Branch 的 published 历史。

`token_hash` 用于匿名请求快速校验，`token_ciphertext + cipher_kid` 仅用于管理员重新显示 active 链接。`password_verifier` 是 bcrypt 单向校验结果。公开响应和审计不得包含上述密文/摘要之外的明文 secret、完整链接或密码。匿名 view/download audit 使用 `actor_type = 4`。

## 9. AI Provider、Summary 和审计

`ai_providers` 保存系统级和项目级 Provider。项目级 Provider 覆盖同 Project 的系统默认 Provider；如果项目级 Provider 不存在或未启用，运行时回退到系统 Provider。

| 字段 | 类型 | 默认值和范围 | 说明 |
|---|---|---|---|
| `temperature` | `double precision` | 默认 `0.2`，范围 `0` 到 `2` | 发送给 Chat Completions 或 Responses Provider 的采样温度。 |
| `timeout_ms` | `integer` | 默认 `30000`，范围 `1000` 到 `120000` | Provider HTTP 调用超时时间，单位毫秒。 |
| `max_output_tokens` | `integer` | 默认 `1000`，范围 `1` 到 `32000` | Provider 最大输出 token 数。 |
| `api_key_ciphertext`、`cipher_kid`、`api_key_last4` | `bytea` / `text` | 必填 / 可空 | API Key 只加密保存和显示末四位，明文不写入响应或审计。 |

`ai_summaries` 以 `owner_type` 和 `owner_id` 绑定 draft、version 或 diff。提交 Draft 后自动尝试生成 draft summary，审计 trigger 记录为 `draft_submit`。Approve 发布 Version 后自动尝试生成 version summary，审计 trigger 记录为 `version_publish`。自动总结在状态变更保存后执行，AI 失败不会回滚 submit 或 publish。

`ai_summaries.status` 使用 `pending`、`skipped`、`succeeded`、`failed`。开始调用 Provider 时写入 `pending` 和内部 `generation_token`；Provider 未配置或 Prompt 被禁用时写入 `skipped`；Provider 调用失败时写入 `failed`；成功时写入 `succeeded` 和总结内容。完成写入必须匹配当前 token，且重新校验权限、目标上下文、Provider 和 Prompt；`error_message` 只保存非敏感失败摘要。

AI summary、Provider test 和 Chat 调用写入 `audit_logs.metadata`。当 Provider 返回 token usage 时，metadata 保存 `prompt_tokens`、`completion_tokens`、`total_tokens`。API Key、JWT、MCP Token 和 Authorization header 不写入审计 metadata。
