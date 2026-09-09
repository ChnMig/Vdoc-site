import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { previewBasePath, previewOrigin, routeUrl } from './support/preview'

test.describe('focused desktop interactions', () => {
  test('serves the Compose archive and matching checksum inside the selected base', async ({
    request,
  }) => {
    const archiveName = 'vdoc-compose-bootstrap-v0.3.tar.gz'
    // VitePress preview marks .gz as HTTP gzip. Read the wire bytes like the
    // documented curl -fLO command, without an HTTP client's auto-decompression.
    const archive = execFileSync('curl', [
      '-fsS',
      `${previewOrigin}${previewBasePath}downloads/${archiveName}`,
    ])
    const checksum = await request.get(
      `${previewBasePath}downloads/${archiveName}.sha256`,
    )
    expect(checksum.ok()).toBe(true)
    const digest = createHash('sha256').update(archive).digest('hex')
    expect(await checksum.text()).toBe(`${digest}  ${archiveName}\n`)
  })

  for (const locale of [
    {
      home: '/',
      deployment: '/deployment',
      firstUse: '/admin-usage',
      nextAction: '发布第一份文档并让 Agent 查询',
      initialAdminHeading: '2. 生成配置，设置登录账号',
      firstQueryHeading: '7. 让 Agent 读取文档',
    },
    {
      home: '/en/',
      deployment: '/en/deployment',
      firstUse: '/en/admin-usage',
      nextAction: 'publish your first document and query it with an agent',
      initialAdminHeading: '2. Generate Configuration and Set Your Login',
      firstQueryHeading: '7. Ask Your Agent to Read the Document',
    },
  ]) {
    test(`${locale.home} leads from deployment to the first query`, async ({
      page,
    }) => {
      await page.goto(routeUrl(locale.home), { waitUntil: 'networkidle' })
      await page.locator('.VPHero .actions a.brand').click()
      await expect(page).toHaveURL(routeUrl(locale.deployment))
      await expect(page.locator('#initial-admin')).toBeAttached()
      await expect(
        page.getByRole('heading', {
          name: locale.initialAdminHeading,
          exact: false,
        }),
      ).toBeVisible()
      await page.goto(`${routeUrl(locale.deployment)}#initial-admin`)
      await expect
        .poll(async () => {
          const box = await page
            .getByRole('heading', { name: locale.initialAdminHeading })
            .boundingBox()
          return box?.y ?? 0
        })
        .toBeGreaterThanOrEqual(64)

      await page
        .getByRole('link', { name: locale.nextAction, exact: true })
        .click()
      await expect(page).toHaveURL(routeUrl(locale.firstUse))
      await expect(page.locator('#first-query')).toBeAttached()
      await expect(
        page.getByRole('heading', {
          name: locale.firstQueryHeading,
          exact: false,
        }),
      ).toBeVisible()
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
