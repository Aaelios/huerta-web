// lib/ui_checkout/findWebinarBy.ts

/**
 * Wrapper para localizar un webinar por `sku` o `price_id`.
 * Delegamos en los helpers existentes con caché:
 *  - getWebinarBySku
 *  - getWebinarByPriceId
 *
 * No carga JSONC directamente. No duplica índices.
 */

import { getWebinarBySku } from '../webinars/getWebinarBySku';
import { getWebinarByPriceId } from '../webinars/getWebinarByPriceId';
import type { Webinar } from '@/lib/types/webinars';

export type FindCriteria = {
  sku?: string | null;
  price_id?: string | null; // alias común
  priceId?: string | null;  // alias alterno
};

export type FindResult = { slug: string; webinar: Webinar } | null;

export async function findWebinarBy(criteria: FindCriteria): Promise<FindResult> {
  const sku = norm(criteria.sku);
  const priceId = norm(criteria.price_id) || norm(criteria.priceId);

  if (!sku && !priceId) return null;

  // 1) Buscar por SKU
  if (sku) {
    const w = await getWebinarBySku(sku);
    if (w?.shared?.slug) return { slug: String(w.shared.slug), webinar: w };
  }

  // 2) Buscar por Price ID
  if (priceId) {
    const w = await getWebinarByPriceId(priceId);
    if (w?.shared?.slug) return { slug: String(w.shared.slug), webinar: w };
  }

  return null;
}

/* ------------------------ utils ------------------------ */

function norm(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return s.length ? s : null;
}
