import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const pages = [
  {
    path: 'docs/deployment.md',
    source: readFileSync(
      new URL('../../docs/deployment.md', import.meta.url),
      'utf8',
    ),
    required: [
      '空数据库首次启动必须同时提供',
      'VDOC_INITIAL_ADMIN_NAME',
      '安全失败',
      '不是可直接启动的配置',
    ],
    forbidden: '可留空。如果填写',
  },
  {
    path: 'docs/en/deployment.md',
    source: readFileSync(
      new URL('../../docs/en/deployment.md', import.meta.url),
      'utf8',
    ),
    required: [
      'first startup against an empty database must provide all three',
      'VDOC_INITIAL_ADMIN_NAME',
      'fails closed',
      'not a ready-to-run configuration',
    ],
    forbidden: 'may stay blank. If set',
  },
] as const

describe('deployment bootstrap guidance', () => {
  it.each(pages)(
    '$path matches the fail-closed backend bootstrap contract',
    ({ source, required, forbidden }) => {
      for (const phrase of required) expect(source).toContain(phrase)
      expect(source).not.toContain(forbidden)
    },
  )
})
