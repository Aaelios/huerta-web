// lib/webinars/f_composeWebinar.ts

/**
 * Módulo — f_composeWebinar
 * Punto único de composición del sistema.
 *
 * Responsabilidad:
 * - Unir datos operativos (Supabase) + datos editoriales (JSON)
 * - Construir el objeto Webinar final consumido por UI
 *
 * Reglas:
 * - Supabase manda en identidad (slug, sku, title)
 * - Supabase manda en pricing
 * - JSON solo aporta contenido editorial
 * - No hay fallback silencioso
 * - No hace fetch, lookup ni cache
 *
 * Input:
 * - ProductOperationalData (Supabase)
 * - Webinar (editorial JSON ya validado)
 *
 * Output:
 * - Webinar (view model final)
 */

import type { Webinar } from "@/lib/types/webinars";

/**
 * Shape mínimo operativo derivado de Supabase
 * (alineado a m_catalogo + m_precios)
 */
export type ProductOperationalData = {
  sku: string;
  name: string;
  page_slug: string;
  status: string | null;
  pricing: {
    price_cents: number | null;
    currency: string | null;
    stripe_price_id?: string | null;
  };
};

/**
 * Extrae el slug corto desde page_slug
 * Ej:
 * - webinars/w-ingresos → w-ingresos
 * - servicios/1a1-rhd → 1a1-rhd
 */
function f_getSlugFromPageSlug(pageSlug: string): string {
  if (!pageSlug || typeof pageSlug !== "string") {
    throw new Error("Invalid page_slug");
  }

  const parts = pageSlug.split("/").filter(Boolean);

  if (parts.length === 0) {
    throw new Error(`Cannot derive slug from page_slug: "${pageSlug}"`);
  }

  return parts[parts.length - 1];
}

/**
 * f_composeWebinar
 *
 * Aplica reglas de composición:
 * - identidad desde Supabase
 * - pricing desde Supabase
 * - contenido desde JSON
 */
export function f_composeWebinar(
  operational: ProductOperationalData,
  editorial: Webinar
): Webinar {
  // ---------------------------
  // Validaciones base
  // ---------------------------

  if (!operational) {
    throw new Error("Missing operational data");
  }

  if (!editorial) {
    throw new Error("Missing editorial data");
  }

  if (!operational.sku) {
    throw new Error("Missing operational.sku");
  }

  if (!operational.name) {
    throw new Error(`Missing operational.name for sku "${operational.sku}"`);
  }

  if (!operational.page_slug) {
    throw new Error(`Missing page_slug for sku "${operational.sku}"`);
  }

  if (!operational.pricing) {
    throw new Error(`Missing pricing for sku "${operational.sku}"`);
  }

  // ---------------------------
  // Derivaciones operativas
  // ---------------------------

  const slug = f_getSlugFromPageSlug(operational.page_slug);

  const amount = operational.pricing.price_cents;
  const currency = operational.pricing.currency;

  if (amount == null || currency == null) {
    throw new Error(`Invalid pricing for sku "${operational.sku}"`);
  }

  // ---------------------------
  // Composición final
  // ---------------------------

  return {
    ...editorial,

    shared: {
      ...editorial.shared,

      // Identidad (Supabase manda)
      slug,
      sku: operational.sku,
      title: operational.name,

      // Pricing (Supabase manda)
      pricing: {
        ...editorial.shared.pricing,
        sku: operational.sku,
        amountCents: amount,
        currency,
      },
    },
  };
}