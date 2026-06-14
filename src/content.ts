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
    languageSwitcher: string
    languageOption: string
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
      apiReference: string
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
  }
  footer: {
    body: string
    docs: string
    deployment: string
    apiReference: string
    github: string
  }
}

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
      languageSwitcher: 'Language switcher',
      languageOption: 'Switch language to',
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
      { href: '/docs/index.html', label: 'Docs' },
    ],
    hero: {
      eyebrow: 'Public portal and documentation',
      title: 'A living dossier for AI-assisted teams.',
      body: 'Vdoc keeps OpenAPI docs, Markdown knowledge, semantic diffs, breaking-change summaries, MCP access, and agent skills in one reviewed source of truth.',
      ctas: {
        docs: 'Open document index',
        apiReference: 'Read API reference',
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
      eyebrow: 'Documentation',
      title: 'Vdoc documentation',
      body: 'A practical guide for understanding Vdoc, deploying the backend, using the Admin workbench, connecting MCP and Skill, and operating a v0.1 pilot end to end.',
    },
    footer: {
      body: 'Vdoc public portal for OpenAPI, Markdown, MCP, Skill, and docs.',
      docs: 'Read docs',
      deployment: 'Deployment',
      apiReference: 'API reference',
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
      languageSwitcher: '语言切换',
      languageOption: '切换语言到',
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
      { href: '/docs/index.html', label: '文档' },
    ],
    hero: {
      eyebrow: '公共门户与文档站',
      title: '面向 AI 协作团队的活文档档案馆。',
      body: 'Vdoc 将 OpenAPI 文档、Markdown 项目知识、语义 Diff、Breaking Change 摘要、MCP 接入和 Agent Skill 汇入一个经过审核的可信来源。',
      ctas: {
        docs: '打开文档索引',
        apiReference: '阅读 API 参考',
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
      eyebrow: '文档',
      title: 'Vdoc 文档',
      body: '一份从理解产品、部署后端、使用后台、接入 MCP/Skill 到发布回滚的实用文档，目标是让访问者能完整跑通 Vdoc。',
    },
    footer: {
      body: 'Vdoc 公共门户，覆盖 OpenAPI、Markdown、MCP、Skill 和文档。',
      docs: '阅读文档',
      deployment: '部署',
      apiReference: 'API 参考',
      github: 'GitHub 仓库',
    },
  },
}
