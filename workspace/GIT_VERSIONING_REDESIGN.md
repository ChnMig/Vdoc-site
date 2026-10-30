# Vdoc 提交与分支模型重设计

日期：2026-10-30。适用测试版：`v0.4.0-beta.1`。本文说明 Vdoc 产品内的文档版本管理与后续演进；发布结果以同版本 GitHub Release、固定源码和发布核验为准。

实现采用一个 Project 对应一个文档仓库，分支和提交属于整个 Project；一次提交可以同时修改多个文档。用户已明确取消独立草稿功能，用连续提交保存内容历史，并支持比较、AI 处理和推送。修订号和发布版本号均由系统自动生成，页面、客户端和 MCP 不要求用户填写版本号；用户只需提供内容与可选的提交说明。

## v0.4 Beta 实现范围

| 能力 | 本测试版契约 |
|---|---|
| 保存与历史 | 系统生成 SHA-256 提交 ID、完整文件树、父关系；单/多文件原子提交；HEAD/generation 并发检查与幂等重试；游标分页 |
| 分支与协作 | 默认保护 main、功能分支、固定双方 HEAD 的合并请求、人工批准、三方合并、显式冲突解决和新增还原提交 |
| 发布与分享 | 系统生成发布号，人工发布固定提交；分享固定某次发布中的一篇文档，支持密码、过期、撤销和密钥轮换；旧链接继续读取原对象 |
| 比较与 AI | 固定两个提交的原文/语义比较；手动请求提交或提交对分析与提问，持久化输入指纹、模型、状态和输出；不自动生成或应用文件 patch |
| 事件与投递 | 与提交事务一起保存事件；站内管理记录及签名 HTTPS Webhook；事件/分支/文档筛选、暂停、失败重试与投递状态 |
| 兼容与存储 | 新增 PostgreSQL 仓库记录和分享定位索引，S3 原文不可变；显式导入现存旧快照，记录来源；切换后拒绝旧覆盖写 |
| 客户端 | Admin 默认提交工作流，MCP/Skill 提供 36 项工具（其中 14 项仓库工具）；无手填修订号或发布号，无 MCP 人工批准/发布工具 |

附录中的独立标签、可切换发布通道、发布撤回、讨论/多轮检查策略、自动 AI、patch 应用、异步大 Diff 和大规模性能指标是后续目标，不属于本测试版已提供的能力。本测试版不提供原生 Git 网络协议。数据库使用 `repository_records` 存储类型化记录，并非附录 A 中拆分表的逐表实现。

## 1. 用户看到的结果

维护者在同一个分支反复保存文档，每次保存成功都得到一个独立提交。第一次保存 API、第二次补充字段说明、第三次修正示例，三份内容都能按提交打开、下载和比较。无需每次填写新的业务版本号。正式文档继续修改时也遵守相同规则，旧内容始终可以定位。

“草稿”从导航、内容模型和必经流程中移除。用户面对的是文件、分支、提交、合并请求和发布。尚未提交的编辑只是工作区的本地修改；已经保存到服务端的正文就是提交，不再经过一个会被覆盖的草稿对象。审核针对确定的提交和改动，发布引用确定的提交，两者都不复制出第二套正文。

目标用户包括维护 OpenAPI、Markdown 和 TXT 的团队成员，以及通过 MCP 读写项目知识的 Agent。成功的标准是：任何一次保存都可追溯；任意两个可访问提交都能比较；AI 与通知能够指出自己处理的具体改动；正式消费者始终读取明确发布的内容。

## 2. 统一内容模型

Project 对应仓库。仓库有一张不可变提交图，每个提交包含完整文件树的引用、父提交、作者、时间和说明。分支只是指向某个提交的可移动引用；它不拥有提交，多个分支可以共享同一提交。新项目创建空树初始提交和默认 `main` 分支，后续允许普通功能分支，不强制预置 dev/test/prod 三套环境分支。

提交 ID 使用规范化提交对象的 SHA-256，界面显示可消歧的短 ID 和本地时间，API 始终返回完整 ID。时间只用于展示，不能独自充当唯一键、祖先关系或并发条件。文档原始字节、路径、类型和应保留的名称/描述均进入版本化的文件树，保证重命名后仍能准确打开历史路径和内容。保留稳定的 `document_id`，在不同树中跟踪同一文档。

提交 ID 和每次发布的 `version_name` 由服务端生成，不接收客户端自定的修订号。旧数据的业务版本名仅作为来源信息保留，不能变成新提交身份。每次发布有独立的 `release_id` 与 `commit_id`。后续若加入业务别名、固定标签和可切换发布通道，须与修订身份分开建模；本测试版公开链接固定具体发布，不把未发布分支 HEAD 当成正式内容。

## 3. 编辑、审核与发布

