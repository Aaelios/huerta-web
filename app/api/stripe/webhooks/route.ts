// app/api/stripe/webhooks/route.ts

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import crypto from 'crypto';

// Idempotencia
import { f_webhookEvents_getByStripeId } from '@/lib/webhooks/f_webhookEvents_getByStripeId';
import { f_webhookEvents_markReceived } from '@/lib/webhooks/f_webhookEvents_markReceived';
import { f_webhookEvents_markProcessed } from '@/lib/webhooks/f_webhookEvents_markProcessed';
import { f_webhookEvents_markIgnored } from '@/lib/webhooks/f_webhookEvents_markIgnored';

// Refetch
import f_refetchSession from '@/lib/stripe/f_refetchSession';
import f_refetchInvoice from '@/lib/stripe/f_refetchInvoice';

// Orquestación
import h_stripe_webhook_process from '@/lib/orch/h_stripe_webhook_process';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function sha256(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

function deriveFlags(event: Stripe.Event) {
  const obj: any = (event as any)?.data?.object ?? {};
  const line = obj?.lines?.data?.[0] ?? obj?.line_items?.data?.[0] ?? {};
  const priceObj = line?.price ?? {};
  const compact = line?.pricing?.price_details ?? {};
  const priceMeta = priceObj?.metadata ?? {};
  const productMeta = priceObj?.product?.metadata ?? {};

  return {
    has_price_id: typeof priceObj?.id === 'string' && priceObj.id.length > 0,
    has_compact_price: typeof compact?.price === 'string' && compact.price.length > 0,
    has_price_meta_sku: typeof priceMeta?.sku === 'string' && priceMeta.sku.length > 0,
    has_product_meta_sku: typeof productMeta?.sku === 'string' && productMeta.sku.length > 0,
    currency: obj?.currency ?? null,
    amount_total: obj?.amount_total ?? obj?.total ?? null,
  };
}

export async function POST(req: Request) {
  // 1) Firma
  const sig = req.headers.get('stripe-signature');
  if (!sig) return new Response('missing signature', { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('missing webhook secret', { status: 500 });

  const raw = await req.text();
  const rawHash = sha256(raw);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    console.error('constructEvent error', err?.message || err);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // Flags de estructura para comparar con DB
  const flags = deriveFlags(event);
  console.log('[stripe:webhook] recv', {
    id: event.id,
    type: event.type,
    raw_sha256: rawHash,
    ...flags,
  });

  // 2) Idempotencia mínima
  try {
    const existing = await f_webhookEvents_getByStripeId(event.id);
    if (existing) {
      return Response.json(
        { ok: true, replay: true, id: event.id, type: event.type },
        { status: 200 }
      );
    }
    // Guardar el RAW sin alterar
    await f_webhookEvents_markReceived({
      stripeEventId: event.id,
      type: event.type,
      payload: raw,
    });
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
        await f_webhookEvents_markIgnored({ stripeEventId: event.id });
      } else {
        console.log('[orchestrate] unknown result shape', result);
      }
    } else {
      await f_webhookEvents_markIgnored({ stripeEventId: event.id });
    }
  } catch (e) {
    console.error('[orchestrate] error:', (e as any)?.message ?? e);
    // Tolerancia a fallos: mantenemos 200
  }

  // 5) Respuesta 200
  console.log('stripe event done:', event.type, event.id);
  return new Response('ok', { status: 200 });
}
