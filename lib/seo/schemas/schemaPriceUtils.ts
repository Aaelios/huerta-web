// lib/seo/schemas/schemaPriceUtils.ts
// Utilidades de precio para infraestructura JSON-LD.
// Conversión simple de centavos a valor numérico + moneda estándar.

/**
 * Convierte amountCents a precio decimal.
 * Si el valor no es válido, devuelve undefined.
 */
export function toPriceValue(amountCents?: number): number | undefined {
  if (typeof amountCents !== "number" || amountCents < 0) return undefined;
  return amountCents / 100;
}

/**
 * Construye un fragmento de precio listo para JSON-LD.
 * No aplica reglas de negocio ni formatting especial.
 */
export function buildPriceObject(amountCents?: number, currency?: string): { price: number; priceCurrency: string } | undefined {
  const price = toPriceValue(amountCents);
  if (price === undefined || !currency) return undefined;
  return {
    price,
    priceCurrency: currency,
  };
}
