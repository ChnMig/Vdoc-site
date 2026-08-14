# API 参考

本页给脚本、Admin 调试和 Agent 集成使用。它不是完整 OpenAPI 文件；完整机器可读定义由 backend 提供：`/api/v1/open/docs/openapi.yaml`。

## 基础路径

| Surface          | Path                             | 鉴权                           |
| ---------------- | -------------------------------- | ------------------------------ |
| Public REST      | `/api/v1/open/*`                 | 具体 route 决定，多数无鉴权。  |
| Private REST     | `/api/v1/private/*`              | Raw JWT 放进 `Authorization`。 |
| OpenAPI document | `/api/v1/open/docs/openapi.yaml` | 无鉴权。                       |
| MCP JSON-RPC     | `/api/v1/open/mcp`               | Raw MCP Token。                |

本机完整 Compose 默认 backend origin 是 `http://127.0.0.1:8080`。部署环境请换成你的 backend 域名。

```sh
API_BASE="${API_BASE:-http://127.0.0.1:8080}"
curl "$API_BASE/api/v1/open/health"
curl "$API_BASE/api/v1/open/docs/openapi.yaml"
```

## 鉴权规则

Public auth 通常从 login 开始。匿名注册默认关闭；只有可信的一次性或试点环境才应设置 `VDOC_AUTH_ALLOW_REGISTRATION=true`。Private REST 使用登录或注册返回的 JWT。MCP 使用 Admin 或 private REST 创建的 MCP Token。

关键规则：`Authorization` header 放原始 JWT 或 MCP Token，不加 `Bearer` 前缀。不要把完整 header 写进文档、日志、截图或仓库。shell 环境变量不是 package CLI argument，不要把凭据放进 package 或进程 `args`。运行前用 `set +x` 关闭 xtrace，并用 stdin config 把 header 交给 `curl`，避免原始值进入 `curl` 的进程参数。

## 响应 envelope

REST handler 对成功和业务错误都可能返回 HTTP 200，语义结果在 JSON body 中。

| 字段        | 含义                                                                                                       |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| `code`      | 语义状态码，例如 `200`、`400`、`401`、`403`、`404`、`409`、`500`。                                         |
| `status`    | 语义状态，例如 `OK`、`INVALID_ARGUMENT`、`UNAUTHENTICATED`、`PERMISSION_DENIED`、`NOT_FOUND`、`INTERNAL`。 |
| `message`   | 面向调用者的提示。                                                                                         |
| `detail`    | 成功结果或错误详情。                                                                                       |
| `total`     | 列表接口的可选总数。                                                                                       |
| `trace_id`  | 排查请求时使用的 trace 标识。                                                                              |
| `timestamp` | 响应时间。                                                                                                 |

## 注册或登录

下面示例只用于本地 smoke。不要使用真实用户密码。

```sh
PASSWORD="sample-password-change-me"

# backend 必须已显式设置 VDOC_AUTH_ALLOW_REGISTRATION=true。
REGISTER_RESPONSE=$(curl -sS "$API_BASE/api/v1/open/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"docs-admin@example.test","name":"Docs Admin","password":"sample-password-change-me"}')

ADMIN_USER_ID=$(printf '%s' "$REGISTER_RESPONSE" | jq -r '.detail.user.id')
JWT=$(printf '%s' "$REGISTER_RESPONSE" | jq -r '.detail.token')

set +x
curl_with_jwt() {
  printf 'header = "Authorization: %s"\n' "$JWT" |
    curl --config - "$@"
}
```

验证 private identity：

```sh
curl_with_jwt -sS "$API_BASE/api/v1/private/identity/me"
```

## 角色和文档类型

- SuperAdmin 可以做系统级管理和审核。
- Project Reader 可以查询。
- Project Writer 可以上传 Draft 并提交。
- Project Admin 可以 approve、request changes 或 reject。
- `document_type=1` 表示 OpenAPI。
- `document_type=2` 表示 Markdown。
- `relative_path` 是 Document 的稳定身份，显示名称变化不应改变它。

