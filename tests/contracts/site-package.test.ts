import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { projectRoot, readProjectText } from './contract-helpers'

const manifest = JSON.parse(
  readProjectText('workspace/workspace-distribution.json'),
) as { artifact_name: string; root_directory: string }
const archiveName = `${manifest.artifact_name}.tar.gz`

function fixture(candidate = false) {
  const root = mkdtempSync(join(tmpdir(), 'vdoc-site-package-test-'))
  const built = join(root, 'docs/.vitepress/dist')
  const downloads = join(root, 'docs/public/downloads')
  for (const directory of ['scripts', 'workspace', 'docs/public/downloads']) {
    mkdirSync(join(root, directory), { recursive: true })
  }
  mkdirSync(join(built, 'downloads'), { recursive: true })
  copyFileSync(
    join(projectRoot, 'scripts/package-site.sh'),
    join(root, 'scripts/package-site.sh'),
  )
  writeFileSync(
    join(root, 'workspace/workspace-distribution.json'),
    JSON.stringify(manifest),
  )
  writeFileSync(join(built, 'index.html'), '<!doctype html><title>Vdoc</title>')
  for (const file of [archiveName, `${archiveName}.sha256`]) {
    const source = join(projectRoot, 'docs/public/downloads', file)
    copyFileSync(source, join(downloads, file))
    copyFileSync(source, join(built, 'downloads', file))
  }
  // Fixtures exercise the packaging boundary independently of publication status.
  const unpacked = join(root, 'bootstrap')
  mkdirSync(unpacked)
  execFileSync('tar', ['-xzf', join(downloads, archiveName), '-C', unpacked])
  const lockPath = join(
    unpacked,
    manifest.root_directory,
    'workspace.lock.json',
  )
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  if (candidate) lock.candidate = true
  else delete lock.candidate
  writeFileSync(lockPath, JSON.stringify(lock))
  execFileSync('tar', [
    '-czf',
    join(downloads, archiveName),
    '-C',
    unpacked,
    manifest.root_directory,
  ])
  const digest = createHash('sha256')
    .update(readFileSync(join(downloads, archiveName)))
    .digest('hex')
  writeFileSync(
    join(downloads, `${archiveName}.sha256`),
    `${digest}  ${archiveName}\n`,
  )
  for (const file of [archiveName, `${archiveName}.sha256`])
    copyFileSync(join(downloads, file), join(built, 'downloads', file))
  return { root, built, downloads }
}

describe('site release packaging', () => {
  it('refuses candidate downloads before producing release assets', () => {
    const { root } = fixture(true)
    try {
      const result = spawnSync(
        'bash',
        [join(root, 'scripts/package-site.sh')],
        { encoding: 'utf8' },
      )
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('candidates are not deployable')
      expect(existsSync(join(root, '.artifacts/release'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
  it('packages the built site and identical Compose downloads with matching checksums', () => {
    const { root, built, downloads } = fixture()
    try {
      execFileSync('bash', [join(root, 'scripts/package-site.sh')])
      const output = join(root, '.artifacts/release')
      const archives = [archiveName, 'vdoc-site-static.tar.gz']
      expect(readdirSync(output).sort()).toEqual(
        archives.flatMap((file) => [file, `${file}.sha256`]).sort(),
      )
      for (const file of archives) {
        const digest = createHash('sha256')
          .update(readFileSync(join(output, file)))
          .digest('hex')
        expect(readFileSync(join(output, `${file}.sha256`), 'utf8')).toBe(
          `${digest}  ${file}\n`,
        )
      }
      expect(readFileSync(join(output, archiveName))).toEqual(
        readFileSync(join(downloads, archiveName)),
      )
      const extracted = join(root, 'extracted')
      mkdirSync(extracted)
      execFileSync('tar', [
        '-xzf',
        join(output, 'vdoc-site-static.tar.gz'),
        '-C',
        extracted,
      ])
      for (const file of [
        'index.html',
        `downloads/${archiveName}`,
        `downloads/${archiveName}.sha256`,
      ]) {
        expect(readFileSync(join(extracted, file))).toEqual(
          readFileSync(join(built, file)),
        )
      }
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('refuses a stale built download before producing release assets', () => {
    const { root, built } = fixture()
    try {
      writeFileSync(join(built, 'downloads', archiveName), 'stale download')
      const result = spawnSync(
        'bash',
        [join(root, 'scripts/package-site.sh')],
        {
          encoding: 'utf8',
        },
      )
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('Built download is missing or stale')
      expect(existsSync(join(root, '.artifacts/release'))).toBe(false)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
