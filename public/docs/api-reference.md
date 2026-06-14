# API 参考

本页给脚本、Admin 调试和 Agent 集成使用。它不是完整 OpenAPI 文件，完整接口定义请从后端读取 `/api/v1/open/docs/openapi.yaml`。

## 本页目标

- 说明 Vdoc REST 和 MCP 的基础路径。
- 给出注册、私有身份验证、Draft 发布链路和 MCP `tools/list` 的安全示例。
- 强调 Vdoc response envelope 和 raw `Authorization` header 规则。

## 适用场景

- 你要用 `curl` 或脚本排查 Admin 调用。
- 你要给 Agent integrator 解释 MCP endpoint 和 token 用法。
- 你要确认某个 route 属于 public、private 还是 MCP。

## 基础路径

| Surface          | Base                             |
| ---------------- | -------------------------------- |
| Public REST      | `/api/v1/open`                   |
| Private REST     | `/api/v1/private`                |
| OpenAPI document | `/api/v1/open/docs/openapi.yaml` |
| MCP JSON-RPC     | `/api/v1/open/mcp`               |

健康检查：

```sh
curl http://127.0.0.1:8080/api/v1/open/health
```

读取 OpenAPI 文件：

```sh
curl http://127.0.0.1:8080/api/v1/open/docs/openapi.yaml
```

## 鉴权规则

Public auth 从 register 或 login 开始。Private REST 调用使用 Vdoc envelope 返回的 JWT。MCP 调用使用通过 private REST 或 Admin UI 创建的 MCP Token。

关键规则：`Authorization` header 放原始 JWT 或 MCP Token，不加 `Bearer` 前缀。不要把 header 值写进文档、日志、截图或仓库。

## 注册并保存 JWT

下面示例使用占位密码和测试邮箱，不要用真实用户密码。

```sh
API_BASE="${API_BASE:-http://127.0.0.1:8080}"
PASSWORD="sample-password-change-me"

REGISTER_RESPONSE=$(curl -sS "$API_BASE/api/v1/open/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"email":"docs-admin@example.test","name":"Docs Admin","password":"sample-password-change-me"}')

ADMIN_USER_ID=$(printf '%s' "$REGISTER_RESPONSE" | jq -r '.detail.user.id')
JWT=$(printf '%s' "$REGISTER_RESPONSE" | jq -r '.detail.token')
```

验证 private identity：

```sh
curl -sS "$API_BASE/api/v1/private/identity/me" \
  -H "Authorization: $JWT"
```

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

## 角色和文档类型

- Project Reader 可以查询。
- Project Writer 可以上传 Draft 并提交。
- Project Admin 可以 approve、request changes 或 reject。
- SuperAdmin 可以做系统级管理。
- `document_type=1` 表示 OpenAPI，`document_type=2` 表示 Markdown。
- `relative_path` 是稳定身份，显示名称可以改，但路径身份不要随意改。

## 创建 Team、Project 和 Document

```sh
TEAM_RESPONSE=$(curl -sS "$API_BASE/api/v1/private/teams" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $JWT" \
  -d '{"name":"Docs Team","description":"API docs smoke team"}')
TEAM_ID=$(printf '%s' "$TEAM_RESPONSE" | jq -r '.detail.id')

PROJECT_RESPONSE=$(curl -sS "$API_BASE/api/v1/private/projects" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $JWT" \
  -d "{\"team_id\":\"$TEAM_ID\",\"name\":\"Docs Project\",\"description\":\"API docs smoke project\",\"admin_user_id\":\"$ADMIN_USER_ID\"}")
PROJECT_ID=$(printf '%s' "$PROJECT_RESPONSE" | jq -r '.detail.id')

DOCUMENT_RESPONSE=$(curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $JWT" \
  -d '{"name":"petstore","document_type":1,"relative_path":"apis/petstore.yaml","description":"Docs sample document"}')
DOCUMENT_ID=$(printf '%s' "$DOCUMENT_RESPONSE" | jq -r '.detail.id')
```

Document 创建后会生成 `dev`、`test` 和受保护的 `prod` branches。取 `dev` branch：

```sh
BRANCH_ID=$(curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/branches" \
  -H "Authorization: $JWT" | jq -r '.detail[] | select(.name=="dev") | .id')
```

## Draft、Review 和 Version

OpenAPI Draft 可以提交 OpenAPI 3.0 或 3.1 内容为 `schema_content`。Markdown Draft 使用相同 private REST draft routes，可提交 Markdown 文本为 `schema_content` 或 `content`。MCP Markdown draft tools 使用 `markdown_content`。`content_kind` 对 OpenAPI 接受 `raw` 或 `normalized`，对 Markdown 接受 `raw` 或 `stable`。

运行下面的 OpenAPI 示例前，先把 `SCHEMA_V1` 设成合法 JSON 字符串，例如用 `jq -Rs . < openapi.yaml` 生成；不要把含 secret 的 schema 样本提交到仓库。

