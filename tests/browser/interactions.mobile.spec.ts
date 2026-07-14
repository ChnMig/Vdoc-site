import { expect, test } from '@playwright/test'
import { routeUrl } from './support/preview'

test('mobile navigation opens and exposes its menu', async ({ page }) => {
  await page.goto(routeUrl('/'), { waitUntil: 'networkidle' })

  const menuButton = page.getByRole('button', { name: 'mobile navigation' })
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false')
  await menuButton.click()

  await expect(menuButton).toHaveAttribute('aria-expanded', 'true')
  await expect(page.locator('#VPNavScreen')).toBeVisible()
  await expect(page.locator('#VPNavScreen').getByRole('link')).not.toHaveCount(
    0,
  )
})
