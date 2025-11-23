// lib/seo/schemas/schemaDateUtils.ts
// Utilidades mínimas de fecha para infraestructura JSON-LD.
// Validación y normalización simple de cadenas ISO sin lógica de negocio.

/**
 * Valida si una cadena es un ISO 8601 válido.
 * No ajusta zonas. Solo verifica que Date lo pueda interpretar correctamente.
 */
export function isValidIsoDate(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp);
}

/**
 * Normaliza una fecha en formato ISO 8601 completo.
 * - Si no es válida, retorna undefined.
 * - Si es válida, retorna date.toISOString().
 */
export function normalizeIso(value: string): string | undefined {
  if (!isValidIsoDate(value)) return undefined;
  return new Date(value).toISOString();
}
