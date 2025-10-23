// /lib/data/getBundleNextStartAt.ts
/**
 * Módulo — getBundleNextStartAt (Infra común)
 * Llama la RPC f_bundle_next_start_at(p_bundle_sku text) y devuelve IsoUtcString|null.
 * Soporta dos formatos de retorno:
 *  1) SETOF record → [{ next_start_at: ... }]
 *  2) json/jsonb    → { next_start_at: ... } o { f_bundle_next_start_at: { next_start_at: ... } }
 */

import 'server-only';
import type { IsoUtcString } from '@/lib/dto/catalog';

// -----------------------------
// Cliente Supabase
// -----------------------------
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

// -----------------------------
// Coerciones
// -----------------------------
function toIsoUtcOrNull(v: unknown): IsoUtcString | null {
  if (typeof v !== 'string' || v.length < 8) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : (d.toISOString() as IsoUtcString);
}

// -----------------------------
// RPC wrapper tolerante
// -----------------------------
export async function getBundleNextStartAt(bundleSku: string): Promise<IsoUtcString | null> {
  const client = await getServiceClient();
  if (!client) return null;

  const { data, error } = await client.rpc('f_bundle_next_start_at', {
    bundle_sku: String(bundleSku ?? '').trim(),
  });
  if (error || data == null) return null;

  // Formato A: array de filas [{ next_start_at: ... }]
  if (Array.isArray(data)) {
    const first = (data[0] ?? null) as Record<string, unknown> | null;
    const iso = first ? first['next_start_at'] : null;
    return toIsoUtcOrNull(iso);
  }

  // Formato B: objeto JSON { next_start_at: ... }
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // directo
    const direct = obj['next_start_at'];
    if (direct) return toIsoUtcOrNull(direct);
    // envuelto: { f_bundle_next_start_at: { next_start_at: ... } }
    const wrapped = obj['f_bundle_next_start_at'];
    if (wrapped && typeof wrapped === 'object') {
      const inner = (wrapped as Record<string, unknown>)['next_start_at'];
      return toIsoUtcOrNull(inner);
    }
  }

  return null;
}
