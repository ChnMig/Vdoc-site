#!/usr/bin/env node
// Disposable dual-domain HTTPS deployment; no production configuration or volumes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { chromium, expect } = createRequire(join(root, 'Vdoc-admin/package.json'))('@playwright/test')
const { values } = parseArgs({ options: { 'backend-image': { type: 'string' }, 'admin-image': { type: 'string' }, 'backend-container-port': { type: 'string', default: '8080' } } })
const backendContainerPort = Number(values['backend-container-port'])
assert.ok(Number.isInteger(backendContainerPort) && backendContainerPort > 0 && backendContainerPort <= 65535, 'Backend container port must be valid')
const directory = mkdtempSync(join(tmpdir(), 'vdoc-caddy-'))
const project = `vdoc-caddy-${randomBytes(5).toString('hex')}`
const secrets = []
const secret = () => {
  const value = randomBytes(24).toString('hex')
  secrets.push(value)
  return value
}
const redact = (value) => secrets.reduce((text, value) => text.replaceAll(value, '[redacted]'), String(value))
const environment = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(VDOC_|COMPOSE_)/.test(name)))
const prefix = ['compose', '--project-name', project, '-f', join(directory, 'docker-compose.yml'), '-f', join(directory, 'proxy.json')]
function compose(...args) {
  try {
    return execFileSync('docker', [...prefix, ...args], { cwd: directory, env: environment, encoding: 'utf8', timeout: 300_000, stdio: ['ignore', 'pipe', 'pipe'] })
  } catch (error) {
    throw new Error(redact(`${error.stdout ?? ''}\n${error.stderr ?? ''}`))
  }
}
async function freePort() {
  const server = createServer()
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise((resolve) => server.close(resolve))
  return port
}

