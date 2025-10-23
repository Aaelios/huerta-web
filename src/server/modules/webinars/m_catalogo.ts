// src/server/modules/webinars/m_catalogo.ts

/**
 * Módulo D — m_catalogo
 * Une datos de productos, precios e instancias para el Hub de Webinars.
 * Fuentes: products (catálogo + page_slug), m_precios, m_instancias.
 * Compatible con Next.js 15.5 y ESLint (TS/ESM). Server-only.
 */

import type { PrecioVigente, SupabaseClient as PriceClient } from './m_precios';
import type { InstanciaResumen, SupabaseRpcClient } from './m_instancias';
import { f_precioVigentePorSku } from './m_precios';
import { f_instanciaProximaPorSku } from './m_instancias';
import {
  f_normalizaFiltrosWebinars,
  f_construyeOrdenListado,
  type OrderSpec,
  type OrderField,
} from './m_filtros';

export interface CatalogoQuery {
  topic?: string | string[];
  level?: 'Fundamentos' | 'Profundización' | 'Impacto';
  sort?: 'recent' | 'price_asc' | 'price_desc' | 'featured';
  page?: number;
  page_size?: number;
}

/** Fila mínima esperada desde products */
interface ProductRow {
  sku: string;
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  product_type?: string | null;  // pista opcional
  visibility?: string | null;
  status?: string | null;
  page_slug?: string | null;
  created_at?: string | null; // ISO para orden secundario local
}

type Level = 'Fundamentos' | 'Profundización' | 'Impacto';

interface ProductMeta {
  topics?: unknown;
  level?: unknown;
  purchasable?: unknown;
  is_featured?: unknown;
  fulfillment_type?: unknown;
  module_sku?: unknown;
  cover?: unknown;
  product_slug?: unknown;
}

export interface HubItemDTO {
  sku: string;
  title: string;
  summary: string | null;
  cover: string | null;
  level: Level | null;
  topics: string[];
  module_sku: string | null;
  purchasable: boolean;
  price_cents: number | null;
  currency: string | null;
  next_start_at: string | null;
  instance_count_upcoming: number;
  featured: boolean;
  fulfillment_type: 'bundle' | 'course' | 'live_class' | 'one_to_one';
  landing_slug: string;
  instance_slug: string | null;
}

export interface HubFacetsDTO {
  topics: string[];
  levels: Level[];
}

export interface HubSearchDTO {
  items: HubItemDTO[];           // Mezcla: bundles/courses (no paginados) + live_class paginados
  featured_items: HubItemDTO[];  // Siempre visibles, ignoran filtros
  facets: HubFacetsDTO;          // Globales, sin filtros
  page: number;
  page_size: number;
  total: number;                 // Conteo SOLO de live_class que cumplen filtros
}

/* Tipos mínimos para castear el cliente sin usar any */
type SelectResult<T> = { data: T[] | null; error: { message: string } | null };

type FromSelectAll<T> = {
  from: (table: string) => {
    select: (cols: string) => Promise<SelectResult<T>>;
  };
};

type FromSelectEqLimit<T> = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: unknown) => {
        limit: (n: number) => Promise<SelectResult<T>>;
      };
    };
  };
};

/* Wrappers tipados para evitar errores en VS Code */
async function selectAllProducts(
  supabase: unknown
): Promise<SelectResult<ProductRow>> {
  const c = supabase as FromSelectAll<ProductRow>;
  return c
    .from('products')
    .select(
      // Incluye created_at para orden fijo de bundles/courses
      'sku, name, description, metadata, product_type, visibility, status, page_slug, created_at'
    );
}

async function selectProductPageSlugBySku(
  supabase: unknown,
  sku: string
): Promise<SelectResult<{ page_slug: string | null }>> {
  const c = supabase as FromSelectEqLimit<{ page_slug: string | null }>;
  return c.from('products').select('page_slug').eq('sku', sku).limit(1);
}

/**
 * f_catalogoListaWebinars
 * Lee productos de products y construye respuesta con:
 * - Facetas globales (sin filtros)
 * - Destacados fijos (sin filtros)
 * - Items: bundles/courses no paginados + live_class paginados
 */
