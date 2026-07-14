import { readOptionalProjectText } from './contract-helpers'

type SemanticRequirement = {
  readonly label: string
  readonly patterns: readonly RegExp[]
}

type AdminAiPageContract = {
  readonly label: string
  readonly path: string
  readonly requirements: readonly SemanticRequirement[]
  readonly summarySectionPattern: RegExp
  readonly contextPatterns: readonly RegExp[]
  readonly pageChatSectionPattern: RegExp
  readonly pageChatPatterns: readonly RegExp[]
  readonly forbiddenPageChatPatterns: readonly RegExp[]
}

const zhRequirements = [
  {
    label: 'system and project provider hierarchy',
    patterns: [
      /系统/i,
      /项目/i,
      /(?:AI\s*)?提供商/i,
      /(?:覆盖|优先级|继承|回退)/i,
    ],
  },
  {
    label: 'chat_completions and responses APIs',
    patterns: [/chat_completions/i, /\bresponses\b/i],
  },
  {
    label: 'automatic Draft and Version summaries',
    patterns: [
      /(?:自动|后台)/i,
      /(?:Draft|草稿)/i,
      /(?:Version|版本)/i,
      /(?:摘要|summary)/i,
    ],
  },
  {
    label: 'non-blocking skipped and failed outcomes',
    patterns: [
      /(?:skipped|跳过)/i,
      /(?:failed|失败)/i,
      /(?:不阻塞|不影响|non-blocking)/i,
    ],
  },
  {
    label: 'page chat',
    patterns: [/(?:页面|page).{0,40}(?:对话|聊天|chat)/is],
  },
  {
    label: 'masked and encrypted provider keys',
    patterns: [/(?:密钥|key)/i, /(?:掩码|遮盖|masked)/i, /(?:加密|encrypted)/i],
  },
  {
    label: 'audit secrecy for raw AI material',
    patterns: [
      /(?:审计|audit|日志|log)/i,
      /(?:不记录|不得记录|不写入|never|must not)/i,
      /(?:明文|原始|raw|plaintext)/i,
      /(?:密钥|key|prompt|response|提示词|响应|secret)/i,
    ],
  },
  {
    label: 'no AI publish or review authority',
    patterns: [
      /(?:AI|模型)/i,
      /(?:不能|不得|无权|不负责|仅人工|人类)/i,
      /(?:发布|publish|approve)/i,
      /(?:审核|review|approve)/i,
    ],
  },
] as const satisfies readonly SemanticRequirement[]

const enRequirements = [
  {
    label: 'system and project provider hierarchy',
    patterns: [
      /system/i,
      /project/i,
      /(?:AI\s*)?provider/i,
      /(?:override|precedence|inherit|fallback)/i,
    ],
  },
  {
    label: 'chat_completions and responses APIs',
    patterns: [/chat_completions/i, /\bresponses\b/i],
  },
  {
    label: 'automatic Draft and Version summaries',
    patterns: [
      /(?:automatic|automatically|background)/i,
      /Draft/i,
      /Version/i,
      /summary/i,
    ],
  },
  {
    label: 'non-blocking skipped and failed outcomes',
    patterns: [/skipped/i, /failed/i, /(?:non-blocking|does not block)/i],
  },
  {
    label: 'page chat',
    patterns: [/page.{0,40}chat/is],
  },
  {
    label: 'masked and encrypted provider keys',
    patterns: [/key/i, /mask(?:ed|ing)/i, /encrypt(?:ed|ion)/i],
  },
  {
    label: 'audit secrecy for raw AI material',
    patterns: [
      /(?:audit|log)/i,
      /(?:never|must not|does not)/i,
      /(?:raw|plaintext)/i,
      /(?:key|prompt|response|secret)/i,
    ],
  },
  {
    label: 'no AI publish or review authority',
    patterns: [
      /(?:AI|model)/i,
      /(?:cannot|must not|no authority|human-only)/i,
      /(?:publish|approve)/i,
      /(?:review|approve)/i,
    ],
  },
] as const satisfies readonly SemanticRequirement[]

