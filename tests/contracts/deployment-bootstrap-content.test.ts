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
      'CHANGE_ME',
      'VDOC_INITIAL_ADMIN_NAME',
      'docker compose pull',
      'docker compose up -d',
      'workspace/deploy/docker-compose.yml',
      'config-check',
    ],
    forbidden: 'scripts/vdoc-local-bootstrap.sh',
  },
  {
    path: 'docs/en/deployment.md',
    source: readFileSync(
      new URL('../../docs/en/deployment.md', import.meta.url),
      'utf8',
    ),
    required: [
      'CHANGE_ME',
      'VDOC_INITIAL_ADMIN_NAME',
      'docker compose pull',
      'docker compose up -d',
      'workspace/deploy/docker-compose.yml',
      'config-check',
    ],
    forbidden: 'scripts/vdoc-local-bootstrap.sh',
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
