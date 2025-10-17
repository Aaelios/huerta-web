// app/api/webinars/search/route.ts

/**
 * API: /api/webinars/search
 * Lista webinars, bundles y cursos con filtros, facetas globales y destacados fijos.
 * Requiere FEATURE_WEBINARS_HUB habilitado. Next.js 15.5 · ESLint/TS compliant.
 */

import { NextResponse, type NextRequest } from 'next/server';

import {
  f_normalizaFiltrosWebinars,
  type WebinarsSort,
  type WebinarsLevel,
} from '@/src/server/modules/webinars/m_filtros';
import {
  f_catalogoListaWebinars,
  type CatalogoQuery,
  type HubSearchDTO,
} from '@/src/server/modules/webinars/m_catalogo';
import type { SupabaseRpcClient } from '@/src/server/modules/webinars/m_instancias';
import type { SupabaseClient as PriceClient } from '@/src/server/modules/webinars/m_precios';

/* =========================
 * Guards
 * ========================= */

function isHubEnabled(): boolean {
  const flag =
    process.env.FEATURE_WEBINARS_HUB === 'TRUE' ||
    process.env.FEATURE_WEBINARS_HUB === 'true' ||
    process.env.FEATURE_WEBINARS_HUB === '1';
  return Boolean(flag);
}

/* =========================
 * Supabase client loader
 * ========================= */

async function getSupabaseServiceClient(): Promise<(PriceClient & SupabaseRpcClient) | null> {
  try {
    // Preferimos factory explícita en /lib/supabase/m_getSupabaseService
    const modA: unknown = await import('@/lib/supabase/m_getSupabaseService');
    const factoryA: unknown =
      (modA as Record<string, unknown>)?.default ??
      (modA as Record<string, unknown>)?.m_getSupabaseService ??
      (modA as Record<string, unknown>)?.getSupabaseService;

    if (typeof factoryA === 'function') {
      const client = await (factoryA as () => Promise<unknown>)();
      if (client && typeof client === 'object' && 'from' in client && 'rpc' in client) {
        return client as PriceClient & SupabaseRpcClient;
      }
    }
  } catch {
    // ignore
  }

  try {
    // Fallback: /lib/supabase/server
    const modB: Record<string, unknown> = (await import('@/lib/supabase/server')) as Record<
      string,
      unknown
    >;
    const clientB =
      (modB.default as unknown) ??
      (modB.supabase as unknown) ??
      (modB.client as unknown);

    if (
      clientB &&
      typeof clientB === 'object' &&
      'from' in (clientB as object) &&
      'rpc' in (clientB as object)
    ) {
      return clientB as PriceClient & SupabaseRpcClient;
    }
  } catch {
    // ignore
  }

  return null;
}

/* =========================
 * Query parsing helpers
 * ========================= */

function qpArray(sp: URLSearchParams, key: string): string[] {
  const vals = sp.getAll(key);
  return vals.map((v) => v.trim()).filter((v) => v.length > 0);
}

function qpEnum<T extends string>(
  sp: URLSearchParams,
  key: string,
  allowed: readonly T[]
): T | undefined {
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
 * GET
 * ========================= */

export async function GET(req: NextRequest) {
  // 1) Feature flag
  if (!isHubEnabled()) {
    return NextResponse.json(
      { ok: false, error: 'forbidden', detail: 'webinars_disabled' },
      { status: 403 }
    );
  }

  // 2) Parse params
  const sp = req.nextUrl.searchParams;
  const topics = qpArray(sp, 'topic');

  const query: CatalogoQuery = {
    topic: topics.length ? topics : undefined,
    level: qpEnum<WebinarsLevel>(sp, 'level', [
      'basico',
      'intermedio',
      'avanzado',
    ] as const),
    sort: qpEnum<WebinarsSort>(sp, 'sort', [
      'recent',
      'price_asc',
      'price_desc',
      'featured',
    ] as const),
    page: qpInt(sp, 'page'),
    page_size: qpInt(sp, 'page_size'),
  };

  // 3) Normalización y clamps
  const normalized = f_normalizaFiltrosWebinars(query);
  const page = Math.max(normalized.page, 1);
  const page_size = Math.min(Math.max(normalized.page_size, 1), 24);

  try {
    // 4) Supabase client
    const supabase = await getSupabaseServiceClient();
    if (!supabase) {
      return NextResponse.json(
        { ok: false, error: 'internal_error', detail: 'supabase_unavailable' },
        { status: 500 }
      );
    }

    // 5) Query
    const data: HubSearchDTO = await f_catalogoListaWebinars(supabase, {
      topic: normalized.topic && normalized.topic.length ? normalized.topic : undefined,
      level: (normalized.level ?? undefined) as 'basico' | 'intermedio' | 'avanzado' | undefined,
      sort: (normalized.sort ?? 'recent') as 'recent' | 'price_asc' | 'price_desc' | 'featured',
      page,
      page_size,
    });

    // 6) Response — sin cache: ISR superior controla revalidate
    return NextResponse.json(
      { ok: true, params: { page, page_size, topic: normalized.topic, level: normalized.level, sort: normalized.sort }, data },
      { status: 200 }
    );
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : 'unknown_error';
    console.error('[webinars/api/search] fatal', detail);
    return NextResponse.json(
      { ok: false, error: 'internal_error', detail },
      { status: 500 }
    );
  }
}