默认操作是“保存并提交”，提交说明可自动生成，也可由用户补充。用户可以编辑多个文件后一次提交；单篇编辑也直接使用同一机制。只有浏览器本地尚未提交的缓冲区可以覆盖。若启用服务端自动保存，去抖后每次实际保存也必须生成提交，并在历史中标明自动保存；不能另建隐藏的可覆盖草稿。树完全相同时返回“没有需要提交的改动”，内容字节或版本化元数据变化时都应保留提交。

提交必须携带编辑基线，服务端原子比较目标分支 HEAD。两人从 C1 开始编辑，第一个保存得到 C2，第二个不能覆盖 C2；界面保留第二个人的修改，提供重新比较、三方合并或另建分支。默认 `main` 为保护分支，普通写入者编辑时进入功能分支，通过合并请求进入 `main`。允许由项目规则配置直接提交，但管理员身份本身不应隐式绕过保护。

合并请求记录来源分支、目标分支，以及本次审阅的固定来源 HEAD、目标 HEAD、合并基线和候选结果树。来源或目标变化后，旧审阅记录继续保留，但不能用于批准新的结果。批准与合并分开记录。单父普通提交、快进合并和双父三方合并遵守统一提交图；冲突解决后创建新提交。还原也是新提交，不删除后续历史，也不以移动 HEAD 冒充还原。

发布是管理员人工确认固定提交后追加的一条记录，可以在同一分支持续发布多个提交，每次获得新的系统发布号。保护分支合并成功并不自动对外发布；发布请求绑定提交和分支 generation。MCP 可以提交内容、比较和创建合并请求，继续保留现有“Agent 不能绕过人工发布”的权限边界。未发布提交仍能在有权限的项目内部协作，不能因为有提交 ID 就通过公开分享读取。

## 4. 比较、AI 与推送

系统支持相邻提交、任意两个提交、不同分支、同一分支和两次发布之间的比较。普通比较展示两个完整树的净变化；合并请求展示 merge-base 到来源提交的变化，并另外检查合入当前目标的结果。单篇文档比较按稳定文档 ID 跟踪路径变化，项目比较汇总文件新增、删除、重命名、元数据与正文变化。OpenAPI 同时保留原文差异和语义差异，Markdown/TXT 保留精确文本差异。

AI 分析和提问绑定固定提交或固定提交对。用户从分支进入时，先把分支解析为提交，再启动计算；完成后不能把 C1→C2 的结果挂到 C3 上。持久化结果记录输入指纹、具体提交、模型与状态。证据有明确大小边界并标记截断，失败、超时和取消不影响已经保存的提交。后续修改建议的采纳仍须经过新提交和分支并发检查。

提交、合并、发布和差异就绪产生持久化事件，供站内订阅、Webhook 和后续集成消费。数据库事务先保存内容引用、提交、分支变动和待发事件，后台任务再处理语义差异、AI 和发送；外部服务故障不能丢掉已成功的提交。默认对外订阅发布事件，显式订阅后才发送未发布提交事件。“推送通知”和未来的 Git remote push 是不同适配器；本方案先定义前者及统一事件契约，不声称已经提供 `git clone/push` 协议兼容性。

## 5. 工作台变化

工作台以完成编辑、检查改动、审阅和发布为目标，沿用现有控制台的排版、主题和组件。项目级分支选择控制整棵文件树；文档标题旁显示当前分支和固定提交，用户能清楚区分“正在跟随分支”“正在查看历史提交”和“正在查看某次发布”。分支更新时给出新提交提示，不能悄悄切换已经打开的历史正文。

独立草稿入口及“草稿/正式版本”内容切换移除。文档工具保留阅读、编辑、提交历史、比较、AI 和设置，项目增加合并请求和发布记录。编辑区显示未提交修改以及提交后的短 ID，提交历史展示说明、作者、时间、文件变化和审核/发布引用。比较页固定来源与目标提交；合并请求集中展示文件改动、检查、讨论、审阅与合并操作。发布页从明确提交创建发布，发布版本号由系统生成，没有手填版本号字段。

响应式布局、键盘操作、输入保留、独立滚动和 AI 侧栏延续 `Vdoc-admin/DESIGN.md` 的现有约束。离开未提交编辑时提供保留或放弃选择；并发冲突、网络失败和分支归档都保留输入。历史或权限失效不能回退到其他正文。移动端按文件列表、正文/差异、AI 分层呈现，不要求用户操作一张拥挤的提交图。

## 6. 实现与迁移原则

推荐复用 PostgreSQL、RustFS/S3、现有解析器、语义 Diff、后台任务和鉴权，新增不可变内容树与提交图，而不是直接把 `draft` 改名为 `commit`。这能继续服务多实例部署、项目权限和结构化 Endpoint 查询。它是 Git 风格的领域模型，不等同于完整 Git 服务；若原生 Git 客户端兼容性成为首要要求，需要另作真实 Git 对象库及协议适配决策，不能承诺现有提交哈希直接等于 Git OID。

