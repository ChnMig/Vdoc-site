# Skill 工作流

Vdoc Skill 是安装到 Agent runtime 的工作流包。它不存数据、不计算 diff、不直接调用后端，而是教 Agent 什么时候必须通过 Vdoc MCP 查询事实。

## 使用前准备

- Agent 已配置 [MCP 工具](mcp-tools)，并能成功调用 Vdoc `tools/list`。
- 目标 runtime 支持安装 skill 或自定义工作流说明。
- 你知道 runtime 要求的 skill folder 位置。
- 不要把原始 MCP Token、JWT、DB password、storage secret 或 `Authorization` header 值写进 Skill 文件、示例、日志或 issue。

如果还没有本机 Vdoc 环境，先从 workspace root 运行统一闭环：

```sh
scripts/vdoc-local-bootstrap.sh
docker compose --env-file .env up -d --build
cd Vdoc && go run ./tools/vdoc-demo-seed
```

Demo seed 是可选步骤。完整本机门禁见 [部署指南](deployment)，其中 live E2E 使用 `./scripts/vdoc-e2e.sh live-compose --env-file ../.env --check-only` 和 `./scripts/vdoc-e2e.sh live-compose --env-file ../.env`，release gate 使用 `scripts/vdoc-release-dry-run.sh --list` 和 `scripts/vdoc-release-dry-run.sh`。

## 安装

把 Skill 安装到 `$HOME/.agents/skills/vdoc`（个人范围）或 `.agents/skills/vdoc`（当前仓库范围），并让 `SKILL.md` 位于 `vdoc` skill root。安装 commit 必须和发布包 `workspace.lock.json` 中的 `Vdoc-skill` 一致：

```sh
# 个人安装；仓库范围请改成 .agents/skills/vdoc
VDOC_SKILL_DIR="$HOME/.agents/skills/vdoc"
VDOC_SKILL_COMMIT=73a203c4bd0d7d96997fab8e1fa478a859f32e91
test ! -e "$VDOC_SKILL_DIR"
mkdir -p "$(dirname -- "$VDOC_SKILL_DIR")"
git init "$VDOC_SKILL_DIR"
git -C "$VDOC_SKILL_DIR" remote add origin https://github.com/ChnMig/Vdoc-skill.git
git -C "$VDOC_SKILL_DIR" fetch --depth 1 origin "$VDOC_SKILL_COMMIT"
git -C "$VDOC_SKILL_DIR" checkout --detach FETCH_HEAD
test "$(git -C "$VDOC_SKILL_DIR" rev-parse HEAD)" = "$VDOC_SKILL_COMMIT"
test -f "$VDOC_SKILL_DIR/SKILL.md"
```

如果目标目录已存在，先核对当前 `HEAD`；升级时只 fetch 并 checkout 新版已审核 lock 中的 commit，不要对已安装 Skill 执行未固定来源的 `git pull`。

目录内容应包含：

```text
SKILL.md
templates/
  endpoint-integration.md
  frontend-change-summary.md
examples/
  endpoint-query-example.md
  compare-versions-example.md
```

Skill 必须和 `@vdoc/mcp` 配套使用。Skill 是工作流说明，MCP 才是实时 tool surface 和事实来源。

验证 package：

```sh
cd Vdoc-skill
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
