import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

export type AuthoredTextFile = {
  readonly path: string
  readonly source: string
}

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url))
export const docsRoot = join(projectRoot, 'docs')

const ignoredDirectoryNames = ['cache', 'dist', 'node_modules'] as const
const authoredConfigPaths = ['docs/.vitepress/config.ts'] as const

function isIgnoredDirectory(name: string): boolean {
  return ignoredDirectoryNames.some((ignoredName) => ignoredName === name)
}

function listFilesRecursively(root: string): readonly string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(root, entry.name)
    if (entry.isDirectory()) {
      return isIgnoredDirectory(entry.name)
        ? []
        : listFilesRecursively(absolutePath)
    }
    return [absolutePath]
  })
}

function toProjectPath(absolutePath: string): string {
  return relative(projectRoot, absolutePath).split(sep).join('/')
}

export function readProjectText(path: string): string {
  return readFileSync(join(projectRoot, path), 'utf8')
}

export function readOptionalProjectText(path: string): string | undefined {
  return existsSync(join(projectRoot, path)) ? readProjectText(path) : undefined
}

export function markdownProjectPaths(): readonly string[] {
  return listFilesRecursively(docsRoot)
    .filter((path) => extname(path) === '.md')
    .map(toProjectPath)
}

export function authoredTextFiles(): readonly AuthoredTextFile[] {
  const markdownPaths = markdownProjectPaths()
  const workflowPaths = listFilesRecursively(
    join(projectRoot, '.github', 'workflows'),
  )
    .filter((path) => ['.yaml', '.yml'].includes(extname(path)))
    .map(toProjectPath)

  return [...markdownPaths, ...authoredConfigPaths, ...workflowPaths].map(
    (path) => ({ path, source: readProjectText(path) }),
  )
}

export function routeToMarkdownPath(route: string): string {
  if (route === '/') {
    return 'docs/index.md'
  }
  if (route === '/en/') {
    return 'docs/en/index.md'
  }

  const routePath = route.replace(/^\/+|\/+$/g, '')
  return `docs/${routePath}.md`
}