迁移采用新增模型、构建映射、校验、按项目切换的方式，不先删除旧表。现有分支属于单篇文档，不能直接按名字拼成一个历史上不存在的项目快照。每个旧已发布快照和每个旧草稿当前仍存在的快照都必须有去向；固定公开链接必须继续指向同一份内容。已经被覆盖且无法证明正文来源的旧草稿更新只能保留审计记录，不能补造提交。

实现同步更新 PRD、数据库设计、Admin 上下文、MCP 契约与 companion Skill。下面附录保留完整领域约束和演进方向；测试版支持范围以开头的实现表及实际 API 契约为准。

## 附录 A：概念与存储契约

### A.1 Git 概念对应

| Git 概念 | Vdoc 设计 | 必须满足的语义 |
|---|---|---|
| Repository | Project | 一个项目的文件、提交图和引用 |
| Blob | 原始内容对象 | 按项目和内容哈希引用，不可变，按字节验证 |
| Tree | 版本化文件清单 | 提交时完整快照引用，未变化内容复用 |
| Commit | 仓库提交 | 固定树、父提交、作者、时间、说明；无 draft/published 内容状态 |
| Branch / HEAD | 项目分支 / HEAD | 指向提交，更新有并发条件与审计 |
| Working tree | 本地未提交修改 | 不作为独立草稿业务对象 |
| Pull / Merge Request | 合并请求 | 固定审阅轮次，三方合并，冲突必须解决 |
| Tag | 可选固定标签 | 项目内名字唯一，创建后不移动 |
| Release | 发布记录 | 唯一发布 ID 引用提交，发布版本号由系统生成 |
| Environment | 发布通道 | 有历史的可移动发布引用，不冒充内容身份 |
| Revert | 还原提交 | 对当前 HEAD 施加反向变更，新增提交 |

### A.2 建议数据结构

以下是目标结构和约束，不是本轮执行的 SQL migration。有限状态沿用项目整数码约定，具体码值在实现时加入 `common/vdoc`；下面使用可读状态名描述。

| 结构 | 核心字段 | 约束与说明 |
|---|---|---|
| `repository_commits` | `project_id, commit_id, tree_hash, author_id, actor_type, source, message, created_at, source_git_commit_id?` | `(project_id, commit_id)` 主键；整条提交记录不可变；外部 Git 来源 ID 单独保存 |
| `repository_commit_parents` | `project_id, commit_id, parent_id, parent_order` | 复合外键强制同项目；普通提交一个父，合并两个父，初始提交零父；第一父为目标 HEAD |
| `repository_blobs` | `project_id, raw_hash, object_key, byte_length, content_type` | `(project_id, raw_hash)` 唯一；不以全局可猜哈希授权读取 |
| `repository_trees` | `project_id, tree_hash, manifest_object_key` | 完整清单按规范编码计算 SHA-256，条目稳定排序 |
| `repository_tree_entries` | `project_id, tree_hash, document_id, path, document_type, display_name, description, raw_hash` | 同树路径和文档 ID 各自唯一；文档类型、路径和用户可见元数据随提交版本化 |
| `repository_branches` | `project_id, id, name, head_commit_id, ref_generation, protection, status` | 活动分支名项目内唯一；每次 HEAD 更新递增 generation，防止引用回到旧 ID 时误接受旧请求 |
| `repository_ref_updates` | `project_id, ref_id, generation, old_id, new_id, actor_id, reason, created_at` | 同分支 generation 唯一；保存引用变更历史，不能靠时间推断顺序 |
| `repository_tags` | `project_id, id, name, commit_id, created_by` | 名称项目内唯一，固定指向可访问的同项目提交 |
| `merge_requests` / `review_rounds` | `source_branch_id, target_branch_id, source_commit_id, target_commit_id, merge_base_id, result_tree_hash, status` | 审阅轮次不可变；新 HEAD 新建轮次，不修改旧批准记录 |
| `review_decisions` | `round_id, actor_id, decision, comment, created_at` | 固定轮次上的追加记录；审核权与写内容权分别判断 |
| `repository_releases` | `project_id, release_id, version_name, commit_id, review_round_id, display_label?, notes, published_by, published_at` | `release_id` 唯一；`display_label` 非唯一；没有第二套正文；可记录撤回，不能改指向 |
| `release_channels` / `release_channel_updates` | `project_id, name, release_id, generation` 及变动历史 | latest 来自通道引用；切换和回退均比较 generation 并记录历史 |
| `repository_comparisons` | `project_id, from_commit_id, to_commit_id, mode, base_id?, document_id?, engine_version, status, result_ref` | 结果固定方向和引擎版本；持久化分页结果与大对象引用 |
| `document_checks` / Endpoint 缓存 | `project_id, raw_hash, document_type, parser_version, status` | 按内容复用解析事实；不能改变提交；Endpoint 查询始终验证目标树引用 |
| AI jobs / results | `project_id, commit_id? / comparison_id?, input_fingerprint, generation_token, status, result` | 按明确内容和模型/提示词版本记录，旧结果不覆盖新输入的结果 |
| `event_outbox` / `subscriptions` / `event_deliveries` | `event_id, project_id, sequence, payload`；订阅与尝试记录 | 内容提交与 outbox 同事务；投递至少一次，幂等键稳定 |
| `legacy_revision_map` | `project_id, old_type, old_id, new_commit_id, new_release_id?, provenance` | 稳定兼容链接与迁移核验；保留原内容哈希和原时间 |

