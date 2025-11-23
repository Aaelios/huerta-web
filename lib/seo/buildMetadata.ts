// lib/seo/buildMetadata.ts — Builder central para generar Metadata SEO unificada en LOBRÁ.

import type { Metadata } from "next";

import {
  type SeoPageTypeId,
  type MetadataRobots,
  SEO_GLOBAL_CONFIG,
  SEO_TYPE_CONFIG,
  getCanonicalFromPathname,
  getBaseRobotsForType,
  isHardNoIndexType,
  toMetadataRobots,
} from "./seoConfig";

/**
 * Parámetros permitidos para construir metadata de cualquier página.
 * Se usa desde `generateMetadata()` en rutas dinámicas o estáticas.
 */
export type BuildMetadataInput = {
  typeId: SeoPageTypeId;
  pathname: string; // Debe ser la ruta limpia, sin query params.
  title?: string;
  description?: string;
  ogImageUrl?: string;
  forceIndex?: boolean; // Override manual
  forceNoIndex?: boolean; // Override manual
};

/**
 * Tipos de página que son siempre noindex, nofollow por diseño.
 * Se usan para endurecer la protección de páginas sensibles:
 * - checkout
 * - thankyou (/gracias)
 * - prelobby de webinars
 * - private (área privada genérica, incl. futuras /mi-cuenta, /mis-compras)
 */
const HARD_NOINDEX_TYPES: SeoPageTypeId[] = [
  "checkout",
  "thankyou",
  "prelobby",
  "private",
];

/**
 * Define si un tipo de página debe llevar sufijo de marca (" | LOBRÁ").
 * Home queda como excepción para evitar sobrecargar el título principal.
 */
const shouldAppendBrandSuffix = (typeId: SeoPageTypeId): boolean => {
  if (typeId === "home") return false;
  return true;
};

/**
 * Limpia y formatea un título aplicando la plantilla estándar.
 * - Título base siempre crudo (input o defaultTitle).
 * - El sufijo " | LOBRÁ" se agrega sólo una vez y sólo si aplica.
 */
const resolveTitle = (
  typeId: SeoPageTypeId,
  incomingTitle?: string,
): string => {
  const baseTitle =
    incomingTitle && incomingTitle.trim().length > 0
      ? incomingTitle.trim()
      : SEO_TYPE_CONFIG[typeId].defaultTitle;

  if (!shouldAppendBrandSuffix(typeId)) {
    return baseTitle;
  }

  return `${baseTitle} | ${SEO_GLOBAL_CONFIG.siteName}`;
};

/**
 * Resuelve la descripción:
 * - Si viene en el input, se usa esa.
 * - Si no, toma la defaultDescription del tipo.
 */
const resolveDescription = (
  typeId: SeoPageTypeId,
  incomingDescription?: string,
): string => {
  if (incomingDescription && incomingDescription.trim().length > 0) {
    return incomingDescription.trim();
  }

  return SEO_TYPE_CONFIG[typeId].defaultDescription;
};

/**
 * Aplica todas las reglas de robots:
 * 0. HARD_NOINDEX_TYPES → siempre { index: false, follow: false }.
 * 1. Si el entorno NO es producción → noindex global siempre.
 * 2. Si el tipo es hard noindex → nunca index.
 * 3. forceNoIndex → tiene prioridad.
 * 4. forceIndex → solo se aplica si no es tipo hard noindex y no hay globalNoIndex.
 */
const resolveRobots = (
  typeId: SeoPageTypeId,
  forceIndex?: boolean,
  forceNoIndex?: boolean,
): MetadataRobots => {
  const base = getBaseRobotsForType(typeId);

  // Regla 0: tipos endurecidos siempre noindex, nofollow
  if (HARD_NOINDEX_TYPES.includes(typeId)) {
    return {
      index: false,
      follow: false,
    };
  }

  // Regla 1: noindex global para preview/dev
  if (SEO_GLOBAL_CONFIG.globalNoIndex) {
    return {
      index: false,
      follow: base.follow,
    };
  }

  // Regla 2: tipos con noindex rígido (definidos en seoConfig)
  if (isHardNoIndexType(typeId)) {
    return {
      index: false,
      follow: base.follow,
    };
  }

  // Regla 3: forceNoIndex gana siempre
  if (forceNoIndex) {
    return {
      index: false,
      follow: base.follow,
    };
  }

  // Regla 4: forceIndex solo si está permitido
  if (forceIndex) {
    return {
      index: true,
      follow: base.follow,
    };
  }

  // Caso normal
  return toMetadataRobots(base);
};

/**
 * Build principal. Devuelve metadata estándar de Next.js.
 */
export const buildMetadata = (input: BuildMetadataInput): Metadata => {
  const {
    typeId,
    pathname,
    title,
    description,
    ogImageUrl,
    forceIndex,
    forceNoIndex,
  } = input;

  // Canonical limpio
  const canonical = getCanonicalFromPathname(pathname);

  // Title final
  const finalTitle = resolveTitle(typeId, title);

  // Descripción final
  const finalDescription = resolveDescription(typeId, description);

  // Robots final (incluye endurecimiento para tipos sensibles)
  const robots = resolveRobots(typeId, forceIndex, forceNoIndex);

  return {
    title: finalTitle,
    description: finalDescription,
    alternates: {
      canonical,
    },
    robots,
    openGraph: {
      title: finalTitle,
      description: finalDescription,
      url: canonical,
      siteName: SEO_GLOBAL_CONFIG.siteName,
      type: SEO_TYPE_CONFIG[typeId].ogType,
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
};
