// lib/seo/redirects/validateRedirectsBusiness.ts
// Validador estricto del catálogo de redirecciones (Bloque 05 SEO).
// Garantiza calidad: sin duplicados, sin cadenas, sin destinos prohibidos.

import type {
  RedirectBusinessFile,
  RedirectBusinessRule,
} from "./types";
import { isForbiddenDestination } from "./loadRedirectsBusiness";

/**
 * Lanza error si hay ids duplicados.
 */
function ensureUniqueIds(rules: RedirectBusinessRule[]): void {
  const seen = new Set<string>();
  for (const r of rules) {
    if (seen.has(r.id)) {
      throw new Error(
        `[Redirects] ID duplicado detectado: "${r.id}". IDs deben ser únicos.`
      );
    }
    seen.add(r.id);
  }
}

/**
 * Lanza error si hay source duplicados.
 */
function ensureUniqueSources(rules: RedirectBusinessRule[]): void {
  const seen = new Set<string>();
  for (const r of rules) {
    if (seen.has(r.source)) {
      throw new Error(
        `[Redirects] Source duplicado detectado: "${r.source}". Cada source debe ser único.`
      );
    }
    seen.add(r.source);
  }
}

/**
 * Detecta cadenas A→B→C.  
 * Si B es destino de A y también es source de otra regla → error.
 */
function ensureNoRedirectChains(rules: RedirectBusinessRule[]): void {
  const sourceSet = new Set(rules.map((r) => r.source));

  for (const r of rules) {
    if (sourceSet.has(r.destination)) {
      throw new Error(
        `[Redirects] Cadena de redirecciones detectada: "${r.source}" → "${r.destination}" y "${r.destination}" tiene su propia regla. Simplificar a destino final.`
      );
    }
  }
}

/**
 * Revisa que `destination` no use rutas prohibidas según reglas de negocio.
 */
function ensureNoForbiddenDestinations(
  rules: RedirectBusinessRule[]
): void {
  for (const r of rules) {
    if (isForbiddenDestination(r.destination)) {
      throw new Error(
        `[Redirects] Destination prohibido en regla "${r.id}": "${r.destination}". No se permite redirigir a rutas privadas o internas.`
      );
    }
  }
}

/**
 * Ejecuta TODAS las validaciones del catálogo de negocio.
 * Se invoca en dev y durante el build (next.config.mjs).
 */
export function validateRedirectsBusinessFile(
  file: RedirectBusinessFile
): void {
  const rules = file.rules;

  ensureUniqueIds(rules);
  ensureUniqueSources(rules);
  ensureNoRedirectChains(rules);
  ensureNoForbiddenDestinations(rules);

  // Más validaciones futuras pueden agregarse aquí.
}
