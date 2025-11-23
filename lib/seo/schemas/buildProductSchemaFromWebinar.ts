// lib/seo/schemas/buildProductSchemaFromWebinar.ts
// Builder de JSON-LD Product para páginas de webinars a partir del tipo Webinar.

import type { Webinar } from "@/lib/types/webinars";
import type { SchemaWebinarInput } from "@/lib/seo/schemas/buildEventSchemaFromWebinar";

// Tipo del objeto Product que este builder devuelve.
// @context y @graph se agregan a nivel global en la infraestructura de schemas.
export interface ProductSchema {
  "@type": "Product";
  name: string;
  description: string;
  sku: string;
  offers: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
    availability: "https://schema.org/InStock" | "https://schema.org/PreOrder";
    url: string;
  };
}

/**
 * buildProductSchemaFromWebinar
 * Builder principal para el schema Product de un webinar.
 * - Recibe el contrato completo Webinar.
 * - Internamente mapea a SchemaWebinarInput (lógica local, desacoplada de origen).
 * - Aplica reglas de negocio para precio, disponibilidad y descripción.
 * - Si el webinar no está en catálogo, devuelve null (no se genera Product).
 */
export function buildProductSchemaFromWebinar(
  webinar: Webinar,
  now: Date = new Date()
): ProductSchema | null {
  if (!isWebinarInCatalog(webinar)) {
    // Regla AI-first: si no hay datos mínimos de venta, no se expone Product.
    return null;
  }

  const input = mapWebinarToSchemaInputForProduct(webinar);

  // Normalizamos precio y moneda desde shared.pricing.
  const { price, priceCurrency } = resolvePrice(webinar);

  // Disponibilidad basada en la fecha del webinar.
  const availability = resolveAvailability(webinar.shared.startAt, now);

  const description = resolveProductDescription(input, webinar);
  const sku = resolveSku(webinar);

  // Si por alguna razón crítica no tenemos canonical o sku, omitimos Product.
  if (!input.seoCanonical || !sku) {
    return null;
  }

  return {
    "@type": "Product",
    name: input.seoTitle,
    description,
    sku,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency,
      availability,
      url: input.seoCanonical,
    },
  };
}

/**
 * isWebinarInCatalog
 * Determina si el webinar tiene datos mínimos para considerarse "en catálogo".
 * - Debe tener bloque sales con canonical.
 * - Debe tener pricing con amountCents > 0 y currency no vacía.
 */
function isWebinarInCatalog(webinar: Webinar): boolean {
  const canonical = webinar.sales?.seo.canonical ?? "";
  const pricing = webinar.shared.pricing;

  if (!canonical.trim()) return false;
  if (!pricing) return false;
  if (!Number.isFinite(pricing.amountCents) || pricing.amountCents <= 0) {
    return false;
  }
  if (!pricing.currency || !pricing.currency.trim()) {
    return false;
  }

  return true;
}

/**
 * mapWebinarToSchemaInputForProduct
 * Mapea Webinar hacia SchemaWebinarInput con la misma lógica de Event:
 * - seoTitle ← sales.seo.title || shared.title
 * - seoDescription ← sales.seo.description || ""
 * - seoCanonical ← sales.seo.canonical || ""
 */
function mapWebinarToSchemaInputForProduct(
  webinar: Webinar
): SchemaWebinarInput {
  const seoTitle = webinar.sales?.seo.title ?? webinar.shared.title;
  const seoDescription = webinar.sales?.seo.description ?? "";
  const seoCanonical = webinar.sales?.seo.canonical ?? "";

  return {
    slug: webinar.shared.slug,
    seoTitle,
    seoDescription,
    seoCanonical,
    startAt: webinar.shared.startAt,
    durationMin: webinar.shared.durationMin,
  };
}

/**
 * resolveProductDescription
 * Reutiliza la misma prioridad conceptual que Event:
 * 1) sales.seo.description
 * 2) shared.subtitle
 * 3) sales.hero.subtitle
 * 4) seoTitle (último recurso)
 */
function resolveProductDescription(
  input: SchemaWebinarInput,
  webinar: Webinar
): string {
  const trimmedSeoDescription = (input.seoDescription ?? "").trim();
  if (trimmedSeoDescription.length > 0) {
    return trimmedSeoDescription;
  }

  const sharedSubtitle = webinar.shared.subtitle ?? "";
  if (sharedSubtitle.trim().length > 0) {
    return sharedSubtitle.trim();
  }

  const heroSubtitle = webinar.sales?.hero.subtitle ?? "";
  if (heroSubtitle.trim().length > 0) {
    return heroSubtitle.trim();
  }

  return input.seoTitle;
}

/**
 * resolvePrice
 * Convierte amountCents a precio legible para schema.org.
 * - Usa shared.pricing.amountCents / 100.
 * - Devuelve price como string sin formateo de moneda.
 * - priceCurrency se toma directamente de shared.pricing.currency
 *   con fallback explícito a "MXN".
 */
function resolvePrice(webinar: Webinar): {
  price: string;
  priceCurrency: string;
} {
  const { amountCents, currency } = webinar.shared.pricing;

  const normalizedPrice =
    Number.isFinite(amountCents) && amountCents > 0
      ? amountCents / 100
      : 0;

  const price = normalizedPrice.toString();
  const priceCurrency = (currency || "MXN").trim() || "MXN";

  return { price, priceCurrency };
}

/**
 * resolveAvailability
 * Determina availability según la fecha del webinar:
 * - InStock: startAt en el futuro.
 * - PreOrder: sin próxima fecha (startAt pasado o inválido).
 */
function resolveAvailability(
  startAtIso: string,
  now: Date
): ProductSchema["offers"]["availability"] {
  const startTime = Date.parse(startAtIso);
  const nowTime = now.getTime();

  if (Number.isNaN(startTime)) {
    // Si no podemos interpretar la fecha, optamos por PreOrder (más conservador).
    return "https://schema.org/PreOrder";
  }

  if (startTime > nowTime) {
    return "https://schema.org/InStock";
  }

  return "https://schema.org/PreOrder";
}

/**
 * resolveSku
 * Prioridad de sku para Product:
 * 1) shared.pricing.sku
 * 2) shared.sku
 */
function resolveSku(webinar: Webinar): string {
  const pricingSku = webinar.shared.pricing.sku?.trim();
  if (pricingSku) {
    return pricingSku;
  }

  return webinar.shared.sku?.trim() ?? "";
}