`documents` 保留项目内稳定文档身份，不能再用当前 `relative_path` 等可变列解释所有历史。目录从当前树路径投影；只有空目录需要被版本管理时才增加明确的目录条目。文档删除、移动、类型或描述变更均通过树变化提交，历史读取不受当前文档归档状态的错误过滤。

提交哈希输入由服务端规范编码：项目 ID、树哈希、有序父 ID、认证后的作者、来源、提交时间和说明。规范编码及时间精度固定并有测试向量；不要直接哈希 Go map 的非确定性输出。原始内容与 normalized OpenAPI 分开：raw 字节变化必须能提交，normalized 相同只表示没有语义变化。

### A.3 一个具体例子

```text
main:     C1 ── C2 ─────────── M1 ── C6
                 ╲          ╱
feature:          C3 ── C4 ──┘

发布 R1（系统发布号）→ C2
发布 R2（新的系统发布号）→ M1
固定分享 S1 → R1 中的某篇文档
```

`M1` 第一父为 `C2`，第二父为 `C4`。`C6` 已保存但尚未发布时，内部 main HEAD 是 `C6`，固定分享 S1 仍读取 R1 的 C2。R1 与 R2 可以按提交精确比较。

## 附录 B：保存、并发与合并

### B.1 保存事务

1. 客户端发送 `branch_id + expected_head_commit_id + expected_ref_generation + changes[] + idempotency_key`。修改来源的 `base_commit_id` 必须与预期 HEAD 一致；客户端不得只改 HEAD 参数就把旧全文当成新基线覆盖。
2. 服务端验证项目权限、分支保护、父提交可达性、路径、文档 ID、UTF-8、大小和类型约束，按预期 HEAD 的树应用新增/修改/删除/移动操作。
3. 写入或复用不可变内容对象，计算完整结果树和提交。对象存储失败时不推进分支。
4. 数据库事务锁定/条件更新目标分支，重新校验成员权限、项目/分支有效状态、预期 HEAD 和 generation，写入树、提交、父关系、对象引用、ref update、审计、outbox 与幂等结果，再原子推进 HEAD。任一步失败全部回滚。
5. 同一幂等键重试返回同一提交；同键不同请求体拒绝。提交确认丢失时先查询幂等结果，不删除可能已被引用的对象，也不重复追加提交或事件。
6. 响应返回固定 `commit_id`、完整的新 HEAD/generation、变化清单及异步检查状态，不能只返回“已保存”。

PostgreSQL 与对象存储不具备跨系统事务。现有独占写路径可以继续使用；做内容去重时通过数据库确定 canonical 引用，竞争落败的上传对象走延迟清理。共享 blob 不能随某次失败请求删除。GC 的根包括保留提交、分支、标签、审核轮次、发布与旧映射，默认保留全部已确认内容历史；仅清理经确认未被引用的失败上传。不能只保留 HEAD 的对象。

### B.2 冲突与历史操作

| 场景 | 规定行为 |
|---|---|
| 并发保存同一 HEAD | 一个推进成功，另一个返回 `REF_CONFLICT`，提供当前 HEAD/generation；客户端保留编辑并显示基线差异 |
| 旧基线上修改不同文件 | 显式执行三方合并；不能自动用客户端的完整旧树替换当前树 |
| 两侧改同一字段/文本块 | 标记冲突并要求解决；AI 可建议，不能静默选一侧 |
| 快进合并 | 目标为来源祖先时按策略推进引用，固定审阅 ID，记录 ref update；不制造虚假双父提交 |
| 非快进合并 | 根据共同祖先生成三方合并结果；目标 HEAD 变更后重新计算与审核 |
| 多个 merge-base / 无共同祖先 | 首版明确返回需处理状态；不能任取一个基线或以空文件冒充共同祖先 |
| 重命名/删除冲突 | 按稳定文档 ID 与路径双重检查；移动后同路径冲突不能覆盖其他文档 |
| 还原某次提交 | 在当前 HEAD 创建反向变更提交；后续变化冲突时先解决；还原合并提交需指定第一父/主线 |
| 删除分支 | 归档引用且保留已确认提交与引用历史，发布、标签和固定链接继续有效 |
| 未变化内容 | 精确树相同不创建空提交；仅换行、格式、路径或描述变化均保留真实变化 |

允许在功能分支保存格式错误但满足文本/大小约束的 OpenAPI 源码，保留每次编辑证据；解析失败是可见检查结果，不伪装成语义无变化。受保护分支合并/发布必须通过规定的类型与语义检查。此规则是对现有“保存时必须解析成功”的明确调整。

