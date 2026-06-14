# MCP 工具

`@vdoc/mcp` 是 Vdoc 给 Agent 使用的 stdio MCP adapter。它不在本地实现 Vdoc 业务逻辑，只把 MCP `tools/list` 和 `tools/call` 请求转发到后端 `/api/v1/open/mcp`。

## 本页目标

- 安装并配置 `@vdoc/mcp`。
- 说明必须设置的 MCP 环境变量。
- 确认 Agent 可以读取 Vdoc 的已审核事实，同时不能直接发布版本。

## 适用场景

- Agent 需要查询项目、文档、API version、endpoint detail、diff、Markdown docs 或 change summary。
- Agent 需要创建、更新或提交 OpenAPI 和 Markdown Draft。
- 你需要把 MCP Token 安全放进 Agent runtime，而不是命令行参数。

## 前置条件

- Vdoc backend 已部署，`/api/v1/open/health` 成功。
- Admin 中已经创建 MCP Token。
- 目标 Agent runtime 支持 MCP stdio server 配置。
- 不要把 MCP Token、JWT 或 `Authorization` header 写进仓库、截图、日志或 README。

## 安装

全局安装：

```sh
npm install -g @vdoc/mcp
```

一次性使用时，建议在 Agent MCP config 中通过 `npx` 调用，不要把 token 放在 `args`。

## 环境变量

| Variable              | 是否必填                       | 说明                                                              |
| --------------------- | ------------------------------ | ----------------------------------------------------------------- |
| `VDOC_BASE_URL`       | 当未设置 `VDOC_MCP_URL` 时必填 | Vdoc 服务基础 URL，adapter 会追加 `/api/v1/open/mcp`。            |
| `VDOC_MCP_URL`        | 可选                           | 完整 Vdoc MCP endpoint URL，设置后覆盖 `VDOC_BASE_URL`。          |
| `VDOC_MCP_TOKEN`      | 必填                           | Admin 中创建的 MCP Token，只放在 Agent config 或 secret storage。 |
| `VDOC_MCP_TIMEOUT_MS` | 可选                           | HTTP timeout，单位毫秒，默认 `30000`。                            |

诊断信息写 stderr，stdout 保留给 MCP protocol。不要依赖 stdout 读取日志。

## Agent 配置示例

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["-y", "@vdoc/mcp"],
      "env": {
        "VDOC_BASE_URL": "https://your-vdoc.example.com",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

如果网关或代理已经给出完整 MCP endpoint，可以改用：

```json
{
  "env": {
    "VDOC_MCP_URL": "https://your-vdoc.example.com/api/v1/open/mcp",
    "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN",
    "VDOC_MCP_TIMEOUT_MS": "30000"
  }
}
```

## 可用工具范围

后端是 tool definitions 的事实来源。Adapter 每次运行时调用 Vdoc `tools/list`，所以 schemas 会跟已部署后端保持一致。

v0.1 暴露的 read tools 覆盖：

- projects
- documents
- API versions
- endpoint detail
- API diffs
- Markdown docs
- change summaries

v0.1 也暴露 Draft tools，用于 OpenAPI 和 Markdown Draft 的创建、更新、查看和提交。常见 tool names 包括：

- `list_projects`
- `list_documents`
- `list_api_versions`
- `get_latest_schema`
- `get_endpoint_detail`
- `compare_api_versions`
- `get_change_summary`
- `create_api_version_draft`
- `update_api_version_draft`
- `submit_api_version_draft`
- `get_api_version_draft`
- `get_latest_doc`
- `compare_doc_versions`
- `create_doc_draft`
- `update_doc_draft`
- `submit_doc_draft`
- `get_doc_draft`

v0.1 不暴露 direct publish tools。Agent 可以提交 Draft，发布必须由人类 Admin 或 SuperAdmin 审核。

## 如何验证

先验证 package：

```sh
cd Vdoc-mcp
npm ci
npm test
```

再在 Agent runtime 中验证：

1. Agent MCP server `vdoc` 能启动。
2. `tools/list` 成功返回 schemas。
3. 调用安全 read tool，例如 list operation，结果来自已部署后端。
4. stderr 中没有 token 打印，stdout 中只有 MCP protocol 消息。

本地手动启动时也要使用环境变量，不要使用 CLI token 参数：

```sh
cd Vdoc-mcp
VDOC_BASE_URL="http://127.0.0.1:8080" \
VDOC_MCP_TOKEN="replace-with-local-mcp-token" \
npm start
```

## 常见问题

- 把 `VDOC_MCP_TOKEN` 写在 `args` 中会泄露到进程列表或日志，应放在 `env`。
- 期望 stdout 输出普通日志会误判，stdout 是 MCP protocol 专用通道。
- 工具列表不是写死在 adapter 里，应该以当前后端 `tools/list` 返回为准。
- 如果 Agent 没有先查询 Vdoc 就开始猜字段，加载 [Skill 工作流](skill-workflows) 并重试。
