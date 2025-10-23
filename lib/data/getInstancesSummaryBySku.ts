// /lib/data/getInstancesSummaryBySku.ts
/**
 * Módulo — getInstancesSummaryBySku (Infra común)
 * Llama la RPC f_webinars_resumen para obtener instancias próximas por SKU.
 * No renderiza UI, no toca rutas. Server-only. Next.js 15.5 + ESLint (TS/ESM).
 *
 * Contrato esperado:
 *   f_webinars_resumen(p_sku text, p_max int)
 * Salida normalizada: { next_start_at, next_instance_slug, instance_count_upcoming }
 *
 * Regla base: “proveer datos, no mostrarlos”.
 */

import 'server-only';
import type { IsoUtcString } from '@/lib/dto/catalog';

// ============================
// Bloque A — Tipos
// ============================
export interface InstanceSummary {
  next_start_at: IsoUtcString | null;
  next_instance_slug: string | null;
  instance_count_upcoming: number;
}

// ============================
// Bloque B — Cliente Supabase
// ============================
type RpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<{ data: unknown | null; error: { message: string } | null }>;
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
  } catch {
    // ignore
  }
  try {
    const b: unknown = await import('@/lib/supabase/server');
    const c =
      (b as Record<string, unknown>)?.default ??
      (b as Record<string, unknown>)?.supabase ??
      (b as Record<string, unknown>)?.client;
    if (c && typeof c === 'object' && 'rpc' in (c as object)) return c as RpcClient;
  } catch {
    // ignore
  }
  return null;
}

// ============================
// Bloque C — Coerciones y helpers
// ============================
function toStringOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

function toIsoUtcOrNull(v: unknown): IsoUtcString | null {
  if (typeof v !== 'string' || v.length < 8) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString() as IsoUtcString;
}

function toIntOrZero(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

// ============================
// Bloque D — RPC wrapper
// ============================
export async function getInstancesSummaryBySku(
  sku: string,
  max = 5
): Promise<InstanceSummary> {
  const client = await getServiceClient();
  if (!client) {
    return { next_start_at: null, next_instance_slug: null, instance_count_upcoming: 0 };
  }

  const { data, error } = await client.rpc('f_webinars_resumen', {
    p_sku: String(sku ?? '').trim(),
    p_max: max,
  });

  if (error || !data || typeof data !== 'object') {
    return { next_start_at: null, next_instance_slug: null, instance_count_upcoming: 0 };
  }

  const raw = data as Record<string, unknown>;
  const next = (raw['next_instance'] ?? {}) as Record<string, unknown>;
  const list = Array.isArray(raw['future_instances'])
    ? (raw['future_instances'] as Array<unknown>)
    : [];

  return {
    next_start_at: toIsoUtcOrNull(next.start_at),
    next_instance_slug: toStringOrNull(next.instance_slug),
    instance_count_upcoming: toIntOrZero(list.length),
  };
}
