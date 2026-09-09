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
    concepts: [
      /OpenAPI/,
      /Markdown/,
      /人工审核后发布/,
      /历史版本/,
      /Diff/,
      /MCP/,
      /Vdoc Skill/,
      /Agent 可以提交草稿，发布仍由管理员审核/,
    ],
    actions: ['/deployment', '/how-it-works', '/mcp-tools'],
  },
  {
    path: 'docs/en/index.md',
    concepts: [
      /OpenAPI/,
      /Markdown/,
      /human review/,
      /immutable versions/,
      /Diff/,
      /MCP/,
      /Vdoc Skill/,
      /Agents can submit drafts, while publishing requires human approval/,
    ],
    actions: ['/en/deployment', '/en/how-it-works', '/en/mcp-tools'],
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
      expect(frontmatter).toContain('\n  text:')
      expect(frontmatter).toContain('tagline:')
      expect(frontmatter).toContain('actions:')
      expect(frontmatter.match(/\n {4}- theme:/g) ?? []).toHaveLength(3)
      expect(frontmatter).toContain('features:')
      expect(frontmatter.match(/\n {2}- title:/g) ?? []).toHaveLength(3)

      const actionLinks = [...frontmatter.matchAll(/^ {6}link: (.+)$/gm)].map(
        (match) => match[1],
      )
      expect(actionLinks).toEqual(requirement.actions)

      for (const concept of requirement.concepts) {
        expect(frontmatter).toMatch(concept)
      }
    }
  })

  it('uses VitePress source files instead of React or Docsify runtime files', () => {
    const sourceFiles = listFiles('.')
    expect(sourceFiles).toContain('docs/.vitepress/config.ts')
    expect(sourceFiles).toContain('docs/.vitepress/theme/index.ts')
    expect(sourceFiles).toContain('docs/.vitepress/theme/custom.css')
    expect(sourceFiles).toContain('docs/public/favicon.png')
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
      .filter((path) => /\.(md|ts|css|svg)$/.test(path))
      .concat(['README.md', 'DESIGN.md'])
    const combinedSource = maintainedFiles.map(readProjectFile).join('\n')

    expect(combinedSource).not.toContain('/docs/index.html#')
    expect(combinedSource).not.toContain('Docsify')

    for (const pattern of staleDirectionPatterns) {
      expect(combinedSource).not.toMatch(pattern)
    }
  })
})
