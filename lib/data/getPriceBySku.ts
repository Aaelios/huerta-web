// /lib/data/getPriceBySku.ts
/**
 * Módulo — getPriceBySku (Infra común)
 * Llama la RPC f_catalog_price_by_sku para obtener precio vigente por SKU.
 * Lee amount_cents, currency y metadata.compare_at_total_cents.
 * Server-only. ESLint/TS estricto.
 */

import 'server-only';

export type Currency = 'MXN' | 'USD';

export interface PriceResult {
  price_cents: number | null;
  currency: Currency | null;
  compare_at_total_cents?: number | null;
}

type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

async function getServiceClient(): Promise<RpcClient | null> {
  try {
    const a: unknown = await import('@/lib/supabase/m_getSupabaseService');
    const factory =
      (a as Record<string, unknown>)?.default ??
      (a as Record<string, unknown>)?.m_getSupabaseService ??
      (a as Record<string, unknown>)?.getSupabaseService;
    if (typeof factory === 'function') {
      const c = await (factory as () => Promise<unknown>)();
      if (c && typeof c === 'object' && 'rpc' in (c as object)) return c as RpcClient;
    }
  } catch {}
  try {
    const b: unknown = await import('@/lib/supabase/server');
    const c =
      (b as Record<string, unknown>)?.default ??
      (b as Record<string, unknown>)?.supabase ??
      (b as Record<string, unknown>)?.client;
    if (c && typeof c === 'object' && 'rpc' in (c as object)) return c as RpcClient;
  } catch {}
  return null;
}

function toNumberOrNull(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function toCurrencyOrNull(v: unknown): PriceResult['currency'] {
  const s = typeof v === 'string' ? v.toUpperCase() : '';
  return s === 'MXN' || s === 'USD' ? (s as PriceResult['currency']) : null;
}

export async function getPriceBySku(
  sku: string,
  currency: Currency = 'MXN'
): Promise<PriceResult> {
  const client = await getServiceClient();
  if (!client) return { price_cents: null, currency: null };

  const { data, error } = await client.rpc('f_catalog_price_by_sku', {
    p_sku: String(sku ?? '').trim(),
    p_currency: currency,
  });

  if (error) return { price_cents: null, currency: null };

  // La RPC RETURNS TABLE → array de filas
  const rows = Array.isArray(data) ? (data as Array<unknown>) : [];
  const first = (rows[0] ?? null) as Record<string, unknown> | null;
  if (!first) return { price_cents: null, currency: null };

  // metadata puede venir como objeto JSON (PostgREST ya deserializa jsonb)
  const meta =
    first['metadata'] && typeof first['metadata'] === 'object'
      ? (first['metadata'] as Record<string, unknown>)
      : null;

  return {
    price_cents: toNumberOrNull(first['amount_cents']),
    currency: toCurrencyOrNull(first['currency']),
    compare_at_total_cents: meta ? toNumberOrNull(meta['compare_at_total_cents']) : null,
  };
}
