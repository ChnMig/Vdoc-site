import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createMarkdownRenderer, disposeMdItInstance } from 'vitepress'
import { sharedCodeColors } from '../docs/.vitepress/code-colors'

const docsRoot = new URL('../docs/', import.meta.url).pathname
const css = readFileSync(join(docsRoot, '.vitepress/theme/custom.css'), 'utf8')

function expandSharedColors(html: string): string {
  return html.replace(/class="(vp-code-(?:string|value|text))"/g, (_, name) => {
    const declarations = css.match(
      new RegExp(`\\.vp-code \\.${name} \\{([^}]+)\\}`),
    )?.[1]
    if (declarations === undefined) throw new Error(`Missing CSS for ${name}`)
    const style = declarations
      .replace(/\s/g, '')
      .replace(/;$/, '')
      .replace(/#[\da-f]+/g, (color) => color.toUpperCase())
    return `style="${style}"`
  })
}

function normalizeCodeGroupIds(html: string): string {
  const ids = new Map<string, string>()
  return html.replace(
    /\b(name|id|for)="((?:group|tab)-[\w-]+)"/g,
    (_, attribute: string, value: string) => {
      // Preserve uniqueness and input/label references across random renders.
      if (!ids.has(value)) ids.set(value, `${value.split('-')[0]}-${ids.size}`)
      return `${attribute}="${ids.get(value)}"`
    },
  )
}

test('shared code colors preserve both themes and all bilingual document markup', async () => {
  const documents = ['', 'en'].flatMap((directory) =>
    readdirSync(join(docsRoot, directory))
      .filter((file) => file.endsWith('.md'))
      .map((file) => ({
        path: `${directory}/${file}`,
        source: readFileSync(join(docsRoot, directory, file), 'utf8'),
      })),
  )
  disposeMdItInstance()
  const original = await createMarkdownRenderer(docsRoot)
  const baseline = documents.map(({ source }) => original.render(source))
  // VitePress caches one renderer globally, so each configuration needs its own lifetime.
  disposeMdItInstance()
  const compact = await createMarkdownRenderer(docsRoot, {
    codeTransformers: [sharedCodeColors],
  })
  let savedBytes = 0
  try {
    for (const [index, { source, path }] of documents.entries()) {
      const before = baseline[index]
      if (before === undefined) throw new Error(`Missing baseline for ${path}`)
      const after = compact.render(source)
      expect(normalizeCodeGroupIds(expandSharedColors(after)), path).toBe(
        normalizeCodeGroupIds(before),
      )
      savedBytes += Buffer.byteLength(before) - Buffer.byteLength(after)
    }
  } finally {
    disposeMdItInstance()
  }
  expect(savedBytes).toBeGreaterThan(10_000)
}, 30_000)
