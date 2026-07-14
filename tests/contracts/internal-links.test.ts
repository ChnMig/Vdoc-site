import { readProjectText, routeToMarkdownPath } from './contract-helpers'
import {
  extractMarkdownLinks,
  findBrokenInternalLinks,
  resolveInternalLink,
} from './markdown-links'
import { adminAiRoutePair } from './required-routes'

type DiscoverabilityPage = {
  readonly label: string
  readonly sourcePath: string
  readonly targetPath: string
}

const discoverabilitySlugs = [
  'product-overview',
  'how-it-works',
  'admin-usage',
  'api-reference',
  'version-notes',
  'changelog',
  'troubleshooting',
  'release-rollback',
] as const

const discoverabilityPages: readonly DiscoverabilityPage[] =
  discoverabilitySlugs.flatMap((slug) => [
    {
      label: `Chinese ${slug}`,
      sourcePath: `docs/${slug}.md`,
      targetPath: routeToMarkdownPath(adminAiRoutePair.zh),
    },
    {
      label: `English ${slug}`,
      sourcePath: `docs/en/${slug}.md`,
      targetPath: routeToMarkdownPath(adminAiRoutePair.en),
    },
  ])

function linksToTarget(sourcePath: string, targetPath: string): boolean {
  const source = readProjectText(sourcePath)
  return extractMarkdownLinks(sourcePath, source).some(
    (link) => resolveInternalLink(link)?.targetPath === targetPath,
  )
}

describe('internal link and discoverability contract', () => {
  it('resolves every authored Markdown internal link and fragment', () => {
    const brokenLinks = findBrokenInternalLinks()
    const evidence = brokenLinks
      .map(
        ({ sourcePath, destination, reason }) =>
          `${sourcePath} -> ${destination}: ${reason}`,
      )
      .join('\n')

    expect(brokenLinks, evidence).toEqual([])
  })

  it.each(discoverabilityPages)(
    '$label links to its locale Admin AI guide',
    ({ sourcePath, targetPath }) => {
      expect(
        linksToTarget(sourcePath, targetPath),
        `${sourcePath} must link to ${targetPath}`,
      ).toBe(true)
    },
  )
})
