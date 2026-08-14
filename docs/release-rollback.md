# 升级与回滚

本页用于已经运行 Vdoc 的用户。目标是在升级前备份数据，升级后验证 backend、Admin、MCP 和 Skill，如果失败能回到上一版。

## 升级前准备

- 确认你知道当前运行的代码版本、镜像 tag 或构建来源。
- 保留当前 `.env`，但不要把真实 secret 写入 issue、聊天记录或 release notes。
- 确认 PostgreSQL 和对象存储都能访问。
- 记录当前 Admin URL、backend health URL、Agent MCP 配置，以及 Site URL、source SHA、workflow run ID、静态 artifact 标识/校验和、部署 base path 和 QA report 引用。
- 在维护窗口中执行升级，避免用户正在提交 Draft 时中断。
- 本机升级前先看 release dry-run 计划并运行本机门禁：

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

Release dry-run 只运行本机检查，不会发布 package、部署服务、push image 或创建 git ref。

## 1. 备份 PostgreSQL

完整 Compose 示例：

```sh
mkdir -p backups
docker compose --env-file .env exec -T postgres \
  sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' \
  > backups/vdoc-$(date +%Y%m%d%H%M%S).sql
```

如果你使用外部 PostgreSQL，用供应商建议的快照或 `pg_dump` 方式备份。不要在未验证备份可恢复前升级生产或长期试点环境。

## 2. 备份对象存储

RustFS 或 S3 compatible storage 保存 raw 和 normalized 文档对象。升级前至少要保留 bucket 快照或复制一份 bucket 内容。

完整 Compose 的 named volume 是 `rustfs-data`，可以用基础设施层快照备份。外部对象存储请使用供应商的 bucket versioning、snapshot、replication 或对象复制工具。

不要把 storage access key 和 secret key 写进备份脚本日志。

## 3. 拉取或构建新版本

如果使用 workspace root 的 Compose 包，从 workspace root 执行：

```sh
docker compose --env-file .env config --quiet
docker compose --env-file .env pull
docker compose --env-file .env up -d --build
```

如果是全新一次性本机环境，先运行 `scripts/vdoc-local-bootstrap.sh` 生成 `.env`。已有环境不要为了升级而覆盖 `.env`。当前 root Compose 会从本地 `./Vdoc` 和 `./Vdoc-admin` build app services。`pull` 主要用于拉取 `postgres`、`rustfs`、`caddy`、`node` 等基础镜像；实际 app 更新来自你当前 workspace 内容。

如果你直接部署组件，分别重新构建和发布：

```sh
cd Vdoc
make build
```

```sh
cd Vdoc-admin
pnpm install --frozen-lockfile
pnpm build
```

如果 Site 部署在 `/Vdoc-site/` 子路径，candidate 必须使用 Pages-compatible base 构建，并在上传前验证同一份输出：

```sh
cd Vdoc-site
pnpm install --frozen-lockfile
pnpm format:check
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:content
pnpm build:pages
pnpm check:budget
PLAYWRIGHT_BASE_PATH=/Vdoc-site/ pnpm test:browser
PLAYWRIGHT_BASE_PATH=/Vdoc-site/ pnpm test:performance
```

artifact 路径是仓库内的 `docs/.vitepress/dist/`，也就是 workspace root 下的 `Vdoc-site/docs/.vitepress/dist/`。browser 和 performance 通过后不要重新 build；保留校验和并通过运维方自己的静态托管流程部署这份原样输出。当前仓库 workflow 只验证自托管 `/` base，不上传 artifact、不配置 GitHub Pages，也不执行部署；`/Vdoc-site/` 兼容构建由 workspace release dry-run 验收。

MCP 和 Skill 包升级前也要跑测试：

```sh
cd Vdoc-mcp
npm ci
npm test
```

```sh
cd Vdoc-skill
npm ci
npm test
```

## 4. 等待自动迁移和服务健康

backend 启动时会在 `VDOC_DATABASE_ENABLED=true` 时自动运行 migrations。不要在迁移过程中重启或删除数据库。查看 backend 日志：

```sh
docker compose --env-file .env logs -f backend
```

确认容器状态：

```sh
docker compose --env-file .env ps
```

确认健康：

```sh
curl http://127.0.0.1:8080/api/v1/open/health
curl -I http://127.0.0.1:8081/
```

如果你改过 `.env` host ports，请把命令中的端口替换成实际端口。部署到域名时使用你的 backend 和 Admin 域名。

