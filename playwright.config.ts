import { defineConfig } from '@playwright/test'
import {
  previewBasePath,
  previewBaseUrl,
  previewOrigin,
} from './tests/browser/support/preview'

const previewUrl = new URL(previewOrigin)
const previewHost = previewUrl.hostname
const previewPort = previewUrl.port === '' ? '4173' : previewUrl.port
const previewBaseHasTraversalSegment = previewBasePath
  .split('/')
  .some((segment) => segment === '.' || segment === '..')

if (
  !/^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(previewBasePath) ||
  previewBaseHasTraversalSegment
) {
  throw new TypeError(
    'PLAYWRIGHT_BASE_PATH must start and end with "/" and contain only URL-safe path segments',
  )
}

const inCi = process.env['CI'] !== undefined
const browserOptions = inCi ? {} : { channel: 'msedge-beta' as const }

export default defineConfig({
  testDir: './tests/browser',
  outputDir: '.artifacts/playwright',
  fullyParallel: false,
  forbidOnly: inCi,
  retries: inCi ? 1 : 0,
  ...(inCi ? { workers: 1 } : {}),
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['junit', { outputFile: 'test-results/playwright.xml' }],
  ],
  use: {
    baseURL: previewBaseUrl,
    ...browserOptions,
    serviceWorkers: 'block',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm exec vitepress preview docs --host ${previewHost} --port ${previewPort} --base ${previewBasePath}`,
    url: previewBaseUrl,
    reuseExistingServer: !inCi,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium-375',
      testIgnore: ['**/interactions.desktop.spec.ts'],
      use: { viewport: { width: 375, height: 812 } },
    },
    {
      name: 'chromium-768',
      testIgnore: [
        '**/interactions.desktop.spec.ts',
        '**/interactions.mobile.spec.ts',
      ],
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'chromium-1280',
      testIgnore: ['**/interactions.mobile.spec.ts'],
      use: { viewport: { width: 1280, height: 900 } },
    },
  ],
})
