// /lib/data/getFeatured.ts
/**
 * Módulo — getFeatured (Infra común)
 * Supabase primario (v_products_public + RPCs) con fallback JSONC.
 * Server-only. Sin UI ni rutas. ESLint/TS estricto.
 */

import 'server-only';
import type { FeaturedDTO, IsoUtcString } from '@/lib/dto/catalog';
import { mapSupabaseToFeaturedDTO, mapJSONCToFeaturedDTO } from '@/lib/mappers/catalog';
import { getProductPublicBySku } from '@/lib/data/getProductPublicBySku';
import { getPriceBySku } from '@/lib/data/getPriceBySku';
import { getInstancesSummaryBySku } from '@/lib/data/getInstancesSummaryBySku';
import { getBundleNextStartAt } from '@/lib/data/getBundleNextStartAt';

/* =============== Cliente Supabase mínimo =============== */

type QueryBuilder<T> = {
  select: (cols: string) => QueryBuilder<T>;
  filter: (col: string, op: string, val: unknown) => QueryBuilder<T>;
  order: (col: string, opts?: { ascending?: boolean | null }) => QueryBuilder<T>;
  limit: (n: number) => Promise<{ data: T[] | null; error: { message: string } | null }>;
};

type FromClient<T> = { from: (table: string) => QueryBuilder<T> };

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
  } catch {}
  try {
    const b: unknown = await import('@/lib/supabase/server');
    const c =
      (b as Record<string, unknown>)?.default ??
      (b as Record<string, unknown>)?.supabase ??
      (b as Record<string, unknown>)?.client;
    if (c && typeof c === 'object' && 'from' in (c as object)) return c;
  } catch {}
  return null;
}

/* =============== Buscar SKU destacado en Supabase =============== */

async function findFeaturedSkuFromSupabase(): Promise<string | null> {
  const client = (await getServiceClient()) as FromClient<{
    sku: string;
    metadata: Record<string, unknown> | null;
  }> | null;
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('v_products_public')
      .select('sku, metadata')
      .filter('metadata->>is_featured', 'eq', 'true')
      .order('sku', { ascending: true })
      .limit(1);

    if (error || !data || data.length === 0) return null;
    const sku = data[0]?.sku;
    return typeof sku === 'string' && sku.trim().length > 0 ? sku : null;
  } catch {
    return null;
  }
}

/* =============== Ensamble Supabase → FeaturedDTO (vía mapper 1-arg) =============== */

async function assembleFeaturedDTOBySku(sku: string): Promise<FeaturedDTO | null> {
  const product = await getProductPublicBySku(sku);
  if (!product) return null;

  const price = await getPriceBySku(sku, 'MXN');

  // Determinar fulfillment_type desde metadata o columna
  const meta = (product.metadata as Record<string, unknown> | null) ?? null;
  const ftRaw = (meta?.['fulfillment_type'] as string | undefined) ?? product.product_type;
  const fulfillment_type = ftRaw === 'bundle' || ftRaw === 'live_class' || ftRaw === 'one_to_one' ? ftRaw : 'live_class';

  // next_start_at según tipo
  let nextStartIso: IsoUtcString | null = null;
  if (fulfillment_type === 'bundle') {
    nextStartIso = await getBundleNextStartAt(sku);
  } else if (fulfillment_type === 'live_class') {
    const inst = await getInstancesSummaryBySku(sku);
    nextStartIso = inst.next_start_at ?? null;
  } else {
    nextStartIso = null;
  }

  return mapSupabaseToFeaturedDTO({
    sku: product.sku,
    title: product.name,
    subtitle: product.description,
    page_slug: product.page_slug,
    fulfillment_type,
    price_mxn_cents: price.price_cents ?? null,
    compare_at_total_cents: price.compare_at_total_cents ?? null,
    next_start_at_iso: nextStartIso,
  });
}

/* =============== Fallback JSONC mínimo → FeaturedDTO (mapper 1-arg) =============== */

function toIsoUtcOrNull(v: unknown): IsoUtcString | null {
  if (typeof v !== 'string' || v.length < 8) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : (d.toISOString() as IsoUtcString);
}

async function getFeaturedFromJSONC(): Promise<FeaturedDTO | null> {
  try {
    const mod = (await import('@/lib/webinars/loadWebinars')) as Record<string, unknown>;
    const get =
      (mod['getWebinars'] as unknown) ??
      (mod['loadWebinars'] as unknown) ??
      (mod['default'] as unknown);

    if (typeof get !== 'function') return null;
    const arr = (await (get as () => Promise<unknown>)()) as unknown;

    if (!Array.isArray(arr) || arr.length === 0) return null;

    const items = arr.filter((x) => typeof x === 'object' && x !== null) as Record<
      string,
      unknown
    >[];

    const flagged =
      items.find((w) => {
        const shared = w['shared'] as Record<string, unknown> | undefined;
        const flags = shared?.['flags'] as Record<string, unknown> | undefined;
        return Boolean(flags?.['isFeaturedHome'] ?? (w as Record<string, unknown>)['featuredHome']);
      }) ?? null;

    const picked =
      flagged ??
      (items
        .map((x) => {
          const shared = x['shared'] as Record<string, unknown> | undefined;
          const s = typeof shared?.['startAt'] === 'string' ? (shared['startAt'] as string) : '';
          const t = new Date(s).getTime();
          return Number.isFinite(t) ? { x, t } : null;
        })
        .filter((y): y is { x: Record<string, unknown>; t: number } => !!y)
        .sort((a, b) => a.t - b.t)[0]?.x ??
        items[0] ??
        null);

    if (!picked) return null;

    const shared = picked['shared'] as Record<string, unknown> | undefined;

    const sku = typeof shared?.['slug'] === 'string' ? (shared['slug'] as string) : '';
    const title = typeof shared?.['title'] === 'string' ? (shared['title'] as string) : '';
    const subtitle =
      typeof shared?.['subtitle'] === 'string' ? (shared['subtitle'] as string) : null;
    const startAt = toIsoUtcOrNull(shared?.['startAt']);
    const page_slug = sku ? (sku.startsWith('/') ? sku : `/webinars/${sku}`) : '/webinars';

    return mapJSONCToFeaturedDTO({
      sku,
      title,
      subtitle,
      page_slug,
      type: 'live_class',
      priceMXN: null,
      compareAtTotal: null,
      nextStartAt: startAt,
    });
  } catch {
    return null;
  }
}

/* =============== Punto de entrada público =============== */

export async function getFeatured(): Promise<FeaturedDTO | null> {
  const featuredSku = await findFeaturedSkuFromSupabase();
  if (featuredSku) {
    const dto = await assembleFeaturedDTOBySku(featuredSku);
    if (dto) return dto;
  }

  const fromJson = await getFeaturedFromJSONC();
  if (!fromJson) return null;

  if (fromJson.sku) {
    const fromSb = await assembleFeaturedDTOBySku(fromJson.sku);
    if (fromSb) return fromSb;
  }

  return fromJson;
}
