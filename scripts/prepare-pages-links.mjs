import assert from 'node:assert/strict'
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

const [siteDirectory, ...extra] = process.argv.slice(2)
assert(
  siteDirectory && extra.length === 0,
  'Usage: node scripts/prepare-pages-links.mjs SITE_DIRECTORY',
)
const pagesOrigin = 'https://chnmig.github.io/Vdoc-site/'
let changed = 0
function prepare(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name)
    if (entry.isDirectory() && !['.vitepress', 'public'].includes(entry.name)) {
      prepare(file)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      const source = readFileSync(file, 'utf8')
      const output = source.replaceAll('https://vibe-doc.com/', pagesOrigin)
      if (output !== source) {
        writeFileSync(file, output)
        changed += 1
      }
    }
  }
}
prepare(join(resolve(siteDirectory), 'docs'))
process.stdout.write(`Prepared ${changed} Markdown files for ${pagesOrigin}\n`)
