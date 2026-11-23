import type { Page } from 'playwright'

import type { Platform, StepResult, StoreCheck, Vitals } from '../types.js'

export interface JourneyRun {
  steps: StepResult[]
  vitals: Record<string, Vitals>
  finalUrl: string | null
}

export interface Journey {
  readonly platform: Platform
  run(page: Page, check: StoreCheck): Promise<JourneyRun>
}
