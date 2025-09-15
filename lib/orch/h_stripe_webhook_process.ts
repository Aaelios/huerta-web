// lib/orch/h_stripe_webhook_process.ts
import Stripe from 'stripe';
import { m_getSupabaseService } from '../supabase/m_getSupabaseService';
import f_ensureUserByEmail from '../supabase/f_ensureUserByEmail';

type TStripeWebhookInput = {
  type: string; // 'checkout.session.completed' | 'invoice.payment_succeeded'
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
  const { type, stripeEventId, session, invoice } = input;

  const supported = new Set(['checkout.session.completed', 'invoice.payment_succeeded']);
  if (!supported.has(type)) return { outcome: 'ignored', reason: 'UNHANDLED_EVENT_TYPE' };

  const email = getEmail(input);
  if (!email) return { outcome: 'ignored', reason: 'MISSING_EMAIL' };
  if (!session && !invoice) return { outcome: 'ignored', reason: 'MISSING_OBJECT' };

  // Validaciones: aceptar expanded o compact
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

  const supabase = m_getSupabaseService(); // debe usar SERVICE ROLE
  const { data: orderId, error } = await supabase.rpc('f_orch_orders_upsert', { session_payload });

  if (error) {
    console.error('[orch] f_orch_orders_upsert error:', error);
    throw new Error(error.message || 'ORCH_UPSERT_FAILED');
  }

  return { outcome: 'processed', details: { orderId: orderId ?? null, type, priceIds } };
}
