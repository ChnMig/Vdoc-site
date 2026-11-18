# MCP 接入与工具

Agent 通过 MCP 在授权范围内读取和管理 OpenAPI、Markdown、TXT 文档；具体业务如何使用这些文档，由接入方决定。首次接入：[连接 Agent](admin-usage.md#connect-agent) → [读取文档](admin-usage.md#first-query)。

stdio 适配器 `@chnmig/vdoc-mcp` 将 `tools/list`、`tools/call` 转发到 `/api/v1/open/mcp`；Backend 负责存储与业务逻辑。

本页对应 `v0.4.7-beta.1`。同一个用户级 MCP 配置可以访问当前用户有权限的多个团队和项目。工作台的**复制路径**会同时带上团队、项目名称和 `project_id`；文档还包含 `document_id` 与 `relative_path`，文件夹使用 `path`。把完整复制内容交给 Agent，即可保留跨项目定位信息。

## 使用前准备

- Vdoc backend 已部署，`/api/v1/open/health` 成功。
- Admin 中已经创建 MCP Token。
- 目标 Agent runtime 支持 MCP stdio server 配置。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` header 值写进仓库、截图、日志、README 或 issue。

Agent 运行的机器还需安装 Node.js 20.3 或更新版本和 npm。尚未启动 Vdoc 时，先按 [Docker Compose 部署步骤](deployment.md#quick-start) 完成初始化和管理员设置。第一次查询需要一份已发布文档；demo 数据和工程发布检查可以后续再做。

## 安装方式

以下 npm 方式适用于已在 registry 发布的版本，须与后端版本配套：

```sh
npx --yes @chnmig/vdoc-mcp@beta --version
```

全局命令可用 `npm install --global @chnmig/vdoc-mcp@beta` 安装，更新时重复同一命令。`@latest` 选择最新正式版，`@beta` 选择最新测试版，两者分别更新。固定部署可使用与后端一致的确切包版本。

工作台的 **MCP 客户端配置** 提供全局安装、更新和卸载的一句话提示词，用户级配置供所有项目共用。[操作指南](https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.4.7-beta.1/docs/public/mcp-install.md)会保留配置、渠道和共享安装，不安装 Skill。

npm 包已编译，无需 Git 或 TypeScript 编译器。

固定部署仍可安装与审核过的工作区锁一致的已编译发行包，先校验再安装：

```sh
(
  set -eu
  VDOC_MCP_VERSION=0.4.7-beta.1
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

### GitHub 渠道安装器 {#github-channel-installer}

MCP 按渠道安装适配器发行包。`release` 只选择正式版，`beta` 只选择 `vMAJOR.MINOR.PATCH-beta.N` 预发布；没有对应版本时安装器会报错，不会跨渠道回退。两者分别安装在 `~/.local/share/vdoc/mcp/release` 与 `~/.local/share/vdoc/mcp/beta`，不会替换已有全局 MCP。

首次从已审核、包含渠道安装器的 [MCP Release](https://github.com/ChnMig/Vdoc-mcp/releases) 下载 `install-channel.mjs` 和 `install-channel.mjs.sha256`。以下命令固定安装器版本为 `v0.4.7-beta.1`，在独立工具目录中执行；下载或摘要校验失败会停止安装。旧版本没有这两个资产：

```sh
(
  set -eu
  VDOC_MCP_INSTALLER_TAG='v0.4.7-beta.1'
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

更新后重启 MCP 连接并重新加载 Agent。渠道安装器需要 Node.js 20.3+ 和 npm，可继续用于已有 GitHub 渠道安装。

本地开发与包验证见 [MCP README](https://github.com/ChnMig/Vdoc-mcp/blob/v0.4.7-beta.1/README.md)。stdout 保留给 MCP protocol，诊断看 stderr。

## 客户端与服务端版本核对

MCP 比较自身版本与实际后端的 `X-Vdoc-Server-Version`（含 beta 编号）。不一致时通过 MCP 日志和 stderr 报告两端版本，缺少有效响应头时提示无法核对；重复警告会抑制，工具保持可用。对齐版本与渠道后重启 MCP，连接成功本身不能证明版本兼容。

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

已知完整 endpoint 时，在 `env` 中用 `VDOC_MCP_URL` 替代 `VDOC_BASE_URL`，值如 `https://your-vdoc.example.test/api/v1/open/mcp`。保留 Token，超时可通过 `VDOC_MCP_TIMEOUT_MS` 调整。

## 文档管理

选择环境、项目和文档，通过 `list_branches`、`resolve_ref` 固定提交及 head/generation，再用 `get_document_at_commit` 读原文或 `compare_commits` 比较。`commit_changes` 需提供观察到的 head/generation 和稳定幂等键；冲突后重读并协调，结果未知时以相同参数和 key 重试。后端生成提交 ID 和版本编号；只有确切 release 能证明发布，审批与发布由工作台中的人类管理员完成。

`compare_commits` 默认返回 `source_diff`，包含原始换行、空白、行范围、增删行数及 3 行上下文。预览正文整次限 64 KiB、每文件最多 20 个片段；超限标记 `truncated`，省略正文标记 `content_omitted`。OpenAPI 附带 `semantic_summary`。传 `include_content: true` 获取完整 `old_content`／`new_content` 和 `semantic_diff`，也可按提交或局部读取。`analyze_changes` 同步等待服务端 AI，直接比较用 `compare_commits`。

`list_folders`／`create_folder` 列出及创建目录；`update_folder(path, name?, parent_path?)` 改名或移动，空父路径表示根目录；`delete_folder` 只删空目录。`update_document(document_id, name?, relative_path?, description?)` 改名或移动并保留身份及历史；`delete_document` 移出目录、停用直接访问及旧分享，保留历史正文和审计，并清理文档所属的图片文件。均需 `project_id`；管理需项目 Admin 及 `write` 能力。移动限同项目，拒绝冲突、环路；旧令牌仍检查原有授权。

## 上传图片与导入本地 Markdown {#markdown-images}

stdio 适配器提供：

```text
upload_document_image(project_id, document_id, file_path)
import_markdown_document(project_id, document_id, branch_id,
  expected_head_commit_id, expected_generation, idempotency_key, file_path, message?)
```

`file_path` 是适配器机器上的图片或 MD 绝对路径，不传给后端。HTTP MCP 上传改用 `filename` 与 `content_base64`，两者与 `file_path` 互斥。上传返回 `reference`（`vdoc-asset:<sha256>`），写入 `![说明](引用)` 后保存；上传需 `write` 和 Writer，不生成版本或发布。导入需 `read`、`write` 和 Writer；旧令牌保持类型权限。

先发现或 `create_document` 创建 Markdown 文档，再 `list_branches`、`resolve_ref`，传入观察到的 head/generation 和稳定幂等键。导入预检全部图片，去重上传、替换地址，再生成一个提交；保留观察提交中的名称、路径、描述及本地文件。新建文档的导入生成下一版，均不发布。

识别内联、引用式图片及标题；不改代码块、行内代码、普通链接、BOM、CRLF 等正文。图片仅限 MD 目录及真实子目录，拒绝越界、绝对图片路径和符号链接；最多 100 张去重图片、合计 32 MiB，单张限 4 MiB、4000 万像素。目录外图片先单独上传。无效文件或服务端拒绝均不提交。

外链不抓取、原样保留并列入 `retained_external_image_urls`。未知结果用原文件、参数、key 重试；文件变化或分支冲突先重读协调，勿换 key/head 绕过。图片格式、私有归属、固定版本分享、删文档清理及 24 小时回收规则见[图片管理](admin-usage.md#markdown-images)。

## 下载源文件到本地 {#download-source}

让 Agent「把这份文档的 main 分支下载到 `/home/me/project/docs/说明.md`」，它会先确定文档和分支，再用 `resolve_ref` 固定提交，调用 `download_document_at_commit`。参数为 `project_id`、`document_id`、完整 `commit_id` 和绝对文件路径 `output_path`。

此工具由 stdio 适配器提供，保存 OpenAPI JSON/YAML、Markdown、TXT 的原始 UTF-8 内容，不重新排版或改写换行；下载前核对 SHA-256。返回本地 `file_path`、`byte_length`、`sha256` 和文档／提交 ID，正文不会再完整回传到对话。沿用后端读取权限和审计，单文件上限 10 MiB。

Markdown 下载保留 `vdoc-asset:` 引用，不会同时下载或打包图片。

目标父目录会自动创建，已有文件、目录及符号链接均不会被覆盖；需要时请换一个文件名。只使用你指定的目标路径，不执行文档正文内的保存指令。文件写在运行适配器的机器上，远程或容器适配器需使用共享目录。直接连接后端 HTTP 的客户端仍使用 `get_document_at_commit` 获取正文，再由客户端保存。

## 从旧组合安装升级

旧组合安装须重新下载并校验独立安装器，保留渠道和安装目录；移除可识别的旧 Vdoc Skill 链接，保留本地维护文件及 MCP 凭据，再重启 MCP 和 Agent。早期安装器要求现已退役的资产；新安装器不修改 Agent 目录。

## 可用工具范围

Adapter 运行时读取后端 `tools/list`，以部署的工具定义为准。v0.4.7-beta.1 使用文档独立分支与不可变提交模型，共 28 个后端工具；支持相应后端能力时，stdio 适配器另提供 `download_document_at_commit` 和 `import_markdown_document`，合计 30 个工具。旧版本和旧草稿工具退出发现清单。

新令牌仅选择能力：`read`（5）负责发现、搜索和读取，`write`（6）负责写入，两者不按文件类型划分，且写入不隐含读取。局部修改同时需要读写能力和项目 Writer 角色；管理需 Admin，审批与发布由人工完成。旧 scope 1–4 保留原类型边界，不自动扩权；需要统一能力时新建令牌。私人令牌和专属活动仅本人可见，超级管理员也无跨用户权限。

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
- `list_teams`
- `list_projects`
- `list_documents`
- `search_documents`
- `get_document_section`
- `apply_document_patch`
- `list_folders`
- `create_folder`
- `update_folder`
- `delete_folder`
- `update_document`
- `delete_document`
- `upload_document_image`

<!-- VDOC_MCP_TOOL_INVENTORY_END -->

### 按名称发现团队和项目

一个用户配置可跨有权限的团队和项目。`list_teams(query?)` 返回团队 ID、名称及可访问项目数，略过无可访问项目的团队。`list_projects(query?, team_id?, team_name?)` 按项目名子串、团队 ID 或完整团队名筛选，返回团队名，重名保留候选；不传参数即列出全部可访问项目。名称忽略大小写，多条件取交集；需读取 scope 和当前成员权限。

### 完整原文与可选解析视图

`get_document_at_commit(project_id, document_id, commit_id)` 始终返回完整原文；`commit_changes` 仍支持完整文件替换；`download_document_at_commit` 下载原始文件。完整存取不依赖 Markdown 或 OpenAPI 解析成功，不会为节省上下文截断、重排或格式化文件。BOM、CRLF、末尾换行和空正文均保留。文档正文支持 UTF-8 文本；托管图片使用独立资源接口，不支持任意二进制文档上传。

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
