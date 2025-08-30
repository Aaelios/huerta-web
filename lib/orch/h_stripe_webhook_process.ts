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
  | { outcome: 'ignored'; reason: string };

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

export default async function h_stripe_webhook_process(
  input: TStripeWebhookInput
): Promise<TStripeWebhookResult> {
  const { type, stripeEventId, session, invoice } = input;

  const supported = new Set(['checkout.session.completed', 'invoice.payment_succeeded']);
  if (!supported.has(type)) return { outcome: 'ignored', reason: 'UNHANDLED_EVENT_TYPE' };

  const email = getEmail(input);
  if (!email) return { outcome: 'ignored', reason: 'MISSING_EMAIL' };

  await f_ensureUserByEmail(email);

  if (!session && !invoice) return { outcome: 'ignored', reason: 'MISSING_OBJECT' };

  const session_payload = {
    stripe_event_id: stripeEventId,
    type,
    data: { object: session ?? invoice },
  };

  const supabase = m_getSupabaseService();
  const { data: orderId, error } = await supabase.rpc('f_orch_orders_upsert', { session_payload });

  if (error) throw new Error(error.message || 'ORCH_UPSERT_FAILED');

  return { outcome: 'processed', details: { orderId: orderId ?? null, type } };
}
