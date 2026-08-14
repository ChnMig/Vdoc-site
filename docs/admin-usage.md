# 首次使用

本页从部署后的第一个登录开始，带你创建第一条可被 Agent 查询的 Vdoc 数据链路：Project、Document、Draft、Version、MCP Token、MCP adapter 和 Skill。

## 开始前确认

如果还没有启动本机环境，先从 workspace root 运行：

```sh
scripts/vdoc-local-bootstrap.sh
docker compose --env-file .env up -d --build
cd Vdoc && go run ./tools/vdoc-demo-seed
```

`vdoc-demo-seed` 是可选步骤。然后确认：

- Backend health 成功：`/api/v1/open/health`。
- Admin 可以在浏览器打开。
- 如果使用 Admin Docker，`VDOC_ADMIN_API_BASE_URL` 指向浏览器能访问的 backend origin，例如 `http://127.0.0.1:8080`。
- 如果使用 Admin 本地开发，`VITE_VDOC_API_BASE_URL` 指向 backend origin。
- 你已经通过 `initial_admin` 准备了初始 SuperAdmin。匿名注册默认关闭；只有可信的一次性或试点环境才可临时设置 `VDOC_AUTH_ALLOW_REGISTRATION=true`，并在引导后立即关闭。

## 1. 登录 Admin

完整 Compose 推荐在 `.env` 中设置：

```sh
VDOC_INITIAL_ADMIN_EMAIL=admin@example.com
VDOC_INITIAL_ADMIN_NAME=Vdoc Admin
VDOC_INITIAL_ADMIN_PASSWORD=replace-with-initial-admin-password
```

backend 只会在用户表为空时创建这个 SuperAdmin。启动完成后打开 Admin：

```text
http://127.0.0.1:8081
```

使用初始管理员登录。登录后，Admin 会用 raw JWT 调用 private API。手工调试时也要使用原始 JWT：

```sh
set +x
printf 'header = "Authorization: %s"\n' "$JWT" |
  curl --config - http://127.0.0.1:8080/api/v1/private/identity/me
```

把 `JWT` 放在私密 shell 环境变量中，不要把值写进命令记录、文档、日志或截图。环境变量不是 package CLI argument，不要把 token 放进 `npx`、`npm` 或其他进程的 `args`。运行前关闭 xtrace，且不要加 `Bearer` 前缀。

## 2. 创建 Team 和 Project

1. 创建或选择 Team。
2. 在 Team 下创建 Project。
3. 给参与者添加成员关系。
4. Reader 用于读取，Writer 用于创建和提交 Draft，Admin 用于审核。

Project 是权限和 Agent 查询范围的核心边界。不要把不同产品的文档混在一个 Project 里，除非它们确实共享同一组权限。

## 3. 创建 Document

创建 Document 时选择类型：

- `document_type=1`：OpenAPI。
- `document_type=2`：Markdown。

给 Document 设置稳定的 `relative_path`：

- `apis/petstore.yaml`
- `apis/billing.yaml`
- `docs/runbook.md`

显示名称可以调整，`relative_path` 应作为跨系统引用身份。Document 创建后会有 `dev`、`test` 和受保护的 `prod` branches，也可以创建 `feature/*` branch。

## 4. 创建并提交 Draft

1. 选择 Project、Document 和 Branch。
2. 创建 Draft。
3. OpenAPI Draft 放 OpenAPI 3.0 或 3.1 内容。
4. Markdown Draft 放 Markdown 文本。
5. 提交 Draft 进入 review。

提交后，Draft 还不是事实来源。只有审核通过生成 Version 后，Agent 才应把它当作已发布事实。

## 5. 审核并发布 Version

Project Admin 或 SuperAdmin 打开待审核 Draft：

1. 检查 raw content、normalized content 或 Markdown 内容。
2. 对 OpenAPI 文档检查 endpoint 列表、endpoint detail、diff 和 breaking change。
3. 如果内容有问题，request changes 或 reject。
4. 如果内容正确，approve。
5. 确认 Version 列表出现新的不可变 Version。