## 创建 Team、Project 和 Document

```sh
TEAM_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/teams" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Docs Team","description":"API docs smoke team"}')
TEAM_ID=$(printf '%s' "$TEAM_RESPONSE" | jq -r '.detail.id')

PROJECT_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects" \
  -H 'Content-Type: application/json' \
  -d "{\"team_id\":\"$TEAM_ID\",\"name\":\"Docs Project\",\"description\":\"API docs smoke project\",\"admin_user_id\":\"$ADMIN_USER_ID\"}")
PROJECT_ID=$(printf '%s' "$PROJECT_RESPONSE" | jq -r '.detail.id')

DOCUMENT_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents" \
  -H 'Content-Type: application/json' \
  -d '{"name":"petstore","document_type":1,"relative_path":"apis/petstore.yaml","description":"Docs sample document"}')
DOCUMENT_ID=$(printf '%s' "$DOCUMENT_RESPONSE" | jq -r '.detail.id')
```

Document 创建后会生成 `dev`、`test` 和受保护的 `prod` branches。取 `dev` branch：

```sh
BRANCH_ID=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/branches" |
  jq -r '.detail[] | select(.name=="dev") | .id')
```

## Draft、Review 和 Version

OpenAPI Draft 可以提交 OpenAPI 3.0 或 3.1 内容为 `schema_content`。Markdown Draft 使用相同 private REST draft routes，可提交 Markdown 文本为 `schema_content` 或 `content`。MCP Markdown draft tools 使用 `markdown_content`。`content_kind` 对 OpenAPI 接受 `raw` 或 `normalized`，对 Markdown 接受 `raw` 或 `stable`。

运行下面的 OpenAPI 示例前，先把 `SCHEMA_V1` 设成合法 JSON 字符串，例如用 `jq -Rs . < openapi.yaml` 生成。

```sh
DRAFT_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts" \
  -H 'Content-Type: application/json' \
  -d "{\"branch_id\":\"$BRANCH_ID\",\"version_name\":\"1.0.0\",\"schema_content\":$SCHEMA_V1}")
DRAFT_ID=$(printf '%s' "$DRAFT_RESPONSE" | jq -r '.detail.id')

curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts/$DRAFT_ID/submit" \
  -X POST

VERSION_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts/$DRAFT_ID/approve" \
  -X POST)
VERSION_ID=$(printf '%s' "$VERSION_RESPONSE" | jq -r '.detail.id')
```

其他审核动作：

```text
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/request-changes
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/reject
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/promote
```

## 查询 Version、Endpoint 和 Diff

```sh
curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/content/raw"

ENDPOINTS_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/endpoints?path=/pets")
ENDPOINT_ID=$(printf '%s' "$ENDPOINTS_RESPONSE" | jq -r '.detail[0].id')

curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/endpoints/$ENDPOINT_ID"
```

比较两个已发布 Version：

```sh
DIFF_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/diffs" \
  -H 'Content-Type: application/json' \
  -d "{\"from_version_id\":\"$VERSION_ONE_ID\",\"to_version_id\":\"$VERSION_TWO_ID\"}")
DIFF_ID=$(printf '%s' "$DIFF_RESPONSE" | jq -r '.detail.id')

curl_with_jwt -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/diffs/$DIFF_ID/summary"
```

## MCP Token 和 MCP JSON-RPC

创建 MCP Token。`.detail.token` 可复制；所属用户可以通过详情接口再次查看 active Token。列表、已撤销和已过期响应会脱敏。

