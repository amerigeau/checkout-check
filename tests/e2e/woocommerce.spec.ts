import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { chromium } from 'playwright'
import { expect, test } from '@playwright/test'

import { runStoreCheck } from '../../src/browser-check.js'
import { fixtureCheck, startFixtureShop } from '../../src/fixture-shop.js'

test('WooCommerce journey reaches checkout on the local fixture and does not order', async () => {
  const shop = await startFixtureShop()
  const browser = await chromium.launch({ headless: true })
  try {
    const result = await runStoreCheck(browser, fixtureCheck(shop.url), join(tmpdir(), 'unused-shots'))
    expect(result.status).toBe('pass')
    expect(result.error).toBeUndefined()
    expect(result.screenshot).toBeNull()
    expect(result.finalUrl).toMatch(/\/checkout\.html$/)
    expect(result.steps.map((step) => step.name)).toEqual([
      'home',
      'product',
      'add-to-cart',
      'cart',
      'checkout',
    ])
    expect(result.steps.every((step) => step.status === 'pass')).toBe(true)
    expect(result.vitals.home).toBeDefined()
    expect(result.vitals.checkout).toBeDefined()
    expect(result.durationMs).toBeGreaterThan(0)
  } finally {
    await browser.close()
    await shop.close()
  }
})

test('a missing selector fails the step and writes a screenshot', async () => {
  const shop = await startFixtureShop()
  const browser = await chromium.launch({ headless: true })
  const screenshotDir = await mkdtemp(join(tmpdir(), 'checkout-shots-'))
  try {
    const check = fixtureCheck(shop.url, 'missing-button')
    check.timeoutMs = 2_000
    check.selectors.addToCart = 'button.does-not-exist'
    const result = await runStoreCheck(browser, check, screenshotDir)
    expect(result.status).toBe('fail')
    expect(result.steps.find((step) => step.status === 'fail')?.name).toBe('add-to-cart')
    expect(result.screenshot).toMatch(/missing-button-.*\.png$/)
  } finally {
    await browser.close()
    await shop.close()
  }
})