## 附录 C：比较与 AI 契约

比较类型明确分为 `snapshot`（from 树对 to 树）、`commit`（指定父对该提交）和 `merge-base`（共同祖先对来源）。根提交与空树比较；相同提交对自身返回空结果。API 返回最终解析的完整提交 ID，不能让缓存只以移动分支名作为键。合并提交默认第一父比较，同时允许指定其他父。

文本对比保留 CRLF、尾部换行、空文件和精确下载；显示可提供 unified/split。OpenAPI 有 source diff、结构化语义变化、breaking 标记和检查失败信息。原文变化但语义不变仍在历史中；语义解析失败不能返回“零变更”。项目比较同时给文件级汇总、单文件详情与可分页的语义条目。重命名按文档 ID 精确跟踪，相同内容的两个新文档不能被强行认作同一文件。

比较缓存至少包含项目、完整 from/to ID、模式、父/基线、可选文档过滤和 diff/parser 版本。大结果异步运行、分页与下载，超限或超时显示明确状态，不能用截断输出冒充完整差异。MVP 设计验收数据集至少覆盖一千文件项目与一万条提交的有界历史查询；目标延迟在实现基准后制定，本文不虚报性能结果。

AI 支持提交说明总结、任意范围改动总结、OpenAPI 消费方影响分析、发布说明、差异问答和生成修改建议。摘要记录固定输入、模型、提示词版本、语言和生成轮次，内容引用能回到提交/文件/差异。任务开始和结果持久化时复核权限及配置，取消或旧 generation 不得抢占新请求。项目知识检索返回来源提交和发布状态；默认面向正式消费者的查询解析到发布通道，内部历史必须显式选择。

AI 建议包含 `base_commit_id` 和文件 patch，用户采纳后进入正常保存事务。若目标分支已经变化，返回冲突并重新比较，绝不直接改旧提交。AI 和 diff 失败可单独重试，不撤销保存，不阻塞用户读取原文；发布所要求的检查则必须先完成。首版默认手动请求 AI 或在审核/发布时触发，可配置对提交自动总结，避免每次自动保存都强制调用模型。

## 附录 D：审核、发布与可见性

审核有合并审核和发布审核两种目的，共享固定 `review_round` 与追加决策。合并审核绑定来源/目标/基线/结果树；发布审核绑定具体提交、通道当前发布基线及相关比较结果。新来源 HEAD、新目标 HEAD、新候选结果树或新发布基线使相关批准失效，但旧轮次与意见仍可查看。合并结果及发布内容必须与被审核对象一致。

本测试版发布请求携带 `branch_id + commit_id + expected_generation` 与可选说明，服务端生成发布号，并在事务中检查管理员权限及固定引用。后续若增加独立发布审核轮次和通道，须同时绑定审核对象、通道基线及 generation；并发发布不能按完成时间抢写 latest。

| 角色/入口 | 默认能力 |
|---|---|
| 项目 Reader | 阅读现有项目权限允许的内部提交、比较、AI；面向正式文档入口默认解析发布通道 |
| 项目 Writer | 增加功能分支提交、创建合并请求、处理冲突、请求审阅；不能自行绕过保护/发布 |
| Project Admin / SuperAdmin | 配置保护策略、审核、合并及人工发布；敏感操作均留下固定对象与引用变更记录 |
| MCP Token | 受用户角色及 token scope 双重限制；写入追加提交；不提供自动人工批准/正式发布能力 |
| 公开分享 | 只读取允许的发布记录/通道，不能任意遍历 commit 父链、未发布引用或项目文件树 |

固定公开链接映射到具体 release+document；最新链接映射到具体通道+document；所有历史链接枚举已允许的发布记录。提交 ID 知识本身不是权限。路径移动仍按稳定文档 ID 找到树内文件，某次发布未包含该文件时明确返回不存在，不回退别的发布。发布撤回从可用通道移走并留记录，受撤回规则约束的分享停止暴露；历史内容不被覆盖。

## 附录 E：API、MCP 与工作台

### E.1 新 HTTP 契约方向

新写契约使用 `/api/v1/private/projects/:project_id/repository` 子树，继续沿用项目现有 Gin 注册链、鉴权、中间件和 `HTTP 200 + envelope.code/status` 业务响应约定。表内为相对该 repository 子树的路径，不是现有已实现接口。

