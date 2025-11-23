// lib/seo/redirects/loadRedirectsBusiness.ts
// Loader central del catálogo de redirecciones (Bloque 05 SEO).
// Lee el archivo JSONC, aplica filtros, ordena reglas y expone la estructura tipada.

import { promises as fs } from "fs";
import path from "path";
import { parse } from "jsonc-parser";
import type {
  RedirectBusinessFile,
  RedirectBusinessRule,
} from "./types";

// Prefijos prohibidos para destination según reglas de negocio v1.
// Esto NO arroja error aquí; solo provee el helper.
// La validación estricta ocurre en validateRedirectsBusiness.ts.
const FORBIDDEN_PREFIXES: string[] = [
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
export function isForbiddenDestination(dest: string): boolean {
  return FORBIDDEN_PREFIXES.some((prefix) => dest.startsWith(prefix));
}

/**
 * Lee y parsea data/redirects.business.jsonc.
 * Retorna el archivo tipado y normalizado:
 * - Filtra reglas desactivadas.
 * - Ordena reglas por longitud de `source` (desc) para coincidencias exactas.
 */
export async function loadRedirectsBusiness(): Promise<RedirectBusinessFile> {
  const filePath = path.join(process.cwd(), "data", "redirects.business.jsonc");
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = parse(raw) as RedirectBusinessFile;

  // Filtrar por enabled === true
  const enabledRules: RedirectBusinessRule[] = parsed.rules.filter(
    (r) => r.enabled === true
  );

  // Ordenar por longitud de source (desc) para prioridad natural
  const orderedRules: RedirectBusinessRule[] = [...enabledRules].sort(
    (a, b) => b.source.length - a.source.length
  );

  return {
    version: parsed.version,
    updatedAt: parsed.updatedAt,
    rules: orderedRules,
  };
}
