// lib/seo/schemas/buildSchemasForService.ts
// Builder compuesto de schemas para Servicios (/servicios/*).
// Genera Service, Product y FAQPage (si aplica) a partir de SchemaServiceInput.

import type {
  JsonLdObject,
  SchemaServiceInput,
  SchemaPerson,
  SchemaFaqItem,
} from "./jsonLdTypes";
import { getOriginFromCanonical, buildAbsoluteUrl } from "./schemaUrlUtils";

/* -------------------------------------------------------------------------- */
/* Constantes internas                                                        */
/* -------------------------------------------------------------------------- */

// @id global de la organización LOBRÁ (alineado con 02A / 02B).
const ORG_ID = "https://lobra.net/#organization";

/* -------------------------------------------------------------------------- */
/* Utilidades internas                                                        */
/* -------------------------------------------------------------------------- */

/**
 * El contenido de marketing usa [[...]] para énfasis visual.
 * Para JSON-LD los limpiamos para evitar ruido en SEO.
 */
function stripEmphasisMarkers(text: string): string {
  return text.replace(/\[\[/g, "").replace(/\]\]/g, "");
}

/**
 * Normaliza un texto:
 * - Limpia marcadores [[...]]
 * - recorta espacios
 * - corta a maxLength.
 */
function normalizeText(value: string, maxLength: number): string {
  const cleaned = stripEmphasisMarkers(value ?? "");
  return cleaned.slice(0, maxLength).trim();
}

/**
 * Convierte imageUrl (posiblemente relativa) en absoluta usando el canonical.
 */
function resolveImageUrl(canonical: string, imageUrl?: string): string | undefined {
  if (!imageUrl || !imageUrl.trim()) return undefined;
  return buildAbsoluteUrl(canonical, imageUrl.trim());
}

/**
 * Determina si el servicio está en catálogo con datos mínimos.
 * - Debe ser isActive === true.
 * - Debe tener priceCents > 0 y priceCurrency no vacío.
 */
function isInCatalog(data: SchemaServiceInput): boolean {
  if (!data.isActive) return false;

  const cents = data.priceCents ?? 0;
  if (!Number.isFinite(cents) || cents <= 0) {
    return false;
  }

  const currency = (data.priceCurrency ?? "").trim();
  if (!currency) {
    return false;
  }

  return true;
}

/**
 * Convierte priceCents a precio legible para schema.org.
 * - Usa data.priceCents / 100.
 * - Devuelve price como string.
 * - priceCurrency se toma de data.priceCurrency con fallback a "MXN".
 */
