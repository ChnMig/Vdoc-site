import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import {
  markdownProjectPaths,
  projectRoot,
  readProjectText,
} from './contract-helpers'
import { extractMarkdownLinks } from './markdown-links'

describe('GitHub Markdown navigation', () => {
  it('uses existing in-repository paths without relying on VitePress route resolution', () => {
    const files = [
      'README.md',
      ...markdownProjectPaths(),
      ...readdirSync(join(projectRoot, 'workspace'))
        .filter((file) => file.endsWith('.md'))
        .map((file) => `workspace/${file}`),
    ]
    const failures: string[] = []
    for (const file of files) {
      const body = readProjectText(file).replace(
        /^---\r?\n[\s\S]*?\r?\n---\r?\n/,
        '',
      )
      for (const { destination } of extractMarkdownLinks(file, body)) {
        if (/^(?:[a-z][\w+.-]*:|#|\/\/)/i.test(destination)) continue
        const path = decodeURIComponent(destination.split(/[?#]/)[0] ?? '')
        const target = resolve(projectRoot, dirname(file), path)
        const repoPath = relative(projectRoot, target)
        if (
          repoPath === '..' ||
          repoPath.startsWith('../') ||
          !existsSync(target)
        ) {
          failures.push(`${file} -> ${destination}`)
        }
      }
    }
    expect(failures).toEqual([])
  })
})
