import { execFileSync } from 'node:child_process'
import { strict as assert } from 'node:assert'
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'

const siteRoot = fileURLToPath(new URL('../', import.meta.url))
const sourceRoot = resolve(siteRoot, '..')
const exportRoot = join(siteRoot, 'workspace')
const checkOnly = process.argv[2] === '--check'
assert(
  process.argv.length === 2 || (checkOnly && process.argv.length === 3),
  'Usage: node scripts/sync-workspace.mjs [--check]',
)

const readJson = (root, file) =>
  JSON.parse(readFileSync(join(root, file), 'utf8'))
const manifestAt = (root) => readJson(root, 'workspace-distribution.json')
const digestAt = (root) =>
  execFileSync('bash', [join(root, 'scripts/vdoc-control-plane-digest.sh')], {
    env: {
      ...process.env,
      VDOC_WORKSPACE_ROOT: root,
      VDOC_WORKSPACE_DISTRIBUTION_FILE: join(
        root,
        'workspace-distribution.json',
      ),
    },
    encoding: 'utf8',
  }).trim()

function inventory(root, prefix = '') {
  if (!existsSync(root)) return []
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    assert(
      !entry.isSymbolicLink(),
      `Export contains a symlink: ${prefix}${entry.name}`,
    )
    return entry.isDirectory()
      ? inventory(join(root, entry.name), `${prefix}${entry.name}/`)
      : [`${prefix}${entry.name}`]
  })
}

function validateManifest(manifest) {
  assert.equal(manifest.repository_lock, 'workspace.lock.json')
  assert(manifest.files.includes('.env.example'))
  assert(
    manifest.files.every(
      (file) =>
        /^[A-Za-z0-9._/-]+$/.test(file) &&
        file
          .split('/')
          .every((part) => part && part !== '.' && part !== '..') &&
        !file
          .split('/')
          .some(
            (part) =>
              part === '.env' ||
              (part.startsWith('.env.') && part !== '.env.example'),
          ),
    ),
    'Export must contain safe relative paths and no real environment files',
  )
}

if (!checkOnly) {
  assert(
    existsSync(join(sourceRoot, 'workspace-distribution.json')),
    'Run workspace:sync inside the maintainer workspace; standalone Site clones use workspace:check',
  )
  const manifest = manifestAt(sourceRoot)
  validateManifest(manifest)
  const digest = digestAt(sourceRoot)
  const extras = inventory(exportRoot).filter(
    (file) => !manifest.files.includes(file),
  )
  assert.deepEqual(
    extras,
    [],
    'Refusing to overwrite an export containing unlisted files',
  )
  for (const file of manifest.files) {
    const target = join(exportRoot, file)
    mkdirSync(dirname(target), { recursive: true })
    copyFileSync(join(sourceRoot, file), target)
    chmodSync(target, manifest.executables.includes(file) ? 0o755 : 0o644)
  }
  const lock = readJson(exportRoot, manifest.repository_lock)
  const site = lock.repositories.find((repo) => repo.path === 'Vdoc-site')
  assert(site, 'Release source lock must include Site')
  site.commit = '@release'
  lock.controlPlane.sha256 = digest
  writeFileSync(
    join(exportRoot, manifest.repository_lock),
    JSON.stringify(lock, null, 2) + '\n',
  )
}

const manifest = manifestAt(exportRoot)
validateManifest(manifest)
assert.deepEqual(
  inventory(exportRoot).sort(),
  manifest.files,
  'Export inventory differs from the allowlist',
)
const lock = readJson(exportRoot, manifest.repository_lock)
assert.equal(
  digestAt(exportRoot),
  lock.controlPlane.sha256,
  'Export control-plane digest is stale',
)
for (const file of manifest.files) {
  const stat = lstatSync(join(exportRoot, file))
  assert(stat.isFile(), `Export file is not regular: ${file}`)
  assert.equal(
    Boolean(stat.mode & 0o111),
    manifest.executables.includes(file),
    `Export executable mode differs: ${file}`,
  )
}

if (existsSync(join(sourceRoot, 'workspace-distribution.json'))) {
  for (const file of manifest.files) {
    if (file === manifest.repository_lock) continue
    assert(
      readFileSync(join(sourceRoot, file)).equals(
        readFileSync(join(exportRoot, file)),
      ),
      `Public copy is stale: ${file}; run workspace:sync`,
    )
  }
  const sourceLock = readJson(sourceRoot, manifest.repository_lock)
  sourceLock.controlPlane.sha256 = lock.controlPlane.sha256
  const sourceSite = sourceLock.repositories.find(
    (repo) => repo.path === 'Vdoc-site',
  )
  if (sourceSite?.commit !== '@release') {
    assert.equal(
      sourceSite?.commit,
      execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: siteRoot,
        encoding: 'utf8',
      }).trim(),
      'Extracted workspace Site commit differs from this checkout',
    )
    sourceSite.commit = '@release'
  }
  assert.deepEqual(lock, sourceLock, 'Export changed the repository lock')
}

process.stdout.write(
  `Workspace export verified: ${manifest.files.length} files, ${lock.controlPlane.sha256}\n`,
)
