// lib/freeclass/load.ts
// 1) Loader tipado para landings de clases gratuitas desde data/views/freeclass_pages.jsonc.
// 2) Expone acceso seguro por SKU y por slugLanding, con validación Zod y checks de consistencia.

import { promises as fs } from "fs";
import path from "path";
import { parse as parseJsonc } from "jsonc-parser";
import type { ZodError, ZodIssue } from "zod";
import {
  FreeClassPageMapSchema,
  type FreeClassPage,
  type FreeClassPageMap,
} from "@/lib/freeclass/schema";

/* -------------------------------------------------------------------------- */
/* Utilidades internas                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Formatea un ZodError a un string legible para logs.
 */
function formatZodError(error: ZodError<unknown>): string {
  const lines: string[] = [];

  error.issues.forEach((issue: ZodIssue) => {
    const pathString = issue.path.join(".");
    const message = issue.message;
    lines.push(`- ${pathString}: ${message}`);
  });

  return lines.join("\n");
}

/**
 * Ruta absoluta del archivo JSONC de configuración de free classes.
 */
function getFreeClassPagesFilePath(): string {
  return path.join(process.cwd(), "data", "views", "freeclass_pages.jsonc");
}

/* -------------------------------------------------------------------------- */
/* Loader interno: mapa completo                                              */
/* -------------------------------------------------------------------------- */

/**
 * Carga y valida el mapa completo de FreeClassPage desde JSONC.
 * Errores de estructura o consistencia se consideran errores de configuración.
 */
export async function loadFreeClassPagesMap(): Promise<FreeClassPageMap> {
  const filePath = getFreeClassPagesFilePath();
  const raw = await fs.readFile(filePath, "utf8");

  const parsed = parseJsonc(raw) as unknown;

  const result = FreeClassPageMapSchema.safeParse(parsed);
  if (!result.success) {
    const formatted = formatZodError(result.error);
    throw new Error(
      `Error al validar data/views/freeclass_pages.jsonc:\n${formatted}`,
    );
  }

  const map = result.data;

  // QA adicional: la key del mapa debe coincidir con page.sku
  const slugToSku = new Map<string, string>();

  Object.entries(map).forEach(([key, page]: [string, FreeClassPage]) => {
    if (page.sku !== key) {
      throw new Error(
        `Inconsistencia en freeclass_pages.jsonc: key="${key}" pero page.sku="${page.sku}". Deben coincidir.`,
      );
    }

    const slug = page.slugLanding;
    const existingSku = slugToSku.get(slug);

    if (existingSku && existingSku !== page.sku) {
      throw new Error(
        `Slug de landing duplicado en freeclass_pages.jsonc: slugLanding="${slug}" usado por "${existingSku}" y "${page.sku}". Debe ser único.`,
      );
    }

    slugToSku.set(slug, page.sku);
  });

  return map;
}

/* -------------------------------------------------------------------------- */
/* Loaders públicos                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Devuelve la FreeClassPage asociada a un SKU.
 * Si el SKU no existe en el JSONC, retorna null.
 */
export async function loadFreeClassPageBySku(
  sku: string,
): Promise<FreeClassPage | null> {
  const map = await loadFreeClassPagesMap();
  const page = map[sku];

  if (!page) {
    return null;
  }

  return page;
}

/**
 * Devuelve la FreeClassPage asociada a un slugLanding.
 * Si el slugLanding no existe en el JSONC, retorna null.
 */
export async function loadFreeClassPageBySlug(
  slugLanding: string,
): Promise<FreeClassPage | null> {
  const map = await loadFreeClassPagesMap();

  const pages = Object.values(map);
  const found = pages.find(
    (page: FreeClassPage) => page.slugLanding === slugLanding,
  );

  if (!found) {
    return null;
  }

  return found;
}
