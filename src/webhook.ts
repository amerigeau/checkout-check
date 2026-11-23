import type { RunReport } from './types.js'

export async function postWebhook(
  url: string,
  report: RunReport,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const failed = report.checks.filter((check) => check.status === 'fail')
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      source: 'checkout-check',
      failed: failed.map((check) => ({
        name: check.name,
        platform: check.platform,
        error: check.error ?? null,
        finalUrl: check.finalUrl,
        screenshot: check.screenshot,
        steps: check.steps,
      })),
    }),
  })
  if (!response.ok) {
    throw new Error(`Webhook responded with HTTP ${response.status}`)
  }
}