| 方法与路径 | 用途 |
|---|---|
| `GET /branches`、`POST /branches` | 列出/从明确提交创建项目分支 |
| `GET /refs/resolve?kind=branch\|tag\|release\|channel&value=...` | 解析带类型的引用，返回 commit、generation 及发布来源；禁止依赖歧义名字猜类型 |
| `POST /branches/:branch_id/commits` | 基于预期 HEAD 一次提交多个文件操作 |
| `GET /commits?branch_id=...&document_id=...&cursor=...` | 查询可达历史；游标固定起始 tip，避免翻页时 HEAD 漂移 |
| `GET /commits/:commit_id` | 固定提交元数据、父与文件变化 |
| `GET /commits/:commit_id/tree` | 该提交下的目录和文件投影，分页读取 |
| `GET /commits/:commit_id/documents/:document_id/content` | 读取精确正文与该树的路径/元数据 |
| `POST /comparisons`、`GET /comparisons/:id` | 创建/读取固定比较及分页条目 |
| `POST /merge-requests`、`POST /merge-requests/:id/review-rounds` | 创建请求或重建固定审阅轮次 |
| `POST /review-rounds/:id/decisions` | 人工审阅，绑定轮次 |
| `POST /merge-requests/:id/merge` | 验证双端引用和审阅后快进/合并 |
| `POST /branches/:branch_id/reverts` | 对当前 HEAD 新增还原提交 |
| `POST /tags` | 给具体提交创建固定标签 |
| `POST /releases`、`GET /releases` | 人工发布与发布历史，服务端生成发布版本号 |
| `GET /channels`、`POST /channels/:id/updates` | 发布通道及有审计的更新/回退，强制人工授权与预期 generation |
| `POST /ai/analyses` | 固定提交/比较的分析，支持异步状态 |
| `POST /subscriptions`、`GET /event-deliveries` | 管理事件订阅、投递结果与失败重试 |

历史列表默认第一父视图，可显式请求全部可达提交；返回去重 ID，不能把第一父列表误称为完整 DAG。比较、文档读取和历史查询都校验同项目归属。游标包含查询过滤、固定 tip 和稳定位置，不能用 offset 重新读取变化中的列表。

### E.2 MCP 与兼容

新增统一工具：`resolve_ref`、`list_branches`、`create_branch`、`list_commits`、`get_commit`、`get_document_at_commit`、`commit_changes`、`compare_commits`、`create_merge_request`、`get_release`、`analyze_changes`。结构化返回 commit/ref generation，不要求填写 `version_name`，也不把异步 pending 当成功分析结果。

旧 `create_*_draft` / `update_*_draft` 在受控兼容期映射为追加提交，旧 `draft_id` 映射到隔离的兼容工作分支；旧 `expected_revision` 映射到明确预期 HEAD/generation，不得忽略。映射不存在或语义无法安全兼容时返回明确升级错误，不能回退到覆盖写入。新客户端与 Skill 采用提交术语；旧草稿/版本链接通过映射继续打开固定历史内容。

后端 MCP 定义在 `Vdoc/api/app/v1/open/mcp/` 演进，adapter 与 companion Skill 同属 `Vdoc-mcp/`，同步版本、契约和兼容测试；工作区 `contracts/` 同步新契约。发布前为既有客户端明确停用窗口，不永久维持两套独立内容模型。

### E.3 工作台交互约束

| 区域 | 新行为 | 必须覆盖的状态 |
|---|---|---|
| 项目文件树 | 项目分支/固定提交控制整棵树，文件按该树路径读取 | 空仓库、分支无文件、文件历史删除、分支归档、权限变化 |
| 文档阅读 | 显示分支、短提交、时间、发布引用；历史选择不自动跟随 | 新 HEAD 提示、固定历史、发布未包含文件、失效引用 |
| 编辑 | 单文件或多文件“保存并提交”，自动说明可编辑，基线显式 | 未保存、提交中、已提交、并发冲突、网络未知结果、错误输入保留 |
| 提交历史 | 说明/作者/时间/变化数，打开内容、对比父或任选两个、还原 | 分页、长说明、重命名、合并提交、自动保存、迁移来源 |
| 合并请求 | 文件差异→检查→讨论/审阅→合并；新轮次标识旧批准失效 | 无冲突、文本/语义失败、HEAD 变化、审批失效、只读角色 |
| 发布 | 固定提交与基线、人工确认、系统生成发布号 | 首次发布、后续发布、检查未完成、并发发布 |
| 比较与 AI | 明确固定两端与模式，AI 引用能跳转至具体内容 | pending、失败、取消、超限、来源无权限、陈旧结果提示 |
| 订阅 | 选择项目/分支/事件/文件过滤；查看投递与重试状态 | 未配置、暂停、失败、重复事件、乱序事件、目标失效 |

工作台使用 Operate 模式，文档正文使用 Read 模式。沿用现有主题 token、Radix 控件、文本状态与键盘焦点；没有将本次领域重设计扩大为视觉品牌改版。`Vdoc-admin/PRODUCT.md` 与 `DESIGN.md` 记录工作台约束，发布验收包含真实桌面与移动端流程及截图。

## 附录 F：事件与推送

首批事件为 `commit.created`、`branch.updated`、`merge_request.updated`、`comparison.ready/failed`、`release.published`、`channel.updated`、`ai.analysis.ready/failed`。订阅可按项目、分支、文件和事件过滤；正文与全文 AI 输出默认通过鉴权后的链接获取，payload 只放必要元数据和摘要。

