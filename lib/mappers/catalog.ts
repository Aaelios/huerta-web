// /lib/mappers/catalog.ts
/**
 * Módulo — Mapeadores de Catálogo (Infra común)
 * Transforma fuentes heterogéneas (Supabase, JSONC) a DTOs canónicos.
 * No renderiza UI, no toca rutas. Compatible con Next.js 15.5 y ESLint (TS/ESM).
 *
 * Dependencias:
 * - Tipos/DTOs: /lib/dto/catalog.ts
 *
 * Regla base: “proveer datos, no mostrarlos”.
 */

import type {
  FeaturedDTO,
  FulfillmentType,
  IsoUtcString,
} from '@/lib/dto/catalog';

/* ============================================================================
 * Bloque A — Utilidades internas
 * Objetivo: Normalizar valores y proteger contratos sin asumir esquemas no confirmados.
 * ========================================================================== */

/** Coacciona un fulfillment arbitrario al contrato canónico. */
function normalizeFulfillment(v: unknown): FulfillmentType {
  if (v === 'live_class' || v === 'bundle' || v === 'one_to_one') return v;
  // En JSONC antiguos puede venir 'webinar'; se normaliza a 'live_class'
  if (v === 'webinar') return 'live_class';
  return 'live_class';
}

/** Devuelve string o null, evitando undefined y falsy no-string. */
function toStringOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null;
}

/** Centavos enteros o null. Acepta number entero ya en centavos. */
function toCentsOrNull(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  const n = Math.trunc(v);
  return Number.isFinite(n) ? n : null;
}

/** ISO8601 laxo o null. No convierte timezone; evita Date para RSC. */
function toIsoOrNull(v: unknown): IsoUtcString | null {
  return typeof v === 'string' && v.length >= 10 ? (v as IsoUtcString) : null;
}

/* ============================================================================
 * Bloque B — Contratos de entrada (mínimos y defensivos)
 * Objetivo: No asumir tablas ni vistas. Los fetchers preparan estos shapes.
 * ========================================================================== */

/** Entrada mínima desde Supabase preparada por fetcher (server-only). */
export interface SupabaseFeaturedInput {
  sku: unknown;
  title: unknown;
  subtitle?: unknown;
  page_slug?: unknown;
  fulfillment_type: unknown; // debe venir ya resuelto por fetcher
  price_mxn_cents?: unknown; // número entero en centavos o null
  compare_at_total_cents?: unknown; // número entero en centavos o null
  next_start_at_iso?: unknown; // string ISO o null
}

/** Entrada mínima desde JSONC (fallback) preparada por loader actual. */
export interface JSONCFeaturedInput {
  sku: unknown;
  title: unknown;
  subtitle?: unknown;
  page_slug?: unknown;
  type?: unknown; // 'live_class' | 'bundle' | 'one_to_one' | 'webinar'(legacy)
  priceMXN?: unknown; // centavos ya normalizados por loader, si aplica
  compareAtTotal?: unknown; // centavos, solo bundles si aplica
  nextStartAt?: unknown; // ISO string o null
}

/* ============================================================================
 * Bloque C — Mapeadores públicos
 * Objetivo: Salidas idénticas a FeaturedDTO, listas para UI sin lógica adicional.
 * ========================================================================== */

/**
 * mapSupabaseToFeaturedDTO
 * Fuente primaria. Requiere que el fetcher ya haya resuelto fulfillment_type,
 * page_slug y montos en centavos (MXN).
 */
export function mapSupabaseToFeaturedDTO(
  input: SupabaseFeaturedInput
): FeaturedDTO {
  const sku = toStringOrNull(input.sku) ?? '';
  const title = toStringOrNull(input.title) ?? '';
  const subtitle = toStringOrNull(input.subtitle);

  // Normalización de slug: garantizar que comience con "/"
  const rawSlug = toStringOrNull(input.page_slug) ?? `/producto/${sku}`;
  const page_slug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;

  const type = normalizeFulfillment(input.fulfillment_type);
  const price_mxn = toCentsOrNull(input.price_mxn_cents);
  const compare_at_total = toCentsOrNull(input.compare_at_total_cents);
  const next_start_at = toIsoOrNull(input.next_start_at_iso);

  return {
    sku,
    type,
    title,
    subtitle,
    page_slug,
    price_mxn,
    compare_at_total,
    next_start_at,
  };
}

/**
 * mapJSONCToFeaturedDTO
 * Fallback seguro. Acepta variantes legacy (type:'webinar') y nombres distintos.
 */
export function mapJSONCToFeaturedDTO(
  input: JSONCFeaturedInput
): FeaturedDTO {
  const sku = toStringOrNull(input.sku) ?? '';
  const title = toStringOrNull(input.title) ?? '';
  const subtitle = toStringOrNull(input.subtitle);

  // Normalización de slug también para JSONC
  const rawSlug = toStringOrNull(input.page_slug) ?? `/producto/${sku}`;
  const page_slug = rawSlug.startsWith('/') ? rawSlug : `/${rawSlug}`;

  const type = normalizeFulfillment(input.type);
  const price_mxn = toCentsOrNull(input.priceMXN);
  const compare_at_total = toCentsOrNull(input.compareAtTotal);
  const next_start_at = toIsoOrNull(input.nextStartAt);

  return {
    sku,
    type,
    title,
    subtitle,
    page_slug,
    price_mxn,
    compare_at_total,
    next_start_at,
  };
}
