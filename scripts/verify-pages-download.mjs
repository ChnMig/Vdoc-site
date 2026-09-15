import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'

const [siteDirectory, releaseTag, ...extra] = process.argv.slice(2)
assert(
  siteDirectory && releaseTag && extra.length === 0,
  'Usage: node scripts/verify-pages-download.mjs SITE_DIRECTORY RELEASE_TAG',
)
assert.match(
  releaseTag,
  /^v[0-9]+\.[0-9]+\.[0-9]+$/,
  'Pages requires a stable release tag',
)
const site = resolve(siteDirectory)
const readJson = (file) => JSON.parse(readFileSync(join(site, file), 'utf8'))
const manifest = readJson('workspace/workspace-distribution.json')
const template = readJson('workspace/workspace.lock.json')
assert.equal(
  manifest.version,
  releaseTag.slice(1),
  'Compose release version differs from the Site tag',
)
assert.equal(
  readJson('package.json').version,
  releaseTag.slice(1),
  'Site package version differs from the tag',
)
assert.match(manifest.artifact_name, /^[A-Za-z0-9._-]+$/)
assert.match(manifest.root_directory, /^[A-Za-z0-9._-]+$/)
assert(
  !existsSync(join(site, 'docs/public/CNAME')),
  'Pages uses the GitHub default domain',
)

const archiveName = `${manifest.artifact_name}.tar.gz`
const archive = join(site, 'docs/public/downloads', archiveName)
const digest = createHash('sha256').update(readFileSync(archive)).digest('hex')
assert.equal(
  readFileSync(`${archive}.sha256`, 'utf8'),
  `${digest}  ${archiveName}\n`,
  'Published Compose checksum does not match the archive',
)
const lock = JSON.parse(
  execFileSync(
    'tar',
    ['-xOf', archive, `${manifest.root_directory}/workspace.lock.json`],
    { encoding: 'utf8' },
  ),
)
assert(
  !Object.hasOwn(lock, 'candidate'),
  'Candidate downloads cannot be deployed to Pages',
)
assert.equal(lock.schemaVersion, 2)
assert.deepEqual(lock.repositories.map((repo) => repo.path).sort(), [
  'Vdoc',
  'Vdoc-admin',
  'Vdoc-mcp',
  'Vdoc-site',
  'Vdoc-skill',
])
for (const repo of lock.repositories) {
  assert.equal(repo.ref, `refs/tags/${releaseTag}`)
  assert.match(repo.commit, /^[0-9a-f]{40}$/)
}
const releasedSite = lock.repositories.find((repo) => repo.path === 'Vdoc-site')
const checkoutCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: site,
  encoding: 'utf8',
}).trim()
assert.equal(
  releasedSite.commit,
  checkoutCommit,
  'Published Compose lock points to a different Site commit',
)
releasedSite.commit = '@release'
assert.deepEqual(
  lock,
  template,
  'Published Compose lock differs from the tagged source template',
)
process.stdout.write(
  `Pages download verified: ${releaseTag}, Site ${checkoutCommit}, SHA-256 ${digest}\n`,
)
