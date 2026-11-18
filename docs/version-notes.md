# 版本说明

## v0.4.7-beta.1

后台布局、图标间距和交互反馈优化，无新增迁移。见[变更记录](changelog.md)及[升级说明](release-rollback.md)。

## v0.4.6

托管图片与 MCP 导入转为稳定版，见[变更记录](changelog.md)及[升级说明](release-rollback.md)。

## v0.4.6-beta.1

托管 Markdown 图片与 MCP 导入，见[变更记录](changelog.md)及[升级说明](release-rollback.md)。

## v0.4.5

优化 Agent 文档比较的响应大小和共享锁占用，无新增迁移。依赖完整正文的调用须传 `include_content: true`。配套升级并重启 MCP，见[升级说明](release-rollback.md)。

## v0.4.4

导航图标区分层级；目录、列表、文件树和阅读页均可复制路径，附带项目、文档 ID，只读成员也可用。无新增迁移，更新后重启 MCP。

## v0.4.3

修复空目录留存和私人令牌隔离；新增目录行菜单、树形移动、可点击路径及刷新，整理阅读页入口。统一读写能力、日期时间、表格和动效，保留侧栏状态及减少动态效果支持。

迁移 **026** 保留旧授权。npm 0.4.3 已于 2026-11-05 补充发布，GitHub 安装器仍可用；Beta 不变。见[升级说明](release-rollback.md)。

## v0.4.2

- 文件夹与文档增删改查、移动，团队／项目名称查找；MCP 共 28 个工具，保留完整原文读写与下载。
- 一句话安装改为全局安装和用户级配置，多个项目共用；更新、卸载采用相同范围。
- 文件夹支持重命名、同项目移动、删除空目录，文档路径同步更新。
- 展示 MCP 密钥能力与访问范围，清理旧“草稿”文案，改善折叠侧栏点击。
- AI 输出 Token 支持“不限制”，保留自定义值；修复活动分页偶发重复。

新增迁移 **025**，已有配置保留。备份后一起升级 Backend、Admin、MCP 并重启 MCP；正式渠道更新，Beta 保持独立。见[升级说明](release-rollback.md)。

## v0.4.1

将已验证的 v0.4.1-beta.1 转为正式版。MCP 共 21 个工具：新增原文搜索、固定提交的局部读取和带并发、幂等保护的文本 patch；保留完整原文读取、整文件替换与原始下载，解析失败不影响原文访问。内容存储仍限 UTF-8 文本。

相较 v0.4.0 和 v0.4.1-beta.1 均无新增数据库迁移。一起升级 Backend、Admin 和 MCP，重启 MCP 获取新工具清单。更新稳定镜像 `:latest`、npm `@latest` 和正式官网，保留独立 Beta 渠道。

## v0.4.1-beta.1

新增原文搜索、固定提交局部读取和并发／幂等保护的 patch，保留完整原文、整文件替换和下载。存储仍限 UTF-8；无新增迁移，仅更新 Beta。工具与验证细节见[变更记录](changelog.md)。

## v0.4.0

文档独立分支、自动版本、审核发布与 MCP 接入转为正式版。MCP 通过 npm `@latest` 安装，支持版本提醒与源文件下载。v0.3.17 升级执行 018–024 迁移，beta.7 无新增迁移；备份后一起升级 Backend／Admin／MCP。审计留存及兼容说明见[升级说明](release-rollback.md)，完整功能见[变更记录](changelog.md)。

## v0.4.0-beta.7

新增按提交下载源文件，校验 SHA-256 并拒绝覆盖；修复 PostgreSQL 原文读取。迁移 **024** 将审计资源标识改为 text，保留旧 UUID。先备份 Beta 数据，再配套升级；镜像回退不撤销迁移。详见[变更记录](changelog.md)。

## v0.4.0-beta.6

新增 npm `@beta`、全局安装提示和版本提醒，无新迁移。首次 npm 发布曾初始化 `latest` 为 beta.6，首次正式版再替换。详见[变更记录](changelog.md)。

