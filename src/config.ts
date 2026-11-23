import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'

import { parse as parseYaml } from 'yaml'
import { z } from 'zod'

import { PLATFORMS, type AppConfig } from './types.js'

const selectorsSchema = z.object({
  addToCart: z.string().min(1),
  checkoutLink: z.string().min(1),
  checkoutReady: z.string().min(1),
  cartLink: z.string().min(1).optional(),
})

const checkSchema = z
  .object({
    name: z.string().min(1),
    platform: z.enum(PLATFORMS),
    baseUrl: z.string().url(),
    productPath: z.string().min(1),
    cartPath: z.string().min(1).optional(),
    selectors: selectorsSchema,
    timeoutMs: z.number().int().positive().default(15_000),
  })
  .superRefine((check, ctx) => {
    if (!check.cartPath && !check.selectors.cartLink) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Set cartPath or selectors.cartLink so the cart step has a target',
        path: ['cartPath'],
      })
    }
  })

export const configSchema = z.object({
  concurrency: z.number().int().positive().max(8).default(2),
  webhookUrl: z.string().url().optional(),
  jsonReport: z.string().min(1).optional(),
  screenshotDir: z.string().min(1).default('artifacts/screenshots'),
  checks: z.array(checkSchema).min(1),
})

export function parseConfig(input: unknown): AppConfig {
  return configSchema.parse(input)
}

export async function loadConfig(filePath: string): Promise<AppConfig> {
  const raw = await readFile(filePath, 'utf8')
  const ext = extname(filePath).toLowerCase()
  const data = ext === '.yaml' || ext === '.yml' ? parseYaml(raw) : JSON.parse(raw)
  return parseConfig(data)
}

export function formatConfigError(error: unknown): string {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n')
  }
  if (error instanceof Error) return error.message
  return String(error)
}
