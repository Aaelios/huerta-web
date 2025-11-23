// lib/seo/schemas/buildSchemasForWebinar.ts
// Skeleton del builder de schemas para un Webinar.
// Solo infraestructura: firma, tipos y estructura general. Sin lógica de negocio.

import type {
  JsonLdObject,
  SchemaWebinarInput,
  SchemaPerson,
  SchemaFaqItem,
} from "./jsonLdTypes";

/**
 * Crea los schemas JSON-LD asociados a un webinar.
 * Infraestructura base: no genera schemas reales todavía.
 */
export function buildSchemasForWebinar(params: {
  data: SchemaWebinarInput;
  canonical: string;
  instructorIds: string[];
  faqItems?: SchemaFaqItem[];
  instructors?: SchemaPerson[]; // opcional para fases posteriores
}): JsonLdObject[] {
  const { data, canonical, instructorIds, faqItems } = params;

  // No implementar lógica aquí. Este es solo el esqueleto estructural.
  // Los sub-bloques 02B–02E construirán los objetos JSON-LD reales.

  const schemas: JsonLdObject[] = [];

  // Lugar reservado para Event, Product, FAQPage, etc. en fases posteriores.
  // schemas.push(...);

  return schemas;
}
