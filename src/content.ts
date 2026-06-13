export type Language = 'en' | 'zh-CN'

export type NavItem = {
  href: string
  label: string
}

export type Feature = {
  title: string
  body: string
  meta: string
}

export type WorkflowStep = {
  label: string
  detail: string
}

export type DocPanel = {
  id: string
  eyebrow: string
  title: string
  summary: string
  bullets: string[]
  code?: string
}

export type SiteCopy = {
  languageName: string
  shortLanguageName: string
  htmlLang: string
  meta: {
    title: string
    description: string
  }
  accessibility: {
    skipToMain: string
    primaryNav: string
    docsNav: string
    languageSwitcher: string
    languageOption: string
    toolCloud: string
  }
  header: {
    tagline: string
  }
  github: {
    label: string
    cta: string
    footer: string
  }
  navItems: NavItem[]
  hero: {
    eyebrow: string
    title: string
    body: string
    ctas: {
      docs: string
      api: string
      mcp: string
      github: string
    }
    metrics: Array<{ label: string; value: string }>
    archive: {
      nodes: string[]
      semanticDiff: string
      fieldRemoved: string
      breaking: string
      stableMarkdown: string
      reviewed: string
      documentVersion: string
      immutable: string
    }
  }
  concepts: {
    eyebrow: string
    title: string
    body: string
    cards: Feature[]
  }
  workflows: {
    eyebrow: string
    title: string
    body: string
    steps: WorkflowStep[]
  }
  docs: {
    eyebrow: string
    title: string
    body: string
    landingLabel: string
    openDocLabel: string
    backToDocsLabel: string
    unknownDocLabel: string
    panels: DocPanel[]
  }
  api: {
    eyebrow: string
    title: string
    body: string
    surfaces: Feature[]
    routeCategoriesTitle: string
    routeCategoriesBody: string
  }
  agents: {
    eyebrow: string
    title: string
    body: string
    ctas: {
      mcp: string
      skill: string
    }
    tools: string[]
  }
  footer: {
    body: string
    docs: string
    openapi: string
    quickStart: string
    github: string
  }
}

const agentTools = [
  'list_projects',
  'list_documents',
  'list_api_versions',
  'get_latest_schema',
  'get_endpoint_detail',
  'compare_api_versions',
  'get_change_summary',
  'get_latest_doc',
  'compare_doc_versions',
  'create_api_version_draft',
  'update_api_version_draft',
  'submit_api_version_draft',
  'get_api_version_draft',
  'create_doc_draft',
  'update_doc_draft',
  'submit_doc_draft',
  'get_doc_draft',
]

export const supportedLanguages: Language[] = ['en', 'zh-CN']

