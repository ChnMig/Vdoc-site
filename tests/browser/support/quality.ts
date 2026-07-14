import AxeBuilder from '@axe-core/playwright'
import { expect } from '@playwright/test'
import type { Page, Request, TestInfo } from '@playwright/test'
import {
  expectedLang,
  previewBasePath,
  previewOrigin,
  routeUrl,
} from './preview'

type RuntimeEvidence = {
  readonly pageErrors: string[]
  readonly consoleErrors: string[]
  readonly failedResources: string[]
}

function isTrackedResource(request: Request): boolean {
  const resourceType = request.resourceType()
  return (
    ['stylesheet', 'script', 'font'].includes(resourceType) ||
    new URL(request.url()).pathname.endsWith('/favicon.svg')
  )
}

function observeRuntime(page: Page): RuntimeEvidence {
  const evidence: RuntimeEvidence = {
    pageErrors: [],
    consoleErrors: [],
    failedResources: [],
  }

  page.on('pageerror', (error) => evidence.pageErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') {
      evidence.consoleErrors.push(message.text())
    }
  })
  page.on('requestfailed', (request) => {
    if (
      new URL(request.url()).origin === previewOrigin &&
      isTrackedResource(request)
    ) {
      evidence.failedResources.push(
        `${request.url()}: ${request.failure()?.errorText ?? 'request failed'}`,
      )
    }
  })
  page.on('response', (response) => {
    const request = response.request()
    if (
      response.status() >= 400 &&
      new URL(response.url()).origin === previewOrigin &&
      isTrackedResource(request)
    ) {
      evidence.failedResources.push(
        `${response.url()}: HTTP ${response.status()}`,
      )
    }
  })

  return evidence
}

async function attachJson(
  testInfo: TestInfo,
  name: string,
  value: unknown,
): Promise<void> {
  await testInfo.attach(name, {
    body: Buffer.from(JSON.stringify(value, null, 2)),
    contentType: 'application/json',
  })
}

async function internalBaseViolations(page: Page): Promise<readonly string[]> {
  return page
    .locator(
      'a[href], link[href], script[src], img[src], source[src], source[srcset]',
    )
    .evaluateAll(
      (elements, expectedBasePath) =>
        elements.flatMap((element) => {
          const rawValues = [
            element.getAttribute('href'),
            element.getAttribute('src'),
            ...(element.getAttribute('srcset') ?? '')
              .split(',')
              .map((candidate) => candidate.trim().split(/\s+/)[0]),
          ].filter((value): value is string => value !== null && value !== '')

          return rawValues.flatMap((value) => {
            const url = new URL(value, window.location.href)
            return url.origin === window.location.origin &&
              !url.pathname.startsWith(expectedBasePath)
              ? [`${element.tagName.toLowerCase()} ${value}`]
              : []
          })
        }),
      previewBasePath,
    )
}

export async function assertRouteQuality(
  page: Page,
  route: string,
  testInfo: TestInfo,
): Promise<void> {
  const runtime = observeRuntime(page)
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

  await expect(page.locator('main, #VPContent').first()).toHaveText(/\S/)
  await expect(page.locator('h1').first()).toHaveText(/\S/)
  await expect(page.locator('html')).toHaveAttribute(
    'lang',
    expectedLang(route),
  )

  const hasHorizontalOverflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow, `${route} must not overflow horizontally`).toBe(
    false,
  )

  const baseViolations = await internalBaseViolations(page)
  if (baseViolations.length > 0) {
    await attachJson(testInfo, 'base-path-violations', baseViolations)
  }
  expect(
    baseViolations,
    `${route} has links or assets outside ${previewBasePath}`,
  ).toEqual([])

  if (
    runtime.pageErrors.length > 0 ||
    runtime.consoleErrors.length > 0 ||
    runtime.failedResources.length > 0
  ) {
    await attachJson(testInfo, 'runtime-errors', runtime)
  }
  expect(runtime.pageErrors, `${route} emitted page errors`).toEqual([])
  expect(runtime.consoleErrors, `${route} emitted console errors`).toEqual([])
  expect(
    runtime.failedResources,
    `${route} failed same-origin resources`,
  ).toEqual([])

  const axeResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()
  const seriousViolations = axeResults.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  )
  if (seriousViolations.length > 0) {
    await attachJson(testInfo, 'axe-serious-critical', seriousViolations)
  }
  expect(
    seriousViolations,
    `${route} must have zero serious or critical WCAG A/AA violations`,
  ).toEqual([])
}
