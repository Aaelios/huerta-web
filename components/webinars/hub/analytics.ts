// components/webinars/hub/analytics.ts
/**
 * Analytics no-op — Webinars Hub v1
 * API estable para instrumentación futura. Hoy solo consola.
 */

export function view_item_list(payload: { page: number; pageSize: number; sort: string }) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics] view_item_list', payload);
  }
}

export function select_item(sku: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics] select_item', { sku });
  }
}

export function filter_applied(payload: { topics: string[]; level?: string }) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics] filter_applied', payload);
  }
}

export function sort_applied(sort: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[analytics] sort_applied', { sort });
  }
}