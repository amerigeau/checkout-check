import type { Platform } from '../types.js'
import { prestaShopJourney } from './prestashop.js'
import type { Journey } from './types.js'
import { wooCommerceJourney } from './woocommerce.js'

const journeys: Record<Platform, Journey> = {
  woocommerce: wooCommerceJourney,
  prestashop: prestaShopJourney,
}

export function getJourney(platform: Platform): Journey {
  const journey = journeys[platform]
  if (!journey) throw new Error(`No journey registered for ${platform}`)
  return journey
}

export { prestaShopJourney, wooCommerceJourney }
export type { Journey, JourneyRun } from './types.js'
