// lib/webinars/getWebinarByPriceId.ts

import { loadWebinars } from "./loadWebinars";
import { WebinarMapSchema } from "./schema";
import type { Webinar } from "@/lib/types/webinars";

type CacheShape = {
  byPriceId: Map<string, Webinar>;
  builtAt: number;
  ttlMs: number;
};

const TTL_SECONDS = Number(process.env.CACHE_WEBINARS_TTL ?? 120);

const cache: CacheShape = {
  byPriceId: new Map(),
  builtAt: 0,
  ttlMs: TTL_SECONDS * 1000,
};

function cacheExpired() {
  return Date.now() - cache.builtAt > cache.ttlMs;
}

async function rebuildIndex() {
  const raw = await loadWebinars(); // JSONC → plain object
  const parsed = WebinarMapSchema.parse(raw); // Record<string, Webinar>

  const byPriceId = new Map<string, Webinar>();

  Object.entries(parsed).forEach(([slug, w]) => {
    const priceId = w?.shared?.pricing?.stripePriceId;
    if (!priceId) {
      // No todos los nodos tendrán priceId. Silencioso pero útil en debug:
      // console.warn(`[webinars] missing shared.pricing.stripePriceId for slug="${slug}" — ignored`);
      return;
    }
    if (byPriceId.has(priceId)) {
      console.warn(
        `[webinars] duplicate stripePriceId "${priceId}" found. Keeping first, ignoring slug="${slug}"`
      );
      return;
    }
    byPriceId.set(priceId, w);
  });

  cache.byPriceId = byPriceId;
  cache.builtAt = Date.now();
}

/**
 * getWebinarByPriceId
 * Búsqueda rápida por Stripe Price ID con cache en memoria.
 * TTL controlado por CACHE_WEBINARS_TTL (s), default 120 s.
 */
export async function getWebinarByPriceId(priceId: string): Promise<Webinar | null> {
  if (!priceId || typeof priceId !== "string") return null;
  if (cache.byPriceId.size === 0 || cacheExpired()) {
    await rebuildIndex();
  }
  return cache.byPriceId.get(priceId) ?? null;
}
