// lib/seo/schemas/buildWebsiteSchema.ts
// Builder del schema global "WebSite" para LOBRÁ.
// Usa configuración tipada del sitio y referencia opcional a la Organization global.

import type { JsonLdObject } from "@/lib/seo/schemas/jsonLdTypes";

/**
 * Configuración de búsqueda interna del sitio.
 * Controla si se expone o no un SearchAction en el JSON-LD.
 */
export interface WebsiteSearchConfig {
  enabled: boolean;
  /**
   * URL base donde vive el buscador interno.
   * Debe ser una URL absoluta, por ejemplo: "https://lobra.net/buscar".
   */
  target: string;
  /**
   * Nombre del parámetro de query que recibe el término de búsqueda real.
   * Ejemplo típico: "q".
   */
  queryParam: string;
}

/**
 * Configuración mínima para construir el JSON-LD de WebSite.
 * La capa de datos (JSONC / Supabase) debe mapear sus campos a esta estructura.
 */
export interface WebsiteEntityConfig {
  name: string;
  url: string;
  /**
   * Identificador estable para el WebSite en JSON-LD.
   * Opcional; solo se usa si necesitas referenciar el WebSite desde otros schemas.
   */
  id?: string;
  /**
   * Configuración de búsqueda interna. Si no está presente o enabled=false,
   * no se genera SearchAction.
   */
  search?: WebsiteSearchConfig;
}

/**
 * buildSearchAction
 * Construye el objeto SearchAction para el JSON-LD de WebSite.
 * Devuelve null si la búsqueda no está habilitada o la configuración es incompleta.
 */
function buildSearchAction(config: WebsiteSearchConfig): JsonLdObject | null {
  if (!config.enabled) {
    return null;
  }

  const trimmedTarget = config.target.trim();
  const trimmedQueryParam = config.queryParam.trim();

  if (!trimmedTarget || !trimmedQueryParam) {
    return null;
  }

  const targetUrl = `${trimmedTarget}?${trimmedQueryParam}={search_term_string}`;

  return {
    "@type": "SearchAction",
    target: targetUrl,
    "query-input": "required name=search_term_string",
  };
}

/**
 * buildWebsiteSchema
 * Construye el objeto JSON-LD de tipo "WebSite" a partir de la configuración global.
 * No realiza I/O ni lectura de archivos; es un builder puro y determinista.
 *
 * @param config       Configuración del sitio (nombre, URL y búsqueda interna).
 * @param publisherId  @id de la Organization global para vincular como publisher.
 */
export function buildWebsiteSchema(
  config: WebsiteEntityConfig,
  publisherId?: string,
): JsonLdObject {
  // Objeto base de WebSite con los campos obligatorios.
  const website: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: config.url,
    name: config.name,
  };

  // @id se agrega solo si viene definido en la configuración.
  if (config.id) {
    website["@id"] = config.id;
  }

  // publisher se referencia por @id para conectar con la Organization global.
  if (publisherId) {
    website.publisher = { "@id": publisherId };
  }

  // SearchAction opcional, según la configuración de búsqueda interna.
  if (config.search) {
    const searchAction = buildSearchAction(config.search);
    if (searchAction) {
      website.potentialAction = searchAction;
    }
  }

  return website;
}