```json
{
  "schema_version": 1,
  "event_id": "<unique-event-id>",
  "event_type": "commit.created",
  "project_id": "<project-id>",
  "branch_id": "<branch-id>",
  "ref_generation": 24,
  "before_commit_id": "<full-commit-id>",
  "after_commit_id": "<full-commit-id>",
  "parent_commit_ids": ["<full-commit-id>"],
  "actor_id": "<actor-id>",
  "occurred_at": "2026-10-30T09:00:00Z",
  "comparison_id": "<fixed-comparison-id-or-null>",
  "analysis_status": "pending",
  "resource_url": "<authorized-workbench-url>"
}
```

后台任务按项目/引用的序号处理，不以时间推断因果。`commit.created` 表示提交成功，不承诺分析已完成；后续 ready/failed 事件带原始提交对与关联事件 ID。一次多文件提交只发送一份提交事件，不为每篇文档伪造独立项目提交。接收方按 event_id 去重，按 ref generation 识别乱序。

Webhook 使用签名和时间戳，URL 出站检查、凭证加密和重定向规则在配置及发送时执行。投递语义是至少一次，`(subscription_id, event_id)` 标识同一次投递，尝试序号独立；超时/暂时失败指数退避，永久失败进入可见失败队列，可人工重试。站内通知使用同一 event_id 幂等落库。配置变动和权限撤回时重新判断可投递范围。本文没有创建订阅，也没有向任何外部地址发送消息。

## 附录 G：旧数据迁移与回退

| 旧对象/行为 | 新模型中的去向 |
|---|---|
| Document Branch | 先进入带旧文档/分支 ID 的 `legacy/...` 导入引用，不按同名强行合并 |
| Document Version | 对应不可变导入提交和 legacy release，保留原 ID、字节哈希、路径证据及发布时间 |
| 仍存在的 Draft | 当前可证明内容导入为未发布提交，审核意见与状态作为迁移来源记录，不创建新系统草稿 |
| 同一 Draft 的历次覆盖保存 | 仅有审计的保留审计；只有正文对象、哈希和顺序可核实时才补充标明来源的导入快照 |
| version_name | 保留为可重复 display_label；不得直接提升为项目级唯一 Git tag |
| Promote | 由明确提交/来源分支建立合并请求；未经验证不能视为已经存在的 merge ancestry |
| 旧 Endpoint / Diff / AI | 通过旧 ID 映射关联固定提交；保留引擎版本和输入来源，无法精确映射时标记 legacy，只读保留 |
| 固定公开链接 | 保留原 secret 与授权规则，仅映射到同一份 legacy release+document，不改变实际正文 |
| latest / all_versions 分享 | 迁移为该文档专用 legacy 发布通道及可允许发布集合，不直接接到全项目最新发布 |

迁移先生成 manifest：逐篇列出旧文档、各分支、已发布快照、现存未发布快照、分享引用和目标 ID，验证数量、内容哈希与链接解析一致。旧发布顺序只有在 `version_no`、真实发布时间或明确来源可证明时才形成导入序列，来源字段标记 `migrated_sequence`；这不是声称恢复了当年的原生 Git 父关系。来源不可证明的快照保留独立导入根，不猜共同祖先。

进入项目级主线前，必须明确选择每个文件的初始来源。用 manifest 中已选快照创建“项目初始化”合成提交，显式标记合成时间、每项来源和缺失文件；不能把某个历史时间拼出来的集合声称为当时真实的多文件原子提交。旧 dev/test/prod 的可用内容也由显式文件映射组成各自导入分支/通道，而不是简单重命名。迁移工具输出冲突/缺失清单，未经解决的项目不切换。

按项目进入短暂只读窗口，取得一致性数据库与对象清单，运行导入与验证，再切换到新读写模型。旧写端点只走兼容适配；不允许旧表和新图各自接受独立写入。旧表在兼容窗口只读保留，不执行立即删除。切换前失败可直接回退旧读写；切换后若已有新提交，只能退回新模型的上一版兼容程序或停写修复，不能把流量直接切回不会保存新提交的旧覆盖模型。清理旧数据另立迁移，不与功能首发捆绑。

## 附录 H：分阶段工程交付

以下是实现顺序，不是本轮完成状态。前四阶段共同组成首个可替换现有草稿功能的版本，不能只上线“表改名”就移除旧入口。

