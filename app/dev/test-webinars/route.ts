// app/dev/test-webinars/route.ts

/**
 * Dev tests handler for Webinars Hub modules.
 * Guarded by ALLOW_DEV_TESTS=1 and FEATURE_WEBINARS_HUB=true.
 * Next.js 15.5 App Router, ESM, strict TS, ESLint-safe.
 */

import { NextResponse, type NextRequest } from 'next/server';

// Módulos server-side
import {
  f_normalizaFiltrosWebinars,
  f_construyeOrdenListado,
  type WebinarsSort,
  type WebinarsLevel,
} from '@/src/server/modules/webinars/m_filtros';
import {
  f_instanciaProximaPorSku,
  type SupabaseRpcClient,
} from '@/src/server/modules/webinars/m_instancias';
import {
  f_precioVigentePorSku,
  type SupabaseClient as PriceClient,
} from '@/src/server/modules/webinars/m_precios';
import {
  f_catalogoListaWebinars,
  type CatalogoQuery,
} from '@/src/server/modules/webinars/m_catalogo';

/* =========================
 * Guards
 * ========================= */

function isDevEnabled(): boolean {
  const allow = process.env.ALLOW_DEV_TESTS === '1';
  const flag = process.env.FEATURE_WEBINARS_HUB === 'TRUE' || process.env.FEATURE_WEBINARS_HUB === 'true' || process.env.FEATURE_WEBINARS_HUB === '1';
  const notProd = process.env.VERCEL_ENV !== 'production';
  return allow && flag && notProd;
}

/* =========================
 * Supabase client loader (best-effort)
 * No asumimos nombres exactos. Intentamos dos ubicaciones comunes.
 * ========================= */

async function getSupabaseServiceClient(): Promise<(PriceClient & SupabaseRpcClient) | null> {
  // Candidate 1: /lib/supabase/m_getSupabaseService
  try {
    const modA: unknown = await import('@/lib/supabase/m_getSupabaseService');
    // Common shapes: default export function or named factory
    const candidateA: any =
      (modA as any)?.default ??
      (modA as any)?.m_getSupabaseService ??
      (modA as any)?.getSupabaseService ??
      null;

    if (typeof candidateA === 'function') {
      const client = await candidateA();
      if (client && typeof client === 'object' && 'from' in client && 'rpc' in client) {
        return client as PriceClient & SupabaseRpcClient;
      }
    }
  } catch {
    // ignore
  }

  // Candidate 2: /lib/supabase/server
  try {
    const modB: any = await import('@/lib/supabase/server');
    const clientB: any =
      modB?.default ??
      modB?.supabase ??
      modB?.client ??
      null;

    if (clientB && typeof clientB === 'object' && 'from' in clientB && 'rpc' in clientB) {
      return clientB as PriceClient & SupabaseRpcClient;
    }
  } catch {
    // ignore
  }

  return null;
}

/* =========================
 * Helpers
 * ========================= */

function qpArray(sp: URLSearchParams, key: string): string[] {
  const vals = sp.getAll(key);
  return vals.map((v) => v.trim()).filter((v) => v.length > 0);
}

function qpEnum<T extends string>(sp: URLSearchParams, key: string, allowed: readonly T[]): T | undefined {
  const v = sp.get(key);
  if (!v) return undefined;
  return (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
}

function qpInt(sp: URLSearchParams, key: string): number | undefined {
  const v = sp.get(key);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

/* =========================
 * GET handler
 * ========================= */

export async function GET(req: NextRequest) {
  if (!isDevEnabled()) {
    return NextResponse.json({ error: 'forbidden', detail: 'Dev tests disabled' }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const mod = sp.get('module');

  try {
    switch (mod) {
      case 'filtros': {
        // Build params using raw query values
        const params = {
          page: qpInt(sp, 'page'),
          page_size: qpInt(sp, 'page_size'),
          topic: qpArray(sp, 'topic'),
          level: qpEnum<WebinarsLevel>(sp, 'level', ['Fundamentos', 'Profundización', 'Impacto'] as const),
          sort: qpEnum<WebinarsSort>(sp, 'sort', ['recent', 'price_asc', 'price_desc', 'featured'] as const),
        };
        const normalized = f_normalizaFiltrosWebinars(params);
        const order = f_construyeOrdenListado(normalized.sort);
        return NextResponse.json({ ok: true, normalized, order });
      }

      case 'instancias': {
        const sku = sp.get('sku') ?? '';
        const max = qpInt(sp, 'max') ?? 5;

        const supabase = await getSupabaseServiceClient();
        if (!supabase) {
          return NextResponse.json({ error: 'internal_error', detail: 'Supabase client not available' }, { status: 500 });
        }

        const resumen = await f_instanciaProximaPorSku(supabase, sku, max);
        return NextResponse.json({ ok: true, sku, resumen });
      }

      case 'precio': {
        const sku = sp.get('sku') ?? '';
        const currency = (sp.get('currency') ?? 'MXN') as 'MXN' | 'USD';

        const supabase = await getSupabaseServiceClient();
        if (!supabase) {
          return NextResponse.json({ error: 'internal_error', detail: 'Supabase client not available' }, { status: 500 });
        }

        const precio = await f_precioVigentePorSku(supabase, sku, currency);
        return NextResponse.json({ ok: true, sku, precio });
      }

      case 'catalogo': {
        const topics = qpArray(sp, 'topic');
        const query: CatalogoQuery = {
          topic: topics.length ? topics : undefined,
          level: qpEnum<WebinarsLevel>(sp, 'level', ['Fundamentos', 'Profundización', 'Impacto'] as const),
          sort: qpEnum<WebinarsSort>(sp, 'sort', ['recent', 'price_asc', 'price_desc', 'featured'] as const),
          page: qpInt(sp, 'page'),
          page_size: qpInt(sp, 'page_size'),
        };

        const supabase = await getSupabaseServiceClient();
        if (!supabase) {
          return NextResponse.json({ error: 'internal_error', detail: 'Supabase client not available' }, { status: 500 });
        }

        const data = await f_catalogoListaWebinars(supabase, query);
        return NextResponse.json({ ok: true, query, data });
      }

      default:
        return NextResponse.json(
          {
            error: 'bad_request',
            detail:
              'Use ?module=filtros|instancias|precio|catalogo',
          },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : 'unknown_error';
    return NextResponse.json({ error: 'internal_error', detail }, { status: 500 });
  }
}