```sh
DRAFT_RESPONSE=$(curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $JWT" \
  -d "{\"branch_id\":\"$BRANCH_ID\",\"version_name\":\"1.0.0\",\"schema_content\":$SCHEMA_V1}")
DRAFT_ID=$(printf '%s' "$DRAFT_RESPONSE" | jq -r '.detail.id')

curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts/$DRAFT_ID/submit" \
  -X POST \
  -H "Authorization: $JWT"

VERSION_RESPONSE=$(curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/drafts/$DRAFT_ID/approve" \
  -X POST \
  -H "Authorization: $JWT")
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
curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/content/raw" \
  -H "Authorization: $JWT"

ENDPOINTS_RESPONSE=$(curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/endpoints?path=/pets" \
  -H "Authorization: $JWT")
ENDPOINT_ID=$(printf '%s' "$ENDPOINTS_RESPONSE" | jq -r '.detail[0].id')

curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/versions/$VERSION_ID/endpoints/$ENDPOINT_ID" \
  -H "Authorization: $JWT"
```

比较两个 version。运行前确认 `VERSION_ONE_ID` 和 `VERSION_TWO_ID` 都来自已发布 Version：

```sh
DIFF_RESPONSE=$(curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/diffs" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $JWT" \
  -d "{\"from_version_id\":\"$VERSION_ONE_ID\",\"to_version_id\":\"$VERSION_TWO_ID\"}")
DIFF_ID=$(printf '%s' "$DIFF_RESPONSE" | jq -r '.detail.id')

curl -sS "$API_BASE/api/v1/private/projects/$PROJECT_ID/documents/$DOCUMENT_ID/diffs/$DIFF_ID/summary" \
  -H "Authorization: $JWT"
```

## MCP Token 和 MCP JSON-RPC

创建 MCP Token。`.detail.token` 是一次性可复制 secret，list、get、revoke 返回会脱敏。

```sh
MCP_TOKEN_RESPONSE=$(curl -sS "$API_BASE/api/v1/private/mcp-tokens" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $JWT" \
  -d '{"name":"docs-agent","scopes":[1,2]}')
MCP_TOKEN=$(printf '%s' "$MCP_TOKEN_RESPONSE" | jq -r '.detail.token')
```

查询 MCP tools：

```sh
curl -sS "$API_BASE/api/v1/open/mcp" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $MCP_TOKEN" \
  -d '{"jsonrpc":"2.0","id":"tools-list","method":"tools/list"}'
```

调用 read tool 示例：

```sh
curl -sS "$API_BASE/api/v1/open/mcp" \
  -H 'Content-Type: application/json' \
  -H "Authorization: $MCP_TOKEN" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":\"endpoint-detail\",\"method\":\"tools/call\",\"params\":{\"name\":\"get_endpoint_detail\",\"arguments\":{\"project_id\":\"$PROJECT_ID\",\"document_id\":\"$DOCUMENT_ID\",\"version_id\":\"$VERSION_ID\",\"endpoint_id\":\"$ENDPOINT_ID\"}}}"
```

v0.1 不通过 MCP 暴露 direct publish tools。Agent 可以创建、更新、查看和提交 Draft，但发布仍由人类 Admin 或 SuperAdmin 审核。

## 接口分类

| Category     | 作用                                                               |
| ------------ | ------------------------------------------------------------------ |
| Open         | Health、register/login、OpenAPI YAML、MCP JSON-RPC。               |
| Identity     | 当前 JWT 用户身份。                                                |
| System Users | SuperAdmin user lifecycle 和 user MCP token oversight。            |
| Teams        | Team lifecycle。                                                   |
| Projects     | Project lifecycle 和 membership。                                  |
| Documents    | Project document lifecycle。                                       |
| Branches     | Document branch lifecycle。                                        |
| Drafts       | Draft creation、update、submission、review、promotion。            |
| Versions     | Published document versions 和 raw、normalized 或 stable content。 |
| Endpoints    | Published versions 中解析出的 endpoint list 和 detail。            |
| Diffs        | Semantic version comparison 和 summaries。                         |
| MCP Tokens   | User MCP token lifecycle。                                         |

## 如何验证

1. `curl $API_BASE/api/v1/open/health` 成功。
2. Register 或 login 返回 envelope，`detail.token` 可用于 `GET /api/v1/private/identity/me`。
3. 创建 Draft、submit、approve 后能读取 Version content。
4. `POST /api/v1/open/mcp` 的 `tools/list` 返回 tool schemas。
5. 不在示例、日志或 Git history 中出现真实 JWT、MCP Token 或 `Authorization` header 值。

## 常见问题

- 只看 HTTP status 会误判，必须看 envelope 的 `code` 和 `status`。
- `Authorization` header 不要加 `Bearer`。
- MCP Token 不要放进 CLI args，应该放 Agent MCP config 的 `env`。
- 如果 Agent 声称已经发布版本，先确认它只是提交 Draft，v0.1 不支持 MCP direct publish。