| 阶段 | 实现范围与仓库归属 | 阶段验收证据 |
|---|---|---|
| 1. 提交基础 | `Vdoc/` 新增提交/树/分支引用、保存事务、幂等、固定读取和历史；路径与文档元数据版本化 | 单/多文件历史、字节保真、并发与断连重试、存储失败不推进 HEAD |
| 2. 协作与发布 | `Vdoc/` 固定比较、三方合并、冲突、审阅轮次、发布记录/通道、revert；接入现有权限 | 旧批准失效、合并结果一致、同展示版本多次发布、固定分享不漂移 |
| 3. AI 与事件 | `Vdoc/` 绑定提交/比较的任务、outbox、站内通知、Webhook 订阅与投递管理 | AI 结果固定来源、写回冲突、任务失败重试、重复/乱序/接收方故障不丢提交 |
| 4. 工作台与 Agent | `Vdoc-admin/` 统一分支/编辑/历史/合并/发布；`Vdoc-mcp/` 和 `contracts/` 同步工具及 Skill | 真实用户流程、桌面/移动/键盘、旧链接和旧工具兼容、新工具多文件原子提交 |
| 5. 导入与切换 | workspace 迁移方案；`Vdoc/` 新增迁移实现；`Vdoc-site/` 更新对外说明 | 代表性旧数据导入清单、哈希/引用核验、只读窗口与回退演练；完成前不删旧模型 |

后续扩展可加入 cherry-pick、交互式 rebase、原生 Git remote 导入/导出和更细的检查策略。这些扩展不能替代首版已有的分支、连续提交、三方合并、比较、AI、事件与发布能力。

### H.1 必须通过的产品场景

| 场景 | 预期结果 |
|---|---|
| 同一分支连续保存三次，不填写版本号 | 三个系统生成的独立提交，前两份正文仍可打开下载；任意两次可比较 |
| 同一分支先后发布 C2、C5，不填写版本号 | 两条系统生成发布号的记录；固定 R1 链接仍读 C2，R2 指向 C5 |
| 一个提交同时改 OpenAPI 与 README | 整体成功或整体失败，不能出现只有 API 已提交的中间状态 |
| 两位用户同时保存 | 不覆盖内容；冲突方输入保留，可查看差异并合并或另建分支 |
| 只修改 CRLF、末尾换行、描述或路径 | 生成真实提交，source diff 可见；OpenAPI 语义未变不误报 breaking |
| 功能分支 OpenAPI 暂时无效 | 保存历史可读，检查显示失败；不能通过要求有效 schema 的合并/发布 |
| 分支分叉后改不同文件，再三方合并 | 两边变化都保留；同文档同块冲突明确可解决 |
| 审阅后来源或目标继续提交 | 原批准不再授权新的合并/发布对象，旧意见仍可追溯 |
| 合并后还原一个旧提交 | 生成新提交，后续其他变化保留；有冲突时不静默覆盖 |
| AI 分析 C1→C2 时分支变为 C3 | 结果仍属于 C1→C2；页面不把它标成 C3 的摘要 |
| AI 建议基线落后 | 写回返回引用冲突，不直接覆盖 HEAD |
| 网络断连重试和 Webhook 重复/乱序 | 同幂等键仅一个提交/逻辑事件；消费者可去重并识别序号 |
| 对象写入失败、事务回滚、提交确认丢失 | 无悬空 HEAD，不删已提交共享对象，重试能识别已完成保存 |
| 公开链接知道某个未发布 commit ID | 仍无法读取未授权内容、父链或其他项目文件 |
| 迁移同名文档分支、同名版本与旧分享 | 无名称碰撞导致覆盖；原正文哈希、ID 映射与链接授权一致 |
| 千文件/万提交历史及大 diff | 分页与有界查询；异步/超限状态真实，未验证前不声称性能达标 |

### H.2 实现入口与现状证据

以下为改造前的基线入口，用于理解仍保留的兼容模型。新实现位于 `domain/documentrepo`、`services/vdoc/repository_*`、私有 `repository` / `repositoryshare` API、Admin `repository-*` 组件及统一 MCP 工具。

- `Vdoc/services/vdoc/store.go`：`UpdateDraft`、`UpdateMarkdownDraft` 覆盖当前草稿，并发校验为当前 Revision；发布创建独立 Version。
- `Vdoc/domain/documentdraft/revision.go`：Revision 与 ReviewRevision 是快照校验哈希，不是提交历史。
- `Vdoc/domain/documentbranch/models.go`：分支属于 Document/Service，尚无项目级 HEAD。
- `Vdoc/domain/documentversion/flow.go`：同文档同分支版本名唯一，不能复用为提交身份。
- `Vdoc/services/vdoc/history_store.go`、`document_activity.go`：当前草稿条目和活动记录，不构成逐次编辑的内容图。
- `Vdoc/api/app/v1/private/draft/router.go`：旧草稿保存/提交/审核接口，需要兼容适配与新版本契约。
- `Vdoc-admin/DESIGN.md`：现有阅读、比较、AI、输入保留与响应式工作台约束。
- `PRD.md`、`DATABASE_SCHEMA.md`、`IMPLEMENTATION_PLAN.md`：现有模型说明；本设计是后续替换方向。

验收分别记录代码检查、一次性 PostgreSQL/S3 集成、真实浏览器流程、独立复核和发布制品核验。原生 Git 协议不在本测试版范围内，不宣称协议兼容。