function resolvePrice(data: SchemaServiceInput): {
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
 * ID determinista para Service: canonical#service-{slug}
 */
function buildServiceId(canonical: string, slug: string): string {
  const safeSlug = slug || "service";
  return `${canonical}#service-${safeSlug}`;
}

/**
 * ID determinista para Product: canonical#product-{slug}
 */
function buildProductId(canonical: string, slug: string): string {
  const safeSlug = slug || "service";
  return `${canonical}#product-${safeSlug}`;
}

/**
 * ID determinista para Person: origin#person-{id}
 * Ejemplo: https://lobra.net/#person-roberto
 */
function buildPersonId(origin: string, id: string): string {
  const safeId = id || "instructor";
  return `${origin}#person-${safeId}`;
}

/* -------------------------------------------------------------------------- */
/* Builders específicos                                                       */
/* -------------------------------------------------------------------------- */

/**
 * buildServiceSchema
 * Crea el nodo principal Service para el catálogo de servicios.
 *
 * No genera Organization ni Person; solo referencia a Organization por @id.
 */
function buildServiceSchema(params: {
  data: SchemaServiceInput;
  canonical: string;
}): JsonLdObject {
  const { data, canonical } = params;

  const name = normalizeText(data.name, 160) || data.name;
  const description = normalizeText(data.description, 320) || data.description;
  const image = resolveImageUrl(canonical, data.imageUrl);

  const serviceSchema: JsonLdObject = {
    "@type": "Service",
    "@id": buildServiceId(canonical, data.slug),
    name,
    description,
    provider: {
      "@id": ORG_ID,
    },
    ...(data.serviceType
      ? { serviceType: normalizeText(data.serviceType, 120) }
      : {}),
    ...(data.areaServed
      ? { areaServed: normalizeText(data.areaServed, 120) }
      : {}),
    ...(typeof data.durationMinutes === "number" && data.durationMinutes > 0
      ? { hoursAvailable: `PT${data.durationMinutes}M` }
      : {}),
    ...(image ? { image } : {}),
  };

  return serviceSchema;
}

/**
 * buildProductSchemaFromService
 * Crea el nodo Product + Offer asociado a un servicio.
 *
 * No se genera si el servicio no está en catálogo (sin precio útil).
 */
function buildProductSchemaFromService(params: {
  data: SchemaServiceInput;
  canonical: string;
}): JsonLdObject | null {
  const { data, canonical } = params;

  if (!isInCatalog(data)) {
    return null;
  }

  const name = normalizeText(data.name, 160) || data.name;
  const description = normalizeText(data.description, 320) || data.description;
  const image = resolveImageUrl(canonical, data.imageUrl);
  const { price, priceCurrency } = resolvePrice(data);

  if (price === "0") {
    return null;
  }

  const productSchema: JsonLdObject = {
    "@type": "Product",
    "@id": buildProductId(canonical, data.slug),
    name,
    description,
    sku: data.sku,
    ...(image ? { image } : {}),
    offers: {
      "@type": "Offer",
      price,
      priceCurrency,
      availability: data.isActive
        ? "https://schema.org/InStock"
        : "https://schema.org/PreOrder",
      url: canonical,
    },
  };

  return productSchema;
}

/**
 * buildPersonSchemasFromService
 * Crea nodos Person a partir de instructorIds + catálogo de instructors.
 * - No inventa personas: solo genera nodos si encuentra matching por id.
 */
function buildPersonSchemasFromService(params: {
  canonical: string;
  instructorIds: string[];
  instructors: SchemaPerson[];
}): JsonLdObject[] {
  const { canonical, instructorIds, instructors } = params;
  if (!instructorIds.length || !instructors.length) return [];

  const origin = getOriginFromCanonical(canonical);
  const byId = new Map<string, SchemaPerson>();

  for (const person of instructors) {
    if (person.id) {
      byId.set(person.id, person);
    }
  }

  const result: JsonLdObject[] = [];

  for (const instId of instructorIds) {
    const person = byId.get(instId);
    if (!person) continue;

    const schema: JsonLdObject = {
      "@type": "Person",
      "@id": buildPersonId(origin, person.id),
      name: person.name,
    };

    if (person.description && person.description.trim().length > 0) {
      schema.description = person.description.trim();
    }
    if (person.jobTitle && person.jobTitle.trim().length > 0) {
      schema.jobTitle = person.jobTitle.trim();
    }
    if (person.url && person.url.trim().length > 0) {
      schema.url = person.url.trim();
    } else {
      schema.url = canonical;
    }
    if (person.imageUrl && person.imageUrl.trim().length > 0) {
      schema.image = person.imageUrl.trim();
    }

    result.push(schema);
  }

  return result;
}

/**
 * buildFaqSchemaForService
 * Crea un nodo FAQPage si hay al menos un item válido.
 * - @id = canonical#faq
 * - Cada pregunta recibe su propio @id derivado del índice.
 */
function buildFaqSchemaForService(
  canonical: string,
  faqItems: SchemaFaqItem[] | undefined
): JsonLdObject | null {
  if (!faqItems || !faqItems.length) return null;

  const mainEntity = faqItems
    .map((item, index) => {
      const question = (item.question ?? "").trim();
      const answer = (item.answer ?? "").trim();

      if (!question || !answer) {
        return null;
      }

      const q = {
        "@type": "Question",
        "@id": `${canonical}#faq-q${index + 1}`,
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      };

      return q as unknown as JsonLdObject;
    })
    .filter((q): q is JsonLdObject => q !== null);

  if (!mainEntity.length) return null;

  return {
    "@type": "FAQPage",
    "@id": `${canonical}#faq`,
    mainEntity: mainEntity as unknown as JsonLdObject[],
  } as JsonLdObject;
}

/* -------------------------------------------------------------------------- */
/* Builder principal exportado                                                */
/* -------------------------------------------------------------------------- */

/**
 * buildSchemasForService
 * Crea los schemas JSON-LD asociados a un servicio individual:
 * - Service (descriptivo)
 * - Product (si está en catálogo)
 * - Person (instructor/es, opcional)
 * - FAQPage (si se proveen items)
 *
 * No agrega @context, Organization ni WebSite; eso vive en la capa global.
 */
export function buildSchemasForService(params: {
  data: SchemaServiceInput;
  canonical: string;
  instructorIds?: string[];
  faqItems?: SchemaFaqItem[];
  instructors?: SchemaPerson[];
}): JsonLdObject[] {
  const {
    data,
    canonical,
    instructorIds = [],
    faqItems,
    instructors = [],
  } = params;

  const trimmedCanonical = canonical.trim();
  if (!trimmedCanonical) {
    return [];
  }

  const schemas: JsonLdObject[] = [];

  // Service principal
  const service = buildServiceSchema({
    data,
    canonical: trimmedCanonical,
  });
  schemas.push(service);

  // Product (si aplica)
  const product = buildProductSchemaFromService({
    data,
    canonical: trimmedCanonical,
  });
  if (product) {
    schemas.push(product);
  }

  // Persons (opcional)
  const persons = buildPersonSchemasFromService({
    canonical: trimmedCanonical,
    instructorIds,
    instructors,
  });
  if (persons.length > 0) {
    schemas.push(...persons);
  }

  // FAQPage (opcional)
  const faqSchema = buildFaqSchemaForService(trimmedCanonical, faqItems);
  if (faqSchema) {
    schemas.push(faqSchema);
  }

  return schemas;
}