export async function f_catalogoListaWebinars(
  supabase: PriceClient & SupabaseRpcClient,
  params: CatalogoQuery
): Promise<HubSearchDTO> {
  const p = f_normalizaFiltrosWebinars(params);
  const orderSpec = f_construyeOrdenListado(p.sort);

  const { data: products, error } = await selectAllProducts(supabase);

  if (error || !products) {
    return {
      items: [],
      featured_items: [],
      facets: { topics: [], levels: [] },
      page: p.page,
      page_size: p.page_size,
      total: 0,
    };
  }

  // Catálogo activo y público
  const active = products.filter(
    (row) => row.visibility === 'public' && row.status === 'active'
  );

  // Facetas globales (sin filtros)
  const facets = f_catalogoFacetas(active);

  // Cache de slugs
  const pageSlugCache = new Map<string, string | null>();

  // Destacados fijos, ignoran filtros
  const featured_items = await f_catalogoFeatured(
    active,
    supabase,
    pageSlugCache
  );

  // FILTRADO por reglas
  const withTopic = (row: ProductRow): boolean => {
    const meta = (row.metadata || {}) as ProductMeta;
    const topics = toStringArray(meta.topics);
    return p.topic.length === 0 || topics.some((t) => p.topic.includes(t));
  };

  const fulfillmentOf = (row: ProductRow): HubItemDTO['fulfillment_type'] | null => {
    const meta = (row.metadata || {}) as ProductMeta;
    return toFulfillment(meta.fulfillment_type, row.product_type);
  };

  const isLive = (row: ProductRow): boolean => fulfillmentOf(row) === 'live_class';

  const matchLevelLive = (row: ProductRow): boolean => {
    if (!p.level) return true; // si no hay filtro, pasa
    const meta = (row.metadata || {}) as ProductMeta;
    const level = toLevel(meta.level);
    return level === p.level;
  };

  // M = bundles/courses filtrados por topic (no paginan)
  const M_source = active.filter((row) => {
    const ft = fulfillmentOf(row);
    return (ft === 'bundle' || ft === 'course') && withTopic(row);
  });

  // Orden fijo para M: featured desc, luego created_at desc
  const M_sorted = [...M_source].sort((a, b) => {
    const ma = (a.metadata || {}) as ProductMeta;
    const mb = (b.metadata || {}) as ProductMeta;
    const fa = toBoolean(ma.is_featured) ? 1 : 0;
    const fb = toBoolean(mb.is_featured) ? 1 : 0;
    if (fa !== fb) return fb - fa; // featured primero
    const ca = a.created_at ? Date.parse(a.created_at) : Number.NEGATIVE_INFINITY;
    const cb = b.created_at ? Date.parse(b.created_at) : Number.NEGATIVE_INFINITY;
    return cb - ca; // más reciente primero
  });

  // L = live_class filtrados por topic y level (paginan y ordenan por sort)
  const L_source = active.filter((row) => isLive(row) && withTopic(row) && matchLevelLive(row));

  // Mapear helpers de precio/instancia para obtener llaves de orden en L
  const L_items_raw: HubItemDTO[] = await mapRowsToItems(
    L_source,
    supabase,
    pageSlugCache
  );

  // Ordenamiento para L según sort
  const orderSpecs: OrderSpec[] = [...orderSpec].reverse();
  const L_items_sorted = [...L_items_raw];

  // Comprables primero
  L_items_sorted.sort((a, b) => {
    if (a.purchasable === b.purchasable) return 0;
    return a.purchasable ? -1 : 1;
  });

  for (const spec of orderSpecs) {
    const key = mapOrderFieldToDtoKey(spec.field);
    if (!key) continue;
    L_items_sorted.sort((a, b) => compareByField(key, spec.dir, a, b));
  }

  // Paginación SOLO de L
  const total = L_items_sorted.length;
  const offset = (p.page - 1) * p.page_size;
  const L_paged = L_items_sorted.slice(offset, offset + p.page_size);

  // Mapear M a DTO (no paginados)
  const M_items = await mapRowsToItems(M_sorted, supabase, pageSlugCache);

  // Ensamble final: M primero (no paginado) + L paginado
  const items: HubItemDTO[] = [...M_items, ...L_paged];

  return {
    items,
    featured_items,
    facets,
    page: p.page,
    page_size: p.page_size,
    total, // solo live_class
  };
}

/**
 * Mapea una lista de ProductRow a HubItemDTO usando precio e instancia.
 * Para bundles/courses sin instancia propia, deriva próxima fecha del module_sku (si existe).
 */
