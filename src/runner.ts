import PQueue from 'p-queue'

import { errorMessage } from './steps.js'
import type { AppConfig, CheckResult, CheckRunner, RunReport, StoreCheck } from './types.js'
import { postWebhook } from './webhook.js'

export async function runChecks(
  config: AppConfig,
  runner: CheckRunner,
  options?: { fetchImpl?: typeof fetch },
): Promise<RunReport> {
  const startedAt = new Date()
  const queue = new PQueue({ concurrency: config.concurrency })
  const checks = await Promise.all(
    config.checks.map((check) => queue.add(() => runOne(runner, check))),
  )

  const report: RunReport = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    checks: checks.filter((check): check is CheckResult => check !== undefined),
  }

  const failed = report.checks.some((check) => check.status === 'fail')
  if (failed && config.webhookUrl) {
    try {
      await postWebhook(config.webhookUrl, report, options?.fetchImpl)
    } catch (error) {
      report.webhookError = errorMessage(error)
    }
  }

  return report
}

async function runOne(runner: CheckRunner, check: StoreCheck): Promise<CheckResult> {
  try {
    return await runner.run(check)
  } catch (error) {
    return {
      name: check.name,
      platform: check.platform,
      status: 'fail',
      durationMs: 0,
      steps: [],
      vitals: {},
      finalUrl: null,
      screenshot: null,
      error: errorMessage(error),
    }
  }
}
