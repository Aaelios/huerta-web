// lib/seo/schemas/buildProductSchemaFromWebinar.ts
// Builder de JSON-LD Product para páginas de webinars a partir de SchemaWebinarInput.

import type { SchemaWebinarInput } from "./jsonLdTypes";

/**
 * Tipo del objeto Product que este builder devuelve.
 * @context y @graph se agregan a nivel global en la infraestructura de schemas.
 */
export interface ProductSchema {
  "@type": "Product";
  "@id": string;
  name: string;
  description: string;
  sku: string;
  image?: string;
  offers: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
    availability: "https://schema.org/InStock" | "https://schema.org/PreOrder";
    url: string;
  };
}

/**
 * El contenido de marketing usa [[...]] para énfasis visual.
 * Para JSON-LD los limpiamos para evitar ruido en SEO.
 */
function stripEmphasisMarkers(text: string): string {
  return text.replace(/\[\[/g, "").replace(/\]\]/g, "");
}

/**
 * buildProductSchemaFromWebinar
 * Builder principal para el schema Product de un webinar.
 *
 * Reglas:
 * - Usa SchemaWebinarInput (DTO ya normalizado por 02G).
 * - Requiere canonical no vacío, sku y pricing válido.
 * - Product puede existir incluso si el Event ya no es relevante.
 */
export function buildProductSchemaFromWebinar(params: {
  data: SchemaWebinarInput;
  canonical: string;
  now?: Date;
}): ProductSchema | null {
  const { data, canonical, now = new Date() } = params;

  const trimmedCanonical = canonical.trim();
  if (!trimmedCanonical) {
    return null;
  }

  // Validación mínima de catálogo.
  if (!isInCatalog(data)) {
    return null;
  }

  const sku = resolveSku(data);
  if (!sku) {
    return null;
  }

  const { price, priceCurrency } = resolvePrice(data);
  if (price === "0") {
    // Sin precio útil no tiene sentido exponer Product.
    return null;
  }

  const description = resolveDescription(data);
  const availability = resolveAvailability(data.startDateIso, now);

  const base: ProductSchema = {
    "@type": "Product",
    "@id": buildProductId(trimmedCanonical, data.slug),
    name: stripEmphasisMarkers(data.title),
    description,
    sku,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency,
      availability,
      url: trimmedCanonical,
    },
  };

  if (data.imageUrl && data.imageUrl.trim().length > 0) {
    base.image = data.imageUrl.trim();
  }

  return base;
}

/**
 * buildProductId
 * Construye el @id del Product a partir del canonical y el slug.
 * Regla: @id = canonical + "#product-{slug}".
 */
function buildProductId(canonical: string, slug: string): string {
  const safeSlug = slug || "webinar";
  return `${canonical}#product-${safeSlug}`;
}

/**
 * isInCatalog
 * Determina si la entrada tiene datos mínimos para considerarse "en catálogo".
 * - Debe tener priceCents > 0
 * - Debe tener priceCurrency no vacío
 */
function isInCatalog(data: SchemaWebinarInput): boolean {
  const { priceCents, priceCurrency } = data;

  if (!Number.isFinite(priceCents ?? NaN) || (priceCents ?? 0) <= 0) {
    return false;
  }

  if (!priceCurrency || !priceCurrency.trim()) {
    return false;
  }

  return true;
}

/**
 * resolveSku
 * Prioridad de sku para Product:
 * 1) data.sku
 * 2) data.id
 * 3) data.slug
 */
function resolveSku(data: SchemaWebinarInput): string {
  const fromSku = (data.sku ?? "").trim();
  if (fromSku) return fromSku;

  const fromId = (data.id ?? "").trim();
  if (fromId) return fromId;

  return (data.slug ?? "").trim();
}

/**
 * resolvePrice
 * Convierte priceCents a precio legible para schema.org.
 * - Usa data.priceCents / 100.
 * - Devuelve price como string sin formateo de moneda.
 * - priceCurrency se toma de data.priceCurrency con fallback a "MXN".
 */
function resolvePrice(data: SchemaWebinarInput): {
  price: string;
  priceCurrency: string;
} {
  const cents = data.priceCents ?? 0;

  const normalizedPrice =
    Number.isFinite(cents) && cents > 0 ? cents / 100 : 0;

  const price = normalizedPrice.toString();
  const priceCurrency = (data.priceCurrency || "MXN").trim() || "MXN";

  return { price, priceCurrency };
}

/**
 * resolveAvailability
 * Determina availability según la fecha del webinar:
 * - InStock: startDateIso en el futuro.
 * - PreOrder: sin próxima fecha (startDateIso pasado o inválido).
 *
 * Nota: para programas o 1 a 1 que compartan este DTO,
 * la fecha se sigue usando como referencia conservadora.
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
 * resolveDescription
 * Usa la descripción ya normalizada en SchemaWebinarInput.
 * Si viene vacía, cae a title como último recurso.
 * Siempre limpia los marcadores [[...]].
 */
function resolveDescription(data: SchemaWebinarInput): string {
  const descRaw = data.description ?? "";
  const desc = stripEmphasisMarkers(descRaw).trim();
  if (desc.length > 0) {
    return desc;
  }
  return stripEmphasisMarkers(data.title);
}
