# 首次使用

本页从部署后的第一个登录开始，带你创建第一条可被 Agent 查询的 Vdoc 数据链路：Project、Document、Draft、Version、MCP Token、MCP adapter 和 Skill。

## 开始前确认

- Backend health 成功：`/api/v1/open/health`。
- Admin 可以在浏览器打开。
- 如果使用 Admin Docker，`VDOC_ADMIN_API_BASE_URL` 指向浏览器能访问的 backend origin，例如 `http://127.0.0.1:8080`。
- 如果使用 Admin 本地开发，`VITE_VDOC_API_BASE_URL` 指向 backend origin。
- 你准备了初始 SuperAdmin，或明确允许在可信试点环境注册第一个用户。

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
curl -H "Authorization: replace-with-raw-jwt" \
  http://127.0.0.1:8080/api/v1/private/identity/me
```

不要加 `Bearer` 前缀。

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

## 6. 创建 MCP Token

在 Admin 中打开 MCP Token 页面：

1. 创建用户绑定的 MCP Token。
2. 只复制一次创建响应中的 token。
3. 把 token 放入 Agent runtime 的环境变量或密钥管理。
4. 不要把 token 写入命令行参数、README、截图、日志或 issue。

后续列表或详情可能只显示脱敏值，这是正常行为。

## 7. 连接 MCP adapter

本机完整 Compose 示例：

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["-y", "@vdoc/mcp"],
      "env": {
        "VDOC_BASE_URL": "http://127.0.0.1:8080",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

部署环境把 `VDOC_BASE_URL` 改成浏览器或 Agent 所在机器能访问的 backend origin。也可以直接设置 `VDOC_MCP_URL` 为完整 `/api/v1/open/mcp` endpoint。

## 8. 安装 Skill

把 `Vdoc-skill/` 安装、复制或链接到目标 Agent runtime 的 `vdoc` skill folder，并确保 `SKILL.md` 位于 skill root。Skill 不保存事实，事实来自 Vdoc MCP。

## 完成验证

- Admin Dashboard 能打开。
- `GET /api/v1/private/identity/me` 成功。
- 至少有一个 Project、Document、Draft 和已发布 Version。
- MCP Token 创建后没有出现在命令行参数或日志中。
- Agent 的 `tools/list` 能返回 Vdoc tool schemas。
- Agent 查询 endpoint 或 Markdown 时，先调用 Vdoc MCP，再基于返回结果回答。
