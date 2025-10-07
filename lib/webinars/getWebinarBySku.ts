// lib/webinars/getWebinarBySku.ts

import { loadWebinars } from "./loadWebinars";
import { WebinarMapSchema } from "./schema";
import type { Webinar } from "@/lib/types/webinars";

type CacheShape = {
  bySku: Map<string, Webinar>;
  builtAt: number;
  ttlMs: number;
};

const TTL_SECONDS = Number(process.env.CACHE_WEBINARS_TTL ?? 120);
const cache: CacheShape = {
  bySku: new Map(),
  builtAt: 0,
  ttlMs: TTL_SECONDS * 1000,
};

function cacheExpired() {
  return Date.now() - cache.builtAt > cache.ttlMs;
}

async function rebuildIndex() {
  const raw = await loadWebinars(); // expects JSONC → plain object
  const parsed = WebinarMapSchema.parse(raw); // Record<string, Webinar>

  const bySku = new Map<string, Webinar>();

  Object.entries(parsed).forEach(([slug, w]) => {
    const sku = w?.shared?.sku;
    if (!sku) {
      console.warn(`[webinars] missing shared.sku for slug="${slug}" — ignored`);
      return;
    }
    if (bySku.has(sku)) {
      console.warn(`[webinars] duplicate sku "${sku}" found. Keeping first, ignoring slug="${slug}"`);
      return;
    }
    bySku.set(sku, w);
  });

  cache.bySku = bySku;
  cache.builtAt = Date.now();
}

/**
 * getWebinarBySku
 * Búsqueda rápida por SKU con cache en memoria. TTL controlado por CACHE_WEBINARS_TTL (s), default 120 s.
 */
export async function getWebinarBySku(sku: string): Promise<Webinar | null> {
  if (!sku || typeof sku !== "string") return null;
  if (cache.bySku.size === 0 || cacheExpired()) {
    await rebuildIndex();
  }
  return cache.bySku.get(sku) ?? null;
}
