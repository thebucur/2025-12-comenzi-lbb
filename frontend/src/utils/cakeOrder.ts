import type { CakeType, Floors, Order, OrderCake, Shape, Weight } from '../types/order.types'

export const ALT_CAKE_TYPE = 'ALT TIP'

export function resolveCakeType(
  cakeType: CakeType | string | null | undefined,
  customCakeType: string,
): string | null {
  if (!cakeType) return null
  if (cakeType === ALT_CAKE_TYPE) return customCakeType?.trim() || null
  return String(cakeType)
}

export function displayCakeType(cake: OrderCake): string {
  if (cake.cakeType === ALT_CAKE_TYPE) return cake.customCakeType?.trim() || ALT_CAKE_TYPE
  return cake.cakeType || ''
}

export function validateCakeSortimentBlock(
  cakeType: CakeType | string | null | undefined,
  customCakeType: string,
  weight: Weight | string | null | undefined,
  customWeight: string,
  shape: Shape | string | null | undefined,
  floors: Floors | string | null | undefined,
): boolean {
  if (!cakeType || !weight) return false
  if (cakeType === ALT_CAKE_TYPE && !customCakeType?.trim()) return false
  if (weight === 'ALTĂ GREUTATE' && !customWeight?.trim()) return false
  const showShape =
    weight === '2 KG' || weight === '2.5 KG' || weight === '3 KG' || weight === 'ALTĂ GREUTATE'
  if (showShape && !shape) return false
  const showFloors = weight === '3 KG' || weight === 'ALTĂ GREUTATE'
  if (showFloors && !floors) return false
  return true
}

/** A cake is "filled" if the user has touched at least one of its fields. */
export function isCakeStarted(cake: OrderCake): boolean {
  return Boolean(
    cake.cakeType ||
      cake.weight ||
      cake.customWeight?.trim() ||
      cake.shape ||
      cake.floors,
  )
}

/** A cake counts toward submission only if all required sortiment fields are set. */
export function isCakeValid(cake: OrderCake): boolean {
  return validateCakeSortimentBlock(
    cake.cakeType,
    cake.customCakeType,
    cake.weight,
    cake.customWeight,
    cake.shape,
    cake.floors,
  )
}

/** Text or uploaded photos count as "alte produse" content. */
export function hasOtherProductsContent(order: Order): boolean {
  return Boolean(order.otherProducts?.trim()) || order.otherProductPhotos.length > 0
}

/**
 * Step 2 is valid if:
 *  - there is at least one fully-valid cake (started cakes must be fully completed), OR
 *  - there are no started cakes but other products content exists (text or photos).
 *
 * Started-but-incomplete cakes always fail validation.
 */
export function orderStep2SortimentValid(order: Order): boolean {
  const started = order.cakes.filter(isCakeStarted)

  if (started.length === 0) {
    return hasOtherProductsContent(order)
  }

  // Every started cake must be fully valid
  return started.every(isCakeValid)
}
