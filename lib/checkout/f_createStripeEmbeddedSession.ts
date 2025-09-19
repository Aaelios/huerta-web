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
  // Nuevos flags MVP (parametrizables a futuro)
  allowPromotionCodes?: boolean; // default: true
  phoneEnabled?: boolean;        // default: true
  customFields?: Stripe.Checkout.SessionCreateParams.CustomField[]; // default: opt-in dropdown
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
    allowPromotionCodes = true,
    phoneEnabled = true,
    customFields,
  } = input;

  // Campo custom por defecto: opt-in de marketing
  const defaultOptInField: Stripe.Checkout.SessionCreateParams.CustomField = {
    key: 'opt_in_marketing',
    label: { type: 'custom', custom: '¿Quieres recibir tips y ofertas útiles por email?' },
    type: 'dropdown',
    dropdown: {
      options: [
        { label: 'No, gracias', value: 'no' },
        { label: 'Sí, acepto', value: 'si' },
      ],
    },
  };

  try {
    const params: Stripe.Checkout.SessionCreateParams = {
      mode,
      ui_mode: 'embedded',
      return_url: returnUrl,
      line_items: [{ price: priceId, quantity }],
      allow_promotion_codes: allowPromotionCodes,
      phone_number_collection: { enabled: phoneEnabled },
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      ...(metadata ? { metadata: sanitizeMetadata(metadata) } : {}),
      ...(Array.isArray(customFields) && customFields.length > 0
        ? { custom_fields: customFields }
        : { custom_fields: [defaultOptInField] }),
    };

    const session = await stripe.checkout.sessions.create(params, { idempotencyKey });

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
