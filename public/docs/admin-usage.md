# Admin 使用

Admin 是 Vdoc 的人工工作台。部署完成后，你需要在这里完成登录、Team 和 Project 初始化、Document 和 Draft 创建、人工审核、Version 发布，以及 MCP Token 创建。

## 本页目标

- 完成第一次从登录到发布 Version 的操作。
- 理解 Admin 调用后端时的鉴权规则。
- 创建可供 Agent 使用的 MCP Token。

## 适用场景

- 后端 health 已通过，需要初始化第一个项目。
- 需要人工审核 OpenAPI 或 Markdown Draft。
- 需要让 Agent 查询 Vdoc 中的已审核事实。

## 前置条件

- 后端正在运行，`/api/v1/open/health` 成功。
- Admin 已设置 `VITE_VDOC_API_BASE_URL`，值指向后端 origin，例如 `http://127.0.0.1:8080`。
- 当前用户是 SuperAdmin，或在目标 Project 中拥有 Admin 权限。
- 不要把 `.env`、JWT、MCP Token 或 `Authorization` header 提交到仓库。

## 鉴权规则

Admin 直接调用 Vdoc backend：

- `POST /api/v1/open/auth/register`
- `POST /api/v1/open/auth/login`
- `GET /api/v1/private/identity/me`

Private API 请求把 JWT 原样放进 `Authorization` header，不加 `Bearer` 前缀。Vdoc REST 响应使用 HTTP 200 envelope，业务结果看 `code`、`status`、`message`、`detail`、`total`、`trace_id` 和 `timestamp`。

## 1. 启动或打开 Admin

本地开发：

```sh
cd Vdoc-admin
pnpm install
pnpm dev
```

如果后端地址不同，在 `Vdoc-admin/.env` 中设置：

```sh
VITE_VDOC_API_BASE_URL="http://127.0.0.1:8080"
```

生产或试点发布时，`VITE_VDOC_API_BASE_URL` 必须在 build time 指向已部署后端 origin。

## 2. 登录并确认身份

1. 使用 Admin 登录页注册或登录。
2. 登录后打开 Dashboard。
3. 确认私有身份接口成功：`GET /api/v1/private/identity/me`。
4. 如果接口返回 HTTP 200 但页面仍报错，检查 envelope 中的 `code` 和 `status`。

## 3. 创建 Team 和 Project

1. 创建或选择一个 Team。
2. 在 Team 下创建 Project。
3. 给需要参与的人添加项目成员。
4. Reader 负责查询，Writer 负责上传和提交 Draft，Admin 负责审核。

## 4. 创建 Document 和 Branch

1. 选择 Project。
2. 创建 Document。
3. OpenAPI 文档使用 `document_type=1`，Markdown 文档使用 `document_type=2`。
4. 设置稳定的 `relative_path`，例如 `apis/petstore.yaml` 或 `docs/runbook.md`。
5. Document 创建后会有 `dev`、`test` 和受保护的 `prod` branches。需要隔离开发时再创建 `feature/*` branch。

## 5. 创建并提交 Draft

1. 在目标 Branch 上创建 Draft。
2. OpenAPI Draft 放 OpenAPI 3.0 或 3.1 内容。
3. Markdown Draft 放 Markdown 文本。
4. 提交 Draft 进入 review。
5. 如果审核需要修改，Admin 可以 request changes 或 reject。

## 6. 审核并发布 Version

1. Project Admin 或 SuperAdmin 打开待审核 Draft。
2. 检查 raw、normalized 或 stable content。
3. 对 OpenAPI 文档检查 endpoint 列表、endpoint detail、diff 和 breaking change。
4. 审核通过后 approve，系统生成 published Version。
5. 发布后再到 Version、Markdown viewer、Diff 页面确认内容可读。

## 7. 创建 MCP Token

1. 在 Admin 中打开 MCP Token 相关页面。
2. 创建用户绑定的 MCP Token。
3. 只复制一次 token 到目标 Agent 的 secret-aware config。
4. 不要把 token 放进命令行参数，也不要把 token 写进 README、issue 或终端共享日志。

## 如何验证

- `GET /api/v1/private/identity/me` 在 Admin session 中成功。
- Dashboard 对 SuperAdmin 和 Project Admin 都能加载。
- 至少能创建或查看一个 Project、Document、Draft、Version、Diff 和 MCP Token。
- MCP Token 能被 `@vdoc/mcp` 使用，并且没有出现在 CLI args 中。
- Agent 用 MCP 查询 endpoint 或 Markdown 时，结果来自已发布 Version。

## 常见问题

- `Authorization` header 加了 `Bearer` 会失败，Vdoc 需要原始 JWT。
- Admin build 时忘记设置 `VITE_VDOC_API_BASE_URL`，会导致私有 API 调错后端。
- 只看 HTTP status 会误判，Vdoc 的业务状态在 response envelope 里。
- v0.1 不允许 MCP 直接发布，发布必须经过 Admin 或 SuperAdmin 审核。
