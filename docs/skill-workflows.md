# Skill 工作流

Vdoc Skill 是安装到 Agent runtime 的工作流包。它不存数据、不计算 diff、不直接调用后端，而是教 Agent 什么时候必须通过 Vdoc MCP 查询事实。

## 使用前准备

- Agent 已配置 [MCP 工具](mcp-tools.md)，并能成功调用 Vdoc `tools/list`。
- 目标 runtime 支持安装 skill 或自定义工作流说明。
- 你知道 runtime 要求的 skill folder 位置。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` header 值写进 Skill 文件、示例、日志或 issue。

尚未启动 Vdoc 时，先按 [部署指南](deployment.md#quick-start) 完成初始化。建议在安装 Skill 前先完成 [第一次已发布文档查询](admin-usage.md#first-query)，确认 MCP 连接和文档权限已经可用。

## 安装

从 v0.3.7 起，可选 Skill 位于 `Vdoc-mcp/skills/vdoc`，并随 MCP 包一起发布；不安装 Skill 也能使用 MCP 工具。两者统一使用发布锁中的 `Vdoc-mcp` 版本。下载并校验编译好的发行包，避免 npm 全局 Git 安装在准备阶段报 `tsc: command not found`：

```sh
# Personal install; change the directory for another agent or project scope.
(
  set -eu
  VDOC_SKILL_DIR="$HOME/.agents/skills/vdoc"
  VDOC_MCP_VERSION=0.3.9
  VDOC_MCP_PACKAGE_DIR="$(mktemp -d)"
  trap 'rm -rf -- "$VDOC_MCP_PACKAGE_DIR"' EXIT
  VDOC_MCP_RELEASE="https://github.com/ChnMig/Vdoc-mcp/releases/download/v$VDOC_MCP_VERSION"
  curl -fsSL "$VDOC_MCP_RELEASE/vdoc-mcp-$VDOC_MCP_VERSION.tgz" -o "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
  curl -fsSL "$VDOC_MCP_RELEASE/SHA256SUMS" -o "$VDOC_MCP_PACKAGE_DIR/SHA256SUMS"
  (cd "$VDOC_MCP_PACKAGE_DIR" && shasum -a 256 -c SHA256SUMS)
  npm install --global "$VDOC_MCP_PACKAGE_DIR/vdoc-mcp-$VDOC_MCP_VERSION.tgz"
  vdoc-mcp skill install --directory "$VDOC_SKILL_DIR"
  test -f "$VDOC_SKILL_DIR/SKILL.md"
)
```

安装器会链接完整 Skill，包括引用文件、模板和示例。Claude Code 可使用 `--directory "$HOME/.claude/skills/vdoc"`，项目范围可使用 `--directory .agents/skills/vdoc`。

如果目标目录已经存在，安装器不会覆盖它。迁移前保留本地修改并移走旧安装；个人规则应独立存放，不要修改链接指向的包文件。

### 更新

使用新版已审核 lock 对应的 MCP 发行包，校验后在同一个 npm 全局安装位置重新安装即可，链接的 Skill 会同步更新。之后重新加载 Agent 并重启 MCP。切换 Node 安装或 npm prefix 后需要重新链接。若 MCP 配置仍固定在另一个 Git commit，也要更新该配置，或改为启动全局 `vdoc-mcp` 命令。

目前包尚未发布到 npm。发布并从 Git 固定安装迁移到 registry 安装后，才适用 `npm update --global @vdoc/mcp`。不要从临时 `npx` 缓存目录建立持久 Skill 链接。

### 使用 Skills CLI 单独安装

```sh
npx skills add ChnMig/Vdoc-mcp --skill vdoc -g
```

该方式跟随仓库默认分支，由 Skills CLI 独立管理，更新全局 MCP 包不会替它更新。固定版本安装可使用包含已审核 commit 和 `skills/vdoc` 目录的 GitHub tree URL。不要让两种安装器管理同一个目录；[MCP 连接](mcp-tools.md)仍需单独配置。

在合并后的仓库中验证 MCP 与 Skill：

```sh
cd Vdoc-mcp
npm test
```

## Agent 必须先查 Vdoc 的场景

- 写前端或后端 endpoint integration。
- 判断 endpoint、field、enum、response property、auth scheme 或 server 是否存在。
- 比较两个 API 或 Markdown Version。
- 根据 semantic diff 准备迁移说明。
- 引用已发布 Markdown 文档原文。
- 创建、更新或提交 Draft。

## 工作流 1：endpoint 集成

1. 用户提出集成某个 endpoint。
2. Agent 加载 Vdoc Skill。
3. Agent 通过 MCP 调用 `list_projects`、`list_documents` 或 `list_api_versions` 定位目标版本。
4. Agent 调用 `get_endpoint_detail` 获取 method、path、parameters、request body、response body 和 auth 信息。
5. Agent 根据查询结果写代码或说明。
6. Agent 在回答中说明事实来自 Vdoc，而不是猜测。

## 工作流 2：迁移分析

1. 用户询问两个 API 版本的迁移影响。
2. Agent 通过 MCP 定位 `from_version_id` 和 `to_version_id`。
3. Agent 调用 `compare_api_versions` 或 `get_change_summary`。
4. Agent 只基于返回结果说明 breaking change、兼容变化和迁移动作。
5. 如果 Vdoc 没有对应版本，Agent 应要求先在 Admin 中发布版本，而不是编造结论。

## 工作流 3：Markdown 文档 Draft

1. 用户要求修改已托管的 Markdown 文档。
2. Agent 调用 `get_latest_doc` 读取已发布内容。
3. Agent 基于用户要求生成修改稿。
4. Agent 使用 `create_doc_draft` 或 `update_doc_draft` 创建 Draft。
5. Agent 使用 `submit_doc_draft` 提交人工审核。
6. Admin 或 SuperAdmin 在 Admin 中审核并发布。

## 好提示示例

```text
先查 Vdoc。找到 POST /orders 的已发布 endpoint detail，再更新客户端 payload 校验。
```

```text
比较当前 prod OpenAPI version 和上一个 version，先总结 breaking changes，再改文档。
```

```text
读取 Vdoc 中已审核的 runbook Markdown，然后只基于这些事实回答部署问题。
```

## 如何验证

1. 让 Agent 说明某个 endpoint 的请求字段。
2. 观察 Agent 是否先调用 Vdoc MCP。
3. 检查回答是否引用 `get_endpoint_detail` 或相关 Vdoc tool 的结果。
4. 要求 Agent 发布版本，确认它只提交 Draft，并提示需要 Admin 或 SuperAdmin 审核。

## 失败信号

- Agent 没有查询 Vdoc 就编造 endpoint fields。
- Agent 使用显示名称替代 stable ID 或 `relative_path`。
- Agent 说 Draft 已发布，但 Admin 中还没有新 Version。
- Agent 把 MCP Token 放进 CLI args、日志或文档。
- Live E2E 被指向应用数据库，而不是一次性 `VDOC_TEST_POSTGRES_DB`，默认 `vdoc_e2e`。

出现这些情况时，重新加载 Skill，确认 MCP 可用，并明确要求 Agent 先查询 Vdoc MCP。
