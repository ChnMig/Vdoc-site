# MCP 工具

`@vdoc/mcp` 是 Vdoc 给 Agent runtime 使用的 stdio MCP adapter。它不在本地实现 Vdoc 业务逻辑，只把 MCP `tools/list` 和 `tools/call` 请求转发到后端 `/api/v1/open/mcp`。

## 使用前准备

- Vdoc backend 已部署，`/api/v1/open/health` 成功。
- Admin 中已经创建 MCP Token。
- 目标 Agent runtime 支持 MCP stdio server 配置。
- 不要把 MCP Token、JWT 或 `Authorization` header 写进仓库、截图、日志或 README。

## 安装方式

全局安装：

```sh
npm install -g @vdoc/mcp
```

一次性使用时，推荐在 Agent MCP config 中通过 `npx` 调用，不要把 token 放在 `args`。

本地开发或 package smoke：

```sh
cd Vdoc-mcp
npm ci
npm test
VDOC_BASE_URL="http://127.0.0.1:8080" \
VDOC_MCP_TOKEN="replace-with-local-mcp-token" \
npm start
```

stdout 保留给 MCP protocol，普通诊断看 stderr。

## 环境变量

| Variable              | 是否必填                        | 说明                                                              |
| --------------------- | ------------------------------- | ----------------------------------------------------------------- |
| `VDOC_BASE_URL`       | 当未设置 `VDOC_MCP_URL` 时必填  | Vdoc backend origin，adapter 会追加 `/api/v1/open/mcp`。          |
| `VDOC_MCP_URL`        | 当未设置 `VDOC_BASE_URL` 时必填 | 完整 Vdoc MCP endpoint URL，设置后覆盖 `VDOC_BASE_URL`。          |
| `VDOC_MCP_TOKEN`      | 必填                            | Admin 中创建的 MCP Token，只放在 Agent config 或 secret storage。 |
| `VDOC_MCP_TIMEOUT_MS` | 可选                            | HTTP timeout，单位毫秒，默认 `30000`。                            |

完整 Compose 本机部署时，`VDOC_BASE_URL` 通常是 `http://127.0.0.1:8080`。远程部署时，改成 Agent 所在机器能访问的 backend 域名。

## Agent 配置示例

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["-y", "@vdoc/mcp"],
      "env": {
        "VDOC_BASE_URL": "http://your-vdoc.example.test",
        "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN"
      }
    }
  }
}
```

如果你已经知道完整 MCP endpoint，可以改用：

```json
{
  "env": {
    "VDOC_MCP_URL": "http://your-vdoc.example.test/api/v1/open/mcp",
    "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN",
    "VDOC_MCP_TIMEOUT_MS": "30000"
  }
}
```

## 可用工具范围

后端是 tool definitions 的事实来源。Adapter 每次运行时调用 Vdoc `tools/list`，所以 schemas 会跟已部署后端保持一致。

v0.1 read tools 覆盖：

- projects
- documents
- API versions
- endpoint detail
- API diffs
- Markdown docs
- change summaries

v0.1 draft tools 覆盖 OpenAPI 和 Markdown Draft 的创建、更新、查看和提交。常见 tool names 包括：

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

实际工具列表以当前 backend `tools/list` 返回为准。v0.1 不暴露 direct publish tools。

## Agent 行为规则

- 回答 endpoint fields、response properties、enum values、auth schemes 或 Markdown 原文前，先查 Vdoc。
- 优先使用 stable ID 和 `relative_path`，不要依赖显示名称。
- 把 published Version 视为不可变事实。
- 不要说 Draft 已发布，除非 Admin 审核后已经生成 Version。
- tool call 失败时，遮盖 secret 后报告 envelope `code`、`status`、`message` 和 `trace_id`。

## 如何验证

- Agent MCP server `vdoc` 能启动。
- `tools/list` 成功返回 Vdoc tool schemas。
- 至少一个 read-only tool call 成功。
- token 没有出现在 process args、日志、文档或截图中。
- Agent 在依赖接口或文档事实的回答中说明事实来自 Vdoc 查询结果。
