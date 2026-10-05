# 升级与回滚

单文件部署默认用 `latest` 跟随稳定应用版本，由你执行 `docker compose pull` 和 `docker compose up -d --wait` 更新容器，后端在启动时自动执行新版本附带的数据库迁移。升级沿用原账号、密钥和数据卷。

## 1. 备份当前配置和数据

保留当前私密 `docker-compose.yml`、实际运行的镜像 digest（滚动标签本身不是回滚依据）及 Release 的 `container-image.json`（包含镜像 digest 和源码提交号）。在维护窗口停止写入：

```sh
docker compose stop backend admin
mkdir -p backups
docker compose exec -T postgres \
  sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > backups/vdoc-before-upgrade.sql
```

同时备份 RustFS 的 `rustfs-data` 数据卷或存储桶。外部数据库与对象存储可使用服务商的快照或备份工具。确认备份可恢复，再继续升级。

## 2. 拉取更新并重建容器

默认保持 `x-backend-image` 和 `x-admin-image` 的 `latest`，无需逐次修改 tag。查看 [Site Release](https://github.com/ChnMig/Vdoc-site/releases)，按版本说明合并新增配置；不要覆盖已填写的私密 YAML。若要固定或回退应用版本，将两处应用镜像都改为目标版本 tag 或已保存的 digest。

保留 PostgreSQL 密码、存储凭据、JWT/MCP 密钥、管理员设置、端口、项目名和数据卷。`v0.3.10` 相对 v0.3.6 不新增应用数据库迁移；从 v0.3.0 或更早版本升级时，会执行尚未应用的 `007_parser_facts_and_history_pages.sql`，新增解析版本字段、历史查询索引和 Diff 的 `must_handle` 字段。升级前完成上面的备份；本版不会自动执行数据库降级。

若旧部署的 `services.admin.environment.VDOC_ADMIN_API_BASE_URL` 指向独立后端域名或 `127.0.0.1:8080`，改为 `'same-origin'`。当前 Admin 内置 Caddy 将 `/api/*` 同源转发到 `backend:8080`，运行时配置使用 `window.location.origin`；浏览器通过工作台域名访问 API，Skill、MCP 和 CLI 仍可直接访问后端域名。删除旧的 CORS origin 配置，并保留 `VDOC_SERVER_ENABLE_CORS: 'true'`。两份单文件 Compose（内置或外部 PostgreSQL）都使用这一默认配置。

```sh
docker compose pull
docker compose up -d --wait
docker compose up -d --wait --force-recreate admin
docker compose ps
```

显式重新创建 Admin 会重新生成运行时配置；只重启旧容器不会应用修改后的 Compose 环境变量。新容器会挂载原有数据卷。Backend 自动检查 `schema_migrations`，按顺序执行尚未应用的迁移，并校验已应用迁移的内容。迁移失败会中止启动；不会清空数据库或跳过错误继续提供服务。已完成的迁移不会因重启反复执行。

Vdoc 的迁移只负责应用数据结构，不包含 PostgreSQL 主版本升级。默认 `postgres:18` 跟随 18.x 补丁，`rustfs/rustfs:1.0.0` 固定版本。跨 PostgreSQL 主版本或更换 RustFS 版本前，需按相应升级说明迁移并验证。

## 从 v0.2.1 及更早的下载包迁移 {#legacy-compose}

第一次切换到单文件方式时：

1. 备份现有数据和 `.env`，记下实际 Compose 项目名及卷名。旧默认项目名也是 `vdoc`；若你曾自定义，应在新 YAML 中保留实际名称。
2. 保存旧 Compose，下载新的 YAML 到原部署目录，将旧 `.env` 中的账号、密码、JWT/MCP 密钥、密钥 KID/keyring、数据库名称、存储桶和访问地址逐项填入新 YAML。
3. 旧 `VDOC_POSTGRES_PASSWORD` 对应新 `VDOC_DATABASE_PASSWORD`；新文件通过 YAML 锚点共享数据库配置。若曾单独覆盖 `VDOC_DATABASE_DSN` 或使用外部服务，保留实际连接配置；后端仍支持显式 DSN，并优先使用它。
4. 核对 `name` 及 `postgres-data`、`rustfs-data`、`rustfs-logs` 仍指向原数据卷，然后运行上面的 `pull` / `up -d`。

旧部署若未单独设置 MCP 加密密钥，实际使用的是当时的 JWT 密钥；迁移时把这个原值填入 `VDOC_MCP_TOKEN_CIPHER_KEY`。更换 YAML 不应同时轮换密钥。完成切换后，部署和更新只依赖新的 Compose 文件，不再需要 `.env`、安装脚本或 `workspace.lock.json`。

## 3. 检查升级结果

```sh
docker compose logs --tail=100 backend
curl -fsS http://127.0.0.1:8080/api/v1/open/health
docker compose exec backend /app/vdoc --version
```

如果改过端口，请使用对应地址。确认后端健康、版本正确，随后检查：

- 原管理员可以登录，已有项目、文档、草稿、版本和 Diff 可以打开。
- 现有 MCP Token 可以调用 `tools/list` 和一个只读工具；Agent 可以读取原文档。
- 新草稿仍能提交、审核和发布。
- 使用 AI 或公开分享时，原 Provider 配置及分享链接仍可使用。

使用域名时，检查 `https://docs.example.com/api/v1/open/health` 的 `code` 为 `200`，并检查 `https://docs.example.com/runtime-config.js` 包含 `apiBaseUrl: window.location.origin`。浏览器执行后应使用实际工作台 origin（本例为 `https://docs.example.com`），再验证登录和发布等认证流程。

正常的配置检查容器会退出为 `Exited (0)`。如果检查失败，修正 YAML 后再启动；不要反复删库重试。业务排查可继续阅读[管理端使用](admin-usage.md)、[AI 配置](admin-ai.md)和[MCP 工具](mcp-tools.md)。

## 回滚

回滚到不包含同源 `/api/*` 反代的旧 Admin 时，恢复该版本对应的 API 和代理配置；这些镜像不能直接使用 `'same-origin'`。若恢复跨域访问，网关需显式允许实际工作台 origin 和 `Authorization` 等请求头，或按旧版本支持的 origin 方案配置，并用浏览器验证预检与认证请求。不要仅凭 CORS 通配响应判断跨域登录可用。

先停止 Backend 和 Admin，保留当前数据和日志。对照目标版本的升级说明确定旧版是否兼容迁移后的数据库：

1. 恢复上一版镜像配置，保留仍用于解密数据的密钥和 KID/keyring。
2. 如果新迁移与旧版不兼容，恢复升级前的 PostgreSQL 备份；必要时同时恢复对象存储备份。
3. 运行 `docker compose up -d`，重新验证健康、原账号登录、文档和 MCP 查询。

自动迁移不等于自动降级。不要只回退容器版本就假定数据库也已回滚，也不要执行 `docker compose down -v` 删除数据卷。

## 官网与开发者发布

宣传官网与用户部署相互独立。正式标签通过 CI 并发布 Release 后，GitHub Actions 自动把对应官网版本部署到 [GitHub Pages](https://chnmig.github.io/Vdoc-site/)；分支和预发布标签不会自动上线。

官网需要回滚时，可从 `main` 手动运行 `Publish release to GitHub Pages`，选择已有正式标签。工作流重新校验并部署该版本；不会移动标签，也不会更新用户部署的应用容器。旧版本可能仍提供当时的 Compose 压缩包。

源码构建、E2E 测试、密钥轮换和四仓库发布校验见[维护者运行说明](https://github.com/ChnMig/Vdoc-site/blob/main/workspace/RELEASE_DEPLOY.md)。这些检查在独立测试环境执行，普通部署无需安装源码或创建测试数据库。
