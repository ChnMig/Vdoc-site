import { existsSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  projectRoot,
  readProjectText,
  routeToMarkdownPath,
} from './contract-helpers'
import { adminAiRoutePair, requiredRoutePairs } from './required-routes'

function isProjectFile(path: string): boolean {
  const absolutePath = join(projectRoot, path)
  return existsSync(absolutePath) && statSync(absolutePath).isFile()
}

function sourceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start)
  const endIndex = source.indexOf(end, startIndex + start.length)
  return startIndex >= 0 && endIndex > startIndex
    ? source.slice(startIndex, endIndex)
    : ''
}

describe('locale and route parity contract', () => {
  it.each(requiredRoutePairs)(
    '$slug has authored Chinese and English routes',
    ({ zh, en }) => {
      const routePaths = [
        routeToMarkdownPath(zh),
        routeToMarkdownPath(en),
      ] as const
      const missingPaths = routePaths.filter((path) => !isProjectFile(path))

      expect(
        missingPaths,
        `missing locale route files: ${missingPaths.join(', ')}`,
      ).toEqual([])
    },
  )

  it('exposes Admin AI in the Chinese sidebar', () => {
    const config = readProjectText('docs/.vitepress/config.ts')
    const zhSidebar = sourceBetween(
      config,
      'const zhSidebar',
      'const enSidebar',
    )

    expect(zhSidebar, 'Chinese sidebar declaration must be present').not.toBe(
      '',
    )
    expect(zhSidebar).toMatch(
      new RegExp(`link:\\s*['"]${adminAiRoutePair.zh}['"]`),
    )
  })

  it('exposes Admin AI in the English sidebar', () => {
    const config = readProjectText('docs/.vitepress/config.ts')
    const enSidebar = sourceBetween(config, 'const enSidebar', 'export {')

    expect(enSidebar, 'English sidebar declaration must be present').not.toBe(
      '',
    )
    expect(enSidebar).toMatch(
      new RegExp(`link:\\s*['"]${adminAiRoutePair.en}['"]`),
    )
  })
})
