// lib/ui_checkout/getCheckoutUrl.ts

/**
 * Construye la URL a /checkout/[slug] con query operativa opcional.
 * No incluye textos de UI. No resuelve dominios absolutos.
 *
 * Permitidos:
 * - coupon
 * - mode: "payment" | "subscription"
 * - price_id: override controlado
 * - utm_*: passthrough (source, medium, campaign, term, content)
 */

export type CheckoutUrlOpts = {
  coupon?: string;
  mode?: 'payment' | 'subscription';
  price_id?: string;
  utm?: Partial<Record<'utm_source' | 'utm_medium' | 'utm_campaign' | 'utm_term' | 'utm_content', string>>;
};

export function getCheckoutUrl(slug: string, opts: CheckoutUrlOpts = {}): string {
  if (!slug || typeof slug !== 'string') throw new Error('getCheckoutUrl: slug requerido');

  const qp = new URLSearchParams();

  if (opts.coupon) qp.set('coupon', sanitize(opts.coupon));
  if (opts.mode && (opts.mode === 'payment' || opts.mode === 'subscription')) qp.set('mode', opts.mode);
  if (opts.price_id) qp.set('price_id', sanitize(opts.price_id));

  if (opts.utm) {
    for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const) {
      const v = opts.utm[k];
      if (typeof v === 'string' && v.trim().length) qp.set(k, v.trim());
    }
  }

  const qs = qp.toString();
  return qs ? `/checkout/${encodeURIComponent(slug)}?${qs}` : `/checkout/${encodeURIComponent(slug)}`;
}

/* ------------------------ utils ------------------------ */

function sanitize(v: string): string {
  // Conservador: recorta, evita espacios y caracteres de control.
  return v.replace(/[\s\r\n\t]+/g, '').trim();
}
