// lib/seo/schemas/buildSchemasForModule.ts
// Builder de JSON-LD para páginas de Módulo/Curso compuesto.
// Genera Course, Product y FAQPage (si aplica) a partir de SchemaModuleInput.

import type {
  JsonLdObject,
  SchemaModuleInput,
  SchemaPerson,
  SchemaFaqItem,
} from "./jsonLdTypes";
import { buildAbsoluteUrl } from "./schemaUrlUtils";

/* -------------------------------------------------------------------------- */
/* Constantes internas                                                        */
/* -------------------------------------------------------------------------- */

// @id global de la organización LOBRÁ (definido en la capa 02B).
const ORG_ID = "https://lobra.net/#organization";

// @id por defecto del instructor principal si no se recibe nada en props.
const DEFAULT_INSTRUCTOR_ID = "https://lobra.net/#person-roberto";

// Mapeo de niveles internos → etiquetas estándar para SEO.
const EDUCATIONAL_LEVEL_MAP: Record<string, string> = {
  Fundamentos: "Beginner",
  "Profundización": "Intermediate",
  Impacto: "Advanced",
};

// Orden lógico para el array final de educationalLevel.
const EDUCATIONAL_LEVEL_ORDER = ["Beginner", "Intermediate", "Advanced"] as const;

/* -------------------------------------------------------------------------- */
/* Utilidades internas                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Elimina marcas [[...]] usadas en copies emocionales.
 */
function stripEmphasisMarkers(value: string): string {
  return value.replace(/\[\[|\]\]/g, "").trim();
}

/**
 * Normaliza un array de strings:
 * - elimina marcadores [[...]]
 * - recorta a maxLength
 * - elimina duplicados vacíos
 * - limita la cantidad total.
 */
function normalizeStringArray(
  items: string[] | undefined,
  options: { maxItems: number; maxLength: number }
): string[] {
  if (!items || items.length === 0) return [];

  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of items) {
    const cleaned = stripEmphasisMarkers(raw).slice(0, options.maxLength).trim();
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
    if (result.length >= options.maxItems) break;
  }

  return result;
}

/**
 * Construye la lista de niveles educativos estándar a partir de los hijos.
 */
function buildEducationalLevel(data: SchemaModuleInput): string[] | undefined {
  if (!Array.isArray(data.children) || data.children.length === 0) {
    return undefined;
  }

  const mapped = new Set<string>();

  for (const child of data.children) {
    const rawLevel = (child as { level?: unknown }).level;
    if (typeof rawLevel !== "string") continue;
    const mappedLevel = EDUCATIONAL_LEVEL_MAP[rawLevel];
    if (!mappedLevel) continue;
    mapped.add(mappedLevel);
  }

  if (mapped.size === 0) return undefined;

  const ordered: string[] = [];

  for (const levelKey of EDUCATIONAL_LEVEL_ORDER) {
    if (mapped.has(levelKey)) {
      ordered.push(levelKey);
    }
  }

  return ordered.length > 0 ? ordered : undefined;
}

/**
 * Calcula timeRequired en formato ISO 8601 a partir de la estructura del módulo.
 * Regla v1: cada hijo de tipo live_class se considera de 90 minutos.
 */
function buildTimeRequired(data: SchemaModuleInput): string | undefined {
  if (!Array.isArray(data.children) || data.children.length === 0) {
    return undefined;
  }

  const liveClassChildren = data.children.filter(
    (child) => (child as { fulfillmentType?: unknown }).fulfillmentType === "live_class"
  );

  if (liveClassChildren.length === 0) {
    return undefined;
  }

  const minutesPerLiveClass = 90;
  const totalMinutes = liveClassChildren.length * minutesPerLiveClass;

  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return undefined;
  }

  return `PT${totalMinutes}M`;
}

/**
 * Construye la lista de "teaches" a partir de sales.aprendizaje.
 */
function buildTeaches(data: SchemaModuleInput): string[] | undefined {
  const sales = (data as { sales?: { aprendizaje?: string[] } }).sales;
  const aprendizaje = sales?.aprendizaje;

  const teaches = normalizeStringArray(aprendizaje, {
    maxItems: 8,
    maxLength: 120,
  });

  return teaches.length > 0 ? teaches : undefined;
}

/**
 * Devuelve la URL absoluta de la imagen principal del módulo si existe.
 */
function getModuleImageAbsoluteUrl(
  data: SchemaModuleInput,
  canonical: string
): string | undefined {
  const sales = (data as { sales?: { hero?: { image?: { src?: string | null } } } }).sales;
  const src = sales?.hero?.image?.src;

  if (!src) return undefined;

  return buildAbsoluteUrl(canonical, src);
}

/**
 * Determina el instructor principal a partir de la lista recibida,
 * con un fallback interno a la persona principal.
 */
function resolveInstructorId(instructorIds: string[]): string {
  if (Array.isArray(instructorIds) && instructorIds.length > 0) {
    return instructorIds[0];
  }
  return DEFAULT_INSTRUCTOR_ID;
}

