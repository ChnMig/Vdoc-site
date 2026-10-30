import { expect, test } from '@playwright/test'
import { createHash } from 'node:crypto'
import { previewBasePath, routeUrl } from './support/preview'

test.describe('focused desktop interactions', () => {
  for (const archiveName of [
    'docker-compose.yml',
    'docker-compose.external-postgres.yml',
    'docker-compose.beta.yml',
  ])
    test(`serves ${archiveName} and matching checksum inside the selected base`, async ({
      request,
    }) => {
      const response = await request.get(
        `${previewBasePath}downloads/${archiveName}`,
      )
      expect(response.ok()).toBe(true)
      const archive = await response.body()
      expect(archive.toString()).toContain('ghcr.io/chnmig/vdoc:')
      if (archiveName === 'docker-compose.beta.yml') {
        expect(archive.toString()).toContain('ghcr.io/chnmig/vdoc:beta')
        expect(archive.toString()).toContain('ghcr.io/chnmig/vdoc-admin:beta')
      }
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
      mcp: '/mcp-tools',
      skill: '/skill-workflows',
      mcpChannelLink: '独立渠道安装入口',
      skillChannelLink: 'Skill 渠道隔离',
      firstUse: '/admin-usage',
      nextAction: '发布第一份文档并让 Agent 查询',
      initialAdminHeading: '2. 填写配置和登录账号',
      firstQueryHeading: '7. 让 Agent 读取文档',
    },
    {
      home: '/en/',
      deployment: '/en/deployment',
      mcp: '/en/mcp-tools',
      skill: '/en/skill-workflows',
      mcpChannelLink: 'separate channel installers',
      skillChannelLink: 'Skill channel isolation',
      firstUse: '/en/admin-usage',
      nextAction: 'publish your first document and query it with an agent',
      initialAdminHeading: '2. Fill In Settings and Your Login',
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
      await expect(page.locator('.vp-doc')).toContainText(
        'get_document_at_commit',
      )
    })

    test(`${locale.home} follows Beta channel setup from deployment to MCP and Skill`, async ({
      page,
    }) => {
      await page.goto(`${routeUrl(locale.deployment)}#beta-channel`, {
        waitUntil: 'networkidle',
      })
      await expect(page.locator('#beta-channel')).toBeVisible()
      await expect(
        page.getByRole('link', {
          name: 'docker-compose.beta.yml',
          exact: true,
        }),
      ).toHaveAttribute(
        'href',
        'https://chnmig.github.io/Vdoc-site/downloads/docker-compose.beta.yml',
      )
      await page
        .getByRole('link', { name: locale.mcpChannelLink, exact: true })
        .click()
      await expect(page).toHaveURL(`${routeUrl(locale.mcp)}#release-channels`)
      await expect(page.locator('#release-channels')).toBeVisible()
      const installer = page
        .locator('.vp-doc div[class*="language-"]')
        .filter({ hasText: 'VDOC_MCP_INSTALLER_TAG=' })
      await expect(installer).toHaveCount(1)
      await expect(installer).toContainText(
        /VDOC_MCP_INSTALLER_TAG='v[0-9]+\.[0-9]+\.[0-9]+(?:-beta\.[0-9]+)?'/,
      )
      await expect(installer).toContainText(
        'node install-channel.mjs --channel beta',
      )
      await page
        .getByRole('link', { name: locale.skillChannelLink, exact: true })
        .click()
      await expect(page).toHaveURL(`${routeUrl(locale.skill)}#release-channels`)
      await expect(page.locator('#release-channels')).toBeVisible()
      await expect(page.locator('.vp-doc')).toContainText(
        'mcp/beta/node_modules/.bin/vdoc-mcp" skill install --directory .agents/skills/vdoc',
      )
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
    await page.getByRole('button', { name: '切换语言', exact: true }).click()
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
  test('Chinese task search finds the token creation step', async ({
    page,
  }) => {
    await page.goto(routeUrl('/'), { waitUntil: 'networkidle' })
    await page.locator('#local-search button').click()
    await page.locator('#localsearch-input').fill('令牌')
    await expect(
      page
        .locator('.VPLocalSearchBox .result')
        .filter({ hasText: '创建读取令牌' })
        .first(),
    ).toBeVisible()
  })

  test('language switch preserves the current article', async ({ page }) => {
    await page.goto(routeUrl('/admin-usage'), { waitUntil: 'networkidle' })
    await page.getByRole('button', { name: '切换语言', exact: true }).click()
    await page.getByRole('link', { name: 'English', exact: true }).click()
    await expect(page).toHaveURL(routeUrl('/en/admin-usage'))
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('home provides one main landmark and named feature links', async ({
    page,
    request,
  }) => {
    const response = await request.get(routeUrl('/'))
    expect(await response.text()).toContain('role="main"')
    await page.goto(routeUrl('/'), { waitUntil: 'networkidle' })
    await expect(page.getByRole('main')).toHaveCount(1)
    await expect(page.locator('a.VPFeature')).toHaveCount(3)
    for (const link of await page.locator('a.VPFeature').all()) {
      await expect(link).toHaveAccessibleName(/.+/)
    }
    await page.goto(routeUrl('/admin-usage'), { waitUntil: 'networkidle' })
    await expect(page.getByRole('main')).toHaveCount(1)
  })
})
