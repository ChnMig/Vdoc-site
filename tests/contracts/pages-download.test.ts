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
).version.split('-')[0] as string
const releaseTag = `v${releaseVersion}`

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'vdoc-pages-download-'))
  mkdirSync(join(root, 'workspace/deploy'), { recursive: true })
  mkdirSync(join(root, 'docs/public/downloads'), { recursive: true })
  for (const file of ['workspace.lock.json', 'workspace-distribution.json']) {
    const content = JSON.parse(readProjectText(`workspace/${file}`))
    // Pages fixtures stay stable even while beta tags run the Site content suite.
    if (file === 'workspace-distribution.json') content.version = releaseVersion
    else
      for (const repo of content.repositories)
        repo.ref = `refs/tags/${releaseTag}`
    writeFileSync(join(root, 'workspace', file), JSON.stringify(content))
  }
  for (const file of [
    'docker-compose.yml',
    'docker-compose.external-postgres.yml',
    'docker-compose.beta.yml',
  ])
    copyFileSync(
      join(projectRoot, 'workspace/deploy', file),
      join(root, 'workspace/deploy', file),
    )
  for (const file of [
    'docker-compose.yml',
    'docker-compose.external-postgres.yml',
    'docker-compose.beta.yml',
  ].flatMap((name) => [name, `${name}.sha256`]))
    copyFileSync(
      join(projectRoot, 'docs/public/downloads', file),
      join(root, 'docs/public/downloads', file),
    )
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
  for (const repo of lock.repositories) repo.ref = `refs/tags/${releaseTag}`
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

function replaceCompose(root: string, name: string, content: string) {
  writeFileSync(join(root, 'workspace/deploy', name), content)
  const file = join(root, 'docs/public/downloads', name)
  writeFileSync(file, content)
  const digest = createHash('sha256').update(content).digest('hex')
  writeFileSync(`${file}.sha256`, `${digest}  ${name}\n`)
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

  it.each([
    'docker-compose.yml',
    'docker-compose.external-postgres.yml',
    'docker-compose.beta.yml',
  ])('rejects changed %s even with a regenerated checksum', (name) => {
    const { root } = fixture()
    try {
      const file = join(root, 'docs/public/downloads', name)
      writeFileSync(file, 'services: {}\n')
      expect(check(root).stderr).toContain(
        'standalone Compose checksum does not match',
      )
      const digest = createHash('sha256')
        .update(readFileSync(file))
        .digest('hex')
      writeFileSync(`${file}.sha256`, `${digest}  ${name}\n`)
      expect(check(root).stderr).toContain(
        'standalone Compose differs from the tagged source',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it.each(['latest', releaseTag, `${releaseTag}-beta.1`])(
    'rejects beta Compose following %s even when source and checksum agree',
    (tag) => {
      const { root } = fixture()
      try {
        const content = readFileSync(
          join(root, 'workspace/deploy/docker-compose.beta.yml'),
          'utf8',
        ).replaceAll(':beta', `:${tag}`)
        replaceCompose(root, 'docker-compose.beta.yml', content)
        const result = check(root)
        expect(result.status).not.toBe(0)
        expect(result.stderr).toContain(
          'Beta Compose must contain exactly the backend and Admin beta images',
        )
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    },
  )

  it('rejects an additional application image in beta Compose', () => {
    const { root } = fixture()
    try {
      const content = readFileSync(
        join(root, 'workspace/deploy/docker-compose.beta.yml'),
        'utf8',
      )
      replaceCompose(
        root,
        'docker-compose.beta.yml',
        `${content}\nx-extra-image: ghcr.io/chnmig/vdoc:beta\n`,
      )
      expect(check(root).stderr).toContain(
        'Beta Compose must contain exactly the backend and Admin beta images',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects unused beta anchors when actual application images use another registry', () => {
    const { root } = fixture()
    try {
      const content = readFileSync(
        join(root, 'workspace/deploy/docker-compose.beta.yml'),
        'utf8',
      )
        .replaceAll(
          'image: *backend-image',
          'image: docker.io/chnmig/vdoc:latest',
        )
        .replaceAll(
          'image: *admin-image',
          'image: docker.io/chnmig/vdoc-admin:latest',
        )
      replaceCompose(root, 'docker-compose.beta.yml', content)
      const result = check(root)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain(
        'Beta Compose must wire backend, config-check, and Admin to the beta image anchors',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects a shadow image anchor that redirects beta services to stable images', () => {
    const { root } = fixture()
    try {
      const content = readFileSync(
        join(root, 'workspace/deploy/docker-compose.beta.yml'),
        'utf8',
      ).replace(
        'services:',
        'x-shadow-backend: &backend-image docker.io/chnmig/vdoc:latest\nservices:',
      )
      replaceCompose(root, 'docker-compose.beta.yml', content)
      const result = check(root)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain(
        'Beta Compose must wire backend, config-check, and Admin to the beta image anchors',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it('rejects an extra application service with a different name and indentation', () => {
    const { root } = fixture()
    try {
      const content = readFileSync(
        join(root, 'workspace/deploy/docker-compose.beta.yml'),
        'utf8',
      ).replace(
        'services:',
        'services:\n  extra_1:\n      image: docker.io/chnmig/vdoc:latest',
      )
      replaceCompose(root, 'docker-compose.beta.yml', content)
      const result = check(root)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain(
        'Beta Compose must wire backend, config-check, and Admin to the beta image anchors',
      )
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })

  it.each(['docker-compose.yml', 'docker-compose.external-postgres.yml'])(
    'rejects beta images in stable %s even when source and checksum agree',
    (name) => {
      const { root } = fixture()
      try {
        replaceCompose(
          root,
          name,
          readFileSync(join(root, 'workspace/deploy', name), 'utf8').replaceAll(
            ':latest',
            ':beta',
          ),
        )
        expect(check(root).stderr).toContain(
          'Standalone Compose must follow latest or the matching Site release',
        )
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    },
  )

  it.each(['docker-compose.beta.yml', 'docker-compose.beta.yml.sha256'])(
    'rejects a missing published %s required by the tagged source',
    (name) => {
      const { root } = fixture()
      try {
        rmSync(join(root, 'docs/public/downloads', name))
        const result = check(root)
        expect(result.status).not.toBe(0)
        expect(result.stderr).toContain('ENOENT')
      } finally {
        rmSync(root, { recursive: true, force: true })
      }
    },
  )

  it('supports historical stable releases without beta Compose', () => {
    const { root } = fixture()
    try {
      rmSync(join(root, 'workspace/deploy/docker-compose.beta.yml'))
      rmSync(join(root, 'docs/public/downloads/docker-compose.beta.yml'))
      rmSync(join(root, 'docs/public/downloads/docker-compose.beta.yml.sha256'))
      const result = check(root)
      expect(result.status, result.stderr).toBe(0)
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
