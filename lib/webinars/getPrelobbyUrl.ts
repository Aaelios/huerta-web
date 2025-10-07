// lib/webinars/getPrelobbyUrl.ts

import type { Webinar } from "@/lib/types/webinars";

/**
 * getPrelobbyUrl
 * Construye la URL del prelobby a partir del slug del webinar.
 * Por defecto retorna ruta relativa. Puede construir absoluta si se pasa { base }.
 */

// Ejemplo de uso:
// 1) Dentro del sitio (enlace interno):
//    const url = getPrelobbyUrl(webinar);
//    → "/webinars/2025-10-14-2030/prelobby"
//
// 2) En correos o contexto externo:
//    const url = getPrelobbyUrl(webinar, { base: process.env.APP_URL });
//    → "https://lobra.net/webinars/2025-10-14-2030/prelobby"

export function getPrelobbyUrl(
  webinar: Webinar,
  opts?: { base?: string } // ejemplo: { base: "https://lobra.net" }
): string {
  const slug = webinar?.shared?.slug;
  if (!slug || typeof slug !== "string") {
    throw new Error("[webinars] shared.slug requerido para construir prelobby URL");
  }

  const relative = `/webinars/${slug}/prelobby`;
  if (!opts?.base) return relative;

  const trimmedBase = opts.base.replace(/\/+$/, "");
  return `${trimmedBase}${relative}`;
}