```sh
MCP_TOKEN_RESPONSE=$(curl_with_jwt -sS "$API_BASE/api/v1/private/mcp-tokens" \
  -H 'Content-Type: application/json' \
  -d '{"name":"docs-agent","scopes":[1,2]}')
MCP_TOKEN=$(printf '%s' "$MCP_TOKEN_RESPONSE" | jq -r '.detail.token')

curl_with_mcp_token() {
  printf 'header = "Authorization: %s"\n' "$MCP_TOKEN" |
    curl --config - "$@"
}
```

查询 MCP tools：

```sh
curl_with_mcp_token -sS "$API_BASE/api/v1/open/mcp" \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":"tools-list","method":"tools/list"}'
```

调用 read tool 示例：

```sh
curl_with_mcp_token -sS "$API_BASE/api/v1/open/mcp" \
  -H 'Content-Type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":\"endpoint-detail\",\"method\":\"tools/call\",\"params\":{\"name\":\"get_endpoint_detail\",\"arguments\":{\"project_id\":\"$PROJECT_ID\",\"document_id\":\"$DOCUMENT_ID\",\"version_id\":\"$VERSION_ID\",\"endpoint_id\":\"$ENDPOINT_ID\"}}}"
```

v0.1 不通过 MCP 暴露 direct publish tools。Agent 可以创建、更新、查看和提交 Draft，但发布仍由 Admin 或 SuperAdmin 审核。

## Admin AI 路由

[Admin AI](admin-ai) 使用 private JWT API。Provider 和 prompt 配置与外部 MCP/Skill Agent 分离，AI 结果不能替代机器 Diff 或人工审核。

系统 Provider/Prompt 的读取、更新和测试仅限 SuperAdmin；项目 Provider/Prompt 的读取、更新和测试仅限对应 Project Admin 或 SuperAdmin。Reader 和 Writer 不能读取这些配置，但仍可在文档权限允许时使用摘要和页面 Chat。项目 Provider 测试省略 body 时会测试有效配置；若无启用的项目覆盖，则测试系统回退 Provider。

```text
GET  /api/v1/private/ai/provider
PUT  /api/v1/private/ai/provider
POST /api/v1/private/ai/provider/test
GET  /api/v1/private/projects/{project_id}/ai/provider
PUT  /api/v1/private/projects/{project_id}/ai/provider
POST /api/v1/private/projects/{project_id}/ai/provider/test
GET  /api/v1/private/ai/prompts
PUT  /api/v1/private/ai/prompts/{prompt_key}
GET  /api/v1/private/projects/{project_id}/ai/prompts
PUT  /api/v1/private/projects/{project_id}/ai/prompts/{prompt_key}
GET  /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/ai-summary
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/ai-summary/regenerate
GET  /api/v1/private/projects/{project_id}/documents/{document_id}/versions/{version_id}/ai-summary
POST /api/v1/private/projects/{project_id}/documents/{document_id}/versions/{version_id}/ai-summary/regenerate
GET  /api/v1/private/projects/{project_id}/documents/{document_id}/diffs/{diff_id}/ai-summary
POST /api/v1/private/projects/{project_id}/documents/{document_id}/diffs/{diff_id}/ai-summary/regenerate
GET  /api/v1/private/projects/{project_id}/ai/chat-sessions?document_id={document_id}&context_type={draft|version|diff}&context_id={context_id}
POST /api/v1/private/projects/{project_id}/ai/chat-sessions
GET  /api/v1/private/projects/{project_id}/ai/chat-sessions/{session_id}
POST /api/v1/private/projects/{project_id}/ai/chat-sessions/{session_id}/messages
```

Provider payload 包含 `name`、`base_url`、`model`、`api_mode`、`api_key`、`enabled`、`temperature`、`timeout_ms` 和 `max_output_tokens`。读取响应只暴露 `api_key_set` 和 `api_key_last4`。Prompt 更新 body 只包含 `system_prompt`、`user_prompt_template` 和 `enabled`；所有 user template 必须包含 `{{context}}`，`page_chat` 还必须包含 `{{message}}`。系统和项目 provider 都有 test route，Draft、Version 和 Diff 都支持摘要读取和手动重新生成，chat session 固定在当前页面资源上下文并可通过集合 GET 恢复历史。Project 归档后仅 Project Admin/SuperAdmin 可只读查看 Provider/Prompt 历史配置；历史摘要和 Chat 仍可读，但禁止重新生成、创建会话或发送消息。

