// app/api/stripe/webhooks/route.ts

// Configuración base
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';

// Idempotencia
import { f_webhookEvents_getByStripeId } from '@/lib/webhooks/f_webhookEvents_getByStripeId';
import { f_webhookEvents_markReceived } from '@/lib/webhooks/f_webhookEvents_markReceived';
import { f_webhookEvents_markProcessed } from '@/lib/webhooks/f_webhookEvents_markProcessed';
import { f_webhookEvents_markIgnored } from '@/lib/webhooks/f_webhookEvents_markIgnored';

// Refetch
import f_refetchSession from '@/lib/stripe/f_refetchSession';
import f_refetchInvoice from '@/lib/stripe/f_refetchInvoice';

// Orquestación (versión “estable” que recibe session/invoice)
import h_stripe_webhook_process from '@/lib/orch/h_stripe_webhook_process';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  // 1) Firma
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('missing webhook secret', { status: 500 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2) Idempotencia mínima
  try {
    const existing = await f_webhookEvents_getByStripeId(event.id);
    if (existing) {
      return Response.json({ ok: true, replay: true, id: event.id, type: event.type }, { status: 200 });
    }
    await f_webhookEvents_markReceived({ stripeEventId: event.id, type: event.type, payload: raw });
  } catch (e) {
    console.error('idempotency/received error:', e);
  }

  // 3) Refetch del objeto principal
  let session: Stripe.Checkout.Session | null = null;
  let invoice: Stripe.Invoice | null = null;
  try {
    const obj: any = (event as any).data?.object;

    if (event.type === 'invoice.payment_succeeded') {
      const invoiceId = obj?.id; // in_...
      if (typeof invoiceId === 'string') {
        invoice = await f_refetchInvoice(invoiceId);
        console.log('[refetch] invoice', invoice.id);
      } else {
        console.log('[refetch] invoice: missing id on event object');
      }
    } else if (event.type === 'checkout.session.completed') {
      const sessionId = obj?.id; // cs_...
      if (typeof sessionId === 'string') {
        session = await f_refetchSession(sessionId);
        console.log('[refetch] session', session.id);
      } else {
        console.log('[refetch] session: missing id on event object');
      }
    } else {
      console.log('[refetch] ignored type', event.type);
    }
  } catch (e) {
    console.error('[refetch] error:', (e as any)?.message ?? e);
  }

  // 4) Orquestación + marks finales
  try {
    if (session || invoice) {
      const result = await h_stripe_webhook_process({
        type: event.type,
        stripeEventId: event.id,
        session: session ?? undefined,
        invoice: invoice ?? undefined,
      });

      if (result?.outcome === 'processed') {
        const orderId = (result as any)?.details?.orderId ?? null;
        await f_webhookEvents_markProcessed({ stripeEventId: event.id, orderId });
      } else if (result?.outcome === 'ignored') {
        const reason = (result as any)?.reason ?? 'no_op';
        await f_webhookEvents_markIgnored({ stripeEventId: event.id, reason });
      } else {
        console.log('[orchestrate] unknown result shape', result);
      }
    } else {
      await f_webhookEvents_markIgnored({ stripeEventId: event.id, reason: 'MISSING_REFETCH_PAYLOAD' });
    }
  } catch (e) {
    console.error('[orchestrate] error:', (e as any)?.message ?? e);
    // No rompemos el 200 para tolerancia a fallos
  }

  // 5) Respuesta 200
  console.log('stripe event:', event.type, event.id);
  return new Response('ok', { status: 200 });
}
