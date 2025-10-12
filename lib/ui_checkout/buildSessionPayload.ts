// lib/ui_checkout/buildSessionPayload.ts

// Request esperado por /api/stripe/create-checkout-session
export type TCheckoutRequest = {
  // Camino A (compat): usar un Price de Stripe directo
  price_id?: string;

  // Camino B: resolver vía Supabase por SKU
  sku?: string;
  currency?: 'MXN' | 'USD';
  price_list?: string | null;

  // Extras
  mode?: 'payment' | 'subscription';
  metadata?: Record<string, string>;
  coupon?: string;
  utm?: Record<string, string>;

  // Compat para consumidores que esperan este campo en la UI
  product_id?: string;
};

type TOverrides = Partial<TCheckoutRequest> & {
  // Alias común en UI
  priceId?: string;
};

type TWebinar = {
  shared?: {
    sku?: string;
    title?: string;
    pricing?: {
      currency?: string;
      interval?: string; // 'one_time' | 'month' | etc.
      amountCents?: number;
      // Compat legacy (si existe aún en JSONC, no es obligatorio):
      stripePriceId?: string;
      stripeProductId?: string;
      price_list?: string | null;
    };
    metadata?: Record<string, unknown>;
  };
};

// Helpers seguros sin any
function getString(obj: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!obj) return undefined;
  const v = obj[key];
  return typeof v === 'string' ? v : undefined;
}
function toCurrency(v: unknown): 'MXN' | 'USD' | undefined {
  if (typeof v !== 'string') return undefined;
  const up = v.toUpperCase();
  return up === 'USD' ? 'USD' : up === 'MXN' ? 'MXN' : undefined;
}
function toModeFromInterval(interval?: string): 'payment' | 'subscription' | undefined {
  if (!interval) return undefined;
  return interval === 'one_time' ? 'payment' : 'subscription';
}

function pickPriceId(fromOverrides?: TOverrides, fromJsonc?: TWebinar): string | undefined {
  // Prioridad: override explícito → legacy JSONC (si aún existe)
  const o = fromOverrides?.price_id ?? fromOverrides?.priceId;
  if (typeof o === 'string' && o.length > 0) return o;

  const priceIdLegacy = fromJsonc?.shared?.pricing?.stripePriceId;
  if (typeof priceIdLegacy === 'string' && priceIdLegacy.length > 0) return priceIdLegacy;

  // Sin price_id: modo por SKU
  return undefined;
}

function pickSku(fromOverrides?: TOverrides, fromJsonc?: TWebinar): string | undefined {
  const o = fromOverrides?.sku;
  if (typeof o === 'string' && o.length > 0) return o;

  const sku = fromJsonc?.shared?.sku;
  if (typeof sku === 'string' && sku.length > 0) return sku;

  return undefined;
}

function pickCurrency(fromOverrides?: TOverrides, fromJsonc?: TWebinar): 'MXN' | 'USD' | undefined {
  const o = fromOverrides?.currency;
  if (o === 'USD' || o === 'MXN') return o;

  const c = toCurrency(fromJsonc?.shared?.pricing?.currency);
  return c ?? 'MXN';
}

function pickPriceList(fromOverrides?: TOverrides, fromJsonc?: TWebinar): string | null | undefined {
  // Permite forzar la lista desde override
  if (typeof fromOverrides?.price_list === 'string') return fromOverrides.price_list;
  if (fromOverrides?.price_list === null) return null;

  // Si el JSONC trae una lista, úsala. Si no, no rellenes aquí. El server usará 'default'.
  const fromJson = fromJsonc?.shared?.pricing?.price_list;
  if (typeof fromJson === 'string' && fromJson.length > 0) return fromJson;

  return undefined;
}

function buildMetadata(fromOverrides?: TOverrides, fromJsonc?: TWebinar): Record<string, string> {
  const out: Record<string, string> = {};

  // Metadata de JSONC (solo strings)
  const meta = fromJsonc?.shared?.metadata;
  if (meta) {
    for (const [k, v] of Object.entries(meta)) {
      if (typeof v === 'string') out[k] = v;
    }
  }

  // Overrides de metadata ganan prioridad
  if (fromOverrides?.metadata) {
    for (const [k, v] of Object.entries(fromOverrides.metadata)) {
      if (typeof v === 'string') out[k] = v;
    }
  }

  // Buenas prácticas: pre-popular sku/currency si vienen en la UI
  const sku = pickSku(fromOverrides, fromJsonc);
  const currency = pickCurrency(fromOverrides, fromJsonc);
  if (sku && !out.sku) out.sku = sku;
  if (currency && !out.currency) out.currency = currency;

  // El server añadirá fulfillment_type/price_list si no vienen
  return out;
}

/**
 * Construye el payload para /api/stripe/create-checkout-session.
 * Reglas:
 * - Si hay price_id (override o legacy JSONC), usa camino A.
 * - Si NO hay price_id → usa camino por SKU (no lanza error).
 */
export function buildSessionPayload(webinar: TWebinar, overrides?: TOverrides): TCheckoutRequest {
  const priceId = pickPriceId(overrides, webinar);
  const metadata = buildMetadata(overrides, webinar);
  const coupon = overrides?.coupon;
  const utm = overrides?.utm;

  if (priceId) {
    // Camino A: compat por Price ID
    const modeOverride = overrides?.mode;
    // Si UI tiene interval en JSONC, derivar modo para telemetría; el server revalidará
    const interval = getString(webinar.shared?.pricing as Record<string, unknown>, 'interval');
    const derivedMode = toModeFromInterval(interval);

    return {
      price_id: priceId,
      mode: modeOverride ?? derivedMode,
      metadata,
      coupon,
      utm,
    };
  }

  // Camino B: por SKU (nuevo flujo). No lanzamos error si falta price_id.
  const sku = pickSku(overrides, webinar);
  if (!sku) {
    // Si no hay SKU tampoco, devolver payload mínimo para que el caller lo valide.
    return {
      metadata,
      coupon,
      utm,
    };
  }

  const currency = pickCurrency(overrides, webinar) ?? 'MXN';
  const price_list = pickPriceList(overrides, webinar) ?? undefined;

  // Derivar mode desde interval del JSONC si existe. El server decidirá de todos modos.
  const interval = getString(webinar.shared?.pricing as Record<string, unknown>, 'interval');
  const mode = overrides?.mode ?? toModeFromInterval(interval);

  return {
    sku,
    currency,
    price_list: price_list ?? 'default',
    mode,
    metadata,
    coupon,
    utm,
  };
}

export type SessionPayload = TCheckoutRequest;