## v0.4.0-beta.5

独立 MCP 与全局审计留存设置。迁移 **023** 默认保留 30 个北京时间自然日；0 清空历史并停止留存，回退不能恢复已清理记录。旧组合包升级须换用独立安装器，详见[升级说明](release-rollback.md)。

## v0.4.0-beta.4

工具侧栏与完整 AI 对话，详见[变更记录](changelog.md)。022 迁移兼容新旧文档会话并保留聊天与审计引用。先备份 Beta 数据库和存储，再配套升级；回退镜像不会撤销迁移。

## v0.4.0-beta.3

恢复文档布局；保留分支与版本，无新增迁移。详见[变更记录](changelog.md)。

## v0.4.0-beta.2

文档独立分支与自动版本见[变更记录](changelog.md#v0-4-0-beta-2)，旧版本/分享保留。迁移 `021_document_repositories.sql` 允许跨文档同名分支；先备份 Beta 数据库/存储，配套更新 Backend/Admin/MCP。仅 Beta，镜像回退不撤销迁移。

## v0.4.0-beta.1

不可变提交与固定发布替代草稿，见[变更记录](changelog.md#v0-4-0-beta-1)。Beta 迁移 018–020 需先备份数据库/存储；旧项目由管理员导入，缺失正文无法恢复。

## v0.3.17-beta.9

工作空间、三栏文档及工具链见[变更记录](changelog.md#v0-3-17-beta-9)；依赖审计不保证环境安全。相对 beta.8 无新迁移，仅更新 Beta。备份后[手动升级](release-rollback.md)，更新 Agent 的 Node.js 并重启 MCP。

## v0.3.17-beta.8

[文档工作区与固定版本分享](admin-usage.md)，010/011 自动迁移。详见[变更记录](changelog.md)。

## v0.3.17-beta.7

文档树工作区、TXT 和创建上传，详见[变更记录](changelog.md)。

## v0.3.17-beta.6

工作台任务布局与统一表单组件，详见[变更记录](changelog.md)。仅更新 Beta，不新增 API 或数据库迁移。

## v0.3.17-beta.5

[设置与列表布局优化](changelog.md)。

## v0.3.17-beta.4

[部署版本、渠道检查与 Node.js 构建环境更新](changelog.md)。

## v0.3.17-beta.3

[列表布局与在线修改密码](changelog.md)。两版仅更新 Beta，无新增迁移；稳定镜像及官网不变。

## v0.3.16

独立 Beta 的镜像、端口、网络、数据卷及 MCP/Skill 渠道安装见[变更记录](changelog.md#v0-3-16)。无新迁移；测试须用独立账号、密钥和 Token。

## v0.3.15

修复中英文 AI 配置说明中的提示模板占位符展示：<code v-pre>{{context}}</code> 和 <code v-pre>{{message}}</code> 按字面显示，便于保留必要字段。

本次为文档补丁，不新增数据库迁移，沿用 v0.3.14 的应用行为与升级流程。

## v0.3.14

配置校验、AI 审计、草稿保存、会话隔离、分享与 MCP 错误处理等修复，见[变更记录](changelog.md#v0-3-14)。无新增迁移；备份数据库和存储后按[升级说明](release-rollback.md)操作，更新 MCP 和 Skill 后重启 Agent。

## v0.3.13

修复会话、版本链接、AI 审计、分享和 MCP 请求，见[变更记录](changelog.md#v0-3-13)。无新增迁移。现有 Compose 将 `VDOC_ADMIN_API_BASE_URL` 设为 `same-origin` 后重建 Admin；跨域部署及旧 CORS 配置变更见[升级说明](release-rollback.md)。

## v0.3.10

修复草稿会话、分支默认值、分享与令牌状态，强化 AI 审计及发布门禁。[变更记录](changelog.md)。无迁移；备份后升级并重启 Agent。

## v0.3.9

修正 OpenAPI 兼容性判断、项目并发与大文档读取，保留分享下载文件名，支持预发布标签。[变更记录](changelog.md)。无迁移。

## v0.3.8

编译发行包安装、SHA256 校验及旧 `npx` 兼容见[变更记录](changelog.md#v0-3-8)。无新迁移。

## v0.3.7

Skill 合并到 `Vdoc-mcp/skills/vdoc`，与 MCP 共用版本和发行包，新增 `vdoc-mcp skill install`。[变更记录](changelog.md)。无迁移；保留本地 Skill 修改并重启 Agent。

本页说明 v0.2 的能力边界。规划试点、写 Agent 指令、发布包或升级前，先确认这里的边界没有被误读。

## v0.3.6

会话、CORS、OpenAPI 方向与 AI 缓存修复见[变更记录](changelog.md#v0-3-6)。无新增迁移，REST/MCP 兼容；[升级](release-rollback.md)沿用应用 `latest`、PostgreSQL 18、RustFS 1.0.0 和双域名。

## v0.3.5

部署文档现在直接展示[接入现有 PostgreSQL 的完整 Compose 示例](deployment.md#external-compose-example)，可复制全部 YAML 和字段注释。中英文页面引用与下载文件相同的源文件，随配置更新同步。

本次为文档补丁，不新增应用功能或数据库迁移；五仓分发版本统一为 v0.3.5。

## v0.3.4

身份隔离、OpenAPI 格式、主题同步与外部 PostgreSQL Compose 见[变更记录](changelog.md#v0-3-4)。相对 v0.3.3 无新迁移，REST/MCP 兼容；见[升级](release-rollback.md)。

## v0.3.3

稳定镜像、双域名及 CORS 更新见[变更记录](changelog.md#v0-3-3)。双域名分别反代前端 8081、后端 8080；前端使用后端 HTTPS 域名，CORS `*` 仍需鉴权。用 `docker compose pull`、`docker compose up -d --wait` 更新；[部署验证](deployment.md#caddy-domain)覆盖登录、发布、MCP 和匿名分享。

无新迁移；保留凭据，备份数据库与对象存储，包括 RustFS 旧 beta 升至 1.0.0。见[升级](release-rollback.md)。

## v0.3.2

同步 go-template `http-services/` 至 `f8ab237`，日志脱敏、取消处理及五仓发行见[变更记录](changelog.md#v0-3-2)。REST/MCP、22 项工具及令牌兼容。无新迁移；从更早版本[升级](release-rollback.md)仍执行未应用迁移，包括 007。

## v0.3.1

数字精度、差异、历史及并发修复见[变更记录](changelog.md#v0-3-1)。新增迁移 `007_parser_facts_and_history_pages.sql`（解析版本、历史索引及 `must_handle`）。先[备份数据库和存储](release-rollback.md)，镜像回退不撤销迁移。五仓统一版本，22 项工具、人工审核、权限及 bcrypt cost 12 不变。

## v0.3.0

单文件 Compose、双架构镜像及启动检查见[变更记录](changelog.md#v0-3-0)。无新迁移，MCP API 保持 v0.2.0；[升级](release-rollback.md)保留密钥和数据卷。

## v0.2.1

Compose 示例和小屏 MCP 配置修复见[变更记录](changelog.md#v0-2-1)。五仓及下载统一版本，无新迁移，后端与 22 项工具兼容 v0.2.0；[升级](release-rollback.md)保留 `.env`、Compose 项目名和数据卷。

## v0.2.0

指定版本读取、双架构发行及 GitHub Pages 见[变更记录](changelog.md#v0-2-0)。更新后刷新工具，为最新内容查询补 `branch_id`。无新迁移，人工发布、不可变版本和令牌权限不变；[升级](release-rollback.md)前备份数据库/存储，同步五仓发行包。

## v0.1 已包含

- 一个 Go backend，提供 REST API、MCP endpoint、持久化、认证、审核流、自动 migrations 和对象存储写入。
- PostgreSQL persistence 和 S3 compatible object storage 支持。
- root `docker-compose.yml`，可启动 PostgreSQL、RustFS、backend 和 Admin。
- `scripts/vdoc-local-bootstrap.sh`，用于生成一次性本机 `.env`，secret 只写入文件不打印。
- `Vdoc/scripts/vdoc-e2e.sh live-compose`，可从 root `.env` 派生 live E2E 配置。
- `scripts/vdoc-release-dry-run.sh`，作为本机 release gate，不发布、不部署。
- Admin UI，用于管理 Team、Project、Document、Branch、Draft、Review、Version、Diff、endpoint detail 和 MCP Token。
- 后台 [Admin AI](admin-ai.md)，包含系统和项目级 OpenAI-compatible provider、prompt 覆盖、provider test、Draft/Version 自动摘要、Draft/Version/Diff 摘要读取和重新生成、页面内对话及审计。
- `@vdoc/mcp` package，用于 Agent runtime 通过 MCP 查询 Vdoc backend。
- `Vdoc-skill` package，用于要求 Agent 在依赖 API 或 Markdown 事实前先查询 Vdoc。

## 生产式依赖

- PostgreSQL 保存元数据、用户、权限和工作流状态。
- RustFS、MinIO 或托管 S3 compatible storage 保存 raw 和 normalized 文档对象。
- 稳定 backend origin，供 Admin 浏览器和 Agent runtime 访问。
- Secret management，用于 JWT keys、MCP token cipher keys、database passwords、storage credentials 和 Agent MCP tokens。

## 运行行为

- `VDOC_DATABASE_ENABLED=true` 时，backend 启动会连接 PostgreSQL 并自动运行 migrations。
- database 连接或 migration 失败会让 backend 启动失败，不会静默回退到内存模式。
- `VDOC_STORAGE_ENABLED=true` 时，backend 会连接对象存储，bucket 缺失时会尝试自动创建。
- Admin Docker 在 container 启动时读取 `VDOC_ADMIN_API_BASE_URL` 并写入 `/runtime-config.js`。
- 完整 Compose 内 backend 使用 `postgres:5432` 和 `rustfs:9000`，浏览器和宿主机使用 `127.0.0.1` 或域名。
- Live E2E 会重置一次性 `VDOC_TEST_POSTGRES_DB`，默认 `vdoc_e2e`，不会重置应用数据库 `VDOC_POSTGRES_DB`。

## 当前仍不包含

- MCP direct publish tools。
- AI 直接 approve、request changes、reject、修改或 publish 的能力。
- Invitation flows 和 notification robots。
- PR bot automation。
- Full SDK 或 code generation platform。
- Commercial billing 或完整 tenant management。

## 兼容性规则

- Admin private API 请求把 JWT 原样放进 `Authorization` header，不加 `Bearer` 前缀。
- REST 返回 envelope，关键字段包括 `code`、`status`、`message`、`detail`、`total`、`trace_id` 和 `timestamp`。
- MCP adapter 转发到 `/api/v1/open/mcp`，不在本地实现 Vdoc 业务逻辑。
- Published Version 视为不可变事实。
- `relative_path` 是 Document 的稳定身份。

## 如何验证试点版本

1. Backend health 返回成功。
2. Admin 能创建或查看 Team、Project、Document、Draft、Version、Diff 和 MCP Token。
3. Live E2E 通过 `./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only` 和 `./scripts/vdoc-e2e.sh live-compose --env-file ../.env`。
4. `scripts/vdoc-release-dry-run.sh --list` 和 `scripts/vdoc-release-dry-run.sh` 通过。
5. MCP `tools/list` 返回来自已部署 backend 的 tool schemas。
6. Skill package 测试通过，并且 Agent 在回答 endpoint 或 migration 问题前会调用 Vdoc MCP。
7. 发布说明中明确写出 v0.2 不支持 MCP 直接发布。
8. Admin AI provider test 成功，Draft 和 Version 摘要可读取，失败场景不阻塞机器 Diff 和人工审核。
