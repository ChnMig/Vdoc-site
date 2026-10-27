# Skill 工作流

Vdoc Skill 教 Agent 先查 MCP 事实；不存数据、不计算 diff、不直接调用后端。

## 让 AI 安装、更新或卸载 {#ai-install}

复制一句话给 AI，安装 Skill 无需 Token；[AI 接入说明](https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.17/docs/public/skill-install.md)详述操作与校验。

<div class="skill-install-prompts">

稳定项目：

```text
请阅读 https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.17/docs/public/skill-install.md，帮我把 Vdoc Skill 安装到当前项目，使用 release 渠道。
```

测试项目：

```text
请阅读 https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.17/docs/public/skill-install.md，帮我把 Vdoc Skill 安装到当前项目，使用 beta 渠道。
```

更新当前项目（保持原渠道）：

```text
请阅读 https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.17/docs/public/skill-install.md，将当前项目已安装的 Vdoc MCP 和 Skill 更新到原渠道最新版本，保留现有安装位置和 MCP 配置。
```

卸载当前项目接入：

```text
请阅读 https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.17/docs/public/skill-install.md，卸载当前项目的 Vdoc MCP 和 Skill 接入，保留其他项目共用的安装以及其他工具配置。
```

</div>

## 使用 Skill 查询前

- runtime 支持 Skill／自定义工作流，已确定 Skill 目录。
- [MCP 已配置](mcp-tools.md)，Vdoc `tools/list` 调用成功。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` 值写进 Skill、示例、日志或 issue。

未部署时按[部署指南](deployment.md#quick-start)初始化，再用[首次查询](admin-usage.md#first-query)验证连接与权限。

## 安装

可选 `Vdoc-mcp/skills/vdoc` 自 v0.3.7 起与 MCP 共包、共锁定版本；MCP 可独立使用。按 [MCP 安装方式](mcp-tools.md#安装方式)校验并全局安装编译包，避免 Git 准备时报 `tsc: command not found`，再链接：

```sh
# Personal install; change the directory for another agent or project scope.
(
  set -eu
  VDOC_SKILL_DIR="$HOME/.agents/skills/vdoc"
  vdoc-mcp skill install --directory "$VDOC_SKILL_DIR"
  test -f "$VDOC_SKILL_DIR/SKILL.md"
)
```

链接含引用、模板和示例。Claude Code 用 `--directory "$HOME/.claude/skills/vdoc"`，项目用 `--directory .agents/skills/vdoc`。已有目标不覆盖；迁移前保留修改、移走旧安装。个人规则另存，不改包文件。

### 更新

校验新版已审核 lock 的 MCP 包，在原 npm 全局 prefix 重装；Skill 随链接更新，重启 MCP、重载 Agent。换 Node/npm prefix 后重链；旧 Git pin 须更新或改用全局 `vdoc-mcp`。包未上 npm；registry 发布且迁移 Git 安装后才可 `npm update --global @vdoc/mcp`。勿链接临时 `npx` 缓存。

### release / beta 隔离 {#release-channels}

按 [MCP 渠道安装入口](mcp-tools.md#release-channels)安装，在独立测试项目链接 beta：

```sh
"$HOME/.local/share/vdoc/mcp/beta/node_modules/.bin/vdoc-mcp" skill install --directory .agents/skills/vdoc
```

稳定项目从 `~/.local/share/vdoc/mcp/release/node_modules/.bin/vdoc-mcp` 链接独立目录；Beta 的 Skill 目录、MCP 配置与 Token 独立。按原渠道、原 prefix 重装并重启 MCP／重载 Agent；未知来源或渠道冲突须先确认，不覆盖。[MCP 连接](mcp-tools.md)另配。

合并仓库内验证 MCP 与 Skill：

```sh
cd Vdoc-mcp
npm test
```

## Agent 必须先查 Vdoc 的场景

- 前后端 endpoint 集成，检查 endpoint、field、enum、response property、auth scheme、server 存在性。
- 比较 API/Markdown/TXT Version；据 semantic diff 写迁移说明。
- 引用已发布 Markdown／TXT 原文；创建、更新或提交 Draft。

## 工作流 1：endpoint 集成

1. 集成 endpoint 前加载 Skill，用 `list_projects`、`list_documents` 或 `list_api_versions` 定位版本。
2. 用 `get_endpoint_detail` 读取 method、path、parameters、request body、response body 与 auth。
3. 据返回事实写代码／说明，引用 Vdoc，不猜测。

## 工作流 2：迁移分析

1. 用 MCP 定位待比较的 `from_version_id`、`to_version_id`。
2. 调用 `compare_api_versions` 或 `get_change_summary`，据结果说明 breaking change、兼容变化及迁移动作。
3. 缺版本则先在 Admin 发布，不编造结论。

## 工作流 3：Markdown / TXT 文档 Draft

1. 修改前用 `get_latest_doc` 读已发布内容，再按用户要求修订。
2. 用 `create_doc_draft`／`update_doc_draft` 建 Draft，`submit_doc_draft` 提交人工审核。
3. Admin/SuperAdmin 在 Admin 审核发布。

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

解释 endpoint 请求字段须先查 MCP、引用 `get_endpoint_detail` 等事实。发布只提交 Draft，交 Admin/SuperAdmin 审核。

## 失败信号

- 编造未查 Vdoc 的字段，或用显示名代替 stable ID/`relative_path`。
- 未有新 Version 却声称 Draft 已发布。
- 将 MCP Token 放入 CLI args、日志或文档。
- Live E2E 指向应用库，而非一次性 `VDOC_TEST_POSTGRES_DB`（默认 `vdoc_e2e`）。

重载 Skill、确认 MCP 可用，要求先查 Vdoc。
