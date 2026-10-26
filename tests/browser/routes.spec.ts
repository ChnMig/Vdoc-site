import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { browserRoutes, previewBasePath, routeUrl } from './support/preview'
import { assertRouteQuality } from './support/quality'

test('AI Skill assets serve original text under the configured base', async ({
  request,
}) => {
  for (const filename of ['skill-install.md', 'llms.txt']) {
    const response = await request.get(`${previewBasePath}${filename}`)
    expect(response.ok()).toBe(true)
    expect(await response.text()).toBe(
      readFileSync(
        new URL(`../../docs/public/${filename}`, import.meta.url),
        'utf8',
      ),
    )
    expect(response.headers()['content-type']).not.toContain('text/html')
  }
})

for (const locale of [
  { route: '/skill-workflows', heading: '让 AI 帮你安装' },
  { route: '/en/skill-workflows', heading: 'Let AI Install It' },
]) {
  test(`AI Skill one-sentence installation prompts: ${locale.route}`, async ({
    page,
    context,
  }, testInfo) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto(routeUrl(locale.route), { waitUntil: 'networkidle' })
    await expect(
      page.getByRole('heading', { name: locale.heading }),
    ).toBeVisible()
    const prompts = page.locator('.vp-doc .language-text').filter({
      hasText:
        'https://raw.githubusercontent.com/ChnMig/Vdoc-site/refs/tags/v0.3.17-beta.14/docs/public/skill-install.md',
    })
    await expect(prompts).toHaveCount(2)
    await page
      .getByRole('heading', { name: locale.heading })
      .scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('ai-skill-install.png') })
    for (const [index, channel] of ['release', 'beta'].entries()) {
      const prompt = prompts.nth(index)
      const sentence = (await prompt.locator('code').innerText()).trim()
      expect(sentence).toContain(`${channel}`)
      expect(sentence).not.toMatch(/VDOC_MCP_TOKEN|VDOC_BASE_URL/)
      expect(
        await prompt
          .locator('pre')
          .evaluate((element) => element.scrollWidth <= element.clientWidth),
      ).toBe(true)
      await prompt.locator('button.copy').click()
      await expect
        .poll(() =>
          page.evaluate(async () =>
            (await navigator.clipboard.readText()).trim(),
          ),
        )
        .toBe(sentence)
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  })
}

test.describe('production route quality', () => {
  for (const route of browserRoutes) {
    test(`${route} satisfies browser and accessibility contracts`, async ({
      page,
    }, testInfo) => {
      await assertRouteQuality(page, route, testInfo)
    })
  }
})

for (const locale of [
  { home: '/', search: '搜索文档' },
  { home: '/en/', search: 'Search' },
]) {
  test(`${locale.home} search and feature names preserve their full meaning`, async ({
    page,
  }) => {
    await page.goto(routeUrl(locale.home), { waitUntil: 'networkidle' })
    const searchButton = page.getByRole('button', {
      name: locale.search,
      exact: true,
    })
    await expect(searchButton).toHaveAccessibleName(locale.search)
    await expect(searchButton).toHaveAttribute(
      'aria-keyshortcuts',
      'Control+k Meta+k',
    )

    for (const link of await page.locator('a.VPFeature').all()) {
      const visibleText = (await link.innerText()).replace(/\s+/g, ' ').trim()
      await expect(link).toHaveAccessibleName(visibleText)
    }

    await searchButton.focus()
    await page.keyboard.press('Enter')
    const searchBox = page.locator('.VPLocalSearchBox')
    await expect(searchBox).toBeVisible()
    await expect(searchBox.locator('#localsearch-input')).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(searchBox).toBeHidden()

    for (const shortcut of ['Control+k', 'Meta+k']) {
      await page.keyboard.press(shortcut)
      await expect(searchBox).toBeVisible()
      await expect(searchBox.locator('#localsearch-input')).toBeFocused()
      await page.keyboard.press('Escape')
      await expect(searchBox).toBeHidden()
    }
  })
}

test('shared code colors retain the readable light and dark palettes', async ({
  page,
}, testInfo) => {
  await page.goto(routeUrl('/deployment'), { waitUntil: 'networkidle' })
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle('dark', dark),
      theme === 'dark',
    )
    const comment = page.locator('.vp-code .vc-c').first()
    const functionToken = page.locator('.vp-code .vc-f').first()
    await expect(comment).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(106, 115, 125)' : 'rgb(102, 111, 121)',
    )
    await expect(functionToken).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(133, 232, 157)' : 'rgb(31, 117, 51)',
    )
    await expect(page.locator('.vp-code .vc-p').first()).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(179, 146, 240)' : 'rgb(111, 66, 193)',
    )
    await expect(page.locator('.vp-code .vc-r').first()).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(249, 117, 131)' : 'rgb(193, 42, 58)',
    )
    await expect(
      page.locator('.vp-doc div[class*="language-"]').first(),
    ).toHaveCSS(
      'background-color',
      theme === 'dark' ? 'rgb(22, 22, 24)' : 'rgb(246, 246, 247)',
    )
    await comment.scrollIntoViewIfNeeded()
    await page.screenshot({
      path: testInfo.outputPath(`code-colors-${theme}.png`),
    })
  }
})

for (const route of ['/admin-ai', '/en/admin-ai']) {
  test(`${route} displays required prompt placeholders literally`, async ({
    page,
  }) => {
    await page.goto(routeUrl(route), { waitUntil: 'networkidle' })
    const instructions = page.locator('.vp-doc p').filter({
      has: page.locator('code').filter({ hasText: /^user_prompt_template$/ }),
    })
    await expect(instructions).toHaveCount(1)
    await expect
      .poll(() => instructions.locator('code').allTextContents())
      .toEqual(expect.arrayContaining(['{{context}}', '{{message}}']))
  })
}
