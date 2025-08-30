// lib/checkout/f_callCatalogPrice.ts
import { m_getSupabaseService } from '../supabase/m_getSupabaseService.ts';

export type CatalogPriceRow = {
  stripe_price_id: string;
  currency: 'MXN' | 'USD';
  amount_cents: number;
  metadata?: Record<string, unknown> | null;
};

/**
 * f_callCatalogPrice
 * Ejecuta la función SQL f_catalog_price_by_sku en Supabase.
 * Propaga errores de Postgres (SQLSTATE) para que el caller los mapee.
 */
export async function f_callCatalogPrice(params: {
  sku: string;
  currency: 'MXN' | 'USD';
}): Promise<CatalogPriceRow> {
  const { sku, currency } = params;
  const supabase = m_getSupabaseService();

  const { data, error } = await supabase.rpc('f_catalog_price_by_sku', {
    // Ajusta los nombres si tu RPC usa otros parámetros
    p_sku: sku,
    p_currency: currency,
  });

  if (error) {
    // error.code suele traer SQLSTATE (ej. 'P0002','22023','P0001')
    throw error;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || !row.stripe_price_id || !row.currency || typeof row.amount_cents !== 'number') {
    const err: any = new Error('Malformed RPC response');
    err.code = 'INTERNAL_ERROR';
    throw err;
  }

  return {
    stripe_price_id: row.stripe_price_id as string,
    currency: row.currency as 'MXN' | 'USD',
    amount_cents: row.amount_cents as number,
    metadata: (row.metadata ?? null) as Record<string, unknown> | null,
  };
}
