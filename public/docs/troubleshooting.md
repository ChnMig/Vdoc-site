# 故障排查

本页按组件列出最常见的失败点。先定位失败发生在 backend、database、storage、Admin、MCP、Skill 还是 Docsify，再执行对应检查。

## 本页目标

- 用最短路径找到部署到使用链路中的断点。
- 给出可复制的检查命令和配置项。
- 避免用真实 secret 排查问题时造成二次泄露。

## 适用场景

- Backend health 失败。
- Admin 登录后 private API 失败。
- MCP adapter 启动失败或 Agent 看不到 tools。
- Skill 安装后 Agent 仍然猜接口。
- Docsify 页面或复制按钮不工作。

## 排查前准备

- 记录失败的命令、URL、页面操作或 Agent action。
- 记录 response envelope 的 `code`、`status`、`message` 和 `trace_id`。
- 记录 stderr，但先遮盖 token、JWT、database password、storage secret 和 `Authorization` header。
- 不要把 `.env`、`.env.compose` 或完整 header 发给别人。

## 后端 health 失败

如果使用仓库内 Compose 依赖栈，先确认依赖容器状态：

```sh
cd Vdoc
docker compose --env-file .env.compose ps
```

再检查：

- `.env.compose` 是否包含 `VDOC_DOCKER_POSTGRES_PASSWORD`、`VDOC_DOCKER_RUSTFS_ACCESS_KEY`、`VDOC_DOCKER_RUSTFS_SECRET_KEY`。如果使用外部依赖，可以跳过 Compose 专用变量。
- `Vdoc/.env` 是否设置了 `VDOC_DATABASE_ENABLED=true` 和指向目标 PostgreSQL 的 `VDOC_DATABASE_DSN`。
- `Vdoc/.env` 是否设置了 `VDOC_STORAGE_ENABLED=true` 和指向目标 S3-compatible storage 的 storage variables。
- 后端启动日志中是否有 database 或 storage 初始化失败。
- 健康路径是否正确：`/api/v1/open/health`。

## 数据库连接失败

- 先确认你是哪种部署模式：宿主机后端连接仓库内 Compose、本套 Compose app service 连接 service name，还是连接外部 PostgreSQL。
- 宿主机后端连接仓库内 Compose 时，`VDOC_DATABASE_DSN` 的 host/port 应匹配 `docker-compose.yml` 暴露到宿主机的 PostgreSQL host/port。
- 同一套 Compose app service 连接数据库时，`VDOC_DATABASE_DSN` 的 host 通常应是 Compose service name，例如 `postgres`，不是 `127.0.0.1`。
- 外部 PostgreSQL 连接失败时，检查网络策略、SSL mode、账号权限、database name 和 provider 给出的 host/port。
- 如果使用仓库内 Compose，`VDOC_DATABASE_DSN` 中的 password 应与 `VDOC_DOCKER_POSTGRES_PASSWORD` 一致。
- 如果 password 包含 URI 保留字符，必须 percent-encode 后再放入 DSN。
- 不要对非一次性环境执行 `docker compose down -v`，它会删除本地数据。

## RustFS 或对象存储失败

- 先确认你连接的是仓库内 RustFS、同一套 Compose 的对象存储 service，还是外部 S3-compatible storage。
- 宿主机后端连接仓库内 RustFS 时，`VDOC_STORAGE_ENDPOINT` 应匹配 `docker-compose.yml` 暴露到宿主机的 S3 API host/port。
- 同一套 Compose app service 连接 RustFS 时，endpoint 通常使用 service name 和 container port，例如 `rustfs:9000`。
- 外部对象存储连接失败时，检查 endpoint、bucket、region/provider policy、SSL、path-style/virtual-hosted-style 和 credential 权限。
- 如果使用仓库内 RustFS，`.env.compose` 中的 RustFS access key 和 secret key 要与后端 `.env` 中的 `VDOC_STORAGE_ACCESS_KEY`、`VDOC_STORAGE_SECRET_KEY` 一致。
- 本地 RustFS 通常不使用 SSL，并且常需要 `VDOC_STORAGE_PATH_STYLE=true`；外部对象存储按供应商要求配置。

## Admin 登录或 private API 失败