## 5. 升级后功能验证

1. Admin 能登录。
2. `GET /api/v1/private/identity/me` 成功，private API 使用 raw JWT `Authorization` header，无 `Bearer` 前缀。
3. 已有 Project、Document、Draft、Version 和 Diff 能打开。
4. 新建一个测试 Draft，并确认审核流程仍可用。
5. MCP `tools/list` 成功，至少一个 read-only tool call 成功。
6. Agent 使用 Skill 时会先查 Vdoc MCP，再回答 endpoint 或 Markdown 问题。
7. 按 [Admin AI](admin-ai) 运行系统或项目 provider test，提交测试 Draft，并确认 Draft/Version 摘要和页面 chat 可用。
8. 禁用测试 prompt 或使用不可用 provider 时，确认 AI 结果为 `skipped` 或 `failed`，但机器 Diff、人工审核和发布流程不受影响。
9. 检查 AI 审计不含原始 API key、JWT、MCP Token、`Authorization` header 或提示词中嵌入的秘密；prompt override、summary 和 chat 记录按产品定义保留。
10. 如果本机 root Compose 可用，live E2E 通过：

    ```sh
    cd Vdoc
    ./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
    ./scripts/vdoc-e2e.sh live-compose --env-file ../.env
    ```

    Live E2E 会重置选中的一次性 `VDOC_TEST_POSTGRES_DB`，默认是 `vdoc_e2e`，不会重置 `VDOC_POSTGRES_DB` 指向的应用数据库。

11. 如果选择 `/Vdoc-site/` base，检查公开路由 `/Vdoc-site/`、`/Vdoc-site/en/`、`/Vdoc-site/admin-ai`、`/Vdoc-site/en/admin-ai`、`/Vdoc-site/release-rollback` 和 `/Vdoc-site/en/release-rollback`；导航、脚本、样式、字体和 favicon 必须保持在该 base 下，不能指向站点根路径的错误资源。

## 回滚策略

如果升级后 backend health 失败或核心流程不可用，先停止继续写入，再回滚。

完整 Compose 的快速回滚思路：

1. 回到上一版 workspace 内容或上一版镜像 tag。
2. 保持 `.env` 不变，除非失败原因就是配置错误。
3. 运行：

   ```sh
   docker compose --env-file .env up -d --build
   ```

4. 如果迁移已经写入不兼容 schema，按升级前 PostgreSQL 备份恢复。
5. 如果对象写入出错，按升级前 bucket 备份恢复对象存储。
6. 重新执行 backend health、Admin 登录和 MCP read-only call 验证。
7. 重新执行 Admin AI provider test。若问题只在 AI provider 或 prompt，回滚该配置，不要修改或删除已发布 Version。

直接部署时，恢复上一版 backend binary 或 container、Admin `dist/`、MCP package 和 Skill package。除非你正在恢复备份，不要删除数据库和对象存储。

Site 回滚必须选择仍保留的上一份已验收静态 artifact，核对 source SHA、artifact 校验和、base path 和 QA 证据后，通过运维方自己的静态托管流程重新指向该 artifact。不要在回滚时重新 build，因为重新构建的输出不是原已验收 artifact。回滚后重新检查中英文入口、Admin AI 页面、release rollback 页面和所有 base-safe 静态资源；artifact 已过期时，使用另一份仍保留的已验收 artifact，或从目标 source SHA 重新跑完整门禁并把输出视为新的 candidate。

## 发布说明模板

```text
Version:
Backend source or image:
Admin source or image:
Site source SHA:
Site workflow run ID:
Site artifact ID and checksum:
Site deployment URL and base path:
Site QA report references:
MCP package version:
Skill package version:
Backup location:
Upgrade command:
Health check result:
Admin smoke result:
Site smoke result:
MCP smoke result:
Known limitations:
Rollback artifact:
```

Known limitations 至少写明：AI 不能替代机器 Diff 或人工审核、no direct MCP publish、no invitation flow、no notification bot、no PR Bot、no complete SDK/codegen platform、no commercial billing or tenant administration。

## 避免的操作

- 不要在非一次性环境执行 `docker compose down -v`。
- 不要在升级日志中输出 `.env`、JWT、MCP Token、database password、storage secret 或 `Authorization` header。
- 不要只验证 Admin 页面能打开就宣布整套 Vdoc 升级成功。
- 不要把 MCP 或 Skill 版本升级和 backend 不兼容时的问题归因给 Agent，先验证 `tools/list` 来自当前 backend。
