import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { getJourney } from '../../src/journeys/index.js'
import { exitCode, formatTable, writeJsonReport } from '../../src/report.js'
import type { RunReport } from '../../src/types.js'

const report: RunReport = {
  startedAt: '2026-01-01T00:00:00.000Z',
  finishedAt: '2026-01-01T00:00:01.000Z',
  checks: [
    {
      name: 'fixture-shop',
      platform: 'woocommerce',
      status: 'pass',
      durationMs: 120,
      steps: [{ name: 'home', status: 'pass', durationMs: 40 }],
      vitals: { home: { lcpMs: 80, cls: 0 } },
      finalUrl: 'http://127.0.0.1/checkout.html',
      screenshot: null,
    },
    {
      name: 'broken-cart',
      platform: 'woocommerce',
      status: 'fail',
      durationMs: 900,
      steps: [{ name: 'cart', status: 'fail', durationMs: 900, error: 'missing' }],
      vitals: {},
      finalUrl: null,
      screenshot: 'artifacts/screenshots/broken-cart.png',
      error: 'missing',
    },
  ],
}

describe('formatTable', () => {
  it('includes status, timing, and the failed step', () => {
    const table = formatTable(report)
    expect(table).toContain('fixture-shop')
    expect(table).toContain('broken-cart')
    expect(table).toContain('120ms')
    expect(table).toContain('cart')
    expect(table).toContain('2 checks, 1 failed')
  })
})

describe('exitCode', () => {
  it('is 1 when any check failed or the webhook errored', () => {
    expect(exitCode(report)).toBe(1)
    expect(exitCode({ ...report, checks: report.checks.slice(0, 1) })).toBe(0)
    expect(exitCode({ ...report, checks: report.checks.slice(0, 1), webhookError: 'nope' })).toBe(1)
  })
})

describe('writeJsonReport', () => {
  it('writes the report pretty-printed', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'checkout-report-'))
    const file = join(dir, 'nested', 'report.json')
    await writeJsonReport(file, report)
    const saved = JSON.parse(await readFile(file, 'utf8')) as RunReport
    expect(saved.checks[1]?.screenshot).toBe('artifacts/screenshots/broken-cart.png')
  })
})

describe('getJourney', () => {
  it('exposes the PrestaShop stub without running a store', async () => {
    await expect(getJourney('prestashop').run({} as never, {} as never)).rejects.toThrow(/not implemented/)
    expect(getJourney('woocommerce').platform).toBe('woocommerce')
  })
})
