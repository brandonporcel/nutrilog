/**
 * Formats a number for the UI: comma decimal separator, no unnecessary
 * zeros, no more precision than needed (2 decimals max). Kills float noise
 * like 40.40000000000006 → "40,4". Use for every user-visible number.
 */
export function formatNumber(value: number, maxFractionDigits = 1): string {
  if (!Number.isFinite(value)) return "0";
  const factor = 10 ** maxFractionDigits;
  const rounded = Math.round(value * factor) / factor;
  return rounded.toLocaleString("es-AR", {
    maximumFractionDigits: maxFractionDigits,
  });
}

/** Formats grams for a compact "X g" label. */
export function formatGrams(value: number): string {
  return `${formatNumber(value)} g`;
}