let browser
let strictBrowser
try {
  const edgePort = await freePort()
  const backendPort = await freePort()
  const adminPort = await freePort()
  const frontend = `https://vdoc.localhost:${edgePort}`
  const backend = `https://api.vdoc.localhost:${edgePort}`
  const password = secret()
  let source = readFileSync(join(root, 'deploy/docker-compose.yml'), 'utf8')
    .replace('VDOC_SERVER_PORT: "8080"', `VDOC_SERVER_PORT: "${backendContainerPort}"`)
    .replace('127.0.0.1:8080:8080', `127.0.0.1:${backendPort}:${backendContainerPort}`)
    .replace('127.0.0.1:8081:8080', `127.0.0.1:${adminPort}:8080`)
  if (backendContainerPort !== 8080) {
    source = source.replace('VDOC_ADMIN_API_BASE_URL: "same-origin"', `VDOC_ADMIN_API_BASE_URL: "same-origin"\n      VDOC_ADMIN_API_UPSTREAM: "backend:${backendContainerPort}"`)
  }
  for (const [name, image] of [['backend', values['backend-image']], ['admin', values['admin-image']]]) {
    if (image) source = source.replace(new RegExp(`(^x-${name}-image: &${name}-image )\\S+`, 'm'), `$1${image}`)
  }
  source = source.replaceAll('CHANGE_ME_INITIAL_ADMIN_PASSWORD', password)
  source = source.replace(/CHANGE_ME_[A-Z_]+/g, () => secret())
  writeFileSync(join(directory, 'docker-compose.yml'), source, { mode: 0o600 })
  const caddy = readFileSync(join(root, 'deploy/Caddyfile'), 'utf8')
    .replaceAll('docs.example.com', 'vdoc.localhost')
    .replaceAll('api.example.com', 'api.vdoc.localhost')
    .replaceAll('127.0.0.1:8081', 'admin:8080')
    .replaceAll('127.0.0.1:8080', `backend:${backendContainerPort}`)
    .replaceAll('.localhost {', '.localhost {\n\ttls internal')
  writeFileSync(join(directory, 'Caddyfile'), caddy)
  writeFileSync(join(directory, 'proxy.json'), JSON.stringify({
    services: { caddy: {
      image: 'caddy:2', depends_on: { admin: { condition: 'service_healthy' } },
      ports: [`127.0.0.1:${edgePort}:443`],
      volumes: ['./Caddyfile:/etc/caddy/Caddyfile:ro', 'caddy-data:/data', 'caddy-config:/config'],
    } }, volumes: { 'caddy-data': {}, 'caddy-config': {} },
  }))
  compose('config', '--quiet')
  compose('up', '-d', '--wait', '--wait-timeout', '180')
  assert.match(compose('exec', '-T', 'postgres', 'postgres', '--version'), /PostgreSQL\) 18\./)
  process.stdout.write('PASS: isolated PostgreSQL 18, RustFS 1.0.0, Backend, Admin and Caddy started\n')

  browser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1'] })
  const browserOptions = { ignoreHTTPSErrors: true, serviceWorkers: 'block' }
  const context = await browser.newContext(browserOptions)
  const page = await context.newPage()
  const apiRequests = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url())
  })
  for (const origin of [`http://127.0.0.1:${adminPort}`, frontend]) {
    await page.goto(`${origin}/sign-in`)
    assert.equal(await page.evaluate(() => window.__VDOC_ADMIN_CONFIG__.apiBaseUrl), origin)
    await page.getByLabel('Email', { exact: true }).fill('admin@example.com')
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in to Vdoc' }).click()
    await expect(page).toHaveURL(`${origin}/`)
    assert.ok(apiRequests.some((url) => url === `${origin}/api/v1/open/auth/login`), 'Sign-in must use the workbench origin')
  }
  const token = await page.evaluate(() => sessionStorage.getItem('vdoc_admin_access_token'))
  assert.ok(token, 'Real sign-in must establish an account session')
  secrets.push(token)
  process.stdout.write('PASS: real browser sign-in over local HTTP and HTTPS; runtime config follows workbench origin\n')

  async function raw(path, data, authorization = token) {
    return page.evaluate(async ({ url, data, authorization }) => {
      const response = await fetch(url, {
        method: data === undefined ? 'GET' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authorization },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }),
      })
      return response.json()
    }, { url: frontend + path, data, authorization })
  }
  async function api(path, data) {
    const result = await raw(path, data)
    assert.equal(result.code, 200, `API contract failed for ${path}: ${result.status}`)
    return result.detail
  }
  const identity = await api('/api/v1/private/identity/me')
  const team = await api('/api/v1/private/teams', { name: 'Caddy smoke team' })
  const projectData = await api('/api/v1/private/projects', { team_id: team.id, name: 'Caddy smoke project', admin_user_id: identity.id })
  let base = `/api/v1/private/projects/${projectData.id}/documents`
  const document = await api(base, { name: 'Caddy smoke document', document_type: 2, relative_path: 'docs/caddy.md' })
  base += `/${document.id}`
  const branch = (await api(`${base}/branches`)).find((entry) => entry.name === 'dev')
  const content = '# Caddy split-domain publication\n\nPublished behind two HTTPS domains.\n'
  const draft = await api(`${base}/drafts`, { branch_id: branch.id, version_name: '1.0.0', content })
  const draftUrl = `${base}/drafts/${draft.id}`
  await api(`${draftUrl}/submit`, {})
  const snapshot = await api(`${draftUrl}/content/raw`)
  const version = await api(`${draftUrl}/approve`, { expected_review_revision: snapshot.draft.review_revision })
  assert.equal((await api(`${base}/versions/${version.id}/content/raw`)).content, content)
  await page.goto(`${frontend}/projects`)
  await expect(page.locator('table input[value="Caddy smoke project"]').first()).toBeVisible()
  await page.reload()
  await expect(page.locator('table input[value="Caddy smoke project"]').first()).toBeVisible()
  process.stdout.write('PASS: create team/project/document, submit/review/publish draft, read stored content, refresh SPA route\n')

  const mcp = await api('/api/v1/private/mcp-tokens', { name: 'Caddy smoke token', scopes: [3] })
  secrets.push(mcp.token)
  const mcpResponse = await context.request.post(`${backend}/api/v1/open/mcp`, {
    headers: { Authorization: mcp.token },
    data: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_latest_doc', arguments: { project_id: projectData.id, document_id: document.id, branch_id: branch.id } } },
  })
  const result = await mcpResponse.json()
  assert.ok(!result.error && JSON.stringify(result.result).includes('Caddy split-domain publication'), 'MCP must read the actual published document')
  process.stdout.write('PASS: MCP get_latest_doc returns the published document through the backend domain\n')

  const share = await api(`${base}/shares`, { branch_id: branch.id, version_scope: 1, expiry_preset: '1_month' })
  secrets.push(share.secret)
  const anonymous = await browser.newContext(browserOptions)
  const sharePage = await anonymous.newPage()
  const shareRequests = []
  sharePage.on('request', (request) => {
    if (new URL(request.url()).pathname.startsWith('/api/')) shareRequests.push(request.url())
  })
  await sharePage.goto(`${frontend}/share/${share.share.id}#${share.secret}`)
  await expect(sharePage.getByText('Published behind two HTTPS domains.', { exact: true })).toBeVisible()
  assert.ok(!sharePage.url().includes('#'), 'Share capability must be removed from the browser address')
  assert.ok(shareRequests.length > 0 && shareRequests.every((url) => new URL(url).origin === frontend), 'Share API requests must stay on the workbench origin')
  assert.ok(apiRequests.every((url) => !url.startsWith(backend)), 'Authenticated browser API requests must stay on the workbench origin')

  const sharePassword = secret()
  const protectedShare = await api(`${base}/shares`, { branch_id: branch.id, version_scope: 1, expiry_preset: '1_month', password: sharePassword })
  secrets.push(protectedShare.secret)
  let sentUnlockProof = false
  sharePage.on('request', (request) => {
    if (request.headers()['x-vdoc-share-unlock']) sentUnlockProof = true
  })
  await sharePage.goto(`${frontend}/share/${protectedShare.share.id}#${protectedShare.secret}`)
  await sharePage.getByLabel('Share password', { exact: true }).fill(sharePassword)
  await sharePage.getByRole('button', { name: 'Unlock document', exact: true }).click()
  await expect(sharePage.getByText('Published behind two HTTPS domains.', { exact: true })).toBeVisible()
  assert.ok(sentUnlockProof, 'Protected share reads must carry the unlock proof through the same-origin proxy')
  assert.ok(shareRequests.every((url) => new URL(url).origin === frontend), 'Protected share requests must stay on the workbench origin')
  process.stdout.write('PASS: password-protected share unlock and content read use same-origin Authorization and unlock-proof headers\n')

  const preflight = await context.request.fetch(`${backend}/api/v1/open/health`, { method: 'OPTIONS', headers: { Origin: frontend, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type' } })
  assert.equal(preflight.status(), 200)
  assert.equal(await preflight.text(), 'Options Request!')
  assert.equal(preflight.headers()['access-control-allow-origin'], '*')
  assert.equal(preflight.headers()['access-control-allow-headers'], '*')
  assert.equal(preflight.headers()['access-control-allow-credentials'], undefined)
  process.stdout.write('PASS: anonymous share uses same-origin API; unchanged upstream wildcard CORS response retained\n')

  // The real backend health page has no frontend CSP. Reproduce the original
  // wildcard-Authorization CORS failure independently of the Admin CSP.
  // Chromium currently accepts wildcard Authorization by default; only this
  // diagnostic opts into its standards-strict enforcement. Business smoke above
  // uses the browser's default flags.
  strictBrowser = await chromium.launch({ args: ['--host-resolver-rules=MAP *.localhost 127.0.0.1', '--enable-features=CorsNonWildcardRequestHeadersSupport'] })
  const strictContext = await strictBrowser.newContext(browserOptions)
  const corsProbe = await strictContext.newPage()
  const localBackend = `http://127.0.0.1:${backendPort}`
  await corsProbe.goto(`${localBackend}/api/v1/open/health`)
  const corsResult = await corsProbe.evaluate(async ({ localBackend, backend, token }) => {
    const identityPath = '/api/v1/private/identity/me'
    const sameOrigin = await fetch(localBackend + identityPath, { headers: { Authorization: token } })
    const identity = await sameOrigin.json()
    try {
      await fetch(backend + identityPath, { headers: { Authorization: token } })
      return { sameOriginCode: identity.code, crossOriginBlocked: false }
    } catch (error) {
      return { sameOriginCode: identity.code, crossOriginBlocked: error instanceof TypeError }
    }
  }, { localBackend, backend, token })
  assert.equal(corsResult.sameOriginCode, 200)
  assert.equal(corsResult.crossOriginBlocked, true, 'Upstream wildcard Allow-Headers must not silently permit cross-origin Authorization')
  await corsProbe.close()
  process.stdout.write('PASS: standards-strict browser blocks cross-origin Authorization while same-origin identity succeeds\n')
} catch (error) {
  process.stderr.write(redact(error.stack ?? error) + '\n')
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  if (strictBrowser) await strictBrowser.close()
  try {
    compose('down', '--volumes', '--remove-orphans')
    process.stdout.write('PASS: isolated test containers and volumes removed\n')
  } catch (error) {
    process.stderr.write(redact(error.message) + '\n')
    process.exitCode = 1
  }
  rmSync(directory, { recursive: true, force: true })
}
