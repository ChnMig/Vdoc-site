# 升级与回滚

本页用于已经运行 Vdoc 的用户。目标是在升级前备份数据，升级后验证 backend、Admin、MCP 和 Skill，如果失败能回到上一版。

## 升级前准备

- 确认你知道当前运行的代码版本、镜像 tag 或构建来源。
- 保留当前 `.env`，但不要把真实 secret 写入 issue、聊天记录或 release notes。
- 确认 PostgreSQL 和对象存储都能访问。
- 记录当前 Admin URL、backend health URL 和 Agent MCP 配置。
- 在维护窗口中执行升级，避免用户正在提交 Draft 时中断。

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
docker compose --env-file .env config
docker compose --env-file .env pull
docker compose --env-file .env up -d --build
```

当前 root Compose 会从本地 `./Vdoc` 和 `./Vdoc-admin` build app services。`pull` 主要用于拉取 `postgres`、`rustfs`、`caddy`、`node` 等基础镜像；实际 app 更新来自你当前 workspace 内容。

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

直接部署时，恢复上一版 backend binary 或 container、Admin `dist/`、MCP package 和 Skill package。除非你正在恢复备份，不要删除数据库和对象存储。

## 发布说明模板

```text
Version:
Backend source or image:
Admin source or image:
MCP package version:
Skill package version:
Backup location:
Upgrade command:
Health check result:
Admin smoke result:
MCP smoke result:
Known limitations:
Rollback artifact:
```

Known limitations 至少写明：no direct MCP publish、no invitation flow、no notification bot、no PR Bot、no complete SDK/codegen platform、no commercial billing or tenant administration。

## 避免的操作

- 不要在非一次性环境执行 `docker compose down -v`。
- 不要在升级日志中输出 `.env`、JWT、MCP Token、database password、storage secret 或 `Authorization` header。
- 不要只验证 Admin 页面能打开就宣布整套 Vdoc 升级成功。
- 不要把 MCP 或 Skill 版本升级和 backend 不兼容时的问题归因给 Agent，先验证 `tools/list` 来自当前 backend。