v0.1 不支持 MCP 直接发布。发布门禁在 Admin。

### 5.1 创建和管理公开分享

Project Admin 或 SuperAdmin 在 Documents 页面选择已有发布版本的 Branch 后，可以创建公开分享。默认有效期为三个月，也可选择一个月、六个月、一年或永久；可选密码必须为 12–72 个 UTF-8 字节，且首尾不能包含 Unicode 空白字符。创建后复制完整能力链接，按需重新显示或不可逆撤销。列表会分别标记有效、已过期和已撤销状态；切换 Project 或 Document 后，Admin 会立即清除当前页面展示的能力链接和未提交密码。

## 6. 配置 Admin AI

先由 SuperAdmin 打开系统 AI 设置，填写 OpenAI-compatible `base_url`、`api_mode`、`model`、`api_key`、`enabled` 和需要的 tuning 字段，再运行 provider test。项目需要独立网关、模型或 prompt 时，由 Project Admin 配置项目覆盖并测试。

保存后只应看到 `api_key_set` 和 `api_key_last4` 掩码状态，不应看到原始密钥。提交一个测试 Draft，确认自动摘要可读取。由人类审核发布后，再确认 Version 摘要和页面 chat 可用。AI 只能辅助总结和解释，不能 approve、request changes、reject、modify 或 publish。完整操作和失败状态见 [Admin AI](admin-ai)。

## 7. 创建 MCP Token

在 Admin 中打开 MCP Token 页面：

1. 创建用户绑定的 MCP Token。
2. 复制创建响应中的 token；active Token 之后也可以在详情中再次查看和复制。
3. 把 token 放入 Agent runtime 的环境变量或密钥管理。
4. 不要把 token 写入命令行参数、README、截图、日志或 issue。

列表、已撤销或已过期 Token 只显示脱敏值，这是正常行为。

## 8. 连接 MCP adapter

本机完整 Compose 示例：

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["--yes", "github:ChnMig/Vdoc-mcp"],
      "env": {
        "VDOC_BASE_URL": "http://127.0.0.1:8080",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

部署环境把 `VDOC_BASE_URL` 改成浏览器或 Agent 所在机器能访问的 backend origin。也可以直接设置 `VDOC_MCP_URL` 为完整 `/api/v1/open/mcp` endpoint。

## 9. 安装 Skill

把 Vdoc Skill 安装到 `$HOME/.agents/skills/vdoc`（个人范围）或 `.agents/skills/vdoc`（当前仓库范围），并确保 `SKILL.md` 位于 skill root。Skill 不保存事实，事实来自 Vdoc MCP。

## 完成验证

- Admin Dashboard 能打开。
- `GET /api/v1/private/identity/me` 成功。
- 至少有一个 Project、Document、Draft 和已发布 Version。
- Admin AI provider test 成功，Draft 和 Version 摘要可读取，AI 失败不阻塞机器 Diff 或人工审核。
- MCP Token 创建后没有出现在命令行参数或日志中。
- Agent 的 `tools/list` 能返回 Vdoc tool schemas。
- Agent 查询 endpoint 或 Markdown 时，先调用 Vdoc MCP，再基于返回结果回答。

如果要把本机闭环跑完整，再执行：

```sh
cd Vdoc
./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only
./scripts/vdoc-e2e.sh live-compose --env-file ../.env
```

Live E2E 会重置选中的一次性 `VDOC_TEST_POSTGRES_DB`，默认是 `vdoc_e2e`，不会重置应用数据库 `VDOC_POSTGRES_DB`。最后从 workspace root 运行：

```sh
scripts/vdoc-release-dry-run.sh --list
scripts/vdoc-release-dry-run.sh
```

Release dry-run 不会发布 package 或部署服务。不要把原始 JWT、MCP Token、DB password、storage secret 或 `Authorization` header 值写进文档、日志、截图或 issue。