const adminAiPages = [
  {
    label: 'Chinese Admin AI',
    path: 'docs/admin-ai.md',
    requirements: zhRequirements,
    summarySectionPattern: /## 自动摘要和手动重新生成[\s\S]*?(?=\n## )/,
    contextPatterns: [
      /Draft.{0,80}长度受限.{0,20}规范化内容.{0,80}\bID\b.{0,30}版本名.{0,30}状态.{0,30}\bchangelog\b/is,
      /Version.{0,80}长度受限.{0,20}规范化内容.{0,80}\bID\b.{0,30}版本名.{0,30}\bchangelog\b/is,
      /Diff.{0,80}\bID\b.{0,30}来源版本.{0,20}\bID\b.{0,30}目标版本.{0,20}\bID\b.{0,100}\badded\b.{0,20}\bremoved\b.{0,20}\bmodified\b.{0,20}\bbreaking\b/is,
      /(?:每个|各个).{0,20}(?:item|条目).{0,40}\bmethod\b.{0,20}\bpath\b.{0,20}\blocation\b.{0,20}\bbreaking\b.{0,20}\bmessage\b/is,
    ],
    pageChatSectionPattern: /## 页面内对话[\s\S]*?(?=\n## )/,
    pageChatPatterns: [
      /(?:复用|使用).{0,30}(?:同一|相同).{0,30}(?:Draft、Version 和 Diff|Draft、Version、Diff).{0,30}上下文构建器/is,
    ],
    forbiddenPageChatPatterns: [
      /endpoint detail|端点详情|端点明细/i,
      /line diffs?|行级差异|行差异/i,
      /review comments?|审核评论|审核意见/i,
      /source_git_commit_id/i,
    ],
  },
  {
    label: 'English Admin AI',
    path: 'docs/en/admin-ai.md',
    requirements: enRequirements,
    summarySectionPattern:
      /## Automatic Summaries and Regeneration[\s\S]*?(?=\n## )/,
    contextPatterns: [
      /Draft.{0,80}bounded normalized content.{0,80}\bID\b.{0,30}version name.{0,30}status.{0,30}changelog/is,
      /Version.{0,80}bounded normalized content.{0,80}\bID\b.{0,30}version name.{0,30}changelog/is,
      /Diff.{0,80}\bID\b.{0,30}from-version ID.{0,30}to-version ID.{0,100}\badded\b.{0,20}\bremoved\b.{0,20}\bmodified\b.{0,20}\bbreaking\b/is,
      /each item.{0,40}\bmethod\b.{0,20}\bpath\b.{0,20}\blocation\b.{0,20}\bbreaking\b.{0,20}\bmessage\b/is,
    ],
    pageChatSectionPattern: /## Page Chat[\s\S]*?(?=\n## )/,
    pageChatPatterns: [
      /reuses?.{0,30}(?:the )?same.{0,30}Draft, Version, and Diff context builder/is,
    ],
    forbiddenPageChatPatterns: [
      /endpoint details?/i,
      /line diffs?/i,
      /review comments?/i,
      /source_git_commit_id/i,
    ],
  },
] as const satisfies readonly AdminAiPageContract[]

describe('Admin AI documentation contract', () => {
  it.each(adminAiPages)('$label route is authored', ({ path }) => {
    expect(
      readOptionalProjectText(path),
      `${path} must exist as an authored Markdown page`,
    ).toBeDefined()
  })

  it.each(adminAiPages)(
    '$label documents capability and safety semantics',
    ({ path, requirements }) => {
      const source = readOptionalProjectText(path) ?? ''

      expect(source, `${path} must contain Admin AI documentation`).not.toBe('')
      for (const requirement of requirements) {
        for (const pattern of requirement.patterns) {
          expect(
            source,
            `${path} is missing the ${requirement.label} concept`,
          ).toMatch(pattern)
        }
      }
    },
  )

  it.each(adminAiPages)(
    '$label accurately documents backend AI context',
    ({
      path,
      summarySectionPattern,
      contextPatterns,
      pageChatSectionPattern,
      pageChatPatterns,
      forbiddenPageChatPatterns,
    }) => {
      const source = readOptionalProjectText(path) ?? ''
      const summarySection = source.match(summarySectionPattern)?.[0] ?? ''
      const pageChatSection = source.match(pageChatSectionPattern)?.[0] ?? ''

      for (const pattern of contextPatterns) {
        expect(
          summarySection,
          `${path} is missing a backend context accuracy claim`,
        ).toMatch(pattern)
      }
      for (const pattern of pageChatPatterns) {
        expect(
          pageChatSection,
          `${path} must document the shared page-chat context builder`,
        ).toMatch(pattern)
      }
      for (const pattern of forbiddenPageChatPatterns) {
        expect(
          pageChatSection,
          `${path} makes an unsupported page-chat context claim`,
        ).not.toMatch(pattern)
      }
    },
  )
})