async function mapRowsToItems(
  rows: ProductRow[],
  supabase: PriceClient & SupabaseRpcClient,
  pageSlugCache: Map<string, string | null>
): Promise<HubItemDTO[]> {
  const out: HubItemDTO[] = [];
  for (const row of rows) {
    const precio: PrecioVigente = await f_precioVigentePorSku(
      supabase as PriceClient,
      row.sku,
      'MXN'
    );

    let inst: InstanciaResumen = await f_instanciaProximaPorSku(
      supabase as SupabaseRpcClient,
      row.sku,
      5
    );

    // Derivar próxima fecha para bundles/courses desde module_sku si no hay propia
    if (!inst.next_start_at) {
      const meta = (row.metadata || {}) as ProductMeta;
      const ft = toFulfillment(meta.fulfillment_type, row.product_type);
      const childSku = toStringOrNull(meta.module_sku);
      if ((ft === 'bundle' || ft === 'course') && childSku) {
        const instChild = await f_instanciaProximaPorSku(
          supabase as SupabaseRpcClient,
          childSku,
          5
        );
        if (instChild.next_start_at) {
          inst = instChild;
        }
      }
    }

    const item = await f_catalogoMapItemWebinar(
      row,
      precio,
      inst,
      supabase,
      pageSlugCache
    );
    out.push(item);
  }
  return out;
}

/**
 * Construye facetas globales: union de topics y niveles presentes en live_class.
 */
function f_catalogoFacetas(products: ProductRow[]): HubFacetsDTO {
  const topicsSet = new Set<string>();
  const levelsSet = new Set<Level>();

  for (const row of products) {
    const meta = (row.metadata || {}) as ProductMeta;
    const topics = toStringArray(meta.topics);
    topics.forEach((t) => topicsSet.add(t));

    const ft = toFulfillment(meta.fulfillment_type, row.product_type);
    if (ft === 'live_class') {
      const lvl = toLevel(meta.level);
      if (lvl) levelsSet.add(lvl);
    }
  }

  return {
    topics: Array.from(topicsSet).sort((a, b) => a.localeCompare(b)),
    levels: Array.from(levelsSet).sort((a, b) => a.localeCompare(b)),
  };
}

/**
 * Devuelve lista de destacados globales, ignorando filtros y paginación.
 */
async function f_catalogoFeatured(
  products: ProductRow[],
  supabase: PriceClient & SupabaseRpcClient,
  pageSlugCache: Map<string, string | null>
): Promise<HubItemDTO[]> {
  const featuredRows = products.filter((row) => {
    const meta = (row.metadata || {}) as ProductMeta;
    return toBoolean(meta.is_featured);
  });

  const items = await mapRowsToItems(featuredRows, supabase, pageSlugCache);

  // Próximos primero; prioridad a live_class
  items.sort((a, b) => {
    const an = a.next_start_at ? Date.parse(a.next_start_at) : Number.POSITIVE_INFINITY;
    const bn = b.next_start_at ? Date.parse(b.next_start_at) : Number.POSITIVE_INFINITY;
    if (an !== bn) return an - bn;
    if (a.fulfillment_type !== b.fulfillment_type) {
      return a.fulfillment_type === 'live_class' ? -1 : 1;
    }
    return a.sku.localeCompare(b.sku);
  });

  // Desduplicar por SKU por seguridad
  const seen = new Set<string>();
  return items.filter((it) => (seen.has(it.sku) ? false : (seen.add(it.sku), true)));
}

/**
 * f_catalogoMapItemWebinar
 */
export async function f_catalogoMapItemWebinar(
  row: ProductRow,
  precio: PrecioVigente,
  inst: InstanciaResumen,
  supabase: PriceClient & SupabaseRpcClient,
  pageSlugCache?: Map<string, string | null>
): Promise<HubItemDTO> {
  const meta = (row.metadata || {}) as ProductMeta;

  const topics = toStringArray(meta.topics);
  const level = toLevel(meta.level);
  const purchasable = toBoolean(meta.purchasable);
  const featured = toBoolean(meta.is_featured);
  const ft = toFulfillment(meta.fulfillment_type, row.product_type);

  if (!ft) {
    console.warn('[webinars] exclude_sku_invalid_fulfillment', { sku: row.sku });
    // fallback seguro como live_class para no romper contratos
  }

  const ownPageSlug = resolveOwnPageSlug(row);

  let landing_slug = ownPageSlug;
  let instance_slug: string | null = null;

  if (ft === 'live_class') {
    if (purchasable) {
      instance_slug = inst.next_instance_slug;
      landing_slug = ownPageSlug;
    } else {
      const moduleSku = toStringOrNull(meta.module_sku);
      const modulePage = moduleSku
        ? await resolvePageSlugBySku(supabase, moduleSku, pageSlugCache)
        : null;
      landing_slug = modulePage ?? fallbackSlug(moduleSku ?? row.sku, meta);
      instance_slug = null;
    }
  } else {
    // bundle / course / one_to_one
    // Si no hay próxima del propio SKU pero sí del módulo, inst ya viene derivada en mapRowsToItems
    landing_slug = ownPageSlug;
    instance_slug = null;
  }

  return {
    sku: String(row.sku),
    title: String(row.name),
    summary: row.description ? String(row.description).slice(0, 200) : null,
    cover: toStringOrNull(meta.cover),
    level,
    topics,
    module_sku: toStringOrNull(meta.module_sku),
    purchasable,
    price_cents: precio.price_cents,
    currency: precio.currency,
    next_start_at: inst.next_start_at,
    instance_count_upcoming: inst.instance_count_upcoming,
    featured,
    fulfillment_type: (ft ?? 'live_class'),
    landing_slug,
    instance_slug,
  };
}

