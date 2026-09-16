# 首次使用

发布一份团队约定，让 Agent 从 Vdoc 读取它。完成后，你会看到一条真实查询：Agent 读取已发布的 Markdown，并根据文档回答问题。

## 开始前确认

- 已按 [部署指南](deployment.md#quick-start) 启动 Vdoc，并设置初始管理员账号。
- 工作台可以打开，Backend 健康检查的 `detail.healthy` 为 `true`。
- 用于接入的 Agent 支持 MCP stdio；运行 Agent 的机器已安装 Node.js 20 或更新版本、npm 和 Git。

这次用一份 Markdown 完成“创建 → 审核发布 → 查询”。Admin AI、公开分享和 Skill 可以在首次查询成功后配置。

## 1. 登录并创建试用项目

打开 [本机工作台](http://127.0.0.1:8081)，用部署时在 `docker-compose.yml` 中设置的邮箱和密码登录。如果使用远程环境，请打开对应的工作台地址。

在工作台创建或选择一个 Team，然后创建名为 **Vdoc 试用** 的 Project。用初始 SuperAdmin 完成这次试用即可；团队协作时再添加 Reader、Writer 和 Project Admin 成员。

账号尚未设置时，返回 [初始管理员配置](deployment.md#initial-admin)。已有数据库时修改初始化字段不会重置账号。

## 2. 创建示例文档

进入文档管理，选择刚创建的项目，填写：

| 字段           | 示例值                  |
| -------------- | ----------------------- |
| 文档名称       | 团队约定                |
| 文档类型       | Markdown                |
| 项目内相对路径 | `docs/team-guide.md`    |
| 工作分支       | `dev`（创建文档后选择） |

相对路径用于稳定定位文档。文档创建后有 `dev`、`test` 和受保护的 `prod` 分支，这次使用 `dev`。

## 3. 提交第一份草稿

在草稿页选择这个项目、文档和 `dev` 分支。版本名称填 `v1`，在内容输入框粘贴以下示例 Markdown，也可以保存为 `.md` 文件上传：

```md
# 团队约定

- 演示项目代号为 Northstar。
- 提交代码前，先运行项目测试。
- 文档修改先提交草稿，由项目管理员审核发布。
```

这是用于试用的示例内容。创建草稿（Draft）后，执行提交审核；仅保存草稿还不能让 Agent 把它当作已发布文档。

## 4. 审核并发布

进入审核页，选择刚提交的 `v1` 草稿，检查内容和 Diff，然后批准发布。由 Project Admin 或 SuperAdmin 完成这一步。

进入版本页，确认 `dev` 分支下出现已发布的 `v1`，并且能读到上面的三条约定。这就是不可变版本（Version）；后续修改需要新建草稿。

**发布是人工动作。** MCP 可以提交草稿，不能直接发布 Version。

## 5. 创建读取令牌

打开 MCP Token 页面，创建用户绑定的令牌：

- 选择 **`doc:read`**，用于读取 Markdown；这次查询不需要草稿写入权限。
- 确认令牌关联用户可以访问 **Vdoc 试用** 项目，并设置未来的过期时间。
- 复制令牌到 Agent 的私密配置或密钥管理中。

有效令牌可在详情中再次查看和复制；列表、已撤销或已过期的令牌只显示脱敏值。不要将原始令牌放进命令行参数、仓库、截图或日志。

<div id="connect-agent"></div>

## 6. 连接 Agent

选择客户端对应的配置格式。工作台的 MCP Token 页面也能生成这两种配置。

::: code-group

```json [Cursor]
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": [
        "--yes",
        "github:ChnMig/Vdoc-mcp#e148633a6e56ec233dcbb9be6e0108eabec93b61"
      ],
      "env": {
        "VDOC_BASE_URL": "http://127.0.0.1:8080",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

```toml [Codex]
[mcp_servers.vdoc]
command = "npx"
args = ["--yes", "github:ChnMig/Vdoc-mcp#e148633a6e56ec233dcbb9be6e0108eabec93b61"]
startup_timeout_sec = 60
tool_timeout_sec = 180

[mcp_servers.vdoc.env]
VDOC_BASE_URL = "http://127.0.0.1:8080"
VDOC_MCP_TOKEN = "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
```

:::

- **Codex：** 将 TOML 节合并到个人 `~/.codex/config.toml`，保存后重启 Vdoc MCP 服务或新开会话，使用 `/mcp` 查看连接。首次 `npx` 启动可能需要下载，示例预留了 60 秒启动时间。参阅 [官方 MCP 配置说明](https://developers.openai.com/codex/mcp/)。
- **Cursor：** 将 JSON 合并到个人 `~/.cursor/mcp.json` 的 `mcpServers` 中，在 Settings → Tools & MCP 中启用或重启 Vdoc。其他使用 `mcpServers` 的客户端可复用 JSON，但配置位置以对应客户端为准。

只修改自己的私密配置，保留已有服务器条目；不要把令牌提交到项目仓库。

将占位符替换为第 5 步的令牌，保存到客户端的私密配置中，然后重新加载 MCP 连接。这里使用官方 GitHub 仓库的固定提交，版本须与部署包 `workspace.lock.json` 中的 `Vdoc-mcp` 一致；当前包尚未发布到 npm registry。

`VDOC_BASE_URL` 必须能从 **Agent 运行的机器** 访问。`127.0.0.1` 只适用于 Agent 和 Backend 在同一台机器上；远程 Agent 请使用它能访问的 Backend 地址。完整选项见 [MCP 接入与工具](mcp-tools.md)。

客户端应显示 Vdoc 工具已连接，工具清单中应有 `list_projects`、`list_documents` 和 `get_latest_doc`。

<div id="first-query"></div>

## 7. 让 Agent 读取文档

把下面这句话发送给 Agent：

```text
请先通过 Vdoc MCP，找到「Vdoc 试用」项目 dev 分支下
路径为 docs/team-guide.md 的最新已发布文档。
根据文档回答：项目代号是什么，提交代码前要做什么？
请注明文档路径、分支和版本；找不到时明确告诉我，不要自行补写。
```

检查这三个结果：

- Agent 实际调用了 Vdoc MCP，并使用 `get_latest_doc` 读取已发布内容。
- 回答包含示例中的 **Northstar** 和 **提交代码前先运行项目测试**。
- 引用的是 `docs/team-guide.md`、`dev` 分支和已发布的 `v1`；文档 ID 也可用于核对来源。

这次查询成功后，你就完成了从人工审核到 Agent 使用文档的第一条流程。只看到 `tools/list` 成功，或 Agent 给出了相似回答，都还不能证明它读到了这份文档。

## 如果没有得到预期结果

| 现象                       | 下一步                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------- |
| MCP 无法启动或连接         | 检查 Agent 机器上的 Node.js、npx、Git，以及 Backend 地址是否可访问；查看客户端 MCP 错误。 |
| 有工具，但找不到项目或文档 | 确认令牌仍有效、有 `doc:read`，关联用户可访问项目；核对文档路径和 `dev` 分支。            |
| 找到文档，但没有已发布版本 | 回到审核页批准草稿，再确认版本页已有 `v1`。                                               |
| Agent 没有查询就回答       | 确认 MCP 已启用，明确要求先调用 `get_latest_doc`；必要时新开会话重试。                    |

更多排查方法见 [故障排查](troubleshooting.md)。

## 查询成功后，再按需要配置

- **让 Agent 持续按文档协作：** 安装 [Vdoc Skill](skill-workflows.md#安装)。它引导 Agent 在接口集成、迁移分析和文档修改前先查 Vdoc；实时内容仍来自 MCP。
- **体验接口变更：** 创建 OpenAPI 文档（支持 OpenAPI 3.0 / 3.1），提交并审核两个版本，按 [接口变更示例](how-it-works.md#example) 查询 Diff。令牌需有 `api:read`。
- **启用后台 AI 助手：** 按 [Admin AI](admin-ai.md) 配置 OpenAI-compatible 提供商，可使用自动摘要和页面内对话。它不能批准、拒绝、修改或发布文档；配置缺失或调用失败不阻塞人工审核。
- **向项目外分享文档：** 按下面的说明创建公开链接。
- **验证发布候选：** 维护者可继续执行 [工程验证与发布检查](deployment.md#engineering-and-release-checks)。

### 创建和管理公开分享

Project Admin 或 SuperAdmin 在 Documents 页面选择已有发布版本的 Branch 后，可以创建公开分享。默认有效期为三个月，也可选择一个月、六个月、一年或永久；可选密码必须为 12–72 个 UTF-8 字节，且首尾不能包含 Unicode 空白字符。创建后复制完整能力链接，按需重新显示或不可逆撤销。列表会分别标记有效、已过期和已撤销状态；切换 Project 或 Document 后，Admin 会立即清除当前页面展示的能力链接和未提交密码。
