export type RequiredRoutePair = {
  readonly slug: string
  readonly zh: string
  readonly en: string
}

export const adminAiRoutePair = {
  slug: 'admin-ai',
  zh: '/admin-ai',
  en: '/en/admin-ai',
} as const satisfies RequiredRoutePair

export const requiredRoutePairs = [
  { slug: 'index', zh: '/', en: '/en/' },
  {
    slug: 'product-overview',
    zh: '/product-overview',
    en: '/en/product-overview',
  },
  { slug: 'how-it-works', zh: '/how-it-works', en: '/en/how-it-works' },
  { slug: 'version-notes', zh: '/version-notes', en: '/en/version-notes' },
  { slug: 'deployment', zh: '/deployment', en: '/en/deployment' },
  { slug: 'admin-usage', zh: '/admin-usage', en: '/en/admin-usage' },
  { slug: 'api-reference', zh: '/api-reference', en: '/en/api-reference' },
  { slug: 'changelog', zh: '/changelog', en: '/en/changelog' },
  { slug: 'mcp-tools', zh: '/mcp-tools', en: '/en/mcp-tools' },
  {
    slug: 'skill-workflows',
    zh: '/skill-workflows',
    en: '/en/skill-workflows',
  },
  {
    slug: 'release-rollback',
    zh: '/release-rollback',
    en: '/en/release-rollback',
  },
  {
    slug: 'troubleshooting',
    zh: '/troubleshooting',
    en: '/en/troubleshooting',
  },
  adminAiRoutePair,
] as const satisfies readonly RequiredRoutePair[]