## 文档公开分享

Project Admin 或 SuperAdmin 可在 Documents 页面为已有发布版本的 Branch 创建、重新显示和撤销公开链接。链接 secret 只放在 URL fragment；匿名页面在网络请求前从地址和浏览历史中移除 fragment，且不附带账号 Cookie 或 JWT。

Admin 默认选择三个月有效期，也可选择一个月、六个月、一年或永久。可选密码必须为 12–72 个 UTF-8 字节，且首尾不能包含 Unicode 空白字符；中文等多字节字符按编码后的字节数计算。

```text
GET, POST /api/v1/private/projects/{project_id}/documents/{document_id}/shares
POST      /api/v1/private/projects/{project_id}/documents/{document_id}/shares/{share_id}/reveal
POST      /api/v1/private/projects/{project_id}/documents/{document_id}/shares/{share_id}/revoke
GET       /api/v1/open/document-shares/{share_id}
POST      /api/v1/open/document-shares/{share_id}/unlock
GET       /api/v1/open/document-shares/{share_id}/versions
GET       /api/v1/open/document-shares/{share_id}/versions/{version_id}/content
GET       /api/v1/open/document-shares/{share_id}/versions/{version_id}/download
```

公开请求使用 `Authorization: VdocShare {secret}`。密码保护链接先通过 `/unlock` 获取 15 分钟、绑定当前 share 的 proof，再用 `X-Vdoc-Share-Unlock` 访问。撤销、过期、proof 错误或上级资源停用统一返回 unavailable。Markdown 禁 raw HTML、远程图片和危险链接；OpenAPI 只显示转义文本；下载始终经过后端授权。

## 接口分类

| Category        | 作用                                                               |
| --------------- | ------------------------------------------------------------------ |
| Open            | Health、login、显式开启的 register、OpenAPI YAML、MCP JSON-RPC。   |
| Identity        | 当前 JWT 用户身份。                                                |
| System Users    | SuperAdmin user lifecycle 和 user MCP token oversight。            |
| Teams           | Team lifecycle。                                                   |
| Projects        | Project lifecycle 和 membership。                                  |
| Documents       | Project document lifecycle。                                       |
| Branches        | Document branch lifecycle。                                        |
| Drafts          | Draft creation、update、submission、review、promotion。            |
| Versions        | Published document versions 和 raw、normalized 或 stable content。 |
| Endpoints       | Published versions 中解析出的 endpoint list 和 detail。            |
| Diffs           | Semantic version comparison 和 summaries。                         |
| AI              | Provider、prompt、Draft/Version/Diff AI summary 和 page chat。     |
| MCP Tokens      | User MCP token lifecycle。                                         |
| Document Shares | 管理员公开链接管理和匿名已发布内容读取。                           |

## 如何验证

1. `curl $API_BASE/api/v1/open/health` 成功。
2. Register 或 login 返回 envelope，`detail.token` 可用于 `GET /api/v1/private/identity/me`。
3. 创建 Draft、submit、approve 后能读取 Version content。
4. `POST /api/v1/open/mcp` 的 `tools/list` 返回 tool schemas。
5. 示例、日志或 Git history 中没有真实 JWT、MCP Token 或 `Authorization` header 值。

## 常见问题

- 只看 HTTP status 会误判，必须看 envelope 的 `code` 和 `status`。
- `Authorization` header 不要加 `Bearer`。
- MCP Token 不要放进 CLI args，应该放 Agent MCP config 的 `env`。
- 如果 Agent 声称已经发布版本，先确认它只是提交 Draft，v0.1 不支持 MCP direct publish。
