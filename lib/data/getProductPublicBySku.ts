// /lib/data/getProductPublicBySku.ts
/**
 * Módulo — getProductPublicBySku (Infra común)
 * Lee un producto público por SKU desde v_products_public y resuelve page_slug.
 * No renderiza UI, no toca rutas. Server-only. Next.js 15.5 + ESLint (TS/ESM).
 *
 * Fuentes:
 * - v_products_public: sku, product_type, name, description, status, visibility, metadata
 * - products: page_slug (solo lectura, opcional)
 *
 * Regla base: “proveer datos, no mostrarlos”.
 */

import 'server-only';
import type { FulfillmentType } from '@/lib/dto/catalog';

// ============================
// Bloque A — Tipos de salida
// ============================
export interface ProductPublic {
  sku: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  product_type: string | null;
  status: string | null;
  visibility: string | null;
  page_slug: string | null;
}

// ============================
// Bloque B — Cliente Supabase
// ============================
type FromSelectEqSingle<T> = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        limit: (n: number) => {
          single: () => Promise<{ data: T | null; error: { message: string } | null }>;
        };
        single: () => Promise<{ data: T | null; error: { message: string } | null }>;
      };
      single: () => Promise<{ data: T | null; error: { message: string } | null }>;
    };
  };
};

async function getServiceClient(): Promise<unknown | null> {
  try {
    const a: unknown = await import('@/lib/supabase/m_getSupabaseService');
    const factory =
      (a as Record<string, unknown>)?.default ??
      (a as Record<string, unknown>)?.m_getSupabaseService ??
      (a as Record<string, unknown>)?.getSupabaseService;
    if (typeof factory === 'function') {
      const c = await (factory as () => Promise<unknown>)();
      if (c && typeof c === 'object' && 'from' in (c as object)) return c;
    }
  } catch {
    // ignore
  }
  try {
    const b: unknown = await import('@/lib/supabase/server');
    const c =
      (b as Record<string, unknown>)?.default ??
      (b as Record<string, unknown>)?.supabase ??
      (b as Record<string, unknown>)?.client;
    if (c && typeof c === 'object' && 'from' in (c as object)) return c;
  } catch {
    // ignore
  }
  return null;
}

// ============================
// Bloque C — Helpers internos
// ============================
function toStringOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

// Función mantenida pero no exportada - disponible para uso futuro
function coerceFulfillment(metaVal: unknown, rowType?: string | null): FulfillmentType {
  const mv = toStringOrNull(metaVal);
  if (mv === 'live_class' || mv === 'bundle' || mv === 'one_to_one') return mv;
  if (rowType === 'live_class' || rowType === 'bundle' || rowType === 'one_to_one') return rowType;
  return 'live_class';
}

function fallbackSlugByMeta(meta: Record<string, unknown> | null, sku: string): string | null {
  const ftRaw = toStringOrNull(meta?.['fulfillment_type']) ?? 'product';
  if (ftRaw === 'bundle') return `/producto/${sku}`;
  if (ftRaw === 'one_to_one') return `/servicio/${sku}`;
  if (ftRaw === 'live_class') return `/webinar/${sku}`;
  return `/producto/${sku}`;
}

// ============================
// Bloque D — Query principal
// ============================
export async function getProductPublicBySku(sku: string): Promise<ProductPublic | null> {
  const client = await getServiceClient();
  if (!client) return null;

  // 1) Leer desde v_products_public
  const c1 = client as FromSelectEqSingle<{
    sku: string;
    product_type: string | null;
    name: string;
    description: string | null;
    status: string | null;
    visibility: string | null;
    metadata: Record<string, unknown> | null;
  }>;

  const { data: row, error } = await c1
    .from('v_products_public')
    .select('sku, product_type, name, description, status, visibility, metadata')
    .eq('sku', sku)
    .single();

  if (error || !row) return null;

  // 2) Resolver page_slug desde products si la vista no lo expone
  let page_slug: string | null = null;
  try {
    const c2 = client as FromSelectEqSingle<{ page_slug: string | null }>;
    const { data: p } = await c2.from('products').select('page_slug').eq('sku', sku).limit(1).single();
    page_slug = p?.page_slug ?? null;
  } catch {
    page_slug = null;
  }

  // 3) Fallback a metadata si no existe page_slug
  if (!page_slug) {
    const metaSlug = toStringOrNull(row.metadata?.['product_slug']);
    page_slug = metaSlug ?? fallbackSlugByMeta(row.metadata ?? null, row.sku);
  }

  // 4) Salida normalizada
  return {
    sku: String(row.sku),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    metadata: row.metadata ?? null,
    product_type: row.product_type ?? null,
    status: row.status ?? null,
    visibility: row.visibility ?? null,
    page_slug,
  };
}