// lib/seo/schemas/jsonLdTypes.ts
// Infraestructura base de tipos para JSON-LD en LOBRÁ.
// Estos tipos son contratos genéricos que usarán los builders de Schemas.

import type { ModuleDetail } from "@/lib/modules/loadModuleDetail";

/**
 * Objeto base JSON-LD.
 */
export interface JsonLdObject {
  "@context"?: string | JsonLdObject | Array<string | JsonLdObject>;
  "@type": string | string[];
  "@id"?: string;
  [key: string]: unknown;
}

/**
 * Entrada mínima para schemas de un webinar.
 */
export interface SchemaWebinarInput {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDateIso: string;
  endDateIso?: string;
  imageUrl?: string;
  sku?: string;
  priceCents?: number;
  priceCurrency?: string;
  isLive: boolean;
  hasReplay: boolean;
}

/**
 * Entrada para schemas de un módulo/curso compuesto.
 * Alias directo del DTO ModuleDetail para evitar duplicar contratos.
 */
export type SchemaModuleInput = ModuleDetail;

/**
 * Entrada para schemas de un servicio (páginas /servicios/*).
 * Pensado para asesorías 1 a 1 y futuros servicios.
 */
export interface SchemaServiceInput {
  /**
   * Identificador interno estable del servicio.
   * Puede alinearse con sku (recomendado) o slug.
   * Ejemplo: "one2one-lobra-rhd-090m-v001".
   */
  id: string;
  /**
   * Slug de la página del servicio (sin el prefijo /servicios/).
   * Ejemplo: "1a1-rhd".
   */
  slug: string;
  /**
   * Nombre del servicio ya normalizado para SEO (sin [[...]]).
   */
  name: string;
  /**
   * Descripción principal del servicio, sin marcadores [[...]].
   */
  description: string;
  /**
   * SKU del servicio en catálogo (Stripe / Supabase).
   */
  sku: string;
  /**
   * Precio en centavos de moneda. Ejemplo: 149000 para 1,490.00 MXN.
   */
  priceCents?: number;
  /**
   * Moneda del precio. Ejemplo: "MXN".
   */
  priceCurrency?: string;
  /**
   * Bandera de disponibilidad general del servicio.
   */
  isActive: boolean;
  /**
   * URL de la imagen principal del servicio (absoluta o relativa).
   */
  imageUrl?: string;
  /**
   * Tipo de servicio. Puede alinearse con serviceType de schema.org
   * o usar texto libre como "FinancialConsulting".
   */
  serviceType?: string;
  /**
   * Zona geográfica atendida. Ejemplo: "Latinoamérica".
   */
  areaServed?: string;
  /**
   * Duración típica de la sesión en minutos, si aplica.
   * Ejemplo: 90 para una asesoría de 90 minutos.
   */
  durationMinutes?: number;
}

/**
 * Persona relevante para schemas (instructor, autor, etc.).
 */
export interface SchemaPerson {
  id: string;
  name: string;
  description?: string;
  jobTitle?: string;
  url?: string;
  imageUrl?: string;
}

/**
 * Item de FAQ usado como base para FAQPage.
 */
export interface SchemaFaqItem {
  question: string;
  answer: string;
}

/**
 * Producto o servicio vendible en el ecosistema.
 */
export interface SchemaProduct {
  id: string;
  name: string;
  description: string;
  sku: string;
  priceCents?: number;
  priceCurrency?: string;
  isActive: boolean;
}

/**
 * Evento para JSON-LD (webinar en vivo, clase, etc.).
 */
export interface SchemaEvent {
  id: string;
  name: string;
  description: string;
  startDateIso: string;
  endDateIso?: string;
  locationName?: string;
  locationAddress?: string;
}

/**
 * Curso o programa educativo para JSON-LD.
 */
export interface SchemaCourse {
  id: string;
  name: string;
  description: string;
  webinarIds?: string[];
  providerId?: string;
}
