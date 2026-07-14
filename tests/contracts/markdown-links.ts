import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, join, normalize } from 'node:path'
import {
  markdownProjectPaths,
  projectRoot,
  readProjectText,
} from './contract-helpers'

export type MarkdownLink = {
  readonly sourcePath: string
  readonly destination: string
}

export type ResolvedInternalLink = {
  readonly targetPath: string
  readonly fragment: string | undefined
}

export type BrokenInternalLink = {
  readonly sourcePath: string
  readonly destination: string
  readonly reason: string
}

function stripFencedCode(source: string): string {
  let fenceMarker: string | undefined

  return source
    .split('\n')
    .map((line) => {
      const marker = line.match(/^\s*(?<marker>`{3,}|~{3,})/)?.groups?.[
        'marker'
      ]
      if (fenceMarker === undefined && marker !== undefined) {
        fenceMarker = marker
        return ''
      }
      if (
        fenceMarker !== undefined &&
        marker !== undefined &&
        marker[0] === fenceMarker[0] &&
        marker.length >= fenceMarker.length
      ) {
        fenceMarker = undefined
        return ''
      }
      return fenceMarker === undefined ? line : ''
    })
    .join('\n')
}

function trimDestination(destination: string): string {
  return destination.startsWith('<') && destination.endsWith('>')
    ? destination.slice(1, -1)
    : destination
}

export function extractMarkdownLinks(
  sourcePath: string,
  source: string,
): readonly MarkdownLink[] {
  const authoredMarkdown = stripFencedCode(source)
  const links: MarkdownLink[] = []
  const inlineLinkPattern =
    /(?<!!)\[[^\]]*\]\((?<destination><[^>]+>|[^)\s]+)(?:\s+["'][^"']*["'])?\)/g
  const frontmatterLinkPattern = /^\s*link:\s*(?<destination>\S+)\s*$/gm

  for (const match of authoredMarkdown.matchAll(inlineLinkPattern)) {
    const destination = match.groups?.['destination']
    if (destination !== undefined) {
      links.push({ sourcePath, destination: trimDestination(destination) })
    }
  }
  for (const match of authoredMarkdown.matchAll(frontmatterLinkPattern)) {
    const destination = match.groups?.['destination']
    if (destination !== undefined) {
      links.push({ sourcePath, destination: trimDestination(destination) })
    }
  }

  return links
}

function absoluteLinkTarget(path: string): string {
  const routePath = path.replace(/^\/+/, '')
  if (routePath === '') {
    return 'docs/index.md'
  }
  if (path.endsWith('/')) {
    return `docs/${routePath}index.md`
  }
  if (extname(routePath) === '.html') {
    return `docs/${routePath.slice(0, -5)}.md`
  }
  if (extname(routePath) !== '') {
    return `docs/public/${routePath}`
  }
  return `docs/${routePath}.md`
}

function relativeLinkTarget(sourcePath: string, path: string): string {
  const joinedPath = normalize(join(dirname(sourcePath), path))
  if (path.endsWith('/')) {
    return join(joinedPath, 'index.md')
  }
  if (extname(joinedPath) === '.html') {
    return `${joinedPath.slice(0, -5)}.md`
  }
  return extname(joinedPath) === '' ? `${joinedPath}.md` : joinedPath
}

export function resolveInternalLink(
  link: MarkdownLink,
): ResolvedInternalLink | undefined {
  if (
    link.destination.startsWith('//') ||
    /^[a-z][a-z\d+.-]*:/i.test(link.destination)
  ) {
    return undefined
  }

  const hashIndex = link.destination.indexOf('#')
  const targetWithQuery =
    hashIndex >= 0 ? link.destination.slice(0, hashIndex) : link.destination
  const fragment =
    hashIndex >= 0 ? link.destination.slice(hashIndex + 1) : undefined
  const queryIndex = targetWithQuery.indexOf('?')
  const target =
    queryIndex >= 0 ? targetWithQuery.slice(0, queryIndex) : targetWithQuery

  return {
    targetPath:
      target === ''
        ? link.sourcePath
        : target.startsWith('/')
          ? absoluteLinkTarget(target)
          : relativeLinkTarget(link.sourcePath, target),
    fragment,
  }
}

function headingSlug(heading: string): string {
  return heading
    .replace(/\s*\{#[^}]+\}\s*$/, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\p{M}\s-]/gu, '')
    .replace(/\s+/g, '-')
}

function markdownAnchors(source: string): ReadonlySet<string> {
  const anchors = new Set<string>()
  const slugCounts = new Map<string, number>()
  const authoredMarkdown = stripFencedCode(source)
  const headingPattern = /^#{1,6}\s+(?<heading>.+?)\s*#*\s*$/gm
  const explicitAnchorPattern = /(?:\{#|\bid=["'])(?<anchor>[\w-]+)/g

  for (const match of authoredMarkdown.matchAll(explicitAnchorPattern)) {
    const anchor = match.groups?.['anchor']
    if (anchor !== undefined) {
      anchors.add(anchor)
    }
  }
  for (const match of authoredMarkdown.matchAll(headingPattern)) {
    const heading = match.groups?.['heading']
    if (heading === undefined) {
      continue
    }
    const slug = headingSlug(heading)
    if (slug === '') {
      continue
    }
    const count = slugCounts.get(slug) ?? 0
    anchors.add(count === 0 ? slug : `${slug}-${count}`)
    slugCounts.set(slug, count + 1)
  }

  return anchors
}

export function findBrokenInternalLinks(): readonly BrokenInternalLink[] {
  const brokenLinks: BrokenInternalLink[] = []

  for (const sourcePath of markdownProjectPaths()) {
    const source = readProjectText(sourcePath)
    for (const link of extractMarkdownLinks(sourcePath, source)) {
      const resolvedLink = resolveInternalLink(link)
      if (resolvedLink === undefined) {
        continue
      }
      const absoluteTarget = join(projectRoot, resolvedLink.targetPath)
      if (!existsSync(absoluteTarget) || !statSync(absoluteTarget).isFile()) {
        brokenLinks.push({
          sourcePath,
          destination: link.destination,
          reason: `missing target ${resolvedLink.targetPath}`,
        })
        continue
      }
      if (
        resolvedLink.fragment !== undefined &&
        resolvedLink.fragment !== '' &&
        !markdownAnchors(readFileSync(absoluteTarget, 'utf8')).has(
          resolvedLink.fragment,
        )
      ) {
        brokenLinks.push({
          sourcePath,
          destination: link.destination,
          reason: `missing fragment #${resolvedLink.fragment}`,
        })
      }
    }
  }

  return brokenLinks
}
