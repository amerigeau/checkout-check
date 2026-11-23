import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { RunReport } from './types.js'

export function formatTable(report: RunReport): string {
  const rows = report.checks.map((check) => [
    check.name,
    check.platform,
    check.status,
    `${check.durationMs}ms`,
    check.steps.find((step) => step.status === 'fail')?.name ?? '-',
  ])
  const header = ['name', 'platform', 'status', 'duration', 'failed step']
  const widths = header.map((label, index) =>
    Math.max(label.length, ...rows.map((row) => row[index]?.length ?? 0)),
  )

  const line = (cells: string[]) =>
    cells.map((cell, index) => cell.padEnd(widths[index] ?? cell.length)).join('  ')

  const failed = report.checks.filter((check) => check.status === 'fail').length
  const lines = [
    line(header),
    widths.map((width) => '-'.repeat(width)).join('  '),
    ...rows.map((row) => line(row)),
    '',
    `${report.checks.length} checks, ${failed} failed`,
  ]
  if (report.webhookError) lines.push(`webhook error: ${report.webhookError}`)
  return lines.join('\n')
}

export function exitCode(report: RunReport): number {
  return report.checks.some((check) => check.status === 'fail') || report.webhookError ? 1 : 0
}

export async function writeJsonReport(filePath: string, report: RunReport): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}
