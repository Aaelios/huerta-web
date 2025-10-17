// src/server/modules/webinars/m_filtros.ts

/**
 * Módulo A — m_filtros
 * Normaliza query params del Hub de Webinars y construye el ordenamiento.
 * Compatible con Next.js 15.5 y ESLint (TS/ESM). Sin I/O.
 */

export type WebinarsSort = 'recent' | 'price_asc' | 'price_desc' | 'featured';
export type WebinarsLevel = 'basico' | 'intermedio' | 'avanzado';

export interface HubSearchParams {
  page?: number;
  page_size?: number;
  topic?: string | string[];
  level?: WebinarsLevel;
  sort?: WebinarsSort;
}

export interface NormalizedParams {
  page: number;
  page_size: number;
  topic: string[];
  level: WebinarsLevel | null;
  sort: WebinarsSort;
}

/**
 * Campos válidos para construcción de ORDER BY en capa catálogo.
 * Nota: la regla “módulos primero / clases después” se aplica en m_catalogo.
 */
export type OrderField = 'featured' | 'next_start_at' | 'price_cents' | 'created_at' | 'sku';
export interface OrderSpec {
  field: OrderField;
  dir: 'asc' | 'desc';
}

/**
 * Normaliza parámetros de búsqueda del Hub.
 * - page: mínimo 1 (def 1)
 * - page_size: 1–24 (def 12)
 * - topic: siempre array, minificado y sin vacíos
 * - level: enum válido o null
 * - sort: enum válido (def 'recent')
 */
export function f_normalizaFiltrosWebinars(q: URLSearchParams | HubSearchParams): NormalizedParams {
  const asRecord = isURLSearchParams(q) ? fromSearchParams(q) : { ...q };

  const pageRaw = toNumber(asRecord.page, 1);
  const page = pageRaw < 1 ? 1 : pageRaw;

  const pageSizeRaw = toNumber(asRecord.page_size, 12);
  const page_size = clamp(pageSizeRaw, 1, 24);

  const topic = toArray(asRecord.topic).map(sanitizeTag).filter(Boolean);

  const level = isLevel(asRecord.level) ? asRecord.level : null;

  const sort = isSort(asRecord.sort) ? asRecord.sort : 'recent';

  return { page, page_size, topic, level, sort };
}

/**
 * Construye especificación de orden secundario para el listado.
 * La prioridad “módulos primero / clases después” NO se define aquí.
 */
export function f_construyeOrdenListado(sort: WebinarsSort): OrderSpec[] {
  switch (sort) {
    case 'featured':
      return [
        { field: 'featured', dir: 'desc' },      // destacados primero
        { field: 'next_start_at', dir: 'asc' },  // luego por fecha próxima
        { field: 'sku', dir: 'asc' },
      ];
    case 'price_asc':
      return [
        { field: 'price_cents', dir: 'asc' },
        { field: 'sku', dir: 'asc' },
      ];
    case 'price_desc':
      return [
        { field: 'price_cents', dir: 'desc' },
        { field: 'sku', dir: 'asc' },
      ];
    case 'recent':
    default:
      return [
        { field: 'next_start_at', dir: 'asc' },  // nulos se manejan en capa de datos
        { field: 'created_at', dir: 'desc' },
        { field: 'sku', dir: 'asc' },
      ];
  }
}

/* =========================
 * Helpers internos puros
 * ========================= */

function isURLSearchParams(v: unknown): v is URLSearchParams {
  return typeof URLSearchParams !== 'undefined' && v instanceof URLSearchParams;
}

function fromSearchParams(sp: URLSearchParams): Record<string, unknown> {
  // Soporta repetición de ?topic=...
  const obj: Record<string, unknown> = {};
  sp.forEach((value, key) => {
    if (key === 'topic') {
      const prev = obj.topic as string[] | undefined;
      obj.topic = prev ? [...prev, value] : [value];
      return;
    }
    obj[key] = value;
  });
  return obj;
}

function toNumber(v: unknown, def: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return def;
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === 'string') return [v];
  return [];
}

function sanitizeTag(s: string): string {
  const trimmed = s.trim();
  // Normaliza a minúsculas y elimina espacios duplicados
  return trimmed.replace(/\s+/g, ' ').toLowerCase();
}

function isLevel(v: unknown): v is WebinarsLevel {
  return v === 'basico' || v === 'intermedio' || v === 'avanzado';
}

function isSort(v: unknown): v is WebinarsSort {
  return v === 'recent' || v === 'price_asc' || v === 'price_desc' || v === 'featured';
}

const filtrosApi = {
  f_normalizaFiltrosWebinars,
  f_construyeOrdenListado,
};

export default filtrosApi;
