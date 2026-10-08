import { expect, test } from '@playwright/test'
import { browserRoutes, routeUrl } from './support/preview'
import { assertRouteQuality } from './support/quality'

test.describe('production route quality', () => {
  for (const route of browserRoutes) {
    test(`${route} satisfies browser and accessibility contracts`, async ({
      page,
    }, testInfo) => {
      await assertRouteQuality(page, route, testInfo)
    })
  }
})

test('shared code colors retain the readable light and dark palettes', async ({
  page,
}, testInfo) => {
  await page.goto(routeUrl('/deployment'), { waitUntil: 'networkidle' })
  for (const theme of ['light', 'dark'] as const) {
    await page.evaluate(
      (dark) => document.documentElement.classList.toggle('dark', dark),
      theme === 'dark',
    )
    const comment = page.locator('.vp-code .vpc-comment').first()
    const functionToken = page.locator('.vp-code .vpc-function').first()
    await expect(comment).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(106, 115, 125)' : 'rgb(102, 111, 121)',
    )
    await expect(functionToken).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(133, 232, 157)' : 'rgb(31, 117, 51)',
    )
    await expect(page.locator('.vp-code .vpc-purple').first()).toHaveCSS(
      'color',
      theme === 'dark' ? 'rgb(179, 146, 240)' : 'rgb(111, 66, 193)',
    )
    await expect(page.locator('.vp-code .vpc-red').first()).toHaveCSS(
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
