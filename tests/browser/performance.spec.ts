import { expect, test } from '@playwright/test'
import performanceBudget from '../../performance-budget.json' with { type: 'json' }
import { browserRoutes, previewOrigin, routeUrl } from './support/preview'

type PerformanceMetrics = {
  lcp: number
  tbt: number
}

declare global {
  interface Window {
    __vdocPerformanceMetrics: PerformanceMetrics
  }
}

const requestBudget = performanceBudget.limits.maxRouteRequests
const lcpBudgetMilliseconds = performanceBudget.limits.lcpMilliseconds
const tbtBudgetMilliseconds = performanceBudget.limits.tbtMilliseconds

test.describe('production runtime budgets', () => {
  for (const route of browserRoutes) {
    test(`${route} stays within runtime budgets`, async ({
      page,
    }, testInfo) => {
      await page.addInitScript(() => {
        window.__vdocPerformanceMetrics = { lcp: 0, tbt: 0 }

        if (
          PerformanceObserver.supportedEntryTypes.includes(
            'largest-contentful-paint',
          )
        ) {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__vdocPerformanceMetrics.lcp = Math.max(
                window.__vdocPerformanceMetrics.lcp,
                entry.startTime,
              )
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true })
        }
        if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              window.__vdocPerformanceMetrics.tbt += Math.max(
                0,
                entry.duration - 50,
              )
            }
          }).observe({ type: 'longtask', buffered: true })
        }
      })

      const requests: string[] = []
      page.on('request', (request) => requests.push(request.url()))

      const response = await page.goto(routeUrl(route), {
        waitUntil: 'networkidle',
      })
      if (response === null) {
        expect(
          response,
          `${route} must return a navigation response`,
        ).not.toBeNull()
        return
      }
      expect(response.ok(), `${route} returned HTTP ${response.status()}`).toBe(
        true,
      )

      await page.evaluate(
        () =>
          new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
          }),
      )

      const metrics = await page.evaluate(() => window.__vdocPerformanceMetrics)
      const crossOriginRequests = requests.filter((requestUrl) => {
        const url = new URL(requestUrl)
        return (
          ['http:', 'https:'].includes(url.protocol) &&
          url.origin !== previewOrigin
        )
      })
      const evidence = {
        route,
        requestCount: requests.length,
        crossOriginRequests,
        lcpMilliseconds: metrics.lcp,
        tbtMilliseconds: metrics.tbt,
      }
      await testInfo.attach('performance-budget', {
        body: Buffer.from(JSON.stringify(evidence, null, 2)),
        contentType: 'application/json',
      })

      expect(
        crossOriginRequests,
        `${route} loaded cross-origin runtime resources`,
      ).toHaveLength(performanceBudget.limits.crossOriginRuntimeResources)
      expect(
        requests.length,
        `${route} exceeded ${requestBudget} requests`,
      ).toBeLessThanOrEqual(requestBudget)
      expect(metrics.lcp, `${route} did not report an LCP`).toBeGreaterThan(0)
      expect(
        metrics.lcp,
        `${route} exceeded the LCP budget`,
      ).toBeLessThanOrEqual(lcpBudgetMilliseconds)
      expect(
        metrics.tbt,
        `${route} exceeded the TBT budget`,
      ).toBeLessThanOrEqual(tbtBudgetMilliseconds)
    })
  }
})
