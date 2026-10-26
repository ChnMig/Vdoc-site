# Skill 工作流

Vdoc Skill 教 Agent 先查 MCP 事实；不存数据、不计算 diff、不直接调用后端。

## 让 AI 安装、更新或卸载 {#ai-install}

复制一句话给 AI。安装 Skill 无需 Token；[AI 接入说明](https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md)包含安装、校验、更新和卸载步骤。

<div class="skill-install-prompts">

稳定项目：

```text
请阅读 https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md，帮我把 Vdoc Skill 安装到当前项目，使用 release 渠道。
```

测试项目：

```text
请阅读 https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md，帮我把 Vdoc Skill 安装到当前项目，使用 beta 渠道。
```

更新当前项目（保持原渠道）：

```text
请阅读 https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md，将当前项目已安装的 Vdoc MCP 和 Skill 更新到原渠道最新版本，保留现有安装位置和 MCP 配置。
```

卸载当前项目接入：

```text
请阅读 https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md，卸载当前项目的 Vdoc MCP 和 Skill 接入，保留其他项目共用的安装以及其他工具配置。
```

</div>

## 使用 Skill 查询前

- runtime 支持 Skill／自定义工作流，已确定 Skill 目录。
- [MCP 已配置](mcp-tools.md)，Vdoc `tools/list` 调用成功。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` 值写进 Skill、示例、日志或 issue。

未部署时按[部署指南](deployment.md#quick-start)初始化；查询前用[首次文档查询](admin-usage.md#first-query)验证连接与权限。

## 安装

自 v0.3.7 起，可选的 `Vdoc-mcp/skills/vdoc` 与 MCP 共用包及 lock 中的 `Vdoc-mcp` 版本；MCP 不依赖 Skill。按 [MCP 安装方式](mcp-tools.md#安装方式)校验、全局安装编译发行包，避免 Git 准备阶段报 `tsc: command not found`，再链接 Skill：

```sh
# Personal install; change the directory for another agent or project scope.
(
  set -eu
  VDOC_SKILL_DIR="$HOME/.agents/skills/vdoc"
  vdoc-mcp skill install --directory "$VDOC_SKILL_DIR"
  test -f "$VDOC_SKILL_DIR/SKILL.md"
)
```

链接含全部引用、模板和示例。Claude Code 使用 `--directory "$HOME/.claude/skills/vdoc"`，项目范围使用 `--directory .agents/skills/vdoc`。已有目标不会被覆盖；迁移前保留修改并移走旧安装。个人规则另存，不修改包内文件。

### 更新

校验新版已审核 lock 的 MCP 发行包，重装到原 npm 全局位置，Skill 随链接更新；重启 MCP、重载 Agent。更换 Node／npm prefix 须重新链接。配置固定旧 Git commit 时，更新它或改用全局 `vdoc-mcp`。

包尚未发布到 npm；完成 registry 发布并从 Git 安装迁移后才可用 `npm update --global @vdoc/mcp`。不要从临时 `npx` 缓存建立持久链接。

### release / beta 隔离 {#release-channels}

通过 [MCP 渠道安装入口](mcp-tools.md#release-channels)安装后，在独立测试项目链接 beta Skill：

```sh
"$HOME/.local/share/vdoc/mcp/beta/node_modules/.bin/vdoc-mcp" skill install --directory .agents/skills/vdoc
```

稳定项目从 `~/.local/share/vdoc/mcp/release/node_modules/.bin/vdoc-mcp` 链接到独立目录；Beta 使用自己的 Skill 目录、MCP 配置和 Token。更新时核对原渠道和安装位置，重复相同渠道、相同 prefix 的安装命令；Skill 随链接更新，重启 MCP 并重载 Agent。来源不明或渠道不匹配时先确认，不覆盖旧安装。[MCP 连接](mcp-tools.md)另行配置。

在合并仓库验证 MCP 与 Skill：

```sh
cd Vdoc-mcp
npm test
```

## Agent 必须先查 Vdoc 的场景

- 前后端 endpoint 集成，或判断 endpoint、field、enum、response property、auth scheme、server 是否存在。
- 比较 API、Markdown、TXT Version，或按 semantic diff 准备迁移说明。
- 引用已发布 Markdown／TXT 原文；创建、更新或提交 Draft。

## 工作流 1：endpoint 集成

1. 集成用户要求的 endpoint 时，加载 Skill，用 `list_projects`、`list_documents` 或 `list_api_versions` 定位版本。
2. 用 `get_endpoint_detail` 读取 method、path、parameters、request body、response body 与 auth。
3. 按返回事实写代码／说明，标明来自 Vdoc，不猜测。

## 工作流 2：迁移分析

1. 用户比较 API 版本时，用 MCP 定位 `from_version_id`、`to_version_id`。
2. 调用 `compare_api_versions` 或 `get_change_summary`，仅按结果说明 breaking change、兼容变化及迁移动作。
3. 缺少版本时要求先在 Admin 发布，不编造结论。

## 工作流 3：Markdown / TXT 文档 Draft

1. 修改托管文档前，用 `get_latest_doc` 读已发布内容，再按用户要求生成修改稿。
2. 用 `create_doc_draft`／`update_doc_draft` 建 Draft，`submit_doc_draft` 提交人工审核。
3. 由 Admin／SuperAdmin 在 Admin 审核并发布。

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

让 Agent 解释 endpoint 请求字段，检查它是否先调用 MCP、引用 `get_endpoint_detail` 等结果。要求发布时，应只提交 Draft，提示由 Admin／SuperAdmin 审核。

## 失败信号

- 不查 Vdoc 就编造字段，或用显示名代替 stable ID／`relative_path`。
- Admin 尚无新 Version 却声称 Draft 已发布。
- 将 MCP Token 放入 CLI args、日志或文档。
- Live E2E 指向应用库，而非一次性 `VDOC_TEST_POSTGRES_DB`（默认 `vdoc_e2e`）。

遇此情况，重载 Skill、确认 MCP 可用，并要求先查 Vdoc。
