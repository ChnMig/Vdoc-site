import { authoredTextFiles, type AuthoredTextFile } from './contract-helpers'

type SecurityFinding = {
  readonly path: string
  readonly evidence: string
}

type SecretPattern = {
  readonly label: string
  readonly pattern: RegExp
}

const loopbackHosts = ['localhost', '127.0.0.1', '[::1]'] as const
const composeServiceHosts = ['backend', 'postgres', 'redis', 'rustfs'] as const
const realSecretPatterns = [
  {
    label: 'JWT',
    pattern: /\beyJ[A-Za-z\d_-]{10,}\.[A-Za-z\d_-]{10,}\.[A-Za-z\d_-]{10,}\b/,
  },
  { label: 'GitHub token', pattern: /\bgh[pousr]_[A-Za-z\d]{30,}\b/ },
  {
    label: 'OpenAI-style key',
    pattern: /\bsk-(?:proj-)?[A-Za-z\d_-]{20,}\b/,
  },
  { label: 'AWS access key', pattern: /\bAKIA[A-Z\d]{16}\b/ },
  { label: 'Slack token', pattern: /\bxox[baprs]-[A-Za-z\d-]{20,}\b/ },
  {
    label: 'private key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
] as const satisfies readonly SecretPattern[]

const authoredFiles = authoredTextFiles()

function isListedHost(host: string, allowed: readonly string[]): boolean {
  return allowed.some((allowedHost) => allowedHost === host)
}

function isProhibition(line: string): boolean {
  return /\b(?:do not|don't|never|must not)\b|不要|不得|禁止|不能/i.test(line)
}

function isUserOrTokenEndpoint(line: string, pathname: string): boolean {
  return /browser|用户|浏览器|VDOC_ADMIN_API_BASE_URL|Authorization|JWT|MCP_TOKEN|\/api\/v1\/(?:private|open\/(?:auth|mcp))/i.test(
    `${line} ${pathname}`,
  )
}

function isAllowedHttpUrl(url: string, line: string): boolean {
  const parsedUrl = new URL(url)
  if (isListedHost(parsedUrl.hostname, loopbackHosts)) {
    return true
  }
  if (isProhibition(line)) {
    return true
  }
  return (
    isListedHost(parsedUrl.hostname, composeServiceHosts) &&
    !isUserOrTokenEndpoint(line, parsedUrl.pathname)
  )
}

function findUnsafeHttpUrls(
  files: readonly AuthoredTextFile[],
): readonly SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const httpUrlPattern =
    /http:\/\/(?:\[[^\]\s]+\]|[A-Za-z\d.-]+)(?::\d+)?(?:\/[^\s`"'<>)]*)?/g

  for (const file of files) {
    for (const [lineIndex, line] of file.source.split('\n').entries()) {
      for (const match of line.matchAll(httpUrlPattern)) {
        if (!isAllowedHttpUrl(match[0], line)) {
          findings.push({
            path: file.path,
            evidence: `line ${lineIndex + 1}: ${match[0]}`,
          })
        }
      }
    }
  }

  return findings
}

function curlCommands(source: string): readonly string[] {
  const commands: string[] = []
  let command: string | undefined

  for (const line of source.split('\n')) {
    if (command === undefined && /\bcurl\b/.test(line)) {
      command = line
    } else if (command !== undefined) {
      command = `${command}\n${line}`
    }
    if (command !== undefined && !line.trimEnd().endsWith('\\')) {
      commands.push(command)
      command = undefined
    }
  }
  if (command !== undefined) {
    commands.push(command)
  }

  return commands
}

function findRawTokenCurlHeaders(
  files: readonly AuthoredTextFile[],
): readonly SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const rawTokenHeaderPattern =
    /(?:-H|--header)(?:=|\s+)[\s\S]{0,120}?(?:Authorization|X-MCP-Token)[\s\S]{0,80}?\$(?:\{)?(?:JWT|MCP_TOKEN|VDOC_MCP_TOKEN|[A-Z][A-Z\d_]*(?:_JWT|_TOKEN))\b/i

  for (const file of files) {
    for (const command of curlCommands(file.source)) {
      if (rawTokenHeaderPattern.test(command)) {
        findings.push({
          path: file.path,
          evidence: command.replace(/\s+/g, ' ').trim(),
        })
      }
    }
  }

  return findings
}

function findMutableActions(
  files: readonly AuthoredTextFile[],
): readonly SecurityFinding[] {
  const findings: SecurityFinding[] = []
  const actionPattern = /^[ \t]*uses:[ \t]*(?<action>[^\s#]+)[ \t]*(?:#.*)?$/gm

  for (const file of files.filter((candidate) =>
    candidate.path.startsWith('.github/workflows/'),
  )) {
    for (const match of file.source.matchAll(actionPattern)) {
      const action = match.groups?.['action']
      if (action === undefined || action.startsWith('./')) {
        continue
      }
      const revision = action.slice(action.lastIndexOf('@') + 1)
      if (!/^[a-f\d]{40}$/i.test(revision)) {
        findings.push({ path: file.path, evidence: action })
      }
    }
  }

  return findings
}

function findRealLookingSecrets(
  files: readonly AuthoredTextFile[],
): readonly SecurityFinding[] {
  return files.flatMap((file) =>
    realSecretPatterns.flatMap(({ label, pattern }) =>
      pattern.test(file.source)
        ? [{ path: file.path, evidence: `${label} pattern` }]
        : [],
    ),
  )
}

function findingMessage(findings: readonly SecurityFinding[]): string {
  return findings
    .map((finding) => `${finding.path}: ${finding.evidence}`)
    .join('\n')
}

describe('authored documentation security contract', () => {
  it('uses HTTPS for non-loopback user and Agent endpoints', () => {
    const findings = findUnsafeHttpUrls(authoredFiles)

    expect(findings, findingMessage(findings)).toEqual([])
  })

  it('keeps raw JWT and MCP values out of curl header arguments', () => {
    const findings = findRawTokenCurlHeaders(authoredFiles)

    expect(findings, findingMessage(findings)).toEqual([])
  })

  it('pins third-party workflow actions to immutable commits', () => {
    const findings = findMutableActions(authoredFiles)

    expect(findings, findingMessage(findings)).toEqual([])
  })

  it('checks workflow action pins before trailing YAML comments', () => {
    const files = [
      {
        path: '.github/workflows/mutable.yml',
        source: '      uses: actions/checkout@v4 # mutable tag',
      },
      {
        path: '.github/workflows/pinned.yml',
        source:
          '      uses: actions/checkout@0123456789abcdef0123456789abcdef01234567 # v4',
      },
      {
        path: '.github/workflows/local.yml',
        source: '      uses: ./actions/setup # local action',
      },
    ] as const satisfies readonly AuthoredTextFile[]

    const findings = findMutableActions(files)

    expect(findings).toEqual([
      {
        path: '.github/workflows/mutable.yml',
        evidence: 'actions/checkout@v4',
      },
    ])
  })

  it('contains no real-looking secrets', () => {
    const findings = findRealLookingSecrets(authoredFiles)

    expect(findings, findingMessage(findings)).toEqual([])
  })
})