/* -------------------------------------------------------------------------- */
/* Builders específicos                                                       */
/* -------------------------------------------------------------------------- */

function buildCourseSchema(params: {
  data: SchemaModuleInput;
  canonical: string;
  instructorIds: string[];
}): JsonLdObject {
  const { data, canonical, instructorIds } = params;

  const sales = (data as { sales?: { seo?: { title?: string; description?: string } } }).sales;
  const seoTitle = sales?.seo?.title ?? data.title;
  const seoDescription =
    sales?.seo?.description ??
    sales?.seo?.title ??
    data.title;

  const educationalLevel = buildEducationalLevel(data);
  const timeRequired = buildTimeRequired(data);
  const teaches = buildTeaches(data);
  const imageUrl = getModuleImageAbsoluteUrl(data, canonical);
  const instructorId = resolveInstructorId(instructorIds);

  const courseSchema: JsonLdObject = {
    "@type": "Course",
    name: seoTitle,
    description: seoDescription,
    provider: {
      "@id": ORG_ID,
    },
    instructor: {
      "@id": instructorId,
    },
    learningResourceType: "OnlineCourse",
    ...(educationalLevel ? { educationalLevel } : {}),
    ...(timeRequired ? { timeRequired } : {}),
    ...(teaches ? { teaches } : {}),
    ...(imageUrl ? { image: imageUrl } : {}),
  };

  return courseSchema;
}

function buildProductSchema(params: {
  data: SchemaModuleInput;
  canonical: string;
}): JsonLdObject {
  const { data, canonical } = params;

  const sales = (data as {
    sales?: {
      seo?: { title?: string; description?: string };
      hero?: { image?: { src?: string | null } };
    };
  }).sales;

  const seoTitle = sales?.seo?.title ?? data.title;
  const seoDescription =
    sales?.seo?.description ??
    sales?.seo?.title ??
    data.title;

  const imageUrl = getModuleImageAbsoluteUrl(data, canonical);

  const pricing = (data as {
    pricing?: { amountCents?: number; currency?: string };
  }).pricing;

  if (!pricing || typeof pricing.amountCents !== "number" || !pricing.currency) {
    throw new Error(
      `buildProductSchema: pricing inválido o ausente para módulo sku="${data.sku}"`
    );
  }

  const priceNumber = pricing.amountCents / 100;

  const productSchema: JsonLdObject = {
    "@type": "Product",
    name: seoTitle,
    description: seoDescription,
    sku: data.sku,
    ...(imageUrl ? { image: imageUrl } : {}),
    offers: {
      "@type": "Offer",
      price: priceNumber,
      priceCurrency: pricing.currency,
      availability: "https://schema.org/InStock",
      url: canonical,
    },
  };

  return productSchema;
}

function buildFaqSchema(faqItems: SchemaFaqItem[]): JsonLdObject | null {
  if (!Array.isArray(faqItems) || faqItems.length === 0) {
    return null;
  }

  const limited = faqItems.slice(0, 6);

  const mainEntity = limited
    .map((item) => {
      const question = stripEmphasisMarkers(item.question).slice(0, 160).trim();
      const answer = stripEmphasisMarkers(item.answer).trim();

      if (!question || !answer) {
        return null;
      }

      return {
        "@type": "Question",
        name: question,
        acceptedAnswer: {
          "@type": "Answer",
          text: answer,
        },
      };
    })
    .filter((entity): entity is NonNullable<typeof entity> => entity !== null);

  if (mainEntity.length === 0) {
    return null;
  }

  const faqSchema: JsonLdObject = {
    "@type": "FAQPage",
    mainEntity,
  };

  return faqSchema;
}

/* -------------------------------------------------------------------------- */
/* Builder principal exportado                                                */
/* -------------------------------------------------------------------------- */

/**
 * Crea los schemas JSON-LD asociados a un módulo/curso compuesto.
 * Integra Course, Product y FAQPage (si hay items).
 * No genera Organization ni Person; solo los referencia por @id.
 */
export function buildSchemasForModule(params: {
  data: SchemaModuleInput;
  canonical: string;
  instructorIds: string[];
  faqItems?: SchemaFaqItem[];
  instructors?: SchemaPerson[]; // reservado para futuras extensiones
}): JsonLdObject[] {
  const { data, canonical, instructorIds, faqItems } = params;

  const schemas: JsonLdObject[] = [];

  // Course
  schemas.push(
    buildCourseSchema({
      data,
      canonical,
      instructorIds,
    })
  );

  // Product
  schemas.push(
    buildProductSchema({
      data,
      canonical,
    })
  );

  // FAQPage (solo si se reciben FAQ items estructurados)
  if (faqItems && faqItems.length > 0) {
    const faqSchema = buildFaqSchema(faqItems);
    if (faqSchema) {
      schemas.push(faqSchema);
    }
  }

  return schemas;
}
