import { expect, test } from '@playwright/test'
import { previewBasePath, routeUrl } from './support/preview'

test.describe('focused desktop interactions', () => {
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
