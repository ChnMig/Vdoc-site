import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { lstatSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { projectRoot, readProjectText } from './contract-helpers'

const workspaceRoot = join(projectRoot, 'workspace')
const manifest = JSON.parse(
  readProjectText('workspace/workspace-distribution.json'),
) as {
  artifact_name: string
  root_directory: string
  files: string[]
  executables: string[]
}
const artifactName = `${manifest.artifact_name}.tar.gz`
const archivePath = join(projectRoot, 'docs/public/downloads', artifactName)

describe('public Compose workspace distribution', () => {
  it('validates the exported inventory, lock digest, modes, and available source files', () => {
    expect(
      execFileSync(
        process.execPath,
        [join(projectRoot, 'scripts/sync-workspace.mjs'), '--check'],
        { encoding: 'utf8' },
      ),
    ).toContain(`Workspace export verified: ${manifest.files.length} files`)
  })

  it('ships a checksum matching the downloadable archive', () => {
    const digest = createHash('sha256')
      .update(readFileSync(archivePath))
      .digest('hex')
    expect(readFileSync(`${archivePath}.sha256`, 'utf8')).toBe(
      `${digest}  ${artifactName}\n`,
    )
  })

  it('contains exactly the public sources and executable modes, with no environment secrets or checkouts', () => {
    const entries = execFileSync('tar', ['-tzf', archivePath], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
    const expected = manifest.files.map(
      (file) => `${manifest.root_directory}/${file}`,
    )
    const directories = new Set(
      expected.flatMap((file) => {
        const parts = file.split('/')
        return parts
          .slice(1)
          .map((_, index) => `${parts.slice(0, index + 1).join('/')}/`)
      }),
    )
    expect(entries.sort()).toEqual([...expected, ...directories].sort())
    expect(manifest.files).not.toContain('.env')

    const stage = mkdtempSync(join(tmpdir(), 'vdoc-site-archive-test-'))
    try {
      execFileSync('tar', ['-xzf', archivePath, '-C', stage])
      const staleFiles: string[] = []
      for (const file of manifest.files) {
        const extracted = join(stage, manifest.root_directory, file)
        const stat = lstatSync(extracted)
        expect(stat.isFile(), file).toBe(true)
        expect(stat.mode & 0o777, file).toBe(
          manifest.executables.includes(file) ? 0o755 : 0o644,
        )
        if (
          !readFileSync(extracted).equals(
            readFileSync(join(workspaceRoot, file)),
          )
        ) {
          staleFiles.push(file)
        }
      }
      expect(
        staleFiles,
        'Download archive is stale; run pnpm workspace:package and commit both the .tar.gz and .sha256 files with workspace/ changes',
      ).toEqual([])
    } finally {
      rmSync(stage, { recursive: true, force: true })
    }
  })
})
