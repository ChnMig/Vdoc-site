import { test } from '@playwright/test'
import { browserRoutes } from './support/preview'
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