/* =========================
 * Helpers internos
 * ========================= */

function mapOrderFieldToDtoKey(field: OrderField): keyof HubItemDTO | null {
  switch (field) {
    case 'featured':
      return 'featured';
    case 'next_start_at':
      return 'next_start_at';
    case 'price_cents':
      return 'price_cents';
    case 'sku':
      return 'sku';
    case 'created_at':
    default:
      return null; // created_at no existe en DTO; solo se usa internamente en M
  }
}

function compareByField(
  field: keyof HubItemDTO,
  dir: 'asc' | 'desc',
  a: HubItemDTO,
  b: HubItemDTO
): number {
  const av = a[field];
  const bv = b[field];
  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  let res = 0;

  switch (field) {
    case 'price_cents': {
      const an = av as number;
      const bn = bv as number;
      res = an === bn ? 0 : an < bn ? -1 : 1;
      break;
    }
    case 'featured': {
      const an = (av as boolean) ? 1 : 0;
      const bn = (bv as boolean) ? 1 : 0;
      res = an === bn ? 0 : an < bn ? -1 : 1;
      break;
    }
    case 'sku': {
      res = String(av).localeCompare(String(bv));
      break;
    }
    case 'next_start_at': {
      const an = String(av);
      const bn = String(bv);
      res = an.localeCompare(bn);
      break;
    }
    default: {
      res = String(av).localeCompare(String(bv));
    }
  }

  return dir === 'asc' ? res : -res;
}

function resolveOwnPageSlug(row: ProductRow): string {
  if (row.page_slug && typeof row.page_slug === 'string') return row.page_slug;
  const meta = (row.metadata || {}) as ProductMeta;
  const productSlug = toStringOrNull(meta.product_slug);
  if (productSlug) return productSlug;
  return fallbackSlug(row.sku, meta);
}

function fallbackSlug(sku: string, meta: ProductMeta): string {
  const ftRaw =
    typeof meta.fulfillment_type === 'string'
      ? (meta.fulfillment_type as string)
      : 'product';
  if (ftRaw === 'bundle' || ftRaw === 'course') return `/producto/${sku}`;
  if (ftRaw === 'one_to_one') return `/servicio/${sku}`;
  if (ftRaw === 'live_class') return `/webinar/${sku}`;
  return `/producto/${sku}`;
}

async function resolvePageSlugBySku(
  supabase: PriceClient,
  sku: string,
  cache?: Map<string, string | null>
): Promise<string | null> {
  if (cache && cache.has(sku)) return cache.get(sku) ?? null;

  const { data, error } = await selectProductPageSlugBySku(supabase, sku);

  const value =
    error || !data || data.length === 0
      ? null
      : data[0]?.page_slug
      ? String(data[0].page_slug)
      : null;

  if (cache) cache.set(sku, value);
  return value;
}

/* =========================
 * Type-safe meta helpers
 * ========================= */

function toStringArray(val: unknown): string[] {
  return Array.isArray(val) ? val.map((t) => String(t)) : [];
}

function toStringOrNull(val: unknown): string | null {
  return typeof val === 'string' ? val : null;
}

function toBoolean(val: unknown): boolean {
  return val === true || val === 'true' || val === 1;
}

function toLevel(val: unknown): Level | null {
  if (val === 'Fundamentos' || val === 'Profundización' || val === 'Impacto') return val;
  return null;
}

function toFulfillment(
  metaVal: unknown,
  rowType?: string | null
): HubItemDTO['fulfillment_type'] | null {
  const mv =
    metaVal === 'bundle' ||
    metaVal === 'course' ||
    metaVal === 'live_class' ||
    metaVal === 'one_to_one'
      ? (metaVal as HubItemDTO['fulfillment_type'])
      : null;

  if (mv) return mv;

  // fallback opcional con product_type si coincide con nuestros tipos
  if (
    rowType === 'bundle' ||
    rowType === 'course' ||
    rowType === 'live_class' ||
    rowType === 'one_to_one'
  ) {
    return rowType;
  }

  return null;
}

const api = {
  f_catalogoListaWebinars,
  f_catalogoMapItemWebinar,
};

export default api;
