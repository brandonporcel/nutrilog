import type { Product } from "@/lib/db/database";

/**
 * Portion math — single source of truth for quantity conversions.
 *
 * Product nutrients (protein, calories, etc.) describe the REFERENCE PORTION
 * (serving_amount in the serving unit, e.g. "2 rebanadas") and optionally its
 * weight (serving_weight_grams, e.g. 50 g). Users enter quantities in the
 * product's OWN UNIT (2 rebanadas, 250 g, 0,5 unidad), so every macro scales
 * by servings = quantity / serving_amount. Never re-implement this ratio in
 * repositories, hooks or components.
 */

export type PortionSource = Pick<Product, "serving_amount" | "serving_weight_grams">;

/** Reference portions that a quantity of the product's unit represents. */
export function servingsFor(quantity: number, product: PortionSource | undefined): number {
  if (!product || product.serving_amount <= 0) return quantity;
  return quantity / product.serving_amount;
}

/** Weight (g) equivalent of a quantity, or null when the portion has none. */
export function weightGramsFor(quantity: number, product: PortionSource | undefined): number | null {
  if (!product || !product.serving_weight_grams || product.serving_amount <= 0) return null;
  return (quantity / product.serving_amount) * product.serving_weight_grams;
}

/** Scales a per-portion macro to the given quantity. */
export function macroForQuantity(
  quantity: number,
  perServing: number,
  product: PortionSource | undefined
): number {
  return servingsFor(quantity, product) * perServing;
}

/** True when the unit measures weight/volume directly (g, ml). */
export function isWeightUnit(servingUnitName: string | null): boolean {
  const unit = servingUnitName?.toLowerCase() ?? "";
  return unit === "gram" || unit === "milliliter";
}
