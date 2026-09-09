import { expect, test } from '@playwright/test'
import { previewBasePath, routeUrl } from './support/preview'

test.describe('focused desktop interactions', () => {
  for (const locale of [
    {
      home: '/',
      deployment: '/deployment',
      firstUse: '/admin-usage',
      nextAction: '发布第一份文档并让 Agent 查询',
    },
    {
      home: '/en/',
      deployment: '/en/deployment',
      firstUse: '/en/admin-usage',
      nextAction: 'publish your first document and query it with an agent',
    },
  ]) {
    test(`${locale.home} leads from deployment to the first query`, async ({
      page,
    }) => {
      await page.goto(routeUrl(locale.home), { waitUntil: 'networkidle' })
      await page.locator('.VPHero .actions a.brand').click()
      await expect(page).toHaveURL(routeUrl(locale.deployment))
      await expect(page.locator('#initial-admin')).toBeVisible()

      await page
        .getByRole('link', { name: locale.nextAction, exact: true })
        .click()
      await expect(page).toHaveURL(routeUrl(locale.firstUse))
      await expect(page.locator('#first-query')).toBeVisible()
      await expect(page.locator('.vp-doc')).toContainText('docs/team-guide.md')
      await expect(page.locator('.vp-doc')).toContainText('get_latest_doc')
    })
  }

  test('local search returns a base-safe result', async ({ page }) => {
    await page.goto(routeUrl('/'), { waitUntil: 'networkidle' })
    await page.locator('#local-search button').click()

    const searchBox = page.locator('.VPLocalSearchBox')
    await expect(searchBox).toBeVisible()
    await searchBox.locator('#localsearch-input').fill('部署')

    const firstResult = searchBox.locator('.result').first()
    await expect(firstResult).toBeVisible()
    await expect(firstResult).toHaveAttribute(
      'href',
      new RegExp(`^${previewBasePath}`),
    )
  })

  test('locale navigation reaches the English home inside the base', async ({
    page,
  }) => {
    await page.goto(routeUrl('/'), { waitUntil: 'networkidle' })
    await page.getByRole('link', { name: 'English', exact: true }).click()
    await expect(page).toHaveURL(routeUrl('/en/'))
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('keyboard users can focus and activate the skip link', async ({
    page,
  }) => {
    await page.goto(routeUrl('/'), { waitUntil: 'networkidle' })
    await page.keyboard.press('Tab')

    const skipLink = page.locator('.VPSkipLink')
    await expect(skipLink).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(page.locator('#VPContent')).toBeFocused()
  })
})
