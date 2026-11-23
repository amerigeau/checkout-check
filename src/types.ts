export const PLATFORMS = ['woocommerce', 'prestashop'] as const

export type Platform = (typeof PLATFORMS)[number]

export interface Selectors {
  addToCart: string
  checkoutLink: string
  checkoutReady: string
  cartLink?: string
}

export interface StoreCheck {
  name: string
  platform: Platform
  baseUrl: string
  productPath: string
  cartPath?: string
  selectors: Selectors
  timeoutMs: number
}

export interface AppConfig {
  concurrency: number
  webhookUrl?: string
  jsonReport?: string
  screenshotDir: string
  checks: StoreCheck[]
}

export interface StepResult {
  name: string
  status: 'pass' | 'fail'
  durationMs: number
  error?: string
}

export interface Vitals {
  lcpMs: number | null
  cls: number | null
}

export interface CheckResult {
  name: string
  platform: Platform
  status: 'pass' | 'fail'
  durationMs: number
  steps: StepResult[]
  vitals: Record<string, Vitals>
  finalUrl: string | null
  screenshot: string | null
  error?: string
}

export interface RunReport {
  startedAt: string
  finishedAt: string
  checks: CheckResult[]
  webhookError?: string
}

export interface CheckRunner {
  run(check: StoreCheck): Promise<CheckResult>
}
