# 变更记录

## v0.3.7

- 将可选工作流 Skill 合并到 `Vdoc-mcp/skills/vdoc`，与 MCP 共用一个包、版本和发布流程。
- 在 Vdoc-mcp 中保留原 Skill 的完整 Git 历史和 `skill/` 历史 tag；新安装及四仓工作区锁不再依赖旧仓库。
- 新增 `vdoc-mcp skill install`，链接随包提供的 Skill；在同一全局安装位置更新包即可同步内容，已有目录不会被覆盖。
- 同步工作台安装入口和官网示例。npm registry 发布仍是独立事项，目前使用已审核 Git commit 或校验后的发行包安装。

本版不新增应用数据库迁移。迁移前保留已有 Skill 的本地修改，完成后重新加载 Agent 并重启 MCP。

本页记录当前 VitePress 文档覆盖的 v0.2 用户可见状态。它不是营销列表，而是评估、部署和试点前需要知道的变化。

## v0.3.6

- 修复迟到的登录或注册响应覆盖新账号的问题；页面离开后取消请求，并按会话版本隔离结果。
- 启用全局限流时，拒绝响应仍携带 CORS 与安全响应头；跨域预检不消耗业务请求额度。
- OpenAPI 必填变化按请求/响应方向处理 `readOnly`、`writeOnly`，覆盖引用、嵌套和 `allOf`；已有差异缓存读取时自动更新。
- 修复退出、切号或重新登录后，旧 AI 摘要任务回调重新写入缓存的问题。

本次不新增数据库迁移，REST/MCP 契约保持兼容。部署继续使用应用 `latest`、PostgreSQL `18`、RustFS `1.0.0` 及双域名反代。升级方法见[升级与回滚](release-rollback.md)。

## v0.3.5

