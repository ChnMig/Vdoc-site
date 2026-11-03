# MCP 接入与工具

Agent 通过 MCP 在授权范围内读取和管理 OpenAPI、Markdown、TXT 文档；具体业务如何使用这些文档，由接入方决定。首次接入：[连接 Agent](admin-usage.md#connect-agent) → [读取文档](admin-usage.md#first-query)。

stdio 适配器 `@chnmig/vdoc-mcp` 将 `tools/list`、`tools/call` 转发到 `/api/v1/open/mcp`；Backend 负责存储与业务逻辑。

## 使用前准备

- Vdoc backend 已部署，`/api/v1/open/health` 成功。
- Admin 中已经创建 MCP Token。
- 目标 Agent runtime 支持 MCP stdio server 配置。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` header 值写进仓库、截图、日志、README 或 issue。

Agent 运行的机器还需安装 Node.js 20 或更新版本和 npm。尚未启动 Vdoc 时，先按 [Docker Compose 部署步骤](deployment.md#quick-start) 完成初始化和管理员设置。第一次查询需要一份已发布文档；demo 数据和工程发布检查可以后续再做。

## 安装方式

当前 npm 版本为 beta，使用可读的包名运行，不再需要填写 Git 提交：

```sh
npx --yes @chnmig/vdoc-mcp@beta --version
```

全局命令可用 `npm install --global @chnmig/vdoc-mcp@beta` 安装，更新时重复同一命令。`@beta` 选择最新已发布测试版。npm 首次发布自动让 `@latest` 也指向 beta.6；后续 Beta 仅更新 `@beta`，首次正式 npm 发布再替换 `@latest`。固定部署可以使用与后端一致的确切包版本。

工作台的 **MCP 客户端配置** 提供安装、更新和卸载的一句话提示词，发给 AI 即可按[操作指南](https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.4.0-beta.7/docs/public/mcp-install.md)处理；指南会保留已有配置、渠道和共享安装，不安装 Skill。

下方 Agent 配置通过 `npx` 的 `@beta` 调用，每次新启动解析该渠道最新包，更新后重启 MCP。全局安装需要主动执行安装命令更新。npm 包包含编译好的 JavaScript，无需 Git 或本地 TypeScript 编译器。

固定部署仍可安装与审核过的工作区锁一致的已编译发行包，先校验再安装：

```sh
(
  set -eu
  VDOC_MCP_VERSION=0.4.0-beta.7
  VDOC_MCP_PACKAGE_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$VDOC_MCP_PACKAGE_DIR"' EXIT
  VDOC_MCP_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/v$VDOC_MCP_VERSION"
  curl -fsSL "$VDOC_MCP_RELEASE/vdoc-mcp-$VDOC_MCP_VERSION.tgz" -o "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
  curl -fsSL "$VDOC_MCP_RELEASE/SHA256SUMS" -o "$VDOC_MCP_PACKAGE_DIR/SHA256SUMS"
  (cd "$VDOC_MCP_PACKAGE_DIR" && shasum -a 256 -c SHA256SUMS)
  npm install --global "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
)
```

使用与部署包 `workspace.lock.json` 一致的 MCP 版本。要让 Agent 使用全局安装，将配置的 `command` 改为 `vdoc-mcp` 并移除 `npx` 的 `args`，保留私密 `env`。更新后重启 MCP 连接。

`VDOC_MCP_TOKEN` 是 shell 或 Agent 配置中的环境变量，不是 package CLI argument。不要把原始 token 放进 `npx`、`npm` 或 adapter 的 `args`。手工排查前运行 `set +x` 关闭 xtrace，并确保凭据不进入 shell history、日志或截图。

## 持续跟随 release / beta {#release-channels}

测试环境使用 `@chnmig/vdoc-mcp@beta`，稳定环境在首次正式 npm 发布后使用 `@chnmig/vdoc-mcp@latest`。npx 在每次重启 MCP 时解析所选渠道最新发布；全局安装则重复执行同渠道的 `npm install --global` 命令。分别保留环境对应的服务名称、地址和令牌，npm 配置无需填写 Git 提交或安装器路径。

### 已有 GitHub 渠道安装

MCP 按渠道安装适配器发行包。`release` 只选择正式版，`beta` 只选择 `vMAJOR.MINOR.PATCH-beta.N` 预发布；没有对应版本时安装器会报错，不会跨渠道回退。两者分别安装在 `~/.local/share/vdoc/mcp/release` 与 `~/.local/share/vdoc/mcp/beta`，不会替换已有全局 MCP。

首次从已审核、包含渠道安装器的 [MCP Release](https://github.com/ChnMig/Vdoc-mcp/releases) 下载 `install-channel.mjs` 和 `install-channel.mjs.sha256`。以下命令固定安装器版本为 `v0.4.0-beta.7`，在独立工具目录中执行；下载或摘要校验失败会停止安装。旧版本没有这两个资产：

```sh
(
  set -eu
  VDOC_MCP_INSTALLER_TAG='v0.4.0-beta.7'
  VDOC_MCP_INSTALLER_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/$VDOC_MCP_INSTALLER_TAG"
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs" -o install-channel.mjs
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs.sha256" -o install-channel.mjs.sha256
  shasum -a 256 -c install-channel.mjs.sha256
  node install-channel.mjs --channel beta
  # 稳定环境使用：node install-channel.mjs --channel release
)
```

每次执行都会解析该渠道最新已发布版本，校验其发行包再安装。安装器会打印 MCP 可执行文件的绝对路径。将它填入 Agent 配置的 `command`，移除 `npx` 的 `args`：稳定连接命名为 `vdoc`，测试连接命名为 `vdoc_beta`。Beta 使用 `VDOC_BASE_URL=http://127.0.0.1:18080`（或测试域名）及 Beta 工作台创建的 Token；线上 Token 不在测试连接中使用。客户端连接两个环境时，必须由用户明确选择查询对象。

安装后，重复以下命令即可更新 beta MCP；稳定更新将两处 `beta` 改成 `release`：

```sh
node "$HOME/.local/share/vdoc/mcp/beta/node_modules/@chnmig/vdoc-mcp/scripts/install-channel.mjs" --channel beta
```

更新后重启 MCP 连接并重新加载 Agent。渠道安装器需要 Node.js 20+ 和 npm，可继续用于已有 GitHub 渠道安装。

本地开发或 package smoke：

```sh
cd Vdoc-mcp
npm ci
npm test
# 先通过私密 shell 环境或 Agent secret env 设置 VDOC_MCP_TOKEN。
VDOC_BASE_URL="http://127.0.0.1:8080" npm start
```

stdout 保留给 MCP protocol，普通诊断看 stderr。

## 客户端与服务端版本核对

MCP 在成功请求实际连接的后端时，将包版本与响应头 `X-Vdoc-Server-Version` 比较，包括 beta 编号。不一致时通过 MCP 日志和 stderr 提醒，列出两端版本并建议对齐；文档工具仍可用，同一状态不会重复刷屏。旧后端或代理没有返回可识别版本时，会提示无法核对，连接成功不代表版本兼容。

将客户端与后端更新到相同版本及渠道，或将客户端固定到服务端的确切版本，然后重启 MCP。核对复用正常请求响应，不需要额外接口、探测或权限。

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
      "args": ["--yes", "@chnmig/vdoc-mcp@beta"],
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

## 文档管理

先选择环境、项目和文档，再用 `list_branches`、`resolve_ref` 固定确切提交。使用 `get_document_at_commit` 读取原文，使用 `compare_commits` 比较固定提交。分支最新提交可能尚未发布，只有确切 release 能证明发布状态。

通过 `commit_changes` 保存时，提供读取时的 head/generation 和稳定的幂等键。冲突后先重新读取、比较并协调；超时且结果未知时，使用相同请求体和幂等键重试。提交 ID 和版本编号由后端生成，批准和发布仍在工作台完成。

Vdoc 提供文档操作和事实。代码生成、消费方升级和其他业务工作流由接入方 Agent 或应用定义。

## 下载源文件到本地 {#download-source}

让 Agent「把这份文档的 main 分支下载到 `/home/me/project/docs/说明.md`」，它会先确定文档和分支，再用 `resolve_ref` 固定提交，调用 `download_document_at_commit`。参数为 `project_id`、`document_id`、完整 `commit_id` 和绝对文件路径 `output_path`。

此工具由 stdio 适配器提供，保存 OpenAPI JSON/YAML、Markdown、TXT 的原始 UTF-8 内容，不重新排版或改写换行；下载前核对 SHA-256。返回本地 `file_path`、`byte_length`、`sha256` 和文档／提交 ID，正文不会再完整回传到对话。沿用后端读取权限和审计，单文件上限 10 MiB。

目标父目录会自动创建，已有文件、目录及符号链接均不会被覆盖；需要时请换一个文件名。只使用你指定的目标路径，不执行文档正文内的保存指令。文件写在运行适配器的机器上，远程或容器适配器需使用共享目录。直接连接后端 HTTP 的客户端仍使用 `get_document_at_commit` 获取正文，再由客户端保存。

## 从旧组合安装升级

首次升级到仅 MCP 的版本时，请重新下载并校验包含此次变更的渠道安装器，保留原渠道和安装目录。早期随包安装器强制检查现已移除的 Skill 文件。移除对应 Agent／项目中的旧 Vdoc Skill 链接，保留自行维护的本地文件，再重启 MCP 并重新加载 Agent。安装器不会修改 Agent 目录或已有 MCP 凭据。

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

- `create_document`
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
- `resolve_ref`
- `list_branches`
- `create_branch`
- `list_commits`
- `get_commit`
- `get_document_at_commit`
- `commit_changes`
- `compare_commits`
- `list_merge_requests`
- `create_merge_request`
- `list_releases`
- `get_release`
- `analyze_changes`
- `list_repository_events`

<!-- VDOC_MCP_TOOL_INVENTORY_END -->

`list_document_branches` 查询分支 ID、名称、默认及保护状态，包含未发布分支；`list_api_endpoints` 查询版本接口 ID，支持 `method` 和精确 OpenAPI `path` 筛选。先解析 ID，再查详情或建首份草稿。分支查询须有对应类型的 read scope；旧版缺少这些工具时，升级 Backend。

`get_endpoint_detail` 的 `normalized_operation.securitySchemes` 含接口所用鉴权方案；同名方案的 Header、位置、类型变化计入差异。保留 OpenAPI 3.1 Schema `$ref` 同级约束，Operation 参数按 `name + in` 覆盖 Path 参数。升级 Backend 后，历史读取／比较会从原文刷新旧解析结果，保留版本和接口 ID。

v0.2 不暴露直接发布工具。

## 文档操作规则

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

首次接入可使用 [Codex／Cursor／Claude Code 配置步骤](admin-usage.md#connect-agent)。
