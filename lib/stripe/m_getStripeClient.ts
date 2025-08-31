// lib/stripe/m_getStripeClient.ts
import Stripe from 'stripe';

/**
 * m_getStripeClient
 * Singleton server-only para el SDK de Stripe.
 * Requiere env: STRIPE_SECRET_KEY (TEST por ahora).
 */
let _stripe: Stripe | null = null;

export function m_getStripeClient(): Stripe {
  if (typeof window !== 'undefined') {
    const err: any = new Error('Stripe SDK is server-only');
    err.code = 'SERVER_ONLY';
    throw err;
  }

  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err: any = new Error('Missing STRIPE_SECRET_KEY');
    err.code = 'CONFIG_ERROR';
    throw err;
  }

  _stripe = new Stripe(key, {
    httpClient: Stripe.createNodeHttpClient(),
  });

  return _stripe;
}
