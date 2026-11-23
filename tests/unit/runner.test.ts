import { createServer } from 'node:http'

import { describe, expect, it } from 'vitest'

import { runChecks } from '../../src/runner.js'
import type { AppConfig, CheckResult, CheckRunner, StoreCheck } from '../../src/types.js'

function check(name: string): StoreCheck {
  return {
    name,
    platform: 'woocommerce',
    baseUrl: 'http://127.0.0.1:9',
    productPath: '/product.html',
    cartPath: '/cart.html',
    timeoutMs: 1000,
    selectors: {
      addToCart: 'button.add',
      checkoutLink: 'a.checkout',
      checkoutReady: 'h1.ready',
    },
  }
}

function result(name: string, status: 'pass' | 'fail'): CheckResult {
  return {
    name,
    platform: 'woocommerce',
    status,
    durationMs: 5,
    steps: [{ name: 'home', status, durationMs: 5, ...(status === 'fail' ? { error: 'down' } : {}) }],
    vitals: {},
    finalUrl: null,
    screenshot: status === 'fail' ? 'artifacts/screenshots/x.png' : null,
    ...(status === 'fail' ? { error: 'down' } : {}),
  }
}

function config(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    concurrency: 2,
    screenshotDir: 'artifacts/screenshots',
    checks: [check('a'), check('b')],
    ...overrides,
  }
}

describe('runChecks', () => {
  it('caps in-flight work at the configured concurrency', async () => {
    let current = 0
    let peak = 0
    const runner: CheckRunner = {
      async run(storeCheck) {
        current += 1
        peak = Math.max(peak, current)
        await new Promise((resolve) => setTimeout(resolve, 40))
        current -= 1
        return result(storeCheck.name, 'pass')
      },
    }

    const report = await runChecks(
      config({
        concurrency: 2,
        checks: [check('a'), check('b'), check('c'), check('d')],
      }),
      runner,
    )

    expect(peak).toBe(2)
    expect(report.checks).toHaveLength(4)
    expect(report.checks.every((item) => item.status === 'pass')).toBe(true)
    expect(report.webhookError).toBeUndefined()
  })

  it('turns a thrown runner error into a failed check', async () => {
    const runner: CheckRunner = {
      async run() {
        throw new Error('browser crashed')
      },
    }
    const report = await runChecks(config({ checks: [check('only')] }), runner)
    expect(report.checks[0]?.status).toBe('fail')
    expect(report.checks[0]?.error).toBe('browser crashed')
  })

  it('posts the webhook only when a check fails', async () => {
    const posts: unknown[] = []
    const server = createServer(async (request, response) => {
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      posts.push(JSON.parse(Buffer.concat(chunks).toString('utf8')))
      response.writeHead(204)
      response.end()
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (!address || typeof address === 'string') throw new Error('no port')
    const webhookUrl = `http://127.0.0.1:${address.port}/hook`

    try {
      const passing: CheckRunner = { async run(storeCheck) { return result(storeCheck.name, 'pass') } }
      await runChecks(config({ webhookUrl, checks: [check('ok')] }), passing)
      expect(posts).toHaveLength(0)

      const failing: CheckRunner = { async run(storeCheck) { return result(storeCheck.name, 'fail') } }
      const report = await runChecks(config({ webhookUrl, checks: [check('bad')] }), failing)
      expect(report.webhookError).toBeUndefined()
      expect(posts).toHaveLength(1)
      expect(posts[0]).toMatchObject({
        source: 'checkout-check',
        failed: [{ name: 'bad', error: 'down' }],
      })
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
  })
})
