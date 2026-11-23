import type { Journey } from './types.js'

/**
 * Stub for a PrestaShop journey. Same contract as WooCommerce:
 * home, product, add to cart, cart, checkout page reached.
 * Do not submit the order.
 *
 * Typical targets once this is filled in:
 * - add to cart: `button.add-to-cart` or `button[data-button-action="add-to-cart"]`
 * - cart: `cartPath` of `/cart` or `?controller=cart`
 * - checkout: link to `/order`, then wait for the checkout step list
 * - stop before `#payment-confirmation button`
 *
 * Register the finished object in `src/journeys/index.ts` (it is already wired).
 */
export const prestaShopJourney: Journey = {
  platform: 'prestashop',
  async run() {
    throw new Error(
      'PrestaShop journey is not implemented yet. Copy the WooCommerce step list in src/journeys/woocommerce.ts and swap the selectors.',
    )
  },
}
