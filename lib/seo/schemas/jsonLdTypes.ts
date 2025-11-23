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
