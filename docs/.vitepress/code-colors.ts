import type { MarkdownOptions } from 'vitepress'

const sharedColors = new Map([
  ['--shiki-light:#032F62;--shiki-dark:#9ECBFF', 'vp-code-string'],
  ['--shiki-light:#005CC5;--shiki-dark:#79B8FF', 'vp-code-value'],
  ['--shiki-light:#24292E;--shiki-dark:#E1E4E8', 'vp-code-text'],
  ['--shiki-light:#22863A;--shiki-dark:#85E89D', 'vp-code-function'],
  ['--shiki-light:#6A737D;--shiki-dark:#6A737D', 'vp-code-comment'],
])

export const sharedCodeColors: NonNullable<
  MarkdownOptions['codeTransformers']
>[number] = {
  name: 'vdoc:shared-code-colors',
  span(node) {
    const style = node.properties['style']
    if (typeof style !== 'string') return
    const className = sharedColors.get(style.replace(/;$/, ''))
    if (className === undefined) return
    // 只共享完全相同的颜色声明，保留其他主题、字重和标注的原始样式。
    delete node.properties['style']
    this.addClassToHast(node, className)
  },
}
