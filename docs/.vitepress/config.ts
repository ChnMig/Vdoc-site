import { defineConfig, type DefaultTheme } from 'vitepress'

const githubUrl = 'https://github.com/ChnMig/Vdoc'
const base = process.env['VITEPRESS_BASE'] ?? '/'
const baseHasTraversalSegment = base
  .split('/')
  .some((segment) => segment === '.' || segment === '..')

if (
  !base.startsWith('/') ||
  !base.endsWith('/') ||
  !/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(base) ||
  baseHasTraversalSegment
) {
  throw new TypeError(
    'VITEPRESS_BASE must start and end with "/" and contain only URL-safe path segments',
  )
}

const faviconHref = `${base}favicon.svg`

const docsSlugs = [
  'product-overview',
  'how-it-works',
  'version-notes',
  'deployment',
  'admin-usage',
  'admin-ai',
  'api-reference',
  'changelog',
  'mcp-tools',
  'skill-workflows',
  'release-rollback',
  'troubleshooting',
] as const

const zhSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: '了解 Vdoc',
    items: [
      { text: '产品概览', link: '/product-overview' },
      { text: '运行流程', link: '/how-it-works' },
      { text: '版本说明', link: '/version-notes' },
    ],
  },
  {
    text: '开始使用',
    items: [
      { text: '部署指南', link: '/deployment' },
      { text: '首次使用', link: '/admin-usage' },
    ],
  },
  {
    text: '接入 Agent',
    items: [
      { text: 'MCP 接入与工具', link: '/mcp-tools' },
      { text: 'Skill 工作流', link: '/skill-workflows' },
    ],
  },
  {
    text: '查阅与运维',
    items: [
      { text: 'Admin AI', link: '/admin-ai' },
      { text: 'API 参考', link: '/api-reference' },
      { text: '变更记录', link: '/changelog' },
      { text: '升级与回滚', link: '/release-rollback' },
      { text: '故障排查', link: '/troubleshooting' },
    ],
  },
]

const enSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Meet Vdoc',
    items: [
      { text: 'Product Overview', link: '/en/product-overview' },
      { text: 'How It Works', link: '/en/how-it-works' },
      { text: 'Version Notes', link: '/en/version-notes' },
    ],
  },
  {
    text: 'Get Started',
    items: [
      { text: 'Deployment Guide', link: '/en/deployment' },
      { text: 'First Use', link: '/en/admin-usage' },
    ],
  },
  {
    text: 'Connect Your Agent',
    items: [
      { text: 'MCP Setup and Tools', link: '/en/mcp-tools' },
      { text: 'Skill Workflows', link: '/en/skill-workflows' },
    ],
  },
  {
    text: 'Reference and Operations',
    items: [
      { text: 'Admin AI', link: '/en/admin-ai' },
      { text: 'API Reference', link: '/en/api-reference' },
      { text: 'Changelog', link: '/en/changelog' },
      { text: 'Upgrade and Rollback', link: '/en/release-rollback' },
      { text: 'Troubleshooting', link: '/en/troubleshooting' },
    ],
  },
]

export { docsSlugs }

export default defineConfig({
  base,
  title: 'Vdoc',
  description:
    'Reviewed OpenAPI and Markdown docs for teams and AI, with version diffs, MCP, and self-hosting.',
  lang: 'zh-CN',
  cleanUrls: true,
  appearance: false,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: faviconHref }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Vdoc' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Reviewed OpenAPI and Markdown docs, version diffs, MCP, and self-hosting.',
      },
    ],
  ],
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Vdoc',
      description:
        '面向团队与 AI 的 OpenAPI、Markdown 文档协作中心，支持版本 Diff、MCP 和自部署。',
      themeConfig: {
        nav: [
          { text: '了解 Vdoc', link: '/product-overview' },
          { text: '部署试用', link: '/deployment' },
          { text: '首次使用', link: '/admin-usage' },
          { text: '接入 Agent', link: '/mcp-tools' },
          { text: 'English', link: '/en/' },
        ],
        sidebar: zhSidebar,
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        outline: {
          label: '本页目录',
        },
        returnToTopLabel: '回到顶部',
        sidebarMenuLabel: '菜单',
        skipToContentLabel: '跳转到正文',
        langMenuLabel: '切换语言',
        footer: {
          message: '文档由团队审核发布，Agent 通过 MCP 查询。',
          copyright: 'Vdoc · 支持 Docker Compose 自部署',
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      title: 'Vdoc',
      description:
        'Reviewed OpenAPI and Markdown docs for teams and AI, with version diffs, MCP, and self-hosting.',
      themeConfig: {
        nav: [
          { text: 'Overview', link: '/en/product-overview' },
          { text: 'Deploy', link: '/en/deployment' },
          { text: 'First Use', link: '/en/admin-usage' },
          { text: 'Agent Setup', link: '/en/mcp-tools' },
          { text: '中文', link: '/' },
        ],
        sidebar: enSidebar,
      },
    },
  },
  themeConfig: {
    search: {
      provider: 'local',
      options: {
        locales: {
          root: {
            translations: {
              button: {
                buttonText: '搜索文档',
                buttonAriaLabel: '搜索文档',
              },
              modal: {
                displayDetails: '显示详细内容',
                resetButtonTitle: '清除搜索',
                backButtonTitle: '返回',
                noResultsText: '没有找到相关文档',
                footer: {
                  selectText: '打开',
                  selectKeyAriaLabel: '回车键',
                  navigateText: '切换结果',
                  navigateUpKeyAriaLabel: '上方向键',
                  navigateDownKeyAriaLabel: '下方向键',
                  closeText: '关闭',
                  closeKeyAriaLabel: '退出键',
                },
              },
            },
          },
        },
      },
    },
    socialLinks: [{ icon: 'github', link: githubUrl }],
    footer: {
      message: 'Your team reviews and publishes. Agents query through MCP.',
      copyright: 'Vdoc · Self-host with Docker Compose',
    },
  },
})
