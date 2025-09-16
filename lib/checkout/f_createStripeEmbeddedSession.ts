// lib/checkout/f_createStripeEmbeddedSession.ts
import Stripe from 'stripe';

export type CreateEmbeddedSessionInput = {
  priceId: string;
  mode: 'payment' | 'subscription';
  returnUrl: string;
  quantity?: number;
  customerEmail?: string | null;
  idempotencyKey?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

export type CreateEmbeddedSessionResult = {
  client_secret: string;
  sessionId: string;
  stripe_request_id?: string;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

/**
 * Crea una Checkout Session en modo Embedded.
 * No realiza validaciones de SKU/precios; asume que priceId ya es válido.
 * Propaga metadata al objeto session según contrato del proyecto.
 */
export async function f_createStripeEmbeddedSession(
  input: CreateEmbeddedSessionInput
): Promise<CreateEmbeddedSessionResult> {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw Object.assign(new Error('STRIPE_SECRET_KEY not configured'), { code: 'ENV_MISSING' });
  }
  const {
    priceId,
    mode,
    returnUrl,
    quantity = 1,
    customerEmail,
    idempotencyKey,
    metadata,
  } = input;

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode,
      ui_mode: 'embedded',
      return_url: returnUrl,
      line_items: [{ price: priceId, quantity }],
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      ...(metadata ? { metadata: sanitizeMetadata(metadata) } : {}),
    };

    const session = await stripe.checkout.sessions.create(params, {
      idempotencyKey,
    });

    if (!session?.client_secret || !session?.id) {
      throw Object.assign(new Error('Missing client_secret or id from Stripe'), {
        code: 'STRIPE_RESPONSE_INCOMPLETE',
      });
    }

    const stripe_request_id =
     // (session?.last_response as any)?.headers?.['request-id'] ||
      (session?.lastResponse as any)?.headers?.['request-id']; // compat

    return {
      client_secret: session.client_secret,
      sessionId: session.id,
      stripe_request_id,
    };
  } catch (e: any) {
    // Re-emitir error para que el caller lo clasifique (STRIPE_ERROR, etc.)
    throw e;
  }
}

/**
 * Convierte valores no string a string y descarta undefined para cumplir
 * con el esquema de metadata de Stripe (clave/valor string).
 */
function sanitizeMetadata(
  md: Record<string, string | number | boolean | null | undefined>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(md || {})) {
    if (v === undefined) continue;
    out[k] = v === null ? '' : String(v);
  }
  return out;
}
