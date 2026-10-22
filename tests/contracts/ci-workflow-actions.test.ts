import { spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readProjectText } from './contract-helpers'

const workflow = readProjectText('.github/workflows/ci.yml')
const pagesWorkflow = readProjectText('.github/workflows/pages.yml')
const node24ActionPins = [
  'actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6',
  'pnpm/action-setup@b0f76dfb45f55f8421693e4803ac7bb65143bd34 # v6',
  'actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6',
  'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7',
] as const

function verifyImageChannel(tag: string, mismatch = false) {
  const root = mkdtempSync(join(tmpdir(), 'vdoc-site-image-channel-'))
  const bin = join(root, 'bin')
  const calls = join(root, 'docker-calls')
  mkdirSync(bin)
  writeFileSync(
    join(bin, 'docker'),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$4" >>"$TEST_DOCKER_CALLS"
if [[ "$5" == --raw ]]; then
  printf '%s\\n' '{"manifests":[{"platform":{"os":"linux","architecture":"amd64"}},{"platform":{"os":"linux","architecture":"arm64"}}]}'
elif [[ "$TEST_MISMATCH" == true && ( "$4" == *:beta || "$4" == *:latest ) ]]; then
  printf '%s\\n' 'sha256:different'
else
  printf '%s\\n' 'sha256:release'
fi
`,
    { mode: 0o755 },
  )
  const step = workflow
    .split(
      '      - name: Verify public multi-platform images before releasing the website\n',
    )[1]
    ?.split('\n      - name:')[0]
    ?.split('        run: |\n')[1]
  if (step === undefined)
    throw new Error('Missing public image verification step')
  try {
    const result = spawnSync('bash', ['-euo', 'pipefail', '-c', step], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env['PATH']}`,
        DOCKER_CONFIG: join(root, 'docker-config'),
        RELEASE_TAG: tag,
        TEST_DOCKER_CALLS: calls,
        TEST_MISMATCH: String(mismatch),
      },
    })
    return { ...result, calls: readFileSync(calls, 'utf8').trim().split('\n') }
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

describe('GitHub Actions runtime contract', () => {
  it('uses Node 24 action majors when site CI runs', () => {
    for (const actionPin of node24ActionPins) {
      expect(workflow).toContain(actionPin)
    }
  })

  it('does not opt back into the insecure Node 20 runtime', () => {
    expect(workflow).not.toContain('ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION')
  })

  it('automatically deploys Pages only after stable tag checks and publication', () => {
    expect(workflow).toContain(
      "github.event_name == 'push' && startsWith(github.ref, 'refs/tags/v') && !contains(github.ref_name, '-')",
    )
    expect(workflow).toContain('needs: [verify, release]')
    expect(workflow).toContain('uses: ./.github/workflows/pages.yml')
    expect(pagesWorkflow).not.toMatch(/^ {2}(?:push|pull_request|release):/m)
    expect(pagesWorkflow).toContain(
      '.isDraft == false and .isPrerelease == false',
    )
    expect(pagesWorkflow).toContain('needs: build')
    expect(pagesWorkflow).toContain('PLAYWRIGHT_BASE_PATH: /Vdoc-site/')
    expect(pagesWorkflow).not.toContain('workspace:package --candidate')
    expect(pagesWorkflow).toContain(
      'run: node scripts/verify-pages-download.mjs',
    )
    expect(pagesWorkflow).toContain('cancel-in-progress: false')
    expect(pagesWorkflow).toContain('name: github-pages')
  })

  it('verifies the promoted beta images and publishes both Compose channels', () => {
    expect(workflow).toContain('channel=beta')
    expect(workflow).toContain('channel=latest')
    expect(workflow).toContain('"ghcr.io/chnmig/$image:$channel"')
    expect(workflow).toContain('"$released" == "$promoted"')
    expect(workflow).toContain('.artifacts/release/docker-compose.beta.yml')
    expect(pagesWorkflow).toContain(
      'for name in docker-compose.yml docker-compose.external-postgres.yml docker-compose.beta.yml; do',
    )
    expect(pagesWorkflow).toContain(
      'if [[ -f "workspace/deploy/$name" ]]; then',
    )
  })

  it.each([
    ['v1.2.3', 'latest'],
    ['v1.2.4-beta.1', 'beta'],
  ])(
    'requires %s to match both application %s image aliases',
    (tag, channel) => {
      const result = verifyImageChannel(tag)
      expect(result.status, result.stderr).toBe(0)
      for (const repository of ['vdoc', 'vdoc-admin']) {
        expect(result.calls).toContain(`ghcr.io/chnmig/${repository}:${tag}`)
        expect(result.calls).toContain(
          `ghcr.io/chnmig/${repository}:${channel}`,
        )
      }
      expect(result.calls).not.toContain(
        `ghcr.io/chnmig/vdoc:${channel === 'beta' ? 'latest' : 'beta'}`,
      )
    },
  )

  it.each(['v1.2.3', 'v1.2.4-beta.1'])(
    'refuses release publication when the %s image alias points elsewhere',
    (tag) => {
      const result = verifyImageChannel(tag, true)
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('does not match the coordinated')
    },
  )

  it('does not require alpha or rc releases to match a moving channel alias', () => {
    const result = verifyImageChannel('v1.2.4-rc.1', true)
    expect(result.status, result.stderr).toBe(0)
    expect(result.calls).toEqual([
      'ghcr.io/chnmig/vdoc:v1.2.4-rc.1',
      'ghcr.io/chnmig/vdoc-admin:v1.2.4-rc.1',
    ])
  })
})
