// lib/orch/h_stripe_webhook_process.ts
import Stripe from 'stripe';
import { m_getSupabaseService } from '../supabase/m_getSupabaseService';
import f_ensureUserByEmail from '../supabase/f_ensureUserByEmail';

type TStripeWebhookInput = {
  type: string; // 'checkout.session.completed' | 'invoice.payment_succeeded' | ...
  stripeEventId: string;
  session?: Stripe.Checkout.Session;
  invoice?: Stripe.Invoice;
};

type TStripeWebhookResult =
  | { outcome: 'processed'; details?: Record<string, any> }
  | { outcome: 'ignored'; reason: string; details?: Record<string, any> };

function getEmail(input: TStripeWebhookInput): string | null {
  const { session, invoice } = input;
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
  return null;
}

function extractPriceIds(input: TStripeWebhookInput): string[] {
  const ids: string[] = [];
  const { session, invoice } = input;

  if (session) {
    const li = (session as any).line_items;
    const data = li?.data ?? [];
    for (const it of data) {
      const pid = it?.price?.id;
      if (typeof pid === 'string' && pid.length > 0) ids.push(pid);
    }
  }

  if (invoice) {
    const lines = (invoice as any).lines;
    const data = lines?.data ?? [];
    for (const ln of data) {
      const pid = ln?.price?.id;
      if (typeof pid === 'string' && pid.length > 0) ids.push(pid);
    }
  }

  return ids;
}

export default async function h_stripe_webhook_process(
  input: TStripeWebhookInput
): Promise<TStripeWebhookResult> {
  const { type, stripeEventId, session, invoice } = input;

  const supported = new Set(['checkout.session.completed', 'invoice.payment_succeeded']);
  if (!supported.has(type)) return { outcome: 'ignored', reason: 'UNHANDLED_EVENT_TYPE' };

  const email = getEmail(input);
  if (!email) return { outcome: 'ignored', reason: 'MISSING_EMAIL' };

  // Sanidad del objeto enriquecido
  if (!session && !invoice) return { outcome: 'ignored', reason: 'MISSING_OBJECT' };

  // Validar expansiones mínimas por tipo
  if (type === 'checkout.session.completed') {
    const ok =
      !!(session as any)?.line_items &&
      Array.isArray((session as any)?.line_items?.data) &&
      ((session as any)?.line_items?.data?.[0]?.price?.id ?? null);
    if (!ok) {
      return {
        outcome: 'ignored',
        reason: 'MISSING_EXPANSIONS',
        details: { need: ['line_items', 'line_items.data.price'] },
      };
    }
  }

  if (type === 'invoice.payment_succeeded') {
    const ok =
      !!(invoice as any)?.lines &&
      Array.isArray((invoice as any)?.lines?.data) &&
      ((invoice as any)?.lines?.data?.[0]?.price?.id ?? null);
    if (!ok) {
      return {
        outcome: 'ignored',
        reason: 'MISSING_EXPANSIONS',
        details: { need: ['lines', 'lines.data.price'] },
      };
    }
  }

  await f_ensureUserByEmail(email);

  const priceIds = extractPriceIds(input);

  const session_payload = {
    stripe_event_id: stripeEventId,
    type,
    data: {
      object: session ?? invoice,
      debug: {
        email,
        price_ids: priceIds,
      },
    },
  };

  console.log('[orch] event', { type, stripeEventId, email, priceIdsCount: priceIds.length });

  const supabase = m_getSupabaseService();
  const { data: orderId, error } = await supabase.rpc('f_orch_orders_upsert', { session_payload });

  if (error) {
    console.error('[orch] f_orch_orders_upsert error:', error);
    throw new Error(error.message || 'ORCH_UPSERT_FAILED');
  }

  return { outcome: 'processed', details: { orderId: orderId ?? null, type, priceIds } };
}
