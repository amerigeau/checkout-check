import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

import type { Browser } from 'playwright'

import { getJourney } from './journeys/index.js'
import { installVitals } from './vitals.js'
import { errorMessage } from './steps.js'
import type { CheckResult, StoreCheck } from './types.js'

export async function runStoreCheck(
  browser: Browser,
  check: StoreCheck,
  screenshotDir: string,
): Promise<CheckResult> {
  const started = performance.now()
  const context = await browser.newContext()
  const page = await context.newPage()
  await installVitals(page)

  try {
    const journey = getJourney(check.platform)
    const outcome = await journey.run(page, check)
    const failed = outcome.steps.find((step) => step.status === 'fail')
    const screenshot = failed ? await capture(page, screenshotDir, check.name) : null
    return {
      name: check.name,
      platform: check.platform,
      status: failed ? 'fail' : 'pass',
      durationMs: Math.round(performance.now() - started),
      steps: outcome.steps,
      vitals: outcome.vitals,
      finalUrl: outcome.finalUrl,
      screenshot,
      ...(failed?.error ? { error: failed.error } : {}),
    }
  } catch (error) {
    const screenshot = await capture(page, screenshotDir, check.name).catch(() => null)
    return {
      name: check.name,
      platform: check.platform,
      status: 'fail',
      durationMs: Math.round(performance.now() - started),
      steps: [],
      vitals: {},
      finalUrl: safeUrl(page),
      screenshot,
      error: errorMessage(error),
    }
  } finally {
    await context.close()
  }
}

async function capture(page: import('playwright').Page, dir: string, name: string): Promise<string> {
  await mkdir(dir, { recursive: true })
  const file = join(dir, `${safeName(name)}-${Date.now()}.png`)
  await page.screenshot({ path: file, fullPage: true })
  return file
}

function safeName(name: string): string {
  return name.replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'check'
}

function safeUrl(page: import('playwright').Page): string | null {
  try {
    return page.url()
  } catch {
    return null
  }
}