- 确认 Admin build 或 dev env 中有 `VITE_VDOC_API_BASE_URL`。
- 确认该值指向目标后端 origin；本地开发可以是本机地址，部署环境应是已发布后端域名。
- Private request 的 `Authorization` header 必须是 raw JWT，不加 `Bearer`。
- 不要只看 HTTP status，检查 envelope 的 `code` 和 `status`。
- 登录后确认 `GET /api/v1/private/identity/me` 成功。

## Draft 或 Version 流程失败

- 确认当前用户是 Project Writer、Project Admin 或 SuperAdmin 中符合动作要求的角色。
- 创建 Document 时确认 `document_type=1` 表示 OpenAPI，`document_type=2` 表示 Markdown。
- 查询 Document 身份时使用 `relative_path`，不要依赖显示名称。
- OpenAPI content 应为 OpenAPI 3.0 或 3.1。
- 发布必须走 approve，v0.1 不支持 MCP direct publish。

## MCP adapter 启动失败

- Agent MCP config 中必须设置 `VDOC_MCP_TOKEN`。
- 设置 `VDOC_BASE_URL` 或 `VDOC_MCP_URL`，二者有一个即可。
- 如果使用 `VDOC_BASE_URL`，adapter 会追加 `/api/v1/open/mcp`。
- 不要把 token 放进 `args`，应放在 `env`。
- stdout 是 MCP protocol 专用通道，普通诊断看 stderr。
- 从 Agent 所在机器确认后端 `/api/v1/open/mcp` 可达。

## MCP tools/list 失败

- 确认 MCP Token 未被撤销。
- 确认 header 使用原始 token，无 `Bearer` 前缀。
- 确认后端 health 成功。
- 确认 Agent runtime 读取的是最新 MCP config。
- 重新在 Admin 中创建 token 时，只复制一次 `.detail.token`，之后列表和详情返回会脱敏。

## Skill 工作流被忽略

- 确认 `SKILL.md` 位于安装后的 `vdoc` skill root。
- 确认 Agent runtime 已加载该 Skill。
- 确认 Vdoc MCP server 在 Agent 中可用。
- 给 Agent 明确任务，例如“先查询 `get_endpoint_detail`，再说明请求字段”。
- 如果 Agent 仍然猜测 endpoint fields、response properties、enum values 或 Markdown text，重新加载 Skill 并要求它引用 Vdoc MCP 结果。

## Docsify 页面或复制按钮失败

- 打开 `/docs/index.html`，不要用 React router 处理 `/docs` 或 `/docs/`。
- 子页面应使用 hash route，例如 `/docs/index.html#/deployment`。
- `_sidebar.md` 和 `_navbar.md` 必须位于 `public/docs/`。
- 复制按钮只读取当前 Markdown 文件，例如 `deployment.md`，不会复制全部文档。
- 如果显示 `复制失败 deployment.md`，检查浏览器剪贴板权限和 network 请求。

## 发布后回滚判断

- 如果 backend health 失败，先把流量切回上一版 backend，再查依赖。
- 如果 Admin 页面失败但 backend health 正常，优先回滚 Admin `dist/`。
- 如果 Docsify 文档链接坏了，优先回滚 site `dist/` 或修正文档 hash link。
- 如果 Agent 无法列出 tools，先确认 MCP config 和 token，再考虑回滚 MCP package。
- 如果 Agent 行为不遵守 Vdoc facts，回滚或修正 Skill package。

## 升级到人工排查前的清单

1. 记录精确命令、route、页面操作或 Agent action。
2. 记录 response envelope 或 stderr，并遮盖 secret。
3. 确认变量名拼写完全一致，例如 `VDOC_MCP_TOKEN_CIPHER_KID` 和 `VITE_VDOC_API_BASE_URL`。
4. 用最小命令复现一次，例如 health、identity、`tools/list`。
5. 如果影响发布，先让用户停留在上一版 artifact，直到失败原因明确。

## 常见问题

- “HTTP 200 但失败”通常是 envelope 中 `code` 不是 `200`。
- “Admin 能登录但接口失败”通常是 `VITE_VDOC_API_BASE_URL` 或 raw `Authorization` header 问题。
- “MCP 没日志”不一定是失败，stdout 留给 protocol，stderr 才是诊断。
- “Agent 直接给结论”通常是 Skill 没加载，或任务没有要求它先查 Vdoc MCP。
