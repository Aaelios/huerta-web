// lib/checkout/f_mapSqlError.ts

export type ApiErrorCode =
  | 'NOT_FOUND'
  | 'INVALID_CURRENCY'
  | 'AMBIGUOUS_PRICE'
  | 'BAD_REQUEST'
  | 'STRIPE_ERROR'
  | 'INTERNAL_ERROR';

export type ApiErrorMapped = { status: number; code: ApiErrorCode; message?: string };

/**
 * f_mapSqlError
 * Traduce errores de Supabase/Postgres a {status, code} para la API.
 * Usa SQLSTATE cuando existe; si no, heurística por mensaje.
 */
export function f_mapSqlError(e: unknown): ApiErrorMapped {
  const err = e as any;
  const sqlstate: string | undefined = err?.code || err?.data?.code;

  if (sqlstate === 'P0002') return { status: 404, code: 'NOT_FOUND', message: clean(err?.message) };
  if (sqlstate === '22023') return { status: 400, code: 'INVALID_CURRENCY', message: clean(err?.message) };
  if (sqlstate === 'P0001') return { status: 409, code: 'AMBIGUOUS_PRICE', message: clean(err?.message) };

  const msg = `${err?.message || ''}`.toUpperCase();
  if (msg.startsWith('NOT_FOUND')) return { status: 404, code: 'NOT_FOUND', message: clean(err?.message) };
  if (msg.startsWith('INVALID_CURRENCY')) return { status: 400, code: 'INVALID_CURRENCY', message: clean(err?.message) };
  if (msg.startsWith('AMBIGUOUS_PRICE')) return { status: 409, code: 'AMBIGUOUS_PRICE', message: clean(err?.message) };

  return { status: 500, code: 'INTERNAL_ERROR', message: clean(err?.message) };
}

function clean(m?: string) {
  if (!m) return undefined;
  const s = m.replace(/\s+/g, ' ').trim();
  return s.length > 160 ? s.slice(0, 160) + '…' : s;
}