部署文档现在直接展示[接入现有 PostgreSQL 的完整 Compose 示例](deployment.md#external-compose-example)，可复制全部 YAML 和字段注释。中英文页面引用与下载文件相同的源文件，随配置更新同步。

本次为文档补丁，不新增应用功能或数据库迁移；五仓分发版本统一为 v0.3.5。

## v0.3.4

- 修复账号切换时旧身份请求覆盖或清除新会话的问题，并处理路由取消与同一 Token 再次登录。
- 修复 OpenAPI 3.1 草稿预览和正式 Diff 的格式标识；跨方言比较使用目标版本格式，读取时自动修正已有缓存。
- 修复系统主题变化后工作台主题上下文未同步的问题。
- 增加接入现成 PostgreSQL 的独立 Compose 文件，并为两份部署配置补齐字段注释、下载与校验文件。

相对 v0.3.3 不新增数据库迁移，REST/MCP 契约保持兼容。升级方法见[升级与回滚](release-rollback.md)。

## v0.3.3

- 单文件部署改用 Backend/Admin `latest`、PostgreSQL `18` 和 RustFS `1.0.0`；执行 pull/up 更新容器。
- 增加两个域名分别反代前端 8081、后端 8080 的 Caddy 示例和首次使用流程。
- 后端显式支持通配 CORS，默认部署允许所有浏览器来源，仍校验登录、MCP 和分享凭证。
- 稳定发布后维护 `latest` 别名，防止预发布和旧版本补发覆盖新版。

## v0.3.2

- 同步 [go-template/http-services](https://github.com/ChnMig/go-template/tree/main/http-services) 至 `f8ab237`，在后端中英文 README 中标注脚手架来源和同步记录。
- 统一请求日志上下文，补齐标准 context 的追踪 ID 回退；参数重绑失败时清除旧值，继续对密码、令牌和文档正文保持日志脱敏。
- 连接断开和请求中止按取消处理，避免追加错误响应或空成功响应；新增 Base64URL 随机字符串工具与回归测试。
- 五个仓库、镜像、Compose 下载和 Agent 安装引用统一为 v0.3.2。

相对 v0.3.1 不新增数据库迁移，现有 REST/MCP 接口和令牌格式保持兼容。升级流程见[升级与回滚](release-rollback.md)。

## v0.3.1

- 修复 OpenAPI 数字精度、语义差异和 Schema 边界处理，MCP 与工作台保留大整数、高精度小数及版本差异的真实值。
- 优化历史记录分页、端点事实读取、令牌认证和密码哈希的锁持有时间；修复历史选择、草稿冲突和审核快照处理。
- 修复 UTF-8 密码登录与创建用户时的空白校验、键盘跳到正文、外部字体不可用时的回退。
- MCP 取消请求会中止对应的后端 HTTP 连接；补充数字传输、取消、并发权限和浏览器回归。

本版包含数据库迁移 `007_parser_facts_and_history_pages.sql`，新增解析版本字段、历史查询索引和 Diff 的 `must_handle` 字段。升级前备份数据库与对象存储，按[升级与回滚](release-rollback.md)操作。22 项 MCP 工具契约保持兼容。

## v0.3.0

- 通过单个 [docker-compose.yml](deployment.md) 部署和更新，配置与密钥直接写在 YAML 中，无需 `.env` 或安装脚本。
- 从 GHCR 直接拉取通过验证的 Backend/Admin 镜像，支持 Linux amd64 和 arm64。
- 数据库初始化前检查必填配置；后端启动时自动处理数据库迁移、首个管理员和存储桶。
- 补充旧 Compose 压缩包迁移说明，升级时沿用原密钥和数据卷。

本版不新增数据库迁移，MCP API 契约保持 v0.2.0。升级步骤见[升级与回滚](release-rollback.md)。

## v0.2.1

- [部署指南](deployment.md#compose-example)新增完整 Docker Compose 示例，可一次复制四个服务的配置，并说明 `.env`、安装目录和镜像加载步骤。示例直接引用部署包源文件。
- 修复 Admin 小屏幕下 MCP 配置框被截断的问题，长配置可在框内横向滚动。
- 五个仓库、预构建镜像、Compose 下载包及 MCP/Skill 安装引用统一到 v0.2.1。

本次补丁不新增数据库迁移，后端接口和 22 项 MCP 工具契约与 v0.2.0 兼容。升级步骤见[升级与回滚](release-rollback.md)。

## v0.2.0

- MCP 新增 `get_schema_version` 和 `get_doc_version`，读取指定已发布版本全文。
- 最新内容查询必须明确分支；未知参数会报错。升级后请重新加载 MCP 工具清单，并为 `get_latest_schema` / `get_latest_doc` 补上 `branch_id`。
- OpenAPI 草稿读取增加原始正文，与 revision 来自同一快照；原有元数据字段保留。
- Backend/Admin 提供 Linux amd64 和 arm64 预构建 Docker 镜像，安装器校验下载与源码来源；无需先获取五个源码仓库。
- 工作台和首次使用指南提供 Codex / Cursor 配置；官网改善中文搜索、语言切换、正文地标与卡片链接名称。
- 官网统一为 [GitHub Pages](https://chnmig.github.io/Vdoc-site/)，仅正式 Site 标签通过检查后自动上线。

本版不新增数据库迁移。人工审核发布、不可变版本和令牌权限保持原有边界。升级前备份数据库与对象存储，并同步升级五仓发行包。

## 当前文档变化

- 文档阅读路线从“运维手册”调整为“认识 Vdoc、理解运行流程、部署、首次使用、Agent 接入、升级排障”。
- 中文默认入口是 `/`。
- 英文文档使用 `/en/...`，并保持同名主题路由。
- 新增 [运行流程](how-it-works.md)，解释 Admin review、Draft、Version、MCP、Skill 和 Agent 的关系。
- [部署指南](deployment.md) 已按 `scripts/vdoc-local-bootstrap.sh`、root Compose、可选 demo seed、live-compose E2E、release dry-run、直接部署和外部 PostgreSQL/S3 compatible storage 重写。
- [首次使用](admin-usage.md) 已覆盖初始管理员、Project、Document、Draft、Version、MCP Token、MCP adapter 和 Skill 的第一条链路。
- 新增 [Admin AI](admin-ai.md)，记录系统和项目 provider、两种 OpenAI-compatible API 模式、prompt 覆盖、自动摘要、页面对话、审计和人工发布边界。
- [升级与回滚](release-rollback.md) 已覆盖 PostgreSQL/object storage 备份、`docker compose --env-file .env up -d --build`、live E2E、`scripts/vdoc-release-dry-run.sh`、健康验证和回滚。

## 当前产品面

- Backend 提供 public health/auth/docs/MCP routes 和 private Admin routes。
- Backend 在启用 database 时自动运行 migrations，在启用 storage 时会尝试创建缺失 bucket。
- Admin Docker 支持 runtime `VDOC_ADMIN_API_BASE_URL`，用于生成浏览器可用的 backend API base URL。
- `@vdoc/mcp` 是可安装 stdio MCP adapter，负责把 Agent MCP 请求转发到 backend。
- `Vdoc-skill` 是可安装 Agent 工作流包，要求 Agent 使用 Vdoc MCP 查询事实后再给结论。
- 后台 Admin AI 可以辅助解释 Draft、Version 和 Diff，但不替代外部 MCP/Skill Agent、机器 Diff 或人类发布门禁。
- Live E2E 使用 `./scripts/vdoc-e2e.sh live-compose --env-file ../.env`，只重置一次性 `VDOC_TEST_POSTGRES_DB`，默认 `vdoc_e2e`。

## 仍需记住的边界

- MCP 不能直接发布 Version。
- Agent 可以提交 Draft，发布必须由 Admin 或 SuperAdmin 审核。
- 不要把 Compose service name 用在浏览器配置里；浏览器使用 `127.0.0.1` 或域名，容器内部才使用 `postgres`、`rustfs`、`backend` 等服务名。
- 不要把真实 secret 写入文档、日志、截图或 Git history。

## 如何验证文档

1. 打开 `/`，确认默认中文页面加载。
2. 打开 `/en/product-overview`，确认英文页面加载。
3. 点击 [运行流程](how-it-works.md)、[Admin AI](admin-ai.md)、[部署指南](deployment.md)、[MCP 工具](mcp-tools.md) 和 [升级与回滚](release-rollback.md)，确认主题路径连贯。
