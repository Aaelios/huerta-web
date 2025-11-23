// lib/seo/seoConfig.ts — Configuración centralizada de tipos y reglas SEO técnicas para LOBRÁ.

import type { Metadata } from "next";

/**
 * Identificadores de tipo de página soportados por el sistema SEO.
 * Deben alinearse con la arquitectura definida en docs/seo/arquitectura_seo_tecnico.md.
 */
export type SeoPageTypeId =
  | "home"
  | "webinars_hub"
  | "webinar"
  | "module"
  | "legal"
  | "static"
  | "contacto"
  | "sobre_mi"
  | "private"
  | "checkout"
  | "thankyou"
  | "landing"
  | "prelobby";

/**
 * Tipo interno para la configuración de robots por tipo de página.
 * Se mantiene simple: solo index/follow. Otros flags se podrán extender en el futuro.
 */
export type SeoRobotsConfig = {
  index: boolean;
  follow: boolean;
};

/**
 * Configuración por tipo de página: títulos por defecto, descripción,
 * tipo de Open Graph y política base de robots.
 */
export type SeoTypeConfig = {
  id: SeoPageTypeId;
  defaultTitle: string;
  defaultDescription: string;
  ogType: "website" | "article";
  robots: SeoRobotsConfig;
};

/**
 * Configuración global SEO: nombre del sitio, dominio canónico,
 * entorno actual y bandera global de noindex.
 */
export type SeoGlobalConfig = {
  siteName: string;
  canonicalOrigin: string;
  defaultLocale: string;
  environment: "development" | "preview" | "production";
  globalNoIndex: boolean;
};

/**
 * Alias local del tipo de robots que espera Next.js en Metadata.
 * Se define como objeto, no como string, para mantener control estricto.
 */
export type MetadataRobots = Exclude<Metadata["robots"], string>;

/**
 * Dominio canónico único del proyecto.
 * La arquitectura especifica que SIEMPRE debe ser https://lobra.net,
 * independientemente del entorno donde se renderice la página.
 */
const CANONICAL_ORIGIN = "https://lobra.net" as const;

/**
 * Nombre corto del sitio. Se usa en títulos y Open Graph.
 */
const SITE_NAME = "LOBRÁ" as const;

/**
 * Resuelve el entorno lógico a partir de VERCEL_ENV.
 * - production → producción real
 * - preview → deploys de preview
 * - cualquier otro valor → development
 */
const resolveEnvironment = (): SeoGlobalConfig["environment"] => {
  const env = process.env.VERCEL_ENV;

  if (env === "production" || env === "preview") {
    return env;
  }

  return "development";
};

/**
 * Entorno actual, calculado una sola vez.
 */
const ENVIRONMENT: SeoGlobalConfig["environment"] = resolveEnvironment();

/**
 * Regla global de noindex:
 * - Solo producción real puede ser indexable.
 * - Preview y development van siempre con noindex global.
 */
const GLOBAL_NO_INDEX = ENVIRONMENT !== "production";

/**
 * Conjunto de tipos de página que NUNCA deben ser indexados,
 * sin posibilidad de override por parte de las páginas.
 *
 * Corresponde a:
 * - Rutas privadas / de cuenta
 * - Checkout y flujos de post-compra
 * - Landings controladas y prelobbies
 */
const HARD_NOINDEX_TYPES = new Set<SeoPageTypeId>([
  "private",
  "checkout",
  "thankyou",
  "landing",
  "prelobby",
]);

/**
 * Configuración global SEO exportada para el resto de librerías.
 */
export const SEO_GLOBAL_CONFIG: SeoGlobalConfig = {
  siteName: SITE_NAME,
  canonicalOrigin: CANONICAL_ORIGIN,
  defaultLocale: "es-MX",
  environment: ENVIRONMENT,
  globalNoIndex: GLOBAL_NO_INDEX,
};

/**
 * Configuración base por tipo de página.
 * Las descripciones son placeholders neutros orientados a claridad técnica,
 * no textos comerciales definitivos.
 *
 * Regla: defaultTitle siempre crudo, sin sufijo de marca ("| LOBRÁ").
 */
