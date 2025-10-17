// app/webinars/page.tsx
/**
 * Módulo UI — /webinars · Webinars Hub v1
 * Página server (RSC) con ISR=900. Consume /api/webinars/search.
 * Secciones: Destacados (fijos) → Módulos/Bundles → Clases. Filtros y paginación via querystring.
 * Compatible con Next.js 15.5 y ESLint (TS/ESM). Server-only.
 */

import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { HubItemDTO, HubApiResponse } from '@/components/webinars/hub/types';
import { SectionGrid } from '@/components/webinars/hub/SectionGrid';
import { FiltersBar } from '@/components/webinars/hub/FiltersBar';
import { Pagination } from '@/components/webinars/hub/Pagination';
import * as analytics from '@/components/webinars/hub/analytics';
import s from '@/components/webinars/hub/WebinarsHub.module.css';
import { renderAccent } from '@/lib/ui/renderAccent';

export const revalidate = 900;
const REVALIDATE_SECONDS = 900;

/** Extensión del contrato: añade destacados y facetas globales */
type HubSearchResponse = HubApiResponse & {
  featured_items: HubItemDTO[];
  facets: {
    topics: string[];
    levels: Array<'basico' | 'intermedio' | 'avanzado'>;
  };
};
type ApiMaybeWrapped = HubSearchResponse | { data: HubSearchResponse };
type ApiMaybeWrappedOrDisabled = ApiMaybeWrapped | { maintenance: true };

function isWrapped(x: unknown): x is { data: HubSearchResponse } {
  return typeof x === 'object' && x !== null && 'data' in x;
}
function unwrapApi(x: ApiMaybeWrapped): HubSearchResponse {
  return isWrapped(x) ? x.data : x;
}

// --- Helpers SSR ---
function parseQS(searchParams: Record<string, string | string[] | undefined>) {
  const page = Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page) || 1;
  const page_size_raw =
    Number(Array.isArray(searchParams.page_size) ? searchParams.page_size[0] : searchParams.page_size) || 12;
  const page_size = Math.min(24, Math.max(1, page_size_raw)); // clamp 1–24
  const sort = (Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort) || 'recent';
  const level = (Array.isArray(searchParams.level) ? searchParams.level[0] : searchParams.level) || undefined;
  const tp = searchParams.topic;
  const topic = Array.isArray(tp) ? tp : tp ? [tp] : [];
  return { page: Math.max(1, page), page_size, sort, level, topic };
}

function splitItems(items: HubItemDTO[]) {
  const modulesBundles = items.filter(
    (it) => it.fulfillment_type === 'bundle' || it.fulfillment_type === 'course'
  );
  const classes = items.filter((it) => it.fulfillment_type === 'live_class');
  return { modulesBundles, classes };
}

async function fetchHub(params: ReturnType<typeof parseQS>): Promise<ApiMaybeWrappedOrDisabled> {
  const qs = new URLSearchParams();
  qs.set('page', String(params.page));
  qs.set('page_size', String(params.page_size));
  if (params.level) qs.set('level', params.level);
  if (params.sort) qs.set('sort', params.sort);
  for (const t of params.topic) qs.append('topic', t);

  const url = `${process.env.APP_URL ?? ''}/api/webinars/search?${qs.toString()}`;
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } }); // sin 'no-store'
  if (!res.ok) {
    if (res.status === 403) return { maintenance: true };
    if (res.status === 404) notFound();
    throw new Error(`Hub fetch error: ${res.status}`);
  }
  return (await res.json()) as ApiMaybeWrapped;
}

// --- Página principal ---
export default async function WebinarsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const spRaw = (await searchParams) ?? {};
  const sp = parseQS(spRaw);

  const raw = await fetchHub(sp);
  if ('maintenance' in raw) {
    return (
      <div className={`container ${s.hub}`}>
        <header className="l-hero--compact">
          <h1>{renderAccent('Webinars [[LOBRÁ]]')}</h1>
          <p>Estamos en mantenimiento. Vuelve más tarde.</p>
        </header>
      </div>
    );
  }

  const { items, featured_items, facets, page, page_size: pageSize, total } = unwrapApi(raw);

  analytics.view_item_list({ page: sp.page, sort: sp.sort, pageSize: sp.page_size });

  const { modulesBundles, classes } = splitItems(items);
  const hasResults = total > 0;

  return (
    <div className={`container ${s.hub}`}>
      <header className="l-hero--compact">
        <h1>{renderAccent('Webinars [[LOBRÁ]]')}</h1>
        <p>
          {renderAccent(
            'Explora [[workshops en vivo]], [[módulos]] y [[bundles]]. Filtra por tema y nivel. Compra individual o en paquete.'
          )}
        </p>
      </header>

      {featured_items.length > 0 && (
        <SectionGrid title="Casi llenos" items={featured_items} featured />
      )}

      <div className={`section ${s.filtersBar}`}>
        <FiltersBar
          topics={facets.topics}
          levelOptions={facets.levels}
          selected={{ topics: sp.topic, level: sp.level, sort: sp.sort }}
        />
      </div>

      {modulesBundles.length > 0 && (
        <SectionGrid title="Módulos completos" items={modulesBundles} className={s.bundlesGrid} />
      )}
      {classes.length > 0 && (
        <SectionGrid title="Workshops disponibles" items={classes} className={s.classGrid} />
      )}

      {!hasResults && (
        <div className={s.emptyState} role="status" aria-live="polite">
          <p>No hay resultados con los filtros seleccionados.</p>
          <Link className="c-btn" href="/webinars">
            Ver todos
          </Link>
        </div>
      )}

      {hasResults && (
        <div className="section">
          <Pagination page={page} pageSize={pageSize} total={total} />
        </div>
      )}
    </div>
  );
}
