// lib/seo/schemas/buildSchemasForWebinar.ts
// Builder compuesto de schemas para un Webinar (Event + Product + Person + FAQ).
// Usa SchemaWebinarInput como DTO normalizado y se integra con la infraestructura global.

import type {
  JsonLdObject,
  SchemaWebinarInput,
  SchemaPerson,
  SchemaFaqItem,
} from "./jsonLdTypes";
import { getOriginFromCanonical } from "./schemaUrlUtils";
import { buildEventSchemaFromWebinar } from "./buildEventSchemaFromWebinar";
import { buildProductSchemaFromWebinar } from "./buildProductSchemaFromWebinar";

/**
 * buildSchemasForWebinar
 * Crea los schemas JSON-LD asociados a un webinar individual:
 * - Event (si tiene fecha vigente)
 * - Product (si está en catálogo)
 * - Person (instructor/es)
 * - FAQPage (si hay items)
 *
 * No agrega @context, Organization ni WebSite.
 * Eso vive en la infraestructura global (02A / layout).
 */
export function buildSchemasForWebinar(params: {
  data: SchemaWebinarInput;
  canonical: string;
  instructorIds: string[];
  faqItems?: SchemaFaqItem[];
  instructors?: SchemaPerson[]; // opcional
  now?: Date;
}): JsonLdObject[] {
  const { data, canonical, instructorIds, faqItems, instructors, now } = params;

  const trimmedCanonical = canonical.trim();
  if (!trimmedCanonical) {
    return [];
  }

  const schemas: JsonLdObject[] = [];

  // Event
  const event = buildEventSchemaFromWebinar({
    data,
    canonical: trimmedCanonical,
    now,
  });

  // Product
  const product = buildProductSchemaFromWebinar({
    data,
    canonical: trimmedCanonical,
    now,
  });

  // Persons (instructores / autor)
  const personSchemas = buildPersonSchemas({
    canonical: trimmedCanonical,
    instructorIds,
    instructors: instructors ?? [],
  });

  // Vincular Event → Person vía performer (por @id) si ambos existen.
  if (event && personSchemas.length > 0) {
    const performer = personSchemas
      .map((p) => p["@id"])
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (performer.length > 0) {
      (event as unknown as JsonLdObject)["performer"] = performer.map((id) => ({
        "@id": id,
      }));
    }
  }

  if (event) schemas.push(event as unknown as JsonLdObject);
  if (product) schemas.push(product as unknown as JsonLdObject);
  schemas.push(...personSchemas);

  // FAQPage (opcional)
  const faqPage = buildFaqSchema(trimmedCanonical, faqItems ?? []);
  if (faqPage) {
    schemas.push(faqPage);
  }

  return schemas;
}

/* -------------------------------------------------------------------------- */
/* Person Schema                                                              */
/* -------------------------------------------------------------------------- */

/**
 * buildPersonSchemas
 * Crea nodos Person a partir de instructorIds + catálogo de instructors.
 * - No inventa personas: solo genera nodos si encuentra matching por id.
 */
function buildPersonSchemas(params: {
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
      // Fallback razonable: la propia página del webinar.
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
 * buildPersonId
 * @id para Person: origin + "#person-{id}"
 * Ejemplo: https://lobra.net/#person-rhd
 */
function buildPersonId(origin: string, id: string): string {
  const safeId = id || "instructor";
  return `${origin}#person-${safeId}`;
}

/* -------------------------------------------------------------------------- */
/* FAQPage Schema                                                             */
/* -------------------------------------------------------------------------- */

/**
 * buildFaqSchema
 * Crea un nodo FAQPage si hay al menos un item válido.
 * - @id = canonical#faq
 * - Cada pregunta recibe su propio @id derivado del índice.
 */
function buildFaqSchema(
  canonical: string,
  faqItems: SchemaFaqItem[]
): JsonLdObject | null {
  if (!faqItems.length) return null;

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
