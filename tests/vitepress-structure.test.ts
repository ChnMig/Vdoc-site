import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { docsSlugs } from '../docs/.vitepress/config'

const projectRoot = new URL('..', import.meta.url).pathname
const docsRoot = join(projectRoot, 'docs')
const ignoredDirectories = new Set([
  '.git',
  '.impeccable',
  'coverage',
  'docs/.vitepress/cache',
  'docs/.vitepress/dist',
  'node_modules',
])

const localeHomeRequirements = [
  {
    path: 'docs/index.md',
    statement: '把 OpenAPI 与 Markdown 变成人工复核事实',
    messages: [
      'OpenAPI 与 Markdown 变成人工复核事实',
      'Draft 由 Admin 审核',
      '不可变 Version',
      'Diff 展示每次变更',
      'MCP Token 控制读取权限',
      'Vdoc Skill',
      'Agent 只读取已批准事实，不能直接发布',
    ],
    actions: ['/product-overview', '/deployment', '/mcp-tools'],
  },
  {
    path: 'docs/en/index.md',
    statement: 'OpenAPI and Markdown become human-reviewed facts',
    messages: [
      'OpenAPI and Markdown become human-reviewed facts',
      'Drafts are reviewed in Admin',
      'immutable Version',
      'Diff shows every change',
      'MCP Token controls read access',
      'Vdoc Skill',
      'agents read approved facts and cannot publish directly',
    ],
    actions: ['/en/product-overview', '/en/deployment', '/en/mcp-tools'],
  },
] as const

const staleDirectionPatterns = [
  /Mintlify/,
  /restrained green accent/,
  /radial-gradient/,
  /linear-gradient/,
  /\.VPHero::before/,
  /oklch/,
  /--vdoc-/,
  /Review Ledger|Field Manual|dossier|stamp styling|dark graphite/i,
] as const

function readProjectFile(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8')
}

function listFiles(path: string): readonly string[] {
  const absolutePath = join(projectRoot, path)
  const entries = readdirSync(absolutePath)
  return entries.flatMap((entry) => {
    const entryPath = join(absolutePath, entry)
    const projectPath = relative(projectRoot, entryPath)
    if (statSync(entryPath).isDirectory()) {
      if (ignoredDirectories.has(projectPath)) {
        return []
      }
      return listFiles(projectPath)
    }
    return projectPath
  })
}

function frontmatterOf(markdown: string): string {
  const frontmatter = markdown.match(/^---\n(?<content>[\s\S]*?)\n---/)
  return frontmatter?.groups?.['content'] ?? ''
}

function expectMessagesInOrder(
  source: string,
  messages: readonly string[],
): void {
  let cursor = 0

  for (const message of messages) {
    const index = source.indexOf(message, cursor)
    expect(index).toBeGreaterThanOrEqual(cursor)
    cursor = index + message.length
  }
}

describe('VitePress docs-only structure', () => {
  it('has paired Chinese and English Markdown docs for every required slug', () => {
    for (const slug of docsSlugs) {
      expect(statSync(join(docsRoot, `${slug}.md`)).isFile()).toBe(true)
      expect(statSync(join(docsRoot, 'en', `${slug}.md`)).isFile()).toBe(true)
    }

    expect(statSync(join(docsRoot, 'index.md')).isFile()).toBe(true)
    expect(statSync(join(docsRoot, 'en', 'index.md')).isFile()).toBe(true)
  })

  it('uses VitePress home frontmatter for both locale home pages', () => {
    for (const requirement of localeHomeRequirements) {
      const source = readProjectFile(requirement.path)
      const frontmatter = frontmatterOf(source)

      expect(frontmatter).toContain('layout: home')
      expect(frontmatter).toContain('hero:')
      expect(frontmatter).toContain('name: Vdoc')
      expect(frontmatter).not.toContain('\n  text:')
      expect(frontmatter).toContain('tagline:')
      expect(frontmatter).toContain(requirement.statement)
      expect(frontmatter).toContain('actions:')
      expect(frontmatter.match(/\n {4}- theme:/g) ?? []).toHaveLength(3)
      expect(frontmatter).toContain('features:')
      expect(frontmatter.match(/\n {2}- title:/g) ?? []).toHaveLength(3)

      for (const action of requirement.actions) {
        expect(frontmatter).toContain(`link: ${action}`)
      }

      expectMessagesInOrder(frontmatter, requirement.messages)
    }
  })

  it('uses VitePress source files instead of React or Docsify runtime files', () => {
    const sourceFiles = listFiles('.')
    expect(sourceFiles).toContain('docs/.vitepress/config.ts')
    expect(sourceFiles).toContain('docs/.vitepress/theme/index.ts')
    expect(sourceFiles).toContain('docs/.vitepress/theme/custom.css')
    expect(sourceFiles).toContain('docs/public/favicon.svg')
    expect(sourceFiles.some((path) => path.startsWith('src/'))).toBe(false)
    expect(sourceFiles).not.toContain('index.html')
    expect(sourceFiles).not.toContain('vite.config.ts')
    expect(sourceFiles.some((path) => path.startsWith('public/docs/'))).toBe(
      false,
    )
  })

  it('keeps package scripts and dependencies docs-only', () => {
    const packageJson = readProjectFile('package.json')
    expect(packageJson).toContain('vitepress dev docs')
    expect(packageJson).toContain('vitepress build docs')
    expect(packageJson).not.toMatch(
      /"react"|"react-dom"|"@vitejs\/plugin-react"|"tailwindcss"/,
    )
  })

  it('removes Docsify hash links and old visual language from maintained sources', () => {
    const maintainedFiles = listFiles('docs')
      .filter((path) => !path.startsWith('docs/.vitepress/dist/'))
      .concat(['README.md', 'DESIGN.md'])
    const combinedSource = maintainedFiles.map(readProjectFile).join('\n')

    expect(combinedSource).not.toContain('/docs/index.html#')
    expect(combinedSource).not.toContain('Docsify')

    for (const pattern of staleDirectionPatterns) {
      expect(combinedSource).not.toMatch(pattern)
    }
  })
})
