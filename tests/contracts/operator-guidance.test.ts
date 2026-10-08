import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readProjectText } from './contract-helpers'

const locales = [
  { label: 'Chinese', prefix: 'docs/' },
  { label: 'English', prefix: 'docs/en/' },
] as const

function shellBlocks(source: string): string[] {
  return Array.from(source.matchAll(/^```sh\r?\n([\s\S]*?)^```/gm), (match) =>
    (match[1] ?? '').trim(),
  )
}

function runInstallExample(
  example: string,
  failure: 'none' | 'checksum' | 'download',
) {
  const directory = mkdtempSync(join(tmpdir(), 'vdoc-mcp-doc-install-'))
  const fixture = Buffer.from('synthetic compiled MCP release archive')
  const fixtureHash = createHash('sha256').update(fixture).digest('hex')
  const logPath = join(directory, 'events.jsonl')
  writeFileSync(join(directory, 'archive.tgz'), fixture)
  const commandPrelude = `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')
const log = (event) => fs.appendFileSync(process.env.VDOC_DOC_INSTALL_LOG, JSON.stringify(event) + '\\n')
const args = process.argv.slice(2)
`

  writeFileSync(
    join(directory, 'curl'),
    `${commandPrelude}
const url = new URL(args[1])
const filename = path.basename(url.pathname)
if (args[0] !== '-fsSL' || args[2] !== '-o' || url.origin !== 'https://github.com') process.exit(2)
log({ command: 'download', filename })
if (process.env.VDOC_DOC_INSTALL_FAILURE === 'download') process.exit(22)
if (/^vdoc-mcp-[0-9][0-9A-Za-z.-]*\\.tgz$/.test(filename)) {
  fs.copyFileSync(process.env.VDOC_DOC_INSTALL_FIXTURE, args[3])
} else if (filename === 'SHA256SUMS') {
  const version = url.pathname.split('/').at(-2).slice(1)
  const hash = process.env.VDOC_DOC_INSTALL_FAILURE === 'checksum' ? '0'.repeat(64) : '${fixtureHash}'
  fs.writeFileSync(args[3], hash + '  vdoc-mcp-' + version + '.tgz\\n')
} else process.exit(2)
`,
    { mode: 0o755 },
  )
  writeFileSync(
    join(directory, 'shasum'),
    `${commandPrelude}
if (args.join(' ') !== '-a 256 -c SHA256SUMS') process.exit(2)
const [expected, filename] = fs.readFileSync('SHA256SUMS', 'utf8').trim().split(/\\s+/)
const actual = crypto.createHash('sha256').update(fs.readFileSync(filename)).digest('hex')
log({ command: 'verify', ok: actual === expected })
if (actual !== expected) process.exit(1)
`,
    { mode: 0o755 },
  )
  writeFileSync(
    join(directory, 'npm'),
    `${commandPrelude}
if (args[0] !== 'install' || args[1] !== '--global' || !args[2]?.endsWith('.tgz') || args.length !== 3) process.exit(2)
if (!fs.existsSync(args[2])) process.exit(2)
log({ command: 'install', filename: path.basename(args[2]) })
`,
    { mode: 0o755 },
  )

  try {
    const result = spawnSync('bash', ['-c', example], {
      cwd: directory,
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        PATH: `${directory}:${process.env['PATH'] ?? ''}`,
        TMPDIR: directory,
        VDOC_DOC_INSTALL_FIXTURE: join(directory, 'archive.tgz'),
        VDOC_DOC_INSTALL_LOG: logPath,
        VDOC_DOC_INSTALL_FAILURE: failure,
      },
    })
    const events = readFileSync(logPath, 'utf8')
      .trim()
      .split('\n')
      .map(
        (line) =>
          JSON.parse(line) as {
            command: string
            filename?: string
            ok?: boolean
          },
      )
    const remainingDirectories = readdirSync(directory, {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
    return { result, events, remainingDirectories }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe.each(locales)('$label operator guidance', ({ prefix }) => {
  it('keeps standalone troubleshooting commands free of source workspace requirements', () => {
    const source = readProjectText(`${prefix}troubleshooting.md`)
    const boundary = '<div id="source-workspace"></div>'
    expect(source).toContain(boundary)
    const [standalone = '', developer = ''] = source.split(boundary)
    const commands = shellBlocks(standalone).join('\n')

    expect(commands).toContain('docker compose config --quiet')
    expect(commands).toContain('docker compose ps --all')
    expect(commands).toContain(
      'docker compose logs --tail=100 config-check rustfs backend admin',
    )
    expect(commands).not.toMatch(/--env-file|\.env|(?:\.\/)?scripts\//)
    expect(standalone).toContain("VDOC_ADMIN_API_BASE_URL: 'same-origin'")
    expect(standalone).toContain('apiBaseUrl: window.location.origin')
    expect(standalone).toContain(
      'docker compose up -d --wait --force-recreate admin',
    )
    expect(developer).toContain('docker compose --env-file .env config --quiet')
    expect(developer).toContain('scripts/vdoc-local-bootstrap.sh')
    expect(developer).toContain('VDOC_TEST_POSTGRES_DB')
  })

  it('retains pinned one-off npx and offers a compiled global install', () => {
    const source = readProjectText(`${prefix}mcp-tools.md`)
    const blocks = shellBlocks(source)
    expect(blocks.join('\n')).toMatch(
      /npx --yes github:ChnMig\/Vdoc-mcp#[a-f\d]{40}/,
    )
    expect(blocks.join('\n')).not.toMatch(
      /npm\s+install\s+(?:-g|--global)\s+(?:git\+|github:)/,
    )
    expect(
      blocks.filter((block) => block.includes('npm install --global')),
    ).toHaveLength(1)
    expect(source).toContain('tsc: command not found')
  })

  it('links Skill installation to the verified global MCP installation first', () => {
    const source = readProjectText(`${prefix}skill-workflows.md`)
    const anchor = prefix === 'docs/' ? '安装方式' : 'installation-options'
    const prerequisite = `mcp-tools.md#${anchor}`
    const examples = shellBlocks(source).filter((block) =>
      block.includes('vdoc-mcp skill install'),
    )
    expect(examples).toHaveLength(1)
    expect(source).toContain(prerequisite)
    expect(source.indexOf(prerequisite)).toBeLessThan(
      source.indexOf('vdoc-mcp skill install'),
    )
    expect(examples[0]).toContain('set -eu')
    expect(examples[0]).toContain('test -f "$VDOC_SKILL_DIR/SKILL.md"')
    expect(examples[0]).not.toContain('npm install')
  })

  for (const failure of ['none', 'checksum', 'download'] as const) {
    it(`runs the global install example safely when the ${failure} failure is injected`, () => {
      const examples = shellBlocks(
        readProjectText(`${prefix}mcp-tools.md`),
      ).filter((block) => block.includes('npm install --global'))
      expect(examples).toHaveLength(1)
      const { result, events, remainingDirectories } = runInstallExample(
        examples[0] ?? '',
        failure,
      )

      expect(result.error).toBeUndefined()
      expect(
        remainingDirectories,
        'the download directory must be removed',
      ).toEqual([])
      if (failure === 'none') {
        expect(result.status, result.stderr).toBe(0)
        expect(events.map(({ command }) => command)).toEqual([
          'download',
          'download',
          'verify',
          'install',
        ])
        expect(events[2]?.ok).toBe(true)
        expect(events[3]?.filename).toMatch(/^vdoc-mcp-[\w.-]+\.tgz$/)
      } else {
        expect(result.status).not.toBe(0)
        expect(events.some(({ command }) => command === 'install')).toBe(false)
        if (failure === 'checksum') {
          expect(events.at(-1)).toEqual({ command: 'verify', ok: false })
        } else {
          expect(events).toHaveLength(1)
        }
      }
    })
  }
})
