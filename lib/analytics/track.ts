// /lib/analytics/track.ts
/**
 * Módulo — track (Infra común)
 * Helper central de analítica con antirrebote. Sin UI ni rutas.
 * Seguro para Server y Client. ESLint/TS estricto.
 *
 * Eventos soportados:
 * - 'featured_view'  { placement: 'home_featured'; sku?: string; type?: 'live_class'|'bundle'|'one_to_one' }
 * - 'hub_view'       { filters?: Record<string, unknown>; items_count?: number }
 * - 'cta_click'      { placement: string; sku?: string; type?: 'live_class'|'bundle'|'one_to_one' }
 * - 'select_item'    { sku: string; from: 'home'|'hub'|'sales' }
 *
 * Estado: deshabilitado por defecto hasta configurar GTM.
 */

export type EventName = 'featured_view' | 'hub_view' | 'cta_click' | 'select_item';

export type EventPayload =
  | { placement: 'home_featured'; sku?: string; type?: 'live_class' | 'bundle' | 'one_to_one' } // featured_view
  | { filters?: Record<string, unknown>; items_count?: number } // hub_view
  | { placement: string; sku?: string; type?: 'live_class' | 'bundle' | 'one_to_one' } // cta_click
  | { sku: string; from: 'home' | 'hub' | 'sales' }; // select_item

export interface TrackOptions {
  debounceMs?: number; // default 2000
}

/** Flag global. Mantener en false hasta habilitar GTM. */
export const ENABLED = false;

/* ============================================================================
 * Bloque A — Estado interno de antirrebote
 * ========================================================================== */

const lastEventAt: Map<string, number> = new Map();

function now(): number {
  return Date.now();
}

function shouldSend(key: string, debounceMs: number): boolean {
  const t = lastEventAt.get(key) ?? 0;
  if (now() - t < debounceMs) return false;
  lastEventAt.set(key, now());
  return true;
}

/* ============================================================================
 * Bloque B — Emisores concretos
 * Nota: Sin asumir dataLayer; se verifica en runtime y se hace no-op en SSR.
 * ========================================================================== */

function emitToDataLayer(name: EventName, payload: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  const dl = w['dataLayer'] as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(dl)) return;
  dl.push({ event: name, ...payload });
}

/* ============================================================================
 * Bloque C — API pública
 * ========================================================================== */

export function track(name: EventName, payload: EventPayload, opts?: TrackOptions): void {
  if (!ENABLED) return;

  const debounceMs = typeof opts?.debounceMs === 'number' && opts.debounceMs > 0 ? opts.debounceMs : 2000;

  // Clave de antirrebote por nombre + subset relevante del payload
  const key =
    name === 'featured_view'
      ? `${name}:${(payload as { placement?: string }).placement ?? 'home_featured'}`
      : name === 'cta_click'
      ? `${name}:${(payload as { placement?: string }).placement ?? 'unknown'}:${(payload as { sku?: string }).sku ?? ''}`
      : name === 'select_item'
      ? `${name}:${(payload as { sku: string }).sku}`
      : name; // hub_view

  if (!shouldSend(key, debounceMs)) return;

  // Emisión defensiva
  const safePayload: Record<string, unknown> = { ...payload };
  emitToDataLayer(name, safePayload);
}
