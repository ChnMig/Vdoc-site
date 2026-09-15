import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { projectRoot, readProjectText } from './contract-helpers'

const releaseVersion = JSON.parse(
  readProjectText('workspace/workspace-distribution.json'),
).version as string
const releaseTag = `v${releaseVersion}`

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'vdoc-pages-download-'))
  mkdirSync(join(root, 'workspace'))
  mkdirSync(join(root, 'docs/public/downloads'), { recursive: true })
  for (const file of ['workspace.lock.json', 'workspace-distribution.json']) {
    writeFileSync(
      join(root, 'workspace', file),
      readProjectText(`workspace/${file}`),
    )
  }
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ version: releaseVersion }),
  )
  execFileSync('git', ['init', '--quiet', root])
  execFileSync('git', ['add', 'package.json'], { cwd: root })
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Pages Test',
      '-c',
      'user.email=pages@example.test',
      'commit',
      '--quiet',
      '-m',
      'fixture',
    ],
    { cwd: root },
  )
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  const manifest = JSON.parse(
    readProjectText('workspace/workspace-distribution.json'),
  )
  const archiveName = `${manifest.artifact_name}.tar.gz`
  const archive = join(root, 'docs/public/downloads', archiveName)
  const unpacked = join(root, 'unpacked')
  mkdirSync(unpacked)
  execFileSync('tar', [
    '-xzf',
    join(projectRoot, 'docs/public/downloads', archiveName),
    '-C',
    unpacked,
  ])
  const lockPath = join(
    unpacked,
    manifest.root_directory,
    'workspace.lock.json',
  )
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  delete lock.candidate
  lock.repositories.find(
    (repo: { path: string }) => repo.path === 'Vdoc-site',
  ).commit = commit
  function pack() {
    writeFileSync(lockPath, JSON.stringify(lock))
    execFileSync('tar', [
      '-czf',
      archive,
      '-C',
      unpacked,
      manifest.root_directory,
    ])
    const digest = createHash('sha256')
      .update(readFileSync(archive))
      .digest('hex')
    writeFileSync(`${archive}.sha256`, `${digest}  ${archiveName}\n`)
  }
  pack()
  return { root, archive, lock, pack }
}

function check(root: string, tag = releaseTag) {
  return spawnSync(
    process.execPath,
    [join(projectRoot, 'scripts/verify-pages-download.mjs'), root, tag],
    { encoding: 'utf8' },
  )
}

describe('published Pages download validation', () => {
  it('accepts a stable archive bound to the released Site checkout', () => {
    const { root } = fixture()
    try {
      const result = check(root)
      expect(result.status, result.stderr).toBe(0)
      expect(result.stdout).toContain(`Pages download verified: ${releaseTag}`)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects a candidate even when its checksum and source commit match', () => {
    const { root, lock, pack } = fixture()
    try {
      lock.candidate = true
      pack()
      const result = check(root)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain(
        'Candidate downloads cannot be deployed to Pages',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects a valid archive belonging to another Site commit', () => {
    const { root, lock, pack } = fixture()
    try {
      lock.repositories.find(
        (repo: { path: string }) => repo.path === 'Vdoc-site',
      ).commit = '1111111111111111111111111111111111111111'
      pack()
      const result = check(root)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain(
        'Published Compose lock points to a different Site commit',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects changed download bytes and non-stable tags', () => {
    const { root, archive } = fixture()
    try {
      copyFileSync(join(root, 'package.json'), archive)
      expect(check(root).stderr).toContain(
        'Published Compose checksum does not match',
      )
      expect(check(root, `${releaseTag}-rc.1`).status).not.toBe(0)
      expect(check(root, 'main').status).not.toBe(0)
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})
