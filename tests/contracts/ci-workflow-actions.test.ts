import { readProjectText } from './contract-helpers'

const workflow = readProjectText('.github/workflows/ci.yml')
const node24ActionPins = [
  'actions/checkout@df4cb1c069e1874edd31b4311f1884172cec0e10 # v6',
  'pnpm/action-setup@b0f76dfb45f55f8421693e4803ac7bb65143bd34 # v6',
  'actions/setup-node@48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e # v6',
  'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a # v7',
] as const

describe('GitHub Actions runtime contract', () => {
  it('uses Node 24 action majors when site CI runs', () => {
    for (const actionPin of node24ActionPins) {
      expect(workflow).toContain(actionPin)
    }
  })

  it('does not opt back into the insecure Node 20 runtime', () => {
    expect(workflow).not.toContain('ACTIONS_ALLOW_USE_UNSECURE_NODE_VERSION')
  })

  it('does not configure GitHub Pages when deployment is self-hosted', () => {
    expect(workflow).not.toMatch(
      /actions\/(?:configure-pages|deploy-pages|upload-pages-artifact)@/,
    )
    expect(workflow).not.toContain('pages-build:')
  })
})
