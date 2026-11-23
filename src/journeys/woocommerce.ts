import type { Page } from 'playwright'

import { runStep } from '../steps.js'
import { readVitals } from '../vitals.js'
import type { StepResult, StoreCheck, Vitals } from '../types.js'
import type { Journey, JourneyRun } from './types.js'

export function resolveUrl(baseUrl: string, path: string): string {
  return new URL(path, baseUrl).href
}

/**
 * Generic WooCommerce storefront path.
 * Stops on the checkout page. It never clicks place-order or payment buttons.
 */
export const wooCommerceJourney: Journey = {
  platform: 'woocommerce',
  async run(page, check) {
    const steps: StepResult[] = []
    const vitals: Record<string, Vitals> = {}

    const run = async (name: string, fn: () => Promise<void>) => {
      if (steps.some((step) => step.status === 'fail')) return
      steps.push(await runStep(name, fn))
    }

    await run('home', async () => {
      await open(page, check.baseUrl, check.timeoutMs)
      vitals.home = await readVitals(page)
    })

    await run('product', async () => {
      await open(page, resolveUrl(check.baseUrl, check.productPath), check.timeoutMs)
    })

    await run('add-to-cart', async () => {
      await page.locator(check.selectors.addToCart).click({ timeout: check.timeoutMs })
    })

    await run('cart', async () => {
      if (check.cartPath) {
        await open(page, resolveUrl(check.baseUrl, check.cartPath), check.timeoutMs)
        return
      }
      const cartLink = check.selectors.cartLink
      if (!cartLink) throw new Error('cartPath or selectors.cartLink is required')
      await page.locator(cartLink).click({ timeout: check.timeoutMs })
    })

    await run('checkout', async () => {
      await page.locator(check.selectors.checkoutLink).click({ timeout: check.timeoutMs })
      await page.locator(check.selectors.checkoutReady).waitFor({
        state: 'visible',
        timeout: check.timeoutMs,
      })
      const ordered = await page.locator('body').getAttribute('data-ordered')
      if (ordered === 'yes') {
        throw new Error('An order was placed. Checkout checks must stop before payment.')
      }
      vitals.checkout = await readVitals(page)
    })

    return {
      steps,
      vitals,
      finalUrl: page.url(),
    } satisfies JourneyRun
  },
}

async function open(page: Page, url: string, timeoutMs: number): Promise<void> {
  const response = await page.goto(url, { waitUntil: 'load', timeout: timeoutMs })
  if (response && response.status() >= 400) {
    throw new Error(`${url} returned HTTP ${response.status()}`)
  }
}

export type { StoreCheck }
