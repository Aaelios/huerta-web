// lib/checkout/f_createStripeEmbeddedSession.ts
import type Stripe from 'stripe';
import { m_getStripeClient } from '../stripe/m_getStripeClient';

export type CreateEmbeddedSessionInput = {
  priceId: string;
  returnUrl: string;
  mode: 'payment' | 'subscription';
  quantity?: number;
  customerEmail?: string | null;
  idempotencyKey?: string;
};

export type CreateEmbeddedSessionOK = {
  client_secret: string;
  sessionId: string;
  stripe_request_id?: string;
};

/**
 * f_createStripeEmbeddedSession
 * Crea una sesión de Stripe Checkout en modo embebido.
 * Devuelve { client_secret, sessionId } para montar el embed en /checkout.
 */
export async function f_createStripeEmbeddedSession(
  args: CreateEmbeddedSessionInput
): Promise<CreateEmbeddedSessionOK> {
  const stripe = m_getStripeClient();

  const params: Stripe.Checkout.SessionCreateParams = {
    ui_mode: 'embedded',
    mode: args.mode,
    line_items: [
      {
        price: args.priceId,
        quantity: args.quantity ?? 1,
      },
    ],
    // Embedded: solo return_url. cancel_url no aplica.
    return_url: args.returnUrl,
    // Recomendado por Stripe para embedded
    redirect_on_completion: 'if_required',
  };

  if (args.customerEmail) {
    (params as any).customer_email = args.customerEmail;
  }

  const requestOpts: Stripe.RequestOptions = {};
  if (args.idempotencyKey) {
    requestOpts.idempotencyKey = args.idempotencyKey;
  }

  const session = await stripe.checkout.sessions.create(params, requestOpts);

  if (!session.client_secret) {
    const err: any = new Error('Missing client_secret from Stripe');
    err.code = 'STRIPE_ERROR';
    throw err;
  }

  return {
    client_secret: session.client_secret,
    sessionId: session.id,
    stripe_request_id: (session.lastResponse as any)?.requestId,
  };
}
