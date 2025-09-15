// app/api/stripe/webhooks/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';

// Idempotencia y log en DB
import { f_webhookEvents_getByStripeId } from '@/lib/webhooks/f_webhookEvents_getByStripeId';
import { f_webhookEvents_markReceived } from '@/lib/webhooks/f_webhookEvents_markReceived';
import { f_webhookEvents_markProcessed } from '@/lib/webhooks/f_webhookEvents_markProcessed';
import { f_webhookEvents_markIgnored } from '@/lib/webhooks/f_webhookEvents_markIgnored';

// Refetch fuentes canónicas
import f_refetchSession from '@/lib/stripe/f_refetchSession';
import f_refetchInvoice from '@/lib/stripe/f_refetchInvoice';

// Orquestador DB (usa SECURITY DEFINER en Supabase)
import h_stripe_webhook_process from '@/lib/orch/h_stripe_webhook_process';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const version = 'route.v3';

  // 0) Pre-flight config
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[webhook]', version, 'missing STRIPE_WEBHOOK_SECRET');
    return new Response('missing webhook secret', { status: 500 });
  }
  if (!sig) return new Response('missing signature', { status: 400 });

  // 1) Leer raw body y verificar firma
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.error('[webhook]', version, 'constructEvent error', err?.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2) Idempotencia mínima
  try {
    const existing = await f_webhookEvents_getByStripeId(event.id);
    if (existing) {
      console.log('[webhook]', version, 'replay', event.type, event.id);
      return Response.json({ ok: true, replay: true, id: event.id, type: event.type }, { status: 200 });
    }
    await f_webhookEvents_markReceived({
      stripeEventId: event.id,
      type: event.type,
      payload: raw
    });
  } catch (e) {
    console.error('[webhook]', version, 'markReceived error', (e as any)?.message ?? e);
    // continuamos
  }

  // 3) Refetch objeto canónico desde Stripe
  let session: Stripe.Checkout.Session | null = null;
  let invoice: Stripe.Invoice | null = null;

  const flags: Record<string, any> = {
    hasServiceRole,
    has_price_expanded: false,
    has_compact_price: false,
    currency: null,
    amount_total: null,
  };

  try {
    const obj: any = (event as any).data?.object;

    if (event.type === 'invoice.payment_succeeded') {
      const invoiceId = obj?.id as string | undefined; // in_...
      if (invoiceId) {
        invoice = await f_refetchInvoice(invoiceId);
        // Flags de estructura (post-refetch)
        try {
          const li: any = (invoice as any)?.lines?.data?.[0] ?? null;
          flags.has_price_expanded = Boolean(li?.price?.id);
          flags.has_compact_price = Boolean(li?.pricing?.price_details?.price);
          flags.currency = (invoice as any)?.currency ?? null;
          flags.amount_total = (invoice as any)?.total ?? null;
        } catch {}
        console.log('[webhook]', version, 'refetch invoice', invoice.id, flags);
      } else {
        console.warn('[webhook]', version, 'invoice missing id on event object');
      }
    } else if (event.type === 'checkout.session.completed') {
      const sessionId = obj?.id as string | undefined; // cs_...
      if (sessionId) {
        session = await f_refetchSession(sessionId);
        console.log('[webhook]', version, 'refetch session', session.id, { hasServiceRole });
      } else {
        console.warn('[webhook]', version, 'session missing id on event object');
      }
    } else {
      console.log('[webhook]', version, 'ignored type', event.type);
    }
  } catch (e) {
    console.error('[webhook]', version, 'refetch error', (e as any)?.message ?? e);
  }

  // 4) Orquestación en DB
  try {
    if (session || invoice) {
      console.log('[webhook]', version, 'orchestrate start', event.type, event.id, {
        refetch_invoice: invoice?.id ?? null,
        refetch_session: session?.id ?? null,
      });

      const result = await h_stripe_webhook_process({
        type: event.type,
        stripeEventId: event.id,
        session: session ?? undefined,
        invoice: invoice ?? undefined,
      });

      console.log('[webhook]', version, 'orchestrate result', {
        outcome: result?.outcome ?? null,
        orderId: (result as any)?.details?.orderId ?? null,
      });

      if (result?.outcome === 'processed') {
        const orderId = (result as any)?.details?.orderId ?? null;
        try {
          await f_webhookEvents_markProcessed({ stripeEventId: event.id, orderId });
        } catch (e) {
          console.error('[webhook]', version, 'markProcessed error', (e as any)?.message ?? e);
        }
      } else if (result?.outcome === 'ignored') {
        try {
          await f_webhookEvents_markIgnored({ stripeEventId: event.id });
        } catch (e) {
          console.error('[webhook]', version, 'markIgnored error', (e as any)?.message ?? e);
        }
      }
    } else {
      // Sin refetch válido → ignorado
      try {
        await f_webhookEvents_markIgnored({ stripeEventId: event.id });
      } catch (e) {
        console.error('[webhook]', version, 'markIgnored error', (e as any)?.message ?? e);
      }
    }
  } catch (e) {
    console.error('[webhook]', version, 'orchestrate error', (e as any)?.message ?? e);
    // tolerante a fallos
  }

  // 5) Fin
  console.log('[webhook]', version, 'done', event.type, event.id);
  return new Response('ok', { status: 200 });
}
