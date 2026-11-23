#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'

import { chromium } from 'playwright'

import { runStoreCheck } from './browser-check.js'
import { formatConfigError, loadConfig } from './config.js'
import { exitCode, formatTable, writeJsonReport } from './report.js'
import { runChecks } from './runner.js'
import type { AppConfig } from './types.js'

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv.slice(2),
    allowPositionals: true,
    options: {
      config: { type: 'string', short: 'c' },
      json: { type: 'string' },
      help: { type: 'boolean', short: 'h', default: false },
    },
  })

  if (values.help || positionals[0] !== 'run' || !values.config) {
    console.log('Usage: checkout-check run --config checks.json [--json report.json]')
    return values.help ? 0 : 1
  }

  let config: AppConfig
  try {
    config = await loadConfig(values.config)
  } catch (error) {
    console.error(formatConfigError(error))
    return 1
  }

  if (values.json) config = { ...config, jsonReport: values.json }

  const browser = await chromium.launch({ headless: true })
  try {
    const report = await runChecks(config, {
      run: (check) => runStoreCheck(browser, check, config.screenshotDir),
    })
    console.log(formatTable(report))
    if (config.jsonReport) {
      await writeJsonReport(config.jsonReport, report)
      console.log(`json report: ${config.jsonReport}`)
    }
    return exitCode(report)
  } finally {
    await browser.close()
  }
}

const invokedDirectly = Boolean(
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href,
)
if (invokedDirectly) {
  main(process.argv).then(
    (code) => {
      process.exitCode = code
    },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : error)
      process.exitCode = 1
    },
  )
}
