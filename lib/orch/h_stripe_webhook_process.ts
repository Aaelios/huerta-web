// lib/orch/h_stripe_webhook_process.ts
import Stripe from 'stripe';
import { m_getSupabaseService } from '../supabase/m_getSupabaseService';
import f_ensureUserByEmail from '../supabase/f_ensureUserByEmail';

type TStripeWebhookInput = {
  type: string; // 'checkout.session.completed' | 'invoice.payment_succeeded' | 'payment_intent.succeeded'
  stripeEventId: string;
  session?: Stripe.Checkout.Session;
  invoice?: Stripe.Invoice;
  payment_intent?: Stripe.PaymentIntent;
};

type TStripeWebhookResult =
  | { outcome: 'processed'; details?: Record<string, any> }
  | { outcome: 'ignored'; reason: string; details?: Record<string, any> };

// Extrae email desde session, invoice o payment_intent sin PII innecesaria
function getEmail(input: TStripeWebhookInput): string | null {
  const { session, invoice, payment_intent } = input;

  if (session) {
    if (typeof session.customer === 'object' && (session.customer as any)?.email) {
      return (session.customer as any).email as string;
    }
    const cd = (session as any).customer_details;
    if (cd?.email) return cd.email as string;
  }

  if (invoice) {
    if (typeof invoice.customer === 'object' && (invoice.customer as any)?.email) {
      return (invoice.customer as any).email as string;
    }
    if (invoice.customer_email) return invoice.customer_email;
  }

  if (payment_intent) {
    // Stripe TS puede no tipar charges como propiedad; usar any para lectura segura
    const piAny = payment_intent as any;
    if (piAny?.receipt_email) return piAny.receipt_email as string;
    const ch = piAny?.charges?.data?.[0];
    const be = ch?.billing_details?.email as string | undefined;
    if (be) return be;
  }

  return null;
}

function extractPriceIds(input: TStripeWebhookInput): string[] {
  const ids: string[] = [];
  const { session, invoice } = input;

  // Checkout Session: price.id OR pricing.price_details.price
  if (session) {
    const data: any[] = ((session as any).line_items?.data ?? []) as any[];
    for (const it of data) {
      const idA = it?.price?.id;
      const idB = it?.pricing?.price_details?.price;
      const pid = typeof idA === 'string' && idA ? idA : (typeof idB === 'string' && idB ? idB : null);
      if (pid) ids.push(pid);
    }
  }

  // Invoice: price.id OR pricing.price_details.price
  if (invoice) {
    const data: any[] = ((invoice as any).lines?.data ?? []) as any[];
    for (const ln of data) {
      const idA = ln?.price?.id;
      const idB = ln?.pricing?.price_details?.price;
      const pid = typeof idA === 'string' && idA ? idA : (typeof idB === 'string' && idB ? idB : null);
      if (pid) ids.push(pid);
    }
  }

  return ids;
}

function hasPricePath(obj: any): { expanded: boolean; compact: boolean } {
  const li = obj?.line_items?.data?.[0] ?? obj?.lines?.data?.[0] ?? null;
  return {
    expanded: Boolean(li?.price?.id),
    compact: Boolean(li?.pricing?.price_details?.price),
  };
}

export default async function h_stripe_webhook_process(
  input: TStripeWebhookInput
): Promise<TStripeWebhookResult> {
  const { type, stripeEventId, session, invoice, payment_intent } = input;

  const supported = new Set([
    'checkout.session.completed',
    'invoice.payment_succeeded',
    'payment_intent.succeeded',
  ]);
  if (!supported.has(type)) return { outcome: 'ignored', reason: 'UNHANDLED_EVENT_TYPE' };

  // Para payment_intent.succeeded no exigimos session/invoice
  if (type !== 'payment_intent.succeeded' && !session && !invoice) {
    return { outcome: 'ignored', reason: 'MISSING_OBJECT' };
  }

  const email = getEmail(input);
  if (!email) return { outcome: 'ignored', reason: 'MISSING_EMAIL' };

  // Validaciones de expansiones solo donde aplican
  if (type === 'checkout.session.completed') {
    const ok = Array.isArray((session as any)?.line_items?.data);
    const flags = hasPricePath(session);
    if (!ok || !(flags.expanded || flags.compact)) {
      return {
        outcome: 'ignored',
        reason: 'MISSING_EXPANSIONS',
        details: { need: ['line_items.data.price OR line_items.data.pricing.price_details.price'] },
      };
    }
  }

  if (type === 'invoice.payment_succeeded') {
    const ok = Array.isArray((invoice as any)?.lines?.data);
    const flags = hasPricePath(invoice);
    if (!ok || !(flags.expanded || flags.compact)) {
      return {
        outcome: 'ignored',
        reason: 'MISSING_EXPANSIONS',
        details: { need: ['lines.data.price OR lines.data.pricing.price_details.price'] },
      };
    }
  }

  // Garantiza usuario y obtiene su id
  const userId: string = (await f_ensureUserByEmail(email)) as unknown as string;

  // Rama nueva: inserción en payments para one-time
  if (type === 'payment_intent.succeeded') {
    const supabase = m_getSupabaseService(); // SERVICE ROLE
    const p_obj = payment_intent as unknown as Record<string, any>;

    // p_order_id: opcional. MVP -> null. Se puede conciliar después por PI o metadata.
    const { data: paymentId, error: payErr } = await supabase.rpc('f_payments_upsert', {
      p_user_id: userId,
      p_obj,
      p_order_id: null,
    });

    if (payErr) {
      console.error('[orch] f_payments_upsert error:', payErr);
      throw new Error(payErr.message || 'PAYMENTS_UPSERT_FAILED');
    }

    console.log('[orch]', 'h_stripe_webhook_process', {
      type,
      stripeEventId,
      email,
      paymentId: paymentId ?? null,
      amount_received: (payment_intent as any)?.amount_received ?? null,
      currency: (payment_intent as any)?.currency ?? null,
    });

    return {
      outcome: 'processed',
      details: {
        type,
        paymentId: paymentId ?? null,
        pi_id: payment_intent?.id ?? null,
      },
    };
  }

  // Ramas existentes: orders + entitlements via orquestador SQL
  const priceIds = extractPriceIds(input);

  const session_payload = {
    stripe_event_id: stripeEventId,
    type,
    data: {
      object: session ?? invoice,
      debug: {
        email,
        price_ids: priceIds,
        flags:
          type === 'checkout.session.completed'
            ? hasPricePath(session)
            : hasPricePath(invoice),
      },
    },
  };

  console.log('[orch]', 'h_stripe_webhook_process', {
    type,
    stripeEventId,
    email,
    priceIdsCount: priceIds.length,
  });

  const supabase = m_getSupabaseService(); // SERVICE ROLE
  const { data: orderId, error } = await supabase.rpc('f_orch_orders_upsert', { session_payload });

  if (error) {
    console.error('[orch] f_orch_orders_upsert error:', error);
    throw new Error(error.message || 'ORCH_UPSERT_FAILED');
  }

  return { outcome: 'processed', details: { orderId: orderId ?? null, type, priceIds } };
}
