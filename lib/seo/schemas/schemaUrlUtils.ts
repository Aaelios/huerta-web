// lib/seo/schemas/schemaUrlUtils.ts
// Utilidades de URL para builders de JSON-LD.
// Proveen conversión consistente de rutas relativas a URLs absolutas.

/**
 * Extrae el origin desde un canonical absoluto.
 * Ejemplo: "https://lobra.net/webinars/x" → "https://lobra.net"
 */
export function getOriginFromCanonical(canonical: string): string {
  const url = new URL(canonical);
  return url.origin;
}

/**
 * Convierte un path relativo en una URL absoluta usando el canonical como referencia.
 * No aplica lógica de negocio ni normalización avanzada.
 */
export function buildAbsoluteUrl(canonical: string, path: string): string {
  const origin = getOriginFromCanonical(canonical);
  if (!path.startsWith("/")) return `${origin}/${path}`;
  return `${origin}${path}`;
}