export const SEO_TYPE_CONFIG: Record<SeoPageTypeId, SeoTypeConfig> = {
  home: {
    id: "home",
    defaultTitle: "LOBRÁ — Educación financiera para emprendedores",
    defaultDescription:
      "Página principal de LOBRÁ con acceso a recursos y formación financiera para emprendedores.",
    ogType: "website",
    robots: { index: true, follow: true },
  },
  webinars_hub: {
    id: "webinars_hub",
    defaultTitle: "Webinars y clases en vivo",
    defaultDescription:
      "Listado de webinars y clases en vivo disponibles dentro del ecosistema LOBRÁ.",
    ogType: "website",
    robots: { index: true, follow: true },
  },
  webinar: {
    id: "webinar",
    defaultTitle: "Detalle de webinar",
    defaultDescription:
      "Información detallada de un webinar en vivo o grabado dentro de LOBRÁ.",
    ogType: "article",
    robots: { index: true, follow: true },
  },
  module: {
    id: "module",
    defaultTitle: "Módulo educativo",
    defaultDescription:
      "Descripción y contenido de un módulo educativo dentro del sistema LOBRÁ.",
    ogType: "article",
    robots: { index: true, follow: true },
  },
  legal: {
    id: "legal",
    defaultTitle: "Información legal",
    defaultDescription:
      "Términos, condiciones y documentos legales relacionados con LOBRÁ.",
    ogType: "website",
    robots: { index: true, follow: true },
  },
  static: {
    id: "static",
    defaultTitle: "Página informativa",
    defaultDescription:
      "Página informativa dentro del ecosistema LOBRÁ con contenido estático.",
    ogType: "website",
    robots: { index: true, follow: true },
  },
  contacto: {
    id: "contacto",
    defaultTitle: "Contacto",
    defaultDescription:
      "Información de contacto para solicitar apoyo o resolver dudas sobre LOBRÁ.",
    ogType: "website",
    robots: { index: true, follow: true },
  },
  sobre_mi: {
    id: "sobre_mi",
    defaultTitle: "Sobre mí",
    defaultDescription:
      "Información sobre el fundador e historia del proyecto LOBRÁ.",
    ogType: "website",
    robots: { index: true, follow: true },
  },
  private: {
    id: "private",
    defaultTitle: "Área privada",
    defaultDescription:
      "Sección privada del ecosistema LOBRÁ disponible solo para usuarios autorizados.",
    ogType: "website",
    robots: { index: false, follow: false },
  },
  checkout: {
    id: "checkout",
    defaultTitle: "Checkout",
    defaultDescription:
      "Flujo de pago seguro para adquirir productos o servicios dentro de LOBRÁ.",
    ogType: "website",
    robots: { index: false, follow: false },
  },
  thankyou: {
    id: "thankyou",
    defaultTitle: "Confirmación de compra",
    defaultDescription:
      "Página de confirmación después de completar una compra en LOBRÁ.",
    ogType: "website",
    robots: { index: false, follow: false },
  },
  landing: {
    id: "landing",
    defaultTitle: "Página de aterrizaje",
    defaultDescription:
      "Página de aterrizaje enfocada en campañas específicas dentro de LOBRÁ.",
    ogType: "website",
    robots: { index: false, follow: true },
  },
  prelobby: {
    id: "prelobby",
    defaultTitle: "Acceso controlado",
    defaultDescription:
      "Página de acceso previo o de filtro antes de ingresar a contenido principal en LOBRÁ.",
    ogType: "website",
    robots: { index: false, follow: false },
  },
};

/**
 * Devuelve true si el tipo de página pertenece al conjunto de tipos
 * que nunca deben ser indexados (noindex rígido).
 */
export const isHardNoIndexType = (typeId: SeoPageTypeId): boolean =>
  HARD_NOINDEX_TYPES.has(typeId);

/**
 * Normaliza un pathname para construir el canonical:
 * - Elimina query params y fragments.
 * - Asegura que siempre comience con "/".
 * - Usa siempre el dominio canónico definido en SEO_GLOBAL_CONFIG.
 */
export const getCanonicalFromPathname = (rawPathname: string): string => {
  const withoutParams = rawPathname.split(/[?#]/)[0] || "/";
  const pathname = withoutParams.startsWith("/")
    ? withoutParams
    : `/${withoutParams}`;

  return `${SEO_GLOBAL_CONFIG.canonicalOrigin}${pathname}`;
};

/**
 * Construye la configuración base de robots para un tipo de página
 * tomando en cuenta únicamente la definición del tipo. La aplicación
 * de globalNoIndex y overrides se hará en buildMetadata.
 */
export const getBaseRobotsForType = (typeId: SeoPageTypeId): SeoRobotsConfig =>
  SEO_TYPE_CONFIG[typeId].robots;

/**
 * Convierte una configuración interna de robots (index/follow) en
 * el formato esperado por Next.js Metadata, sin aplicar reglas
 * de entorno ni overrides.
 */
export const toMetadataRobots = (config: SeoRobotsConfig): MetadataRobots => ({
  index: config.index,
  follow: config.follow,
});
