// src/server/modules/webinars/m_precios.ts

/**
 * Módulo B — m_precios
 * Obtiene el "precio vigente" por SKU desde la vista v_prices_vigente.
 * Reglas de prioridad:
 *   1) Promos (price_list != 'default') dentro de ventana (valid_until futuro) primero.
 *   2) Precios vigentes sin fin de vigencia (valid_until NULL); prefieren no-default.
 *   3) Default sin vigencia.
 *   4) Fallback: más reciente por valid_from DESC.
 * Moneda preferida: MXN; si no existe, intenta USD.
 * Compatible con Next.js 15.5 y ESLint (TS/ESM).
 */

export type Currency = 'MXN' | 'USD';

export interface PrecioVigente {
  price_cents: number | null;
  currency: Currency | null;
}

export interface SupabaseClient {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (col: string, val: unknown) => {
        eq: (col2: string, val2: unknown) => Promise<{
          data: Record<string, unknown>[] | null;
          error: { message: string } | null;
        }>;
      };
    };
  };
}

/** Fila mínima esperada desde v_prices_vigente */
interface PriceRow {
  sku: string;
  amount_cents: number | null;
  currency: Currency | null;
  price_list?: string | null;
  interval?: string | null;
  valid_from?: string | null;  // ISO
  valid_until?: string | null; // ISO
  active?: boolean | null;
}

/**
 * f_precioVigentePorSku
 * Lee v_prices_vigente con prioridad por moneda y reglas de negocio.
 */
export async function f_precioVigentePorSku(
  supabase: SupabaseClient,
  sku: string,
  preferredCurrency: Currency = 'MXN'
): Promise<PrecioVigente> {
  const tryCurrency = async (ccy: Currency): Promise<PrecioVigente | null> => {
    const { data, error } = await supabase
      .from('v_prices_vigente')
      .select('sku, amount_cents, currency, price_list, interval, valid_from, valid_until, active')
      .eq('sku', sku)
      .eq('currency', ccy);

    if (error || !data || data.length === 0) return null;

    const rows = (data as unknown as PriceRow[]).filter((r) => r.active !== false && r.amount_cents != null);

    if (rows.length === 0) return null;

    const now = Date.now();

    const scored = rows
      .map((r) => {
        const isPromo = (r.price_list ?? 'default') !== 'default';
        const vu = r.valid_until ? Date.parse(r.valid_until) : null;
        const vf = r.valid_from ? Date.parse(r.valid_from) : null;

        const inWindow = vu === null || vu >= now; // si no tiene fin, lo consideramos vigente
        // Prioridades numéricas menores = mejor
        const pPromo = isPromo ? 0 : 1;
        const pWindow = inWindow ? 0 : 1;
        const pHasEndSoon = vu !== null ? vu : Number.POSITIVE_INFINITY; // más cercano primero
        const pRecency = vf !== null ? -vf : Number.NEGATIVE_INFINITY;   // más reciente primero (desc)

        return { r, score: [pPromo, pWindow, pHasEndSoon, pRecency] as const };
      })
      .sort((a, b) => {
        // Comparación lexicográfica por las cuatro claves
        for (let i = 0; i < a.score.length; i += 1) {
          if (a.score[i] < b.score[i]) return -1;
          if (a.score[i] > b.score[i]) return 1;
        }
        return 0;
      });

    const best = scored[0]?.r;
    if (!best || best.amount_cents == null || !best.currency) return null;

    return { price_cents: best.amount_cents, currency: best.currency };
  };

  // Intento con moneda preferida
  const primary = await tryCurrency(preferredCurrency);
  if (primary) return primary;

  // Fallback USD si no hay MXN
  const alt: Currency = preferredCurrency === 'MXN' ? 'USD' : 'MXN';
  const secondary = await tryCurrency(alt);
  if (secondary) return secondary;

  // Sin precio vigente
  return { price_cents: null, currency: null };
}

const preciosApi = {
  f_precioVigentePorSku,
};

export default preciosApi;
