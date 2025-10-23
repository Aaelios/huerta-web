// /lib/seo/emitJSONLD.ts
/**
 * Módulo — emitJSONLD (Infra común)
 * Genera JSON-LD serializable para Event | Product | Service desde DTOs.
 * Server-only. No renderiza UI ni <script>, solo devuelve string JSON.
 * ESLint/TS estricto. Sin dependencias externas.
 *
 * Reglas:
 * - live_class → Event
 * - bundle → Product
 * - one_to_one → Service
 */

import 'server-only';
import type {
  FeaturedDTO,
  ProductCardDTO,
  BundleScheduleDTO,
  IsoUtcString,
} from '@/lib/dto/catalog';

/* ============================================================================
 * Bloque A — Utilidades internas
 * ========================================================================== */

function isoOrUndefined(v: IsoUtcString | null | undefined): string | undefined {
  return typeof v === 'string' && v.length >= 10 ? v : undefined;
}

function nonEmpty(v: string | null | undefined): string | undefined {
  return typeof v === 'string' && v.trim().length > 0 ? v : undefined;
}

function centsToAmount(v: number | null | undefined): string | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return (v / 100).toFixed(2);
}

// Evita < y > en JSON embebido
function safeJSONStringify(obj: unknown): string {
  const s = JSON.stringify(obj);
  return s.replaceAll('<', '\\u003C').replaceAll('>', '\\u003E');
}

/* ============================================================================
 * Bloque B — Emisores por tipo
 * ========================================================================== */

function emitEventFromFeatured(dto: FeaturedDTO) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: dto.title,
    description: nonEmpty(dto.subtitle),
    startDate: isoOrUndefined(dto.next_start_at),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    location: {
      '@type': 'VirtualLocation',
      url: dto.page_slug,
    },
    offers:
      typeof dto.price_mxn === 'number'
        ? {
            '@type': 'Offer',
            priceCurrency: 'MXN',
            price: centsToAmount(dto.price_mxn),
            url: dto.page_slug,
            availability: 'https://schema.org/InStock',
          }
        : undefined,
  };
  return safeJSONStringify(data);
}

function emitProductFromFeatured(dto: FeaturedDTO) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: dto.title,
    description: nonEmpty(dto.subtitle),
    sku: dto.sku,
    offers:
      typeof dto.price_mxn === 'number'
        ? {
            '@type': 'Offer',
            priceCurrency: 'MXN',
            price: centsToAmount(dto.price_mxn),
            url: dto.page_slug,
            availability: 'https://schema.org/InStock',
          }
        : undefined,
  };
  return safeJSONStringify(data);
}

function emitServiceFromFeatured(dto: FeaturedDTO) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: dto.title,
    description: nonEmpty(dto.subtitle),
    serviceType: 'Consulting',
    areaServed: 'MX',
    offers:
      typeof dto.price_mxn === 'number'
        ? {
            '@type': 'Offer',
            priceCurrency: 'MXN',
            price: centsToAmount(dto.price_mxn),
            url: dto.page_slug,
            availability: 'https://schema.org/InStock',
          }
        : undefined,
  };
  return safeJSONStringify(data);
}

/* ============================================================================
 * Bloque C — Fachada pública
 * ========================================================================== */

export function emitJSONLDFromFeatured(dto: FeaturedDTO): string {
  switch (dto.type) {
    case 'live_class':
      return emitEventFromFeatured(dto);
    case 'bundle':
      return emitProductFromFeatured(dto);
    case 'one_to_one':
      return emitServiceFromFeatured(dto);
    default:
      return emitProductFromFeatured(dto);
  }
}
