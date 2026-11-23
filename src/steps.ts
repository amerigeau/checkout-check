import type { StepResult } from './types.js'

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

export async function runStep(name: string, fn: () => Promise<void>): Promise<StepResult> {
  const started = performance.now()
  try {
    await fn()
    return { name, status: 'pass', durationMs: elapsed(started) }
  } catch (error) {
    return { name, status: 'fail', durationMs: elapsed(started), error: errorMessage(error) }
  }
}

function elapsed(started: number): number {
  return Math.round(performance.now() - started)
}
