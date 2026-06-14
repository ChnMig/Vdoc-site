# 发布与回滚

本页用于试点或生产发布前后。目标是只发布通过 CI 和 live smoke 的 artifact，并保留能快速回滚的上一版。

## 本页目标

- 列出 backend、Admin、site、MCP、Skill 的发布检查。
- 汇总必须配置的环境变量和安全规则。
- 给出发布后 smoke 和按组件回滚步骤。

## 适用场景

- 准备打 tag 或发布试点 artifact。
- 已发布后需要确认 backend、Admin、site、MCP、Skill 都能工作。
- 新版本出现问题，需要回到上一版。

## 发布前检查

确认各仓库 CI 已通过，或本地执行相同检查：

- `Vdoc/.github/workflows/ci.yml`，覆盖 backend build、vet、tests 和 v0.1 E2E smoke。
- `Vdoc-admin/.github/workflows/ci.yml`，覆盖 formatting、build、lint 和 browser tests。
- `Vdoc-site/.github/workflows/ci.yml`，覆盖 formatting、build、lint 和 tests。
- `Vdoc-mcp/.github/workflows/ci.yml`，覆盖 build、tests 和 package dry run。
- `Vdoc-skill/.github/workflows/ci.yml`，覆盖 tests 和 package dry run。

发布前还要按 [部署](deployment) 跑 live backend smoke，使用一次性 PostgreSQL 和 RustFS/S3 resources。

## 必须配置的环境变量

Backend pilot 或 production deployments 必须设置：

- `VDOC_JWT_KEY`
- `VDOC_DATABASE_ENABLED=true`
- `VDOC_DATABASE_DSN`
- `VDOC_STORAGE_ENABLED=true`
- `VDOC_STORAGE_ENDPOINT`
- `VDOC_STORAGE_BUCKET`
- `VDOC_STORAGE_ACCESS_KEY`
- `VDOC_STORAGE_SECRET_KEY`
- `VDOC_MCP_TOKEN_CIPHER_KEY`
- `VDOC_MCP_TOKEN_CIPHER_KID`

Admin deployment 必须在 build time 设置：

- `VITE_VDOC_API_BASE_URL`

如果使用 Docker Compose 试点依赖，还要准备：

- `VDOC_DOCKER_POSTGRES_PASSWORD`
- `VDOC_DOCKER_RUSTFS_ACCESS_KEY`
- `VDOC_DOCKER_RUSTFS_SECRET_KEY`

## 安全规则

- 不要提交 `.env`、`.env.compose`、JWT keys、MCP tokens、storage secrets、database passwords 或 `Authorization` headers。
- `VDOC_MCP_TOKEN_CIPHER_KEY` 轮换时必须同时使用新的 `VDOC_MCP_TOKEN_CIPHER_KID`，并安排迁移窗口。
- v0.1 的 MCP tokens 是 user-bound，project-bound robot 或 CI tokens 属于后续候选能力。
- Release notes 中只能写 placeholder 或状态，不写真实 secret。

## 发布命令

Backend：

```sh
cd Vdoc
make verify
make test-e2e
make build
```

需要 cross-platform distributables 时：

```sh
cd Vdoc
CROSS=1 make build
```

Admin：

```sh
cd Vdoc-admin
pnpm install --frozen-lockfile
pnpm format:check
pnpm build
pnpm lint
pnpm exec playwright install chromium
pnpm test
```

Site：

```sh
cd Vdoc-site
pnpm install --frozen-lockfile
pnpm format:check
pnpm build
pnpm lint
pnpm test
```

MCP package：

```sh
cd Vdoc-mcp
npm ci
npm test
npm pack --dry-run
```

Skill package：

```sh
cd Vdoc-skill
npm ci
npm test
npm pack --dry-run
```

## 发布后 smoke

1. Backend health 成功：

   ```sh
   curl https://your-vdoc.example.com/api/v1/open/health
   ```

2. Admin 能 register 或 login。
3. `/api/v1/private/identity/me` 成功，private API 使用 raw JWT `Authorization` header，无 `Bearer` 前缀。
4. SuperAdmin 和 Project Admin 的 Dashboard 都能打开。
5. 能创建或查看 Project、Document、Draft、Version、Diff 和 MCP Token。
6. Site `/docs/index.html` 能打开 Docsify app，hash routes 工作。
7. MCP `tools/list` 和至少一个 read-only tool call 成功。
8. Skill package 包含 `SKILL.md`、`templates/`、`examples/`、`README.md` 和 `LICENSE`。

## 回滚步骤

Backend 回滚：

1. 在 load balancer 或网关上停止新流量，或切到维护页。
2. 恢复上一版 backend binary 或 container。
3. 除非迁移方案明确要求，不要删除 database 和 object store。
4. 重新运行 `/api/v1/open/health`。
5. 用 MCP Token 做一个 read-only MCP tool call。

Admin 或 site 回滚：

1. 把 static hosting 指回上一版 `dist/` artifact。
2. Admin 回滚后确认 login、Dashboard、Versions、Diffs、MCP Token 页面可用。
3. Site 回滚后确认 `/docs/index.html`、`/docs/index.html#/deployment`、`/docs/index.html#/mcp-tools` 可用。

MCP 或 Skill 回滚：

1. 保留上一版 package。
2. 通知试点用户在 Agent config 中固定上一版。
3. 确认 `tools/list` 和一个 read-only tool call 可用。
4. 确认 Skill 仍会要求 Agent 先查 Vdoc facts。

## 发布说明模板

```text
Version:
Backend commit:
Admin commit:
Site commit:
MCP package version:
Skill package version:
CI status:
Live smoke status:
Known limitations:
Rollback artifact:
```

Known limitations 至少写明：no direct MCP publish、no invitation flow、no notification bot、no PR Bot、no complete SDK/codegen platform、no commercial billing or tenant administration。

## 如何验证

- 每个组件的检查命令都有通过记录。
- Backend health 和 Admin private identity 在目标环境成功。
- MCP Token 没有出现在 CLI args、日志、文档或 release notes 中。
- 旧 artifact 可用，回滚路径不是临时猜测。

## 常见问题

- 只发布 backend 不更新 Admin 可能导致页面调用不匹配接口。
- Site build 成功不代表 Docsify links 正确，必须打开 `/docs/index.html#/deployment` 和 `/docs/index.html#/mcp-tools`。
- 发布前如果没有 live smoke，不要把试点状态标成 ready。
- 回滚时不要随手执行会删数据的 Docker volume 命令，除非环境明确是一次性的。
