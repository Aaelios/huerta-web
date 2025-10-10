// lib/ui_checkout/buildSessionPayload.ts

/**
 * Construye el payload que enviará el cliente a /api/stripe/create-checkout-session.
 * No arma URLs de retorno. Eso lo hace el endpoint en el servidor.
 *
 * Verdades:
 * - El cobro se define por Stripe Price (price_id).
 * - El modo para webinars es "payment".
 * - Metadata estándar: sku, fulfillment_type, product_id.
 *
 * Entradas:
 * - webinar: nodo ya cargado desde webinars.jsonc (no I/O aquí).
 * - overrides: permite price_id y mode solo con validación superficial en cliente.
 * - extras: coupon y utm* opcionales para passthrough.
 */

type Pricing = {
  currency: string;
  stripePriceId?: string;
  stripeProductId?: string;
  interval?: 'one_time' | 'month' | 'year' | string;
};

type WebinarNode = {
  shared: {
    sku: string;
    pricing: Pricing;
    fulfillment_type?: 'live_class' | 'course' | 'template' | 'one_to_one' | 'subscription_grant';
  };
};

export type BuildSessionOverrides = {
  /** Forzar otro Price de Stripe. Validación fuerte se hace en el servidor. */
  price_id?: string;
  /** Forzar modo ("payment" | "subscription"). Se ignora si no aplica. */
  mode?: 'payment' | 'subscription';
};

export type BuildSessionExtras = {
  /** Cupón opcional. No se usa hoy, pero se pasa al servidor. */
  coupon?: string;
  /** Passthrough de utms. Ej: { utm_source, utm_medium, utm_campaign, utm_term, utm_content } */
  utm?: Record<string, string | undefined>;
};

export type SessionPayload = {
  sku: string;
  price_id: string;
  product_id?: string;
  currency: string;
  mode: 'payment' | 'subscription';
  /** Metadata mínima que exige el backend; el endpoint puede añadir más campos. */
  metadata: {
    sku: string;
    fulfillment_type: NonNullable<WebinarNode['shared']['fulfillment_type']> | 'live_class';
    product_id?: string;
  };
  /** Opcionales operativos */
  coupon?: string;
  utm?: Record<string, string | undefined>;
};

export function buildSessionPayload(
  webinar: WebinarNode,
  overrides: BuildSessionOverrides = {},
  extras: BuildSessionExtras = {}
): SessionPayload {
  assertWebinarForSession(webinar);

  const sku = webinar.shared.sku;
  const pricing = webinar.shared.pricing;

  // price_id: preferimos override válido, si no el del JSONC
  const price_id = pickPriceId(overrides.price_id, pricing.stripePriceId);

  const mode =
    pickMode(overrides.mode, pricing.interval) ?? 'payment';

  const currency = safeCurrency(pricing.currency);

  const product_id = pricing.stripeProductId || undefined;

  const metadata = {
    sku,
    fulfillment_type: (webinar.shared.fulfillment_type || 'live_class') as SessionPayload['metadata']['fulfillment_type'],
    product_id,
  };

  const payload: SessionPayload = {
    sku,
    price_id,
    product_id,
    currency,
    mode,
    metadata,
  };

  if (extras.coupon) payload.coupon = extras.coupon;
  if (extras.utm) payload.utm = filterUtm(extras.utm);

  return payload;
}

/* ------------------------ utilidades internas ------------------------ */

function assertWebinarForSession(w: WebinarNode): void {
  if (!w?.shared?.sku) throw new Error('buildSessionPayload: shared.sku requerido');
  if (!w?.shared?.pricing)
    throw new Error('buildSessionPayload: shared.pricing requerido');
  if (typeof w.shared.pricing.currency !== 'string')
    throw new Error('buildSessionPayload: pricing.currency requerido');
  if (
    !w.shared.pricing.stripePriceId &&
    !w.shared.pricing.stripeProductId
  ) {
    // Permitimos que falte productId, pero priceId debe existir si no hay override
    // La validación final ocurrirá en el servidor.
  }
}

function pickPriceId(override?: string, fromJsonc?: string): string {
  const ov = normalizeId(override);
  if (ov) return ov;
  const base = normalizeId(fromJsonc);
  if (base) return base;
  throw new Error('buildSessionPayload: price_id no disponible (ni override ni jsonc)');
}

function pickMode(
  override: 'payment' | 'subscription' | undefined,
  interval: Pricing['interval'] | undefined
): 'payment' | 'subscription' {
  if (override === 'payment' || override === 'subscription') return override;
  if (!interval || interval === 'one_time') return 'payment';
  return 'subscription';
}

function safeCurrency(v: unknown): string {
  if (typeof v === 'string' && v.length >= 3 && v.length <= 5) return v;
  return 'MXN';
}

function normalizeId(v?: string): string | undefined {
  if (!v || typeof v !== 'string') return undefined;
  const s = v.trim();
  return s.length ? s : undefined;
}

function filterUtm(
  utm: Record<string, string | undefined>
): Record<string, string | undefined> {
  const allow = new Set([
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ]);
  const out: Record<string, string | undefined> = {};
  for (const [k, val] of Object.entries(utm)) {
    if (allow.has(k) && typeof val === 'string') out[k] = val;
  }
  return out;
}
