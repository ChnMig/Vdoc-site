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
    text: '理解',
    items: [
      { text: '产品概览', link: '/product-overview' },
      { text: '运行流程', link: '/how-it-works' },
      { text: '版本说明', link: '/version-notes' },
    ],
  },
  {
    text: '跟随',
    items: [
      { text: '部署指南', link: '/deployment' },
      { text: '首次使用', link: '/admin-usage' },
      { text: 'Admin AI', link: '/admin-ai' },
    ],
  },
  {
    text: '查阅',
    items: [
      { text: 'API 参考', link: '/api-reference' },
      { text: '变更记录', link: '/changelog' },
    ],
  },
  {
    text: '运维',
    items: [
      { text: 'MCP 工具', link: '/mcp-tools' },
      { text: 'Skill 工作流', link: '/skill-workflows' },
      { text: '升级与回滚', link: '/release-rollback' },
      { text: '故障排查', link: '/troubleshooting' },
    ],
  },
]

const enSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Understand',
    items: [
      { text: 'Product Overview', link: '/en/product-overview' },
      { text: 'How It Works', link: '/en/how-it-works' },
      { text: 'Version Notes', link: '/en/version-notes' },
    ],
  },
  {
    text: 'Follow',
    items: [
      { text: 'Deployment Guide', link: '/en/deployment' },
      { text: 'First Use', link: '/en/admin-usage' },
      { text: 'Admin AI', link: '/en/admin-ai' },
    ],
  },
  {
    text: 'Reference',
    items: [
      { text: 'API Reference', link: '/en/api-reference' },
      { text: 'Changelog', link: '/en/changelog' },
    ],
  },
  {
    text: 'Operate',
    items: [
      { text: 'MCP Tools', link: '/en/mcp-tools' },
      { text: 'Skill Workflows', link: '/en/skill-workflows' },
      { text: 'Upgrade and Rollback', link: '/en/release-rollback' },
      { text: 'Troubleshooting', link: '/en/troubleshooting' },
    ],
  },
]

export { docsSlugs }

export default defineConfig({
  base,
  title: 'Vdoc Docs',
  description:
    'Human-reviewed Vdoc documentation for installation, operation, MCP, and Skill use.',
  lang: 'zh-CN',
  cleanUrls: true,
  appearance: false,
  lastUpdated: true,
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: faviconHref }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Vdoc Docs' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Reviewed documentation facts for people and AI agents using Vdoc.',
      },
    ],
  ],
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'Vdoc 文档',
      description: '面向 Vdoc 评估、部署、运维、MCP 和 Skill 接入的中文文档。',
      themeConfig: {
        nav: [
          { text: '文档首页', link: '/' },
          { text: '部署', link: '/deployment' },
          { text: 'API', link: '/api-reference' },
          { text: 'MCP', link: '/mcp-tools' },
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
      },
    },
    en: {
      label: 'English',
      lang: 'en',
      title: 'Vdoc Docs',
      description:
        'English documentation for evaluating, deploying, operating, and integrating Vdoc.',
      themeConfig: {
        nav: [
          { text: 'Docs Home', link: '/en/' },
          { text: 'Deployment', link: '/en/deployment' },
          { text: 'API', link: '/en/api-reference' },
          { text: 'MCP', link: '/en/mcp-tools' },
          { text: '中文', link: '/' },
        ],
        sidebar: enSidebar,
      },
    },
  },
  themeConfig: {
    search: {
      provider: 'local',
    },
    socialLinks: [{ icon: 'github', link: githubUrl }],
    footer: {
      message:
        'Vdoc public documentation. Management workflows live in Vdoc-admin.',
      copyright: 'Released with the Vdoc workspace.',
    },
  },
})
