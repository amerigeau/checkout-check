import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'

import { formatConfigError, loadConfig, parseConfig } from '../../src/config.js'

const check = {
  name: 'fixture-shop',
  platform: 'woocommerce',
  baseUrl: 'http://127.0.0.1:9',
  productPath: '/product.html',
  cartPath: '/cart.html',
  selectors: {
    addToCart: 'button.add',
    checkoutLink: 'a.checkout',
    checkoutReady: 'h1.checkout-title',
  },
}

describe('parseConfig', () => {
  it('applies defaults and keeps a valid WooCommerce check', () => {
    const config = parseConfig({ checks: [check] })
    expect(config.concurrency).toBe(2)
    expect(config.screenshotDir).toBe('artifacts/screenshots')
    expect(config.webhookUrl).toBeUndefined()
    expect(config.checks[0]?.timeoutMs).toBe(15_000)
    expect(config.checks[0]?.platform).toBe('woocommerce')
  })

  it('rejects an unknown platform and a cart step with no target', () => {
    expect(() => parseConfig({ checks: [{ ...check, platform: 'shopify' }] })).toThrow(ZodError)
    const { cartPath: _cartPath, ...noCart } = check
    expect(() => parseConfig({ checks: [noCart] })).toThrow(/cartPath or selectors.cartLink/)
  })

  it('accepts a cart link instead of cartPath', () => {
    const { cartPath: _cartPath, ...noCart } = check
    const config = parseConfig({
      checks: [{ ...noCart, selectors: { ...check.selectors, cartLink: 'a.cart' } }],
    })
    expect(config.checks[0]?.selectors.cartLink).toBe('a.cart')
  })
})

describe('loadConfig', () => {
  it('reads JSON and YAML files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'checkout-config-'))
    const body = { checks: [check], concurrency: 1 }
    const jsonPath = join(dir, 'checks.json')
    const yamlPath = join(dir, 'checks.yaml')
    await writeFile(jsonPath, JSON.stringify(body))
    await writeFile(yamlPath, 'concurrency: 1\nchecks:\n  - name: fixture-shop\n    platform: woocommerce\n    baseUrl: http://127.0.0.1:9\n    productPath: /product.html\n    cartPath: /cart.html\n    selectors:\n      addToCart: button.add\n      checkoutLink: a.checkout\n      checkoutReady: h1.checkout-title\n')

    expect((await loadConfig(jsonPath)).concurrency).toBe(1)
    expect((await loadConfig(yamlPath)).checks[0]?.name).toBe('fixture-shop')
  })
})

describe('formatConfigError', () => {
  it('prints field paths from a zod error', () => {
    try {
      parseConfig({ checks: [] })
    } catch (error) {
      expect(formatConfigError(error)).toContain('checks')
    }
  })
})
