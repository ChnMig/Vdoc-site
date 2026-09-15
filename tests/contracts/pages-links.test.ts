import { execFileSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { projectRoot } from './contract-helpers'

it('adapts legacy public-site links and examples without changing release downloads', () => {
  const root = mkdtempSync(join(tmpdir(), 'vdoc-pages-links-'))
  try {
    mkdirSync(join(root, 'docs/en'), { recursive: true })
    mkdirSync(join(root, 'docs/public/downloads'), { recursive: true })
    const markdown =
      '[Download](https://vibe-doc.com/downloads/release.tar.gz)\n\nVDOC_BOOTSTRAP_BASE=https://vibe-doc.com/downloads\n\n[Backend](https://backend.example.test/)\n'
    writeFileSync(join(root, 'docs/deployment.md'), markdown)
    writeFileSync(join(root, 'docs/en/deployment.md'), markdown)
    const download = join(root, 'docs/public/downloads/release.tar.gz')
    writeFileSync(
      download,
      Buffer.from('immutable https://vibe-doc.com/ archive bytes'),
    )
    const before = readFileSync(download)
    const script = join(projectRoot, 'scripts/prepare-pages-links.mjs')
    execFileSync(process.execPath, [script, root])
    for (const locale of ['', 'en/']) {
      expect(
        readFileSync(join(root, `docs/${locale}deployment.md`), 'utf8'),
      ).toBe(
        markdown.replaceAll(
          'https://vibe-doc.com/',
          'https://chnmig.github.io/Vdoc-site/',
        ),
      )
    }
    expect(readFileSync(download)).toEqual(before)
    expect(
      execFileSync(process.execPath, [script, root], { encoding: 'utf8' }),
    ).toContain('Prepared 0 Markdown files')
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
