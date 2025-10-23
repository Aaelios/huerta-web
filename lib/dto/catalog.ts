// /lib/dto/catalog.ts
/**
 * Módulo — DTOs de Catálogo (Infra común)
 * Define contratos canónicos usados por Home Featured, Webinars Hub y Sales Pages.
 * No renderiza UI, no toca rutas. Compatible con Next.js 15.5 y ESLint (TS/ESM).
 *
 * Dependencias lógicas:
 * - Supabase (products, v_prices_vigente, bundles, live_class_instances, RPCs confirmadas)
 * - JSONC maestro (fallback de copys y mínimos)
 *
 * Regla base: “proveer datos, no mostrarlos”.
 */

/* ============================================================================
 * Bloque A — Tipos base
 * Objetivo: Unificar enumeraciones y alias de campos compartidos.
 * ========================================================================== */

/** Tipos válidos de fulfillment en el stack (doc maestro) */
export type FulfillmentType = 'live_class' | 'bundle' | 'one_to_one';

/** Estados de instancia en capa pública (sin campos sensibles) */
export type InstanceStatus =
  | 'scheduled'
  | 'open'
  | 'sold_out'
  | 'ended'
  | 'canceled';

/** ISO8601 en UTC como string (no Date para evitar serialización en RSC) */
export type IsoUtcString = string;

/** Monedas soportadas en UI (vista de precios) */
export type CurrencyCode = 'MXN' | 'USD';

/* ============================================================================
 * Bloque B — DTOs canónicos
 * Objetivo: Contratos serializables, reutilizables y estables.
 * ========================================================================== */

/**
 * FeaturedDTO
 * Resumen unificado para el “destacado” en Home.
 * price_mxn y compare_at_total expresados en centavos (int) o null si no aplica.
 */
export interface FeaturedDTO {
  sku: string;
  type: FulfillmentType; // 'live_class' | 'bundle' | 'one_to_one'
  title: string;
  subtitle: string | null;
  page_slug: string; // slug canónico de la página de ventas/landing
  price_mxn: number | null; // centavos MXN; null si no hay precio vigente
  compare_at_total: number | null; // solo bundles si aplica; en centavos
  next_start_at: IsoUtcString | null; // próxima fecha si existe
}

/**
 * ProductCardDTO
 * Tarjeta compacta para listados y grids; mantiene shape mínimo.
 */
export interface ProductCardDTO {
  sku: string;
  type: FulfillmentType;
  title: string;
  badge: string | null; // p.ej. “Básico”, “Intermedio”, “Avanzado” o copy corto
  next_start_at: IsoUtcString | null;
  price_mxn: number | null; // centavos MXN; null si no hay precio vigente
  page_slug: string;
}

/**
 * BundleScheduleDTO
 * Programación agregada de un bundle y las próximas fechas de sus hijos.
 */
export interface BundleScheduleDTO {
  bundle_sku: string;
  next_start_at: IsoUtcString | null; // próxima fecha global del bundle
  children: Array<{
    child_sku: string;
    next_start_at: IsoUtcString | null;
  }>;
}

/**
 * InstanceDTO
 * Instancia pública de una live_class. No incluye campos sensibles.
 */
export interface InstanceDTO {
  instance_id: string; // uuid o id lógico expuesto por RPC
  instance_slug: string; // p.ej. 'yyyy-mm-dd-hhmm'
  start_at: IsoUtcString; // inicio en UTC
  status: InstanceStatus;
}

/* ============================================================================
 * Bloque C — Tipos auxiliares para catálogos (opcional, de solo lectura)
 * Objetivo: Facilitar tipado de colecciones sin amarrar a UI.
 * ========================================================================== */

/** Conjunto básico de ítems para listados (ej. Hub), sin detalles de UI */
export interface CatalogListDTO<TItem = ProductCardDTO> {
  items: TItem[]; // mezcla permitida por fulfillment_type
  featured_items?: TItem[]; // destacados globales opcionales
  page?: number;
  page_size?: number;
  total?: number; // total paginado de live_class si aplica
}

/* ============================================================================
 * Bloque D — Type Guards (ligeros, sin dependencia de Zod)
 * Objetivo: Proveer validaciones de forma segura en fetchers/mappers.
 * ========================================================================== */

export function isFulfillmentType(v: unknown): v is FulfillmentType {
  return v === 'live_class' || v === 'bundle' || v === 'one_to_one';
}

export function isIsoUtcString(v: unknown): v is IsoUtcString {
  return typeof v === 'string' && v.length >= 10; // verificación laxa y barata
}
