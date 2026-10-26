# MCP 接入与工具

Agent 可查询已发布的 OpenAPI、Markdown、TXT，或提交草稿供人工审核。首次接入：[连接 Agent](admin-usage.md#connect-agent) → [读取文档](admin-usage.md#first-query)。

stdio 适配器 `@vdoc/mcp` 将 `tools/list`、`tools/call` 转发到 `/api/v1/open/mcp`；Backend 负责存储与业务逻辑。

## 使用前准备

- Vdoc backend 已部署，`/api/v1/open/health` 成功。
- Admin 中已经创建 MCP Token。
- 目标 Agent runtime 支持 MCP stdio server 配置。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` header 值写进仓库、截图、日志、README 或 issue。

Agent 运行的机器还需安装 Node.js 20 或更新版本、npm 和 Git。尚未启动 Vdoc 时，先按 [Docker Compose 部署步骤](deployment.md#quick-start) 完成初始化和管理员设置。第一次查询需要一份已发布文档；demo 数据和工程发布检查可以后续再做。

## 安装方式

当前 `@vdoc/mcp` 尚未发布到 npm registry。一次性使用可通过官方 GitHub 仓库的固定提交运行：

```sh
npx --yes github:ChnMig/Vdoc-mcp#a9711bfc718906dee9327c95941f9afde9246dc6
```

一次性使用时，推荐在 Agent MCP config 中通过固定 commit 的 `npx` 调用，不要把 token 放在 `args`。上面的 40 位 commit 必须和已审核发布包 `workspace.lock.json` 的 `Vdoc-mcp` 项一致；不要删掉 fragment 或改成可移动 branch。

全局安装使用已编译的发行包，先校验再安装。源码 Git 安装在 npm 的准备阶段可能报 `tsc: command not found`，发行包无需在安装时编译：

```sh
(
  set -eu
  VDOC_MCP_VERSION=0.3.17-beta.15
  VDOC_MCP_PACKAGE_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$VDOC_MCP_PACKAGE_DIR"' EXIT
  VDOC_MCP_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/v$VDOC_MCP_VERSION"
  curl -fsSL "$VDOC_MCP_RELEASE/vdoc-mcp-$VDOC_MCP_VERSION.tgz" -o "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
  curl -fsSL "$VDOC_MCP_RELEASE/SHA256SUMS" -o "$VDOC_MCP_PACKAGE_DIR/SHA256SUMS"
  (cd "$VDOC_MCP_PACKAGE_DIR" && shasum -a 256 -c SHA256SUMS)
  npm install --global "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
)
```

使用与部署包 `workspace.lock.json` 一致的 MCP 版本。要让 Agent 使用全局安装，将配置的 `command` 改为 `vdoc-mcp` 并移除 `npx` 的 `args`，保留私密 `env`。更新后重启 MCP 连接。可选 Skill 的安装和更新见 [Skill 工作流](skill-workflows.md#安装)。

`VDOC_MCP_TOKEN` 是 shell 或 Agent 配置中的环境变量，不是 package CLI argument。不要把原始 token 放进 `npx`、`npm` 或 adapter 的 `args`。手工排查前运行 `set +x` 关闭 xtrace，并确保凭据不进入 shell history、日志或截图。

## 持续跟随 release / beta {#release-channels}

MCP 与配套 Skill 使用同一个渠道发行包。`release` 只选择正式版，`beta` 只选择 `vMAJOR.MINOR.PATCH-beta.N` 预发布；没有对应版本时安装器会报错，不会跨渠道回退。两者分别安装在 `~/.local/share/vdoc/mcp/release` 与 `~/.local/share/vdoc/mcp/beta`，不会替换已有全局 MCP。

首次从已审核、包含渠道安装器的 [MCP Release](https://github.com/ChnMig/Vdoc-mcp/releases) 下载 `install-channel.mjs` 和 `install-channel.mjs.sha256`。下面将安装器固定到 `v0.3.17-beta.15`，在独立工具目录中执行；下载或摘要校验失败会停止安装。旧版本没有这两个资产：

```sh
(
  set -eu
  VDOC_MCP_INSTALLER_TAG='v0.3.17-beta.15'
  VDOC_MCP_INSTALLER_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/$VDOC_MCP_INSTALLER_TAG"
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs" -o install-channel.mjs
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs.sha256" -o install-channel.mjs.sha256
  shasum -a 256 -c install-channel.mjs.sha256
  node install-channel.mjs --channel beta
  # 稳定环境使用：node install-channel.mjs --channel release
)
```

每次执行都会解析该渠道最新已发布版本，校验其发行包再安装。安装器会打印 MCP 可执行文件的绝对路径。将它填入 Agent 配置的 `command`，移除 `npx` 的 `args`：稳定连接命名为 `vdoc`，测试连接命名为 `vdoc_beta`。Beta 使用 `VDOC_BASE_URL=http://127.0.0.1:18080`（或测试域名）及 Beta 工作台创建的 Token；线上 Token 不在测试连接中使用。客户端连接两个环境时，必须由用户明确选择查询对象。

安装后，重复以下命令即可更新 beta MCP 和配套 Skill；稳定更新将两处 `beta` 改成 `release`：

```sh
node "$HOME/.local/share/vdoc/mcp/beta/node_modules/@vdoc/mcp/scripts/install-channel.mjs" --channel beta
```

更新后重启 MCP 连接并重新加载 Agent。Skill 应链接到各自 Agent 或项目的独立目录，见 [Skill 渠道隔离](skill-workflows.md#release-channels)。渠道安装器需要 Node.js 20+ 和 npm，无需 npm registry 发布。

本地开发或 package smoke：

```sh
cd Vdoc-mcp
npm ci
npm test
# 先通过私密 shell 环境或 Agent secret env 设置 VDOC_MCP_TOKEN。
VDOC_BASE_URL="http://127.0.0.1:8080" npm start
```

stdout 保留给 MCP protocol，普通诊断看 stderr。

## 环境变量

| Variable              | 是否必填                        | 说明                                                                                           |
| --------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `VDOC_BASE_URL`       | 当未设置 `VDOC_MCP_URL` 时必填  | Vdoc backend origin，adapter 会追加 `/api/v1/open/mcp`。                                       |
| `VDOC_MCP_URL`        | 当未设置 `VDOC_BASE_URL` 时必填 | 完整 Vdoc MCP endpoint URL，设置后覆盖 `VDOC_BASE_URL`。                                       |
| `VDOC_MCP_TOKEN`      | 必填                            | Admin 中创建的 MCP Token，只放在 Agent config 或 secret storage。                              |
| `VDOC_MCP_TIMEOUT_MS` | 可选                            | HTTP timeout，单位毫秒，默认 `180000`，范围 `1`–`180000`；agent 宿主的调用超时也需允许此时长。 |

完整 Compose 本机部署时，`VDOC_BASE_URL` 通常是 `http://127.0.0.1:8080`。远程部署时，改成 Agent 所在机器能访问的 backend 域名。

## Agent 配置示例

```json
{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": [
        "--yes",
        "github:ChnMig/Vdoc-mcp#a9711bfc718906dee9327c95941f9afde9246dc6"
      ],
      "env": {
        "VDOC_BASE_URL": "https://your-vdoc.example.test",
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
    "VDOC_MCP_URL": "https://your-vdoc.example.test/api/v1/open/mcp",
    "VDOC_MCP_TOKEN": "REPLACE_WITH_LOCAL_VDOC_MCP_TOKEN",
    "VDOC_MCP_TIMEOUT_MS": "180000"
  }
}
```

## 可用工具范围

Adapter 运行时读取后端 `tools/list`，以部署的工具定义为准。

v0.2 read tools 覆盖：

- projects
- documents
- API versions
- Markdown / TXT versions
- endpoint detail
- API diffs
- Markdown / TXT docs
- change summaries

`list_documents` 会按 token scope 过滤结果：只有 `api:read` 时仅返回 OpenAPI，只有 `doc:read` 时返回 Markdown 和 TXT，同时具备两者时返回全部文档类型。API read tools 只接受 OpenAPI，`doc_*` read tools 接受 Markdown 和 TXT，不能用一种 read scope 绕过另一种。

v0.2 draft tools 覆盖 OpenAPI、Markdown 和 TXT Draft 的创建、更新、查看和提交。规范工具清单如下（必须与后端 `tools/list` 一致）：

<!-- VDOC_MCP_TOOL_INVENTORY_START -->

- `list_projects`
- `list_documents`
- `list_document_branches`
- `list_api_endpoints`
- `list_api_versions`
- `list_doc_versions`
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
- `get_schema_version`
- `get_doc_version`

<!-- VDOC_MCP_TOOL_INVENTORY_END -->

`list_document_branches` 查询分支 ID、名称、默认及保护状态，包含未发布分支；`list_api_endpoints` 查询版本接口 ID，支持 `method` 和精确 OpenAPI `path` 筛选。先解析 ID，再查详情或建首份草稿。分支查询须有对应类型的 read scope；旧版缺少这些工具时，配套升级 Backend 与 Skill。

`get_endpoint_detail` 的 `normalized_operation.securitySchemes` 含接口所用鉴权方案；同名方案的 Header、位置、类型变化计入差异。保留 OpenAPI 3.1 Schema `$ref` 同级约束，Operation 参数按 `name + in` 覆盖 Path 参数。升级 Backend 后，历史读取／比较会从原文刷新旧解析结果，保留版本和接口 ID。

v0.2 不暴露直接发布工具。

## Agent 行为规则

- 回答 endpoint fields、response properties、enum values、auth schemes 或 Markdown / TXT 原文前，先查 Vdoc。
- 优先使用 stable ID 和 `relative_path`，不要依赖显示名称。
- 把 published Version 视为不可变事实。
- 不要说 Draft 已发布，除非 Admin 审核后已经生成 Version。
- tool call 失败时，遮盖 secret 后报告 envelope `code`、`status`、`message` 和 `trace_id`。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` header 值写进仓库、截图、日志、README 或 issue。

## 如何验证

- Agent MCP server `vdoc` 能启动。
- `tools/list` 成功返回 Vdoc tool schemas。
- 至少一个 read-only tool call 成功。
- token 没有出现在 process args、日志、文档或截图中。
- Agent 在依赖接口或文档事实的回答中说明事实来自 Vdoc 查询结果。

## v0.2：明确分支和历史版本

- `get_latest_doc`、`get_latest_schema` 必须传入 `branch_id`，不会跨分支自动选择。先用 `list_document_branches` 解析分支名称。
- 读取指定历史版本全文：Markdown / TXT 使用 `get_doc_version`，OpenAPI 使用 `get_schema_version`，参数均为 `project_id`、`document_id`、`version_id`。返回 `version` 与 `content`，请核对并引用实际版本。
- `get_api_version_draft` 保留原有元数据并增加 `content.content` 原始正文，`revision` 与正文来自同一快照，可用于后续 `expected_revision` 更新。
- Markdown / TXT 的 `create_doc_draft`、`update_doc_draft` 使用 `content` 正文字段；旧 `markdown_content` 仍兼容，至少提供一个，两个同时提供时必须相同。TXT 保留原文及换行，允许空正文，不经过 Markdown 或 OpenAPI 解析。先检查部署后端的实际 schema。
- 未声明的参数会返回 `INVALID_ARGUMENT`。旧客户端调用最新内容工具时需补上分支，不能传 `version_id` 期待读取历史内容。

首次接入可使用 [Codex／Cursor 配置步骤](admin-usage.md#connect-agent)。
