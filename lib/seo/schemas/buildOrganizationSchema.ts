// lib/seo/schemas/buildOrganizationSchema.ts
// Builder del schema global "Organization" para LOBRÁ.
// Recibe una configuración tipada y devuelve un JsonLdObject listo para mergeSchemas.

/* eslint-disable @typescript-eslint/consistent-type-definitions */
import type { JsonLdObject } from "@/lib/seo/schemas/jsonLdTypes";

/**
 * Configuración mínima para construir el JSON-LD de Organization.
 * La capa de datos (JSONC / Supabase) debe mapear sus campos a esta estructura.
 */
export interface OrganizationEntityConfig {
  name: string;
  legalName?: string;
  url: string;
  logo: string;
  /**
   * Identificador estable para la entidad en JSON-LD.
   * Normalmente algo como "https://lobra.net/#organization".
   */
  id?: string;
  /**
   * Lista de URLs oficiales de la marca en otras plataformas.
   * Deben ser URLs absolutas (Instagram, YouTube, LinkedIn, etc.).
   */
  sameAs?: string[];
}

/**
 * buildOrganizationSchema
 * Construye el objeto JSON-LD de tipo "Organization" a partir de la configuración global.
 * No realiza I/O ni lectura de archivos; es un builder puro y determinista.
 */
export function buildOrganizationSchema(config: OrganizationEntityConfig): JsonLdObject {
  // Normalizar sameAs: quitar espacios y descartar entradas vacías.
  const sameAs = (config.sameAs ?? [])
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  // Objeto base de Organization. Solo incluimos campos obligatorios aquí.
  const organization: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: config.name,
    url: config.url,
    logo: config.logo,
  };

  // @id se agrega solo si viene definido en la configuración.
  if (config.id) {
    organization["@id"] = config.id;
  }

  // legalName es opcional; si no existe, el campo no se incluye.
  if (config.legalName) {
    organization.legalName = config.legalName;
  }

  // sameAs solo se agrega si hay al menos una URL válida.
  if (sameAs.length > 0) {
    organization.sameAs = sameAs;
  }

  return organization;
}
