import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

export function verifyBetaCompose(compose) {
  // Include anchor definitions and direct image declarations; comments are not config.
  const source = compose
    .toString()
    .split('\n')
    .map((line) => line.split('#')[0])
    .join('\n')
  const images = source.match(/ghcr\.io\/chnmig\/vdoc[^\s"']*/g) ?? []
  assert.deepEqual(
    images.sort(),
    ['ghcr.io/chnmig/vdoc-admin:beta', 'ghcr.io/chnmig/vdoc:beta'],
    'Beta Compose must contain exactly the backend and Admin beta images',
  )
  // This checks the public template's supported YAML shape without relying on an
  // installed YAML package: Pages verifies downloads before installing dependencies.
  const message =
    'Beta Compose must wire backend, config-check, and Admin to the beta image anchors'
  for (const [anchor, image] of [
    ['backend', 'ghcr.io/chnmig/vdoc:beta'],
    ['admin', 'ghcr.io/chnmig/vdoc-admin:beta'],
  ]) {
    assert.equal(
      source.match(new RegExp(`&${anchor}-image(?![A-Za-z0-9_-])`, 'g'))
        ?.length,
      1,
      message,
    )
    const definitions = source
      .split('\n')
      .filter((line) => line.startsWith(`x-${anchor}-image:`))
    assert.deepEqual(
      definitions.map((line) => line.trim()),
      [`x-${anchor}-image: &${anchor}-image ${image}`],
      message,
    )
  }
  const services = new Map()
  let inServices = false
  let service
  let servicesSections = 0
  for (const line of source.split('\n')) {
    if (/^services:\s*$/.test(line)) {
      inServices = true
      servicesSections++
      continue
    }
    if (/^\S/.test(line)) inServices = false
    if (!inServices) continue
    const declaration = /^ {2}([^\s:]+):\s*$/.exec(line)
    if (/^ {2}\S/.test(line)) assert(declaration, message)
    if (declaration) {
      service = declaration[1]
      assert(!services.has(service), message)
      services.set(service, [])
    }
    const image = /^ {4}image:\s*(.+?)\s*$/.exec(line)
    if (image) {
      assert(service !== undefined, message)
      services.get(service).push(image[1])
    }
  }
  assert.equal(servicesSections, 1, message)
  assert.deepEqual(
    [...services.keys()].sort(),
    ['admin', 'backend', 'config-check', 'postgres', 'rustfs'],
    message,
  )
  for (const [name, anchor] of [
    ['backend', 'backend'],
    ['config-check', 'backend'],
    ['admin', 'admin'],
  ])
    assert.deepEqual(services.get(name), [`*${anchor}-image`], message)
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [composePath, ...extra] = process.argv.slice(2)
  assert(
    composePath && extra.length === 0,
    'Usage: node scripts/verify-beta-compose.mjs COMPOSE_FILE',
  )
  verifyBetaCompose(readFileSync(composePath))
}