export const copy: Record<Language, SiteCopy> = {
  en: {
    languageName: 'English',
    shortLanguageName: 'EN',
    htmlLang: 'en',
    meta: {
      title: 'Vdoc - AI-friendly document collaboration',
      description:
        'Vdoc is an AI-friendly documentation collaboration hub for OpenAPI docs, Markdown docs, semantic diff, MCP, and agent skills.',
    },
    accessibility: {
      skipToMain: 'Skip to main content',
      primaryNav: 'Primary navigation',
      docsNav: 'Documentation sections',
      languageSwitcher: 'Language switcher',
      languageOption: 'Switch language to',
      toolCloud: 'Valid Vdoc MCP tools',
    },
    header: {
      tagline: 'Versioned docs for AI teams',
    },
    github: {
      label: 'GitHub',
      cta: 'View repository',
      footer: 'GitHub repository',
    },
    navItems: [
      { href: '/', label: 'Home' },
      { href: '/concepts', label: 'Concepts' },
      { href: '/workflows', label: 'Workflows' },
      { href: '/docs', label: 'Docs' },
      { href: '/api', label: 'API' },
      { href: '/agents', label: 'Agents' },
    ],
    hero: {
      eyebrow: 'Public portal and documentation',
      title: 'A living dossier for AI-assisted teams.',
      body: 'Vdoc keeps OpenAPI docs, Markdown knowledge, semantic diffs, breaking-change summaries, MCP access, and agent skills in one reviewed source of truth.',
      ctas: {
        docs: 'Open document index',
        api: 'Browse API page',
        mcp: 'Install MCP adapter',
        github: 'View GitHub repository',
      },
      metrics: [
        { label: 'Document types', value: '2' },
        { label: 'Review gate', value: 'Human' },
        { label: 'Agent surface', value: 'MCP' },
      ],
      archive: {
        nodes: ['OpenAPI', 'Markdown', 'MCP', 'Skill'],
        semanticDiff: 'semantic diff',
        fieldRemoved: 'field removed',
        breaking: 'breaking',
        stableMarkdown: 'stable markdown',
        reviewed: 'reviewed',
        documentVersion: 'Document Version',
        immutable: 'immutable',
      },
    },
    concepts: {
      eyebrow: 'Product concepts',
      title: 'Not a Swagger clone. A collaboration boundary.',
      body: 'Vdoc models the project knowledge lifecycle that breaks when humans and agents move faster than documentation review.',
      cards: [
        {
          title: 'Typed project documents',
          body: 'A Project owns versioned OpenAPI and Markdown documents. Relative paths such as apis/petstore.yaml or docs/runbook.md stay stable while display names can change.',
          meta: 'OpenAPI = 1 / Markdown = 2',
        },
        {
          title: 'Branches as environments',
          body: 'Document branches represent dev, test, protected prod, or feature tracks. Teams can promote a reviewed version into a target draft before publication.',
          meta: 'dev -> test -> prod',
        },
        {
          title: 'Reviewed immutable versions',
          body: 'Writers and AI agents submit drafts. Admins or SuperAdmins review and publish immutable Document Versions; MCP cannot bypass the human gate in v0.1.',
          meta: 'Drafts require review',
        },
        {
          title: 'Diffs agents can trust',
          body: 'OpenAPI documents receive endpoint indexes, semantic diffs, and breaking-change summaries. Markdown documents receive stable snapshots and plain file diffs.',
          meta: 'Semantic API diff + Markdown diff',
        },
      ],
    },
    workflows: {
      eyebrow: 'Core workflow',
      title: 'Draft, review, version, compare, act.',
      body: 'Every OpenAPI or Markdown change moves through the same trust loop, whether it started from a developer, web UI, or AI agent.',
      steps: [
        {
          label: 'Submit',
          detail:
            'Backend code, a teammate, or an AI agent uploads OpenAPI or Markdown content into a branch draft.',
        },
        {
          label: 'Review',
          detail:
            'A Project Admin checks the diff, requests changes when needed, then approves the draft.',
        },
        {
          label: 'Version',
          detail:
            'Vdoc stores an immutable version, raw content, normalized OpenAPI or stable Markdown snapshots, and audit metadata.',
        },
        {
          label: 'Index',
          detail:
            'OpenAPI versions produce endpoint details for paths, methods, parameters, bodies, responses, tags, and operation IDs.',
        },
        {
          label: 'Compare',
          detail:
            'Consumers query semantic OpenAPI diffs, breaking changes, Markdown file diffs, and compact change summaries.',
        },
        {
          label: 'Act',
          detail:
            'Developers and AI agents update integration code or project knowledge from Vdoc facts instead of guessing.',
        },
      ],
    },
    docs: {
      eyebrow: 'Documentation navigation',
      title: 'Deploy it, operate it, connect agents.',
      body: 'These sections mirror the v0.1 backend, MCP adapter, and Skill package so the public site can serve as the first-stop handbook.',
      landingLabel: 'Document index',
      openDocLabel: 'Open page',
      backToDocsLabel: 'Back to all docs',
      unknownDocLabel:
        'That document page is not in the current Vdoc public index.',
      panels: [
        {
          id: 'quick-start',
          eyebrow: 'Quick start',
          title: 'Boot a local Vdoc workspace',
          summary:
            'Start the Go backend with a strong JWT key, keep secrets outside source control, and verify the public health route before connecting agents or reading API docs.',
          bullets: [
            'Copy config.yaml.example to config.yaml inside the backend repo when using file config.',
            'Set VDOC_JWT_KEY with a generated value before starting the service.',
            'Use the public health endpoint at /api/v1/open/health to confirm the backend is alive.',
          ],
          code: `cd Vdoc
export VDOC_JWT_KEY="$(openssl rand -base64 32)"
make dev
curl http://127.0.0.1:8080/api/v1/open/health`,
        },
        {
          id: 'infrastructure',
          eyebrow: 'Infrastructure compose',
          title: 'PostgreSQL plus RustFS/S3 storage',
          summary:
            'Vdoc stores structured product state in PostgreSQL and writes raw, normalized, stable, and large diff snapshots to RustFS or any S3-compatible object storage.',
          bullets: [
            'PostgreSQL holds users, teams, projects, documents, branches, drafts, versions, endpoint indexes, diffs, audit logs, and MCP token metadata.',
            'RustFS exposes an S3 API on port 9000 and a console on port 9001 in the backend compose file.',
            'When database.enabled or storage.enabled is true, startup fails on initialization errors instead of silently falling back.',
          ],
          code: `docker compose up -d postgres rustfs
export VDOC_DATABASE_ENABLED=true
export VDOC_DATABASE_DSN="postgres://vdoc:<password>@127.0.0.1:5432/vdoc?sslmode=disable"
export VDOC_STORAGE_ENABLED=true
export VDOC_STORAGE_ENDPOINT="127.0.0.1:9000"`,
        },
        {
          id: 'runtime-env',
          eyebrow: 'Runtime environment',
          title: 'Configuration variables that matter',
          summary:
            'Configuration is loaded from defaults, config.yaml, and VDOC_ environment variables. Environment variables are the safest fit for deployment platforms.',
          bullets: [
            'VDOC_SERVER_PORT controls the API listener and defaults to 8080.',
            'VDOC_INITIAL_ADMIN_EMAIL and VDOC_INITIAL_ADMIN_PASSWORD seed the first SuperAdmin only when the user table is empty.',
            'VDOC_DATABASE_MAX_OPEN_CONNS and VDOC_DATABASE_MAX_IDLE_CONNS tune PostgreSQL pooling.',
            'VDOC_STORAGE_BUCKET, VDOC_STORAGE_ACCESS_KEY, VDOC_STORAGE_SECRET_KEY, VDOC_STORAGE_REGION, VDOC_STORAGE_USE_SSL, and VDOC_STORAGE_PATH_STYLE configure object storage.',
            'VDOC_MCP_TOKEN_CIPHER_KEY and VDOC_MCP_TOKEN_CIPHER_KID control token ciphertext settings.',
            'Use ./vdoc --resetadmin <email> <new-password> to reset an active SuperAdmin password from the deployed binary.',
          ],
          code: `VDOC_SERVER_PORT=8080
VDOC_LOG_LEVEL=info
VDOC_JWT_EXPIRATION=12h
VDOC_INITIAL_ADMIN_EMAIL=admin@example.com
VDOC_INITIAL_ADMIN_PASSWORD="<initial-admin-password>"
VDOC_STORAGE_BUCKET=vdoc
VDOC_STORAGE_REGION=us-east-1
VDOC_STORAGE_PATH_STYLE=true
./vdoc --resetadmin admin@example.com "<new-admin-password>"`,
        },
        {
          id: 'core-workflows',
          eyebrow: 'Core workflows',
          title: 'From draft to trusted context',
          summary:
            'The MVP workflow is deliberately review-first: create team and project, create typed documents, upload drafts, submit for review, approve, then query versions and diffs.',
          bullets: [
            'Document creation prepares dev, test, and protected prod branches by default.',
            'OpenAPI draft content may be queried as raw or normalized content; Markdown content may be raw or stable.',
            'Promotion creates a target draft so protected environments can still be reviewed before release.',
          ],
          code: `POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/submit
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/approve
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/promote`,
        },
        {
          id: 'mcp-tools',
          eyebrow: 'MCP tools',
          title: 'Install the adapter, then ask the backend for tools',
          summary:
            '@vdoc/mcp is a stdio adapter. It forwards tools/list and tools/call to the deployed Vdoc backend at /api/v1/open/mcp, so schemas stay aligned with runtime capabilities.',
          bullets: [
            'Set VDOC_BASE_URL or VDOC_MCP_URL, plus VDOC_MCP_TOKEN, in the agent MCP configuration.',
            'Use read tools for projects, documents, versions, endpoint details, diffs, latest Markdown, and change summaries.',
            'Use draft tools for OpenAPI and Markdown draft creation, update, inspection, and submission. Direct publish tools are not exposed in v0.1.',
          ],
          code: `{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["-y", "@vdoc/mcp"],
      "env": {
        "VDOC_BASE_URL": "https://your-vdoc.example.com",
        "VDOC_MCP_TOKEN": "store-this-in-your-agent-secret-store"
      }
    }
  }
}`,
        },
        {
          id: 'skill-workflows',
          eyebrow: 'Skill workflows',
          title: 'Teach agents how not to hallucinate contracts',
          summary:
            'Vdoc Skill is the installable workflow package that tells agents when to use MCP, how to resolve IDs, and how to produce endpoint integration or migration output only from returned facts.',
          bullets: [
            'Install the Vdoc-skill directory as the vdoc skill folder so SKILL.md is at the skill root.',
            'Pair the skill with the MCP adapter; the skill contains workflow guidance while MCP provides the live tools.',
            'The skill requires get_endpoint_detail before endpoint integration and compare_api_versions before migration advice.',
          ],
          code: `Valid v0.1 groups:
Discovery: list_projects, list_documents
API read: list_api_versions, get_latest_schema, get_endpoint_detail
API diff: compare_api_versions, get_change_summary
Markdown: get_latest_doc, compare_doc_versions
Drafts: create_*, update_*, submit_*, get_*_draft`,
        },
      ],
    },
    api: {
      eyebrow: 'Backend API overview',
      title: 'One Go backend, four exposed surfaces.',
      body: 'Vdoc v0.1 is implemented as a Go/Gin API with unified response envelopes. HTTP status may be 200 while semantic status lives in code, status, message, detail, and total fields.',
      surfaces: [
        {
          title: 'Public REST',
          body: 'Health, register/login, OpenAPI YAML, and JSON-RPC MCP live under /api/v1/open.',
          meta: '/api/v1/open',
        },
        {
          title: 'Private REST',
          body: 'Identity, users, teams, projects, members, documents, branches, drafts, versions, endpoints, diffs, and token management live under JWT routes.',
          meta: '/api/v1/private',
        },
        {
          title: 'OpenAPI document',
          body: 'The machine-readable backend API contract is available as an OpenAPI YAML document for tools and humans.',
          meta: '/api/v1/open/docs/openapi.yaml',
        },
        {
          title: 'MCP JSON-RPC',
          body: 'Agents call the MCP JSON-RPC route with a user-bound MCP token. Token list/get responses are redacted after creation.',
          meta: '/api/v1/open/mcp',
        },
      ],
      routeCategoriesTitle: 'Route categories',
      routeCategoriesBody:
        'Open, Identity, System Users, Teams, Projects, Documents, Branches, Drafts, Versions, Endpoints, Diffs, and MCP Tokens.',
    },
    agents: {
      eyebrow: 'MCP adapter and Skill',
      title: 'Give agents a reviewed memory, not a rumor mill.',
      body: 'The MCP adapter supplies live tool calls. The Skill supplies the operating discipline: resolve IDs, fetch endpoint detail before code, compare versions before migration advice, and never invent contract facts.',
      ctas: {
        mcp: 'Install MCP adapter',
        skill: 'Install Skill',
      },
      tools: agentTools,
    },
    footer: {
      body: 'Vdoc public portal for OpenAPI, Markdown, MCP, Skill, and docs.',
      docs: 'Read docs',
      openapi: 'OpenAPI YAML',
      quickStart: 'Quick start',
      github: 'GitHub repository',
    },
  },
  'zh-CN': {
    languageName: '简体中文',
    shortLanguageName: '中',
    htmlLang: 'zh-CN',
    meta: {
      title: 'Vdoc - 面向 AI 协作的文档中心',
      description:
        'Vdoc 是面向 AI 协作团队的文档协作中心，支持 OpenAPI 文档、Markdown 文档、语义 Diff、MCP 和 Skill。',
    },
    accessibility: {
      skipToMain: '跳到主要内容',
      primaryNav: '主导航',
      docsNav: '文档导航',
      languageSwitcher: '语言切换',
      languageOption: '切换语言到',
      toolCloud: 'Vdoc MCP 可用工具',
    },
    header: {
      tagline: '面向 AI 团队的版本化文档',
    },
    github: {
      label: 'GitHub',
      cta: '查看代码仓库',
      footer: 'GitHub 仓库',
    },
    navItems: [
      { href: '/', label: '首页' },
      { href: '/concepts', label: '产品概念' },
      { href: '/workflows', label: '工作流' },
      { href: '/docs', label: '文档' },
      { href: '/api', label: 'API' },
      { href: '/agents', label: 'Agent' },
    ],
    hero: {
      eyebrow: '公共门户与文档站',
      title: '面向 AI 协作团队的活文档档案馆。',
      body: 'Vdoc 将 OpenAPI 文档、Markdown 项目知识、语义 Diff、Breaking Change 摘要、MCP 接入和 Agent Skill 汇入一个经过审核的可信来源。',
      ctas: {
        docs: '打开文档索引',
        api: '浏览 API 页面',
        mcp: '安装 MCP Adapter',
        github: '查看 GitHub 仓库',
      },
      metrics: [
        { label: '文档类型', value: '2' },
        { label: '审核关卡', value: '人工' },
        { label: 'Agent 接口', value: 'MCP' },
      ],
      archive: {
        nodes: ['OpenAPI', 'Markdown', 'MCP', 'Skill'],
        semanticDiff: '语义 Diff',
        fieldRemoved: '字段被移除',
        breaking: '破坏性变更',
        stableMarkdown: '稳定 Markdown',
        reviewed: '已审核',
        documentVersion: '文档版本',
        immutable: '不可变',
      },
    },
    concepts: {
      eyebrow: '产品概念',
      title: '不是 Swagger 克隆，而是协作边界。',
      body: 'Vdoc 建模的是项目知识生命周期：当人和 Agent 的速度超过文档审核时，最容易断裂的正是这条链路。',
      cards: [
        {
          title: '类型化项目文档',
          body: 'Project 拥有版本化 OpenAPI 和 Markdown 文档。apis/petstore.yaml 或 docs/runbook.md 这类相对路径保持稳定，展示名称可以独立变更。',
          meta: 'OpenAPI = 1 / Markdown = 2',
        },
        {
          title: '分支就是环境',
          body: 'Document Branch 表示 dev、test、受保护 prod 或 feature 轨道。团队可以把已发布版本 Promote 到目标草稿，再走审核发布。',
          meta: 'dev -> test -> prod',
        },
        {
          title: '审核后的不可变版本',
          body: 'Writer 和 AI Agent 提交草稿。Admin 或 SuperAdmin 审核并发布不可变 Document Version；v0.1 中 MCP 不能绕过人工关卡。',
          meta: '草稿必须审核',
        },
        {
          title: 'Agent 可以信任的 Diff',
          body: 'OpenAPI 文档会生成 Endpoint Index、语义 Diff 和 Breaking Change 摘要。Markdown 文档会生成稳定快照和纯文件 Diff。',
          meta: '语义 API Diff + Markdown Diff',
        },
      ],
    },
    workflows: {
      eyebrow: '核心工作流',
      title: '提交、审核、版本化、比较、行动。',
      body: '无论变更来自开发者、Web UI 还是 AI Agent，每一次 OpenAPI 或 Markdown 更新都经过同一条可信闭环。',
      steps: [
        {
          label: '提交',
          detail:
            '后端代码、团队成员或 AI Agent 将 OpenAPI 或 Markdown 内容上传到某个分支草稿。',
        },
        {
          label: '审核',
          detail: 'Project Admin 查看 Diff，必要时要求修改，然后批准草稿。',
        },
        {
          label: '版本化',
          detail:
            'Vdoc 保存不可变版本、Raw 内容、规范化 OpenAPI 或稳定 Markdown 快照，以及审计元数据。',
        },
        {
          label: '索引',
          detail:
            'OpenAPI 版本会生成路径、方法、参数、请求体、响应、标签和 operationId 的 endpoint 详情。',
        },
        {
          label: '比较',
          detail:
            '消费者查询语义 OpenAPI Diff、Breaking Changes、Markdown 文件 Diff 和紧凑变更摘要。',
        },
        {
          label: '行动',
          detail:
            '开发者和 AI Agent 基于 Vdoc 事实更新集成代码或项目知识，而不是猜测。',
        },
      ],
    },
    docs: {
      eyebrow: '文档导航',
      title: '部署、运维，并接入 Agent。',
      body: '这些章节对应 v0.1 后端、MCP Adapter 和 Skill 包，让公共站点成为上手 Vdoc 的第一本文档。',
      landingLabel: '文档索引',
      openDocLabel: '打开页面',
      backToDocsLabel: '返回全部文档',
      unknownDocLabel: '当前 Vdoc 公共索引中没有这个文档页面。',
      panels: [
        {
          id: 'quick-start',
          eyebrow: '快速开始',
          title: '启动本地 Vdoc 工作区',
          summary:
            '使用强 JWT Key 启动 Go 后端，把密钥留在源码控制之外，并在接入 Agent 或阅读 API 文档前验证公开健康检查路由。',
          bullets: [
            '使用文件配置时，在后端仓库中复制 config.yaml.example 为 config.yaml。',
            '启动服务前用生成值设置 VDOC_JWT_KEY。',
            '通过 /api/v1/open/health 公开健康检查确认后端已启动。',
          ],
          code: `cd Vdoc
export VDOC_JWT_KEY="$(openssl rand -base64 32)"
make dev
curl http://127.0.0.1:8080/api/v1/open/health`,
        },
        {
          id: 'infrastructure',
          eyebrow: '基础设施 Compose',
          title: 'PostgreSQL 加 RustFS/S3 存储',
          summary:
            'Vdoc 将结构化产品状态保存到 PostgreSQL，并把 Raw、Normalized、Stable 和大型 Diff 快照写入 RustFS 或任意 S3 兼容对象存储。',
          bullets: [
            'PostgreSQL 保存用户、团队、项目、文档、分支、草稿、版本、Endpoint Index、Diff、审计日志和 MCP Token 元数据。',
            '后端 compose 文件中 RustFS 在 9000 端口暴露 S3 API，在 9001 端口暴露控制台。',
            'database.enabled 或 storage.enabled 为 true 时，初始化失败会中止启动，而不是静默回退。',
          ],
          code: `docker compose up -d postgres rustfs
export VDOC_DATABASE_ENABLED=true
export VDOC_DATABASE_DSN="postgres://vdoc:<password>@127.0.0.1:5432/vdoc?sslmode=disable"
export VDOC_STORAGE_ENABLED=true
export VDOC_STORAGE_ENDPOINT="127.0.0.1:9000"`,
        },
        {
          id: 'runtime-env',
          eyebrow: '运行时环境',
          title: '关键配置变量',
          summary:
            '配置来自默认值、config.yaml 和 VDOC_ 环境变量。对部署平台来说，环境变量是最合适的配置方式。',
          bullets: [
            'VDOC_SERVER_PORT 控制 API 监听端口，默认 8080。',
            'VDOC_INITIAL_ADMIN_EMAIL 和 VDOC_INITIAL_ADMIN_PASSWORD 仅在用户表为空时创建第一个 SuperAdmin。',
            'VDOC_DATABASE_MAX_OPEN_CONNS 和 VDOC_DATABASE_MAX_IDLE_CONNS 调整 PostgreSQL 连接池。',
            'VDOC_STORAGE_BUCKET、VDOC_STORAGE_ACCESS_KEY、VDOC_STORAGE_SECRET_KEY、VDOC_STORAGE_REGION、VDOC_STORAGE_USE_SSL 和 VDOC_STORAGE_PATH_STYLE 配置对象存储。',
            'VDOC_MCP_TOKEN_CIPHER_KEY 和 VDOC_MCP_TOKEN_CIPHER_KID 控制 Token 密文设置。',
            '忘记 SuperAdmin 密码时，可用 ./vdoc --resetadmin <email> <new-password> 直接从部署二进制重置。',
          ],
          code: `VDOC_SERVER_PORT=8080
VDOC_LOG_LEVEL=info
VDOC_JWT_EXPIRATION=12h
VDOC_INITIAL_ADMIN_EMAIL=admin@example.com
VDOC_INITIAL_ADMIN_PASSWORD="<initial-admin-password>"
VDOC_STORAGE_BUCKET=vdoc
VDOC_STORAGE_REGION=us-east-1
VDOC_STORAGE_PATH_STYLE=true
./vdoc --resetadmin admin@example.com "<new-admin-password>"`,
        },
        {
          id: 'core-workflows',
          eyebrow: '核心工作流',
          title: '从草稿到可信上下文',
          summary:
            'MVP 工作流刻意以审核为中心：创建团队和项目，创建类型化文档，上传草稿，提交审核，批准，然后查询版本和 Diff。',
          bullets: [
            '创建文档时默认准备 dev、test 和受保护 prod 分支。',
            'OpenAPI 草稿内容可以按 raw 或 normalized 查询；Markdown 内容可以按 raw 或 stable 查询。',
            'Promote 会创建目标草稿，因此受保护环境仍然可以在发布前接受审核。',
          ],
          code: `POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/submit
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/{draft_id}/approve
POST /api/v1/private/projects/{project_id}/documents/{document_id}/drafts/promote`,
        },
        {
          id: 'mcp-tools',
          eyebrow: 'MCP 工具',
          title: '安装 Adapter，再向后端获取工具',
          summary:
            '@vdoc/mcp 是 stdio adapter。它把 tools/list 和 tools/call 转发到已部署 Vdoc 后端的 /api/v1/open/mcp，因此工具 schema 会与运行时能力保持一致。',
          bullets: [
            '在 Agent MCP 配置中设置 VDOC_BASE_URL 或 VDOC_MCP_URL，以及 VDOC_MCP_TOKEN。',
            '使用读取工具查询项目、文档、版本、endpoint 详情、Diff、最新 Markdown 和变更摘要。',
            '使用草稿工具创建、更新、检查并提交 OpenAPI 与 Markdown 草稿。v0.1 不暴露直接发布工具。',
          ],
          code: `{
  "mcpServers": {
    "vdoc": {
      "command": "npx",
      "args": ["-y", "@vdoc/mcp"],
      "env": {
        "VDOC_BASE_URL": "https://your-vdoc.example.com",
        "VDOC_MCP_TOKEN": "store-this-in-your-agent-secret-store"
      }
    }
  }
}`,
        },
        {
          id: 'skill-workflows',
          eyebrow: 'Skill 工作流',
          title: '让 Agent 不再编造契约',
          summary:
            'Vdoc Skill 是可安装的工作流包，告诉 Agent 何时使用 MCP、如何解析 ID，以及如何只基于返回事实生成 endpoint 集成或迁移分析。',
          bullets: [
            '把 Vdoc-skill 目录安装为 vdoc skill 文件夹，确保 SKILL.md 位于 skill 根目录。',
            '将 Skill 与 MCP Adapter 配对使用；Skill 提供工作流指导，MCP 提供实时工具。',
            'Skill 要求生成 endpoint 集成前先调用 get_endpoint_detail，给出迁移建议前先调用 compare_api_versions。',
          ],
          code: `v0.1 有效工具组：
发现：list_projects, list_documents
API 读取：list_api_versions, get_latest_schema, get_endpoint_detail
API Diff：compare_api_versions, get_change_summary
Markdown：get_latest_doc, compare_doc_versions
草稿：create_*, update_*, submit_*, get_*_draft`,
        },
      ],
    },
    api: {
      eyebrow: '后端 API 概览',
      title: '一个 Go 后端，四类公开接口。',
      body: 'Vdoc v0.1 基于 Go/Gin API 实现，并使用统一响应信封。HTTP 状态当前可能是 200，语义状态位于 code、status、message、detail 和 total 字段中。',
      surfaces: [
        {
          title: '公开 REST',
          body: '健康检查、注册登录、OpenAPI YAML 和 JSON-RPC MCP 位于 /api/v1/open。',
          meta: '/api/v1/open',
        },
        {
          title: '私有 REST',
          body: 'Identity、用户、团队、项目、成员、文档、分支、草稿、版本、Endpoint、Diff 和 Token 管理位于 JWT 路由下。',
          meta: '/api/v1/private',
        },
        {
          title: 'OpenAPI 文档',
          body: '机器可读的后端 API 契约以 OpenAPI YAML 形式提供给工具和人类。',
          meta: '/api/v1/open/docs/openapi.yaml',
        },
        {
          title: 'MCP JSON-RPC',
          body: 'Agent 使用用户绑定的 MCP Token 调用 MCP JSON-RPC 路由。Token 创建后，列表和详情响应会被脱敏。',
          meta: '/api/v1/open/mcp',
        },
      ],
      routeCategoriesTitle: '路由分类',
      routeCategoriesBody:
        'Open、Identity、System Users、Teams、Projects、Documents、Branches、Drafts、Versions、Endpoints、Diffs 和 MCP Tokens。',
    },
    agents: {
      eyebrow: 'MCP Adapter 与 Skill',
      title: '给 Agent 一份审核过的记忆，而不是传言。',
      body: 'MCP Adapter 提供实时工具调用。Skill 提供操作纪律：解析 ID，写代码前获取 endpoint detail，迁移建议前比较版本，并且永远不编造契约事实。',
      ctas: {
        mcp: '安装 MCP Adapter',
        skill: '安装 Skill',
      },
      tools: agentTools,
    },
    footer: {
      body: 'Vdoc 公共门户，覆盖 OpenAPI、Markdown、MCP、Skill 和文档。',
      docs: '阅读文档',
      openapi: 'OpenAPI YAML',
      quickStart: '快速开始',
      github: 'GitHub 仓库',
    },
  },
}
