// lib/modules/loadModulesIndex.ts
// Loader de índice de módulos (bundles) para rutas públicas y sitemap.
// Lee productos tipo "bundle" desde Supabase y expone solo los campos necesarios.

import type { PostgrestResponse } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase/server";

/* -------------------------------------------------------------------------- */
/* Tipos                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Fila mínima de products necesaria para construir el índice de módulos.
 */
type DbProductModuleIndexRow = {
  sku: string;
  page_slug: string | null;
  status: string;
  fulfillment_type: string;
  updated_at: string | null;
};

/**
 * DTO expuesto hacia el resto del sistema (sitemap, listados, etc.).
 */
export type ModuleIndexItem = {
  sku: string;
  pageSlug: string;
  updatedAt: string | null;
};

/* -------------------------------------------------------------------------- */
/* Loader principal                                                            */
/* -------------------------------------------------------------------------- */

/**
 * loadModulesIndex
 *
 * - Obtiene todos los productos tipo bundle (módulos/cursos) visibles en catálogo.
 * - Filtra por estados indexables (status IN active, sunsetting).
 * - Descarta registros sin page_slug (no tienen landing pública).
 * - Devuelve un arreglo tipado listo para usos como sitemap o listados.
 *
 * Nota:
 * - No asume ningún prefijo específico en pageSlug. El valor se respeta tal
 *   como viene de la columna page_slug (ej. "webinars/ms-tranquilidad-financiera").
 */
export async function loadModulesIndex(): Promise<ModuleIndexItem[]> {
  const client = getServiceClient();

  const { data, error } = (await client
    .from("products")
    .select("sku,page_slug,status,fulfillment_type,updated_at")
    .in("status", ["active", "sunsetting"])
    .eq("fulfillment_type", "bundle")) as PostgrestResponse<DbProductModuleIndexRow>;

  if (error) {
    // Error de Supabase debe tratarse como 500 aguas arriba.
    throw new Error(`Error al cargar índice de módulos desde products: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Solo consideramos módulos con page_slug definido (tienen URL pública).
  const items: ModuleIndexItem[] = data
    .filter((row) => row.page_slug !== null)
    .map((row) => ({
      sku: row.sku,
      pageSlug: row.page_slug as string,
      updatedAt: row.updated_at,
    }));

  return items;
}
