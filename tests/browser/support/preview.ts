import { existsSync, readdirSync } from 'node:fs'
import { extname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requiredRoutePairs } from '../../contracts/required-routes'

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url))
const distRoot = join(projectRoot, 'docs', '.vitepress', 'dist')

export const previewOrigin = new URL(
  process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://127.0.0.1:4173',
).origin

export const previewBasePath = normalizeBasePath(
  process.env['PLAYWRIGHT_BASE_PATH'] ?? '/',
)

export const previewBaseUrl = new URL(
  previewBasePath.slice(1),
  `${previewOrigin}/`,
).href

class RouteDiscoveryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RouteDiscoveryError'
  }
}

function normalizeBasePath(value: string): string {
  const withLeadingSlash = value.startsWith('/') ? value : `/${value}`
  return withLeadingSlash.endsWith('/')
    ? withLeadingSlash
    : `${withLeadingSlash}/`
}

function listFiles(root: string): readonly string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  })
}

function htmlPathToRoute(path: string): string {
  const normalizedPath = relative(distRoot, path).split(sep).join('/')
  if (normalizedPath === 'index.html') {
    return '/'
  }
  if (normalizedPath.endsWith('/index.html')) {
    return `/${normalizedPath.slice(0, -'index.html'.length)}`
  }
  return `/${normalizedPath.slice(0, -'.html'.length)}`
}

function discoverBuiltRoutes(): readonly string[] {
  if (!existsSync(distRoot)) {
    throw new RouteDiscoveryError(
      'docs/.vitepress/dist is missing; build the production site before Playwright discovery',
    )
  }

  const routes = listFiles(distRoot)
    .filter((path) => extname(path) === '.html' && !path.endsWith('404.html'))
    .map(htmlPathToRoute)

  if (routes.length === 0) {
    throw new RouteDiscoveryError(
      'Playwright route discovery found zero production HTML routes',
    )
  }
  return routes
}

const requiredRoutes = requiredRoutePairs.flatMap(({ zh, en }) => [zh, en])

export const browserRoutes = [
  ...new Set([...discoverBuiltRoutes(), ...requiredRoutes]),
].sort()

export function routeUrl(route: string): string {
  const routeWithinBase =
    route === '/' ? previewBasePath : `${previewBasePath}${route.slice(1)}`
  return new URL(routeWithinBase.slice(1), `${previewOrigin}/`).href
}

export function expectedLang(route: string): 'en' | 'zh-CN' {
  return route.startsWith('/en/') ? 'en' : 'zh-CN'
}
