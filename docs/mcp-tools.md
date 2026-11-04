# MCP 接入与工具

Agent 通过 MCP 在授权范围内读取和管理 OpenAPI、Markdown、TXT 文档；具体业务如何使用这些文档，由接入方决定。首次接入：[连接 Agent](admin-usage.md#connect-agent) → [读取文档](admin-usage.md#first-query)。

stdio 适配器 `@chnmig/vdoc-mcp` 将 `tools/list`、`tools/call` 转发到 `/api/v1/open/mcp`；Backend 负责存储与业务逻辑。

本页工具清单对应 `v0.4.1`（npm `@latest`）。稳定版部署应使用与其后端一致的 MCP 版本。

## 使用前准备

- Vdoc backend 已部署，`/api/v1/open/health` 成功。
- Admin 中已经创建 MCP Token。
- 目标 Agent runtime 支持 MCP stdio server 配置。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` header 值写进仓库、截图、日志、README 或 issue。

Agent 运行的机器还需安装 Node.js 20 或更新版本和 npm。尚未启动 Vdoc 时，先按 [Docker Compose 部署步骤](deployment.md#quick-start) 完成初始化和管理员设置。第一次查询需要一份已发布文档；demo 数据和工程发布检查可以后续再做。

## 安装方式

正式环境使用 npm 的 `@latest`，连接配套正式版后端，无需填写 Git 提交：

```sh
npx --yes @chnmig/vdoc-mcp@latest --version
```

全局命令可用 `npm install --global @chnmig/vdoc-mcp@latest` 安装，更新时重复同一命令。`@latest` 选择最新正式版，`@beta` 选择最新测试版，两者分别更新。固定部署可使用与后端一致的确切包版本。

工作台的 **MCP 客户端配置** 提供安装、更新和卸载的一句话提示词，发给 AI 即可按[操作指南](https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.4.1/docs/public/mcp-install.md)处理；指南会保留已有配置、渠道和共享安装，不安装 Skill。

下方 Agent 配置通过 `npx` 的 `@latest` 调用，每次新启动解析该渠道最新包，更新后重启 MCP。全局安装需要主动执行安装命令更新。npm 包包含编译好的 JavaScript，无需 Git 或本地 TypeScript 编译器。

固定部署仍可安装与审核过的工作区锁一致的已编译发行包，先校验再安装：

```sh
(
  set -eu
  VDOC_MCP_VERSION=0.4.1
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

测试环境使用 `@chnmig/vdoc-mcp@beta`，稳定环境使用 `@chnmig/vdoc-mcp@latest`。npx 在每次重启 MCP 时解析所选渠道最新发布；全局安装则重复执行同渠道的 `npm install --global` 命令。分别保留环境对应的服务名称、地址和令牌，npm 配置无需填写 Git 提交或安装器路径。

### 已有 GitHub 渠道安装

MCP 按渠道安装适配器发行包。`release` 只选择正式版，`beta` 只选择 `vMAJOR.MINOR.PATCH-beta.N` 预发布；没有对应版本时安装器会报错，不会跨渠道回退。两者分别安装在 `~/.local/share/vdoc/mcp/release` 与 `~/.local/share/vdoc/mcp/beta`，不会替换已有全局 MCP。

首次从已审核、包含渠道安装器的 [MCP Release](https://github.com/ChnMig/Vdoc-mcp/releases) 下载 `install-channel.mjs` 和 `install-channel.mjs.sha256`。以下命令固定安装器版本为 `v0.4.1`，在独立工具目录中执行；下载或摘要校验失败会停止安装。旧版本没有这两个资产：

```sh
(
  set -eu
  VDOC_MCP_INSTALLER_TAG='v0.4.1'
  VDOC_MCP_INSTALLER_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/$VDOC_MCP_INSTALLER_TAG"
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs" -o install-channel.mjs
  curl -fL "$VDOC_MCP_INSTALLER_RELEASE/install-channel.mjs.sha256" -o install-channel.mjs.sha256
  shasum -a 256 -c install-channel.mjs.sha256
  node install-channel.mjs --channel release
  # 测试环境使用：node install-channel.mjs --channel beta
)
```

每次执行都会解析该渠道最新已发布版本，校验其发行包再安装。安装器会打印 MCP 可执行文件的绝对路径。将它填入 Agent 配置的 `command`，移除 `npx` 的 `args`：稳定连接命名为 `vdoc`，测试连接命名为 `vdoc_beta`。Beta 使用 `VDOC_BASE_URL=http://127.0.0.1:18080`（或测试域名）及 Beta 工作台创建的 Token；线上 Token 不在测试连接中使用。客户端连接两个环境时，必须由用户明确选择查询对象。

安装后，重复所选渠道的命令更新 MCP。正式环境使用 `release`，测试环境使用 `beta`：

```sh
node "$HOME/.local/share/vdoc/mcp/release/node_modules/@chnmig/vdoc-mcp/scripts/install-channel.mjs" --channel release
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
      "args": ["--yes", "@chnmig/vdoc-mcp@latest"],
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

Adapter 运行时读取后端 `tools/list`，以部署的工具定义为准。默认清单使用文档独立分支与不可变提交模型，共 20 个后端工具；stdio 适配器另提供 `download_document_at_commit`。旧版本和旧草稿工具退出发现清单。

`list_documents` 和搜索按 token 的文档类型权限过滤：`api:read` 读取 OpenAPI，`doc:read` 读取 Markdown 与 TXT。局部修改需要同一文档类型的 read 与 draft scope，并且用户拥有项目 Writer 权限；审批与发布由人类管理员完成。

<!-- VDOC_MCP_TOOL_INVENTORY_START -->

- `create_document`
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
- `list_projects`
- `list_documents`
- `search_documents`
- `get_document_section`
- `apply_document_patch`

<!-- VDOC_MCP_TOOL_INVENTORY_END -->

### 完整原文与可选解析视图

`get_document_at_commit(project_id, document_id, commit_id)` 始终返回完整原文；`commit_changes` 仍支持完整文件替换；`download_document_at_commit` 下载原始文件。完整存取不依赖 Markdown 或 OpenAPI 解析成功，不会为节省上下文截断、重排或格式化文件。BOM、CRLF、末尾换行和空正文均保留。当前存储支持 UTF-8 文本；任意二进制上传需要后续单独扩展。

`get_document_section` 以确切 `commit_id` 提供可选视图：

- `kind=lines`（默认）：任意已存储文本按 1-based、含首尾的 `start_line` / `end_line` 读取，默认最多 200 行，单次最多 500 行和 256 KiB。使用 `next_line` 继续读取。超限明确报错，可缩小范围或读取全文。
- `kind=markdown_heading`：按唯一 `heading` 读取 ATX 标题及子章节，忽略围栏代码块里的标题。重名标题要求改用行号。
- `kind=openapi_operation`：按 `method` 和精确 `path` 读取解析后的接口；`content_kind=derived_json` 明确表示派生 JSON，不能当作原始文件替换。
- `kind=outline`：列出 Markdown ATX 标题或 OpenAPI 接口，最多 500 项和 256 KiB。解析失败仍可按行读取、读取全文或下载原文件。

### 搜索与局部修改

`search_documents(project_id, query)` 按不区分大小写的字面关键词搜索标题、路径与原文。可指定 `path_prefix`，或指定 `document_id` 配合 `branch_id` / `commit_id`；两种引用不能同时提供。默认检索各文档默认分支。每条结果包含确切提交、匹配字段、片段和正文行号。`limit` 默认 20，最大 50；扫描预算为每页 100 份文档或累计读取达到 16 MiB（当前文件读取完成后停止）。即使本页没有匹配，存在 `next_cursor` 时也必须继续。游标绑定搜索条件；默认分支可在翻页期间前进，各条结果仍固定到实际检索的提交。

`apply_document_patch` 提交 `document_id`、`branch_id`、已观察的 `expected_head_commit_id`、`expected_generation`、稳定的 `idempotency_key` 和 1–100 项 `edits`。每项包含 `old_text` 与 `new_text`；所有锚点针对同一份原文，必须唯一且互不重叠。空 `old_text` 只允许用于空文件的单项插入，空 `new_text` 表示删除。其余字节及元数据不变；成功生成正常的编号提交，不发布。

HEAD 或 generation 变化时重新读取、比较并协调；锚点缺失或重复时明确报错。结果未知时使用完全相同的参数和 key 重试，分支已前进也返回原提交。相同 key 不能用于另一份 patch。

首次接入可使用 [Codex／Cursor／Claude Code 配置步骤](admin-usage.md#connect-agent)。
