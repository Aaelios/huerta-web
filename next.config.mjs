// next.config.mjs
// Configuración central de Next.js para LOBRÁ.
// Incluye loader + validador de redirecciones basados en data/redirects.business.jsonc.

import { promises as fs } from "fs";
import path from "path";
import { parse } from "jsonc-parser";

/**
 * Prefijos prohibidos para destination según reglas de negocio v1.
 * Debe mantenerse alineado con la política del Bloque 05.
 */
const FORBIDDEN_PREFIXES = [
  "/checkout",
  "/gracias",
  "/cancelado",
  "/mi-cuenta",
  "/mis-compras",
  "/comunidad",
  "/api",
  "/admin",
  "/dev",
];

/**
 * Determina si un destino está prohibido por política.
 */
function isForbiddenDestination(dest) {
  return FORBIDDEN_PREFIXES.some((prefix) => dest.startsWith(prefix));
}

/**
 * Lanza error si hay ids duplicados.
 */
function ensureUniqueIds(rules) {
  const seen = new Set();
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
function ensureUniqueSources(rules) {
  const seen = new Set();
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
function ensureNoRedirectChains(rules) {
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
function ensureNoForbiddenDestinations(rules) {
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
 */
function validateRedirectsBusinessFile(file) {
  const rules = file.rules;

  ensureUniqueIds(rules);
  ensureUniqueSources(rules);
  ensureNoRedirectChains(rules);
  ensureNoForbiddenDestinations(rules);
}

/**
 * Lee y parsea data/redirects.business.jsonc.
 * Retorna el archivo normalizado:
 * - Filtra reglas desactivadas.
 * - Ordena reglas por longitud de `source` (desc) para coincidencias exactas.
 */
async function loadRedirectsBusiness() {
  const filePath = path.join(process.cwd(), "data", "redirects.business.jsonc");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parse(raw);

  const rules = Array.isArray(parsed.rules) ? parsed.rules : [];

  const enabledRules = rules.filter((r) => r.enabled === true);

  const orderedRules = [...enabledRules].sort(
    (a, b) => b.source.length - a.source.length
  );

  return {
    version: parsed.version,
    updatedAt: parsed.updatedAt,
    rules: orderedRules,
  };
}

/**
 * Config principal de Next.js.
 */
const nextConfig = {
  /**
   * Redirecciones 301 controladas por el catálogo de negocio.
   * Se validan en dev y durante los builds de preview/prod.
   */
  async redirects() {
    const file = await loadRedirectsBusiness();

    validateRedirectsBusinessFile(file);

    return file.rules.map((r) => ({
      source: r.source,
      destination: r.destination,
      permanent: r.type === "permanent",
    }));
  },
};

export default nextConfig;
