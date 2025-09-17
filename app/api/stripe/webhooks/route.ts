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
  const version = 'route.v3+obs1';

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
      // Otras señales (p. ej. payment_intent.succeeded) no se refetchean aquí en Paso 1
      console.log('[webhook]', version, 'ignored type (no refetch on step1)', event.type);
    }
  } catch (e) {
    console.error('[webhook]', version, 'refetch error', (e as any)?.message ?? e);
  }

  // 3.1) Observabilidad L1 (post-refetch o sin refetch)
  try {
    const obj: any = (event as any).data?.object;

    // Detección de tipo de objeto
    const objectHint =
      (obj?.object as string) ||
      (session ? 'checkout.session' : null) ||
      (invoice ? 'invoice' : null);

    // IDs útiles
    const payment_intent_id =
      (session?.payment_intent as string) ||
      (typeof obj?.payment_intent === 'string' ? obj.payment_intent : null) ||
      ((obj?.id?.startsWith?.('pi_') ? obj.id : null));

    const invoice_id =
      invoice?.id ||
      (obj?.id?.startsWith?.('in_') ? obj.id : null) ||
      (typeof obj?.invoice === 'string' ? obj.invoice : null);

    // Modo y estado de pago
    const session_mode = (session?.mode as string) || (obj?.mode as string) || null;
    const session_payment_status =
      (session?.payment_status as string) || (obj?.payment_status as string) || null;

    // Montos y moneda
    const amount_cents =
      (session?.amount_total as number | null) ??
      (invoice?.total as number | null) ??
      (obj?.amount_received as number | null) ??
      (obj?.amount as number | null) ??
      null;

    const currency =
      (session?.currency as string) ||
      (invoice?.currency as string) ||
      (obj?.currency as string) ||
      null;

    const customer_id =
      (session?.customer as string) ||
      (invoice?.customer as string) ||
      (obj?.customer as string) ||
      null;

    // Metadata no sensible
    const sku =
      (session?.metadata as any)?.sku ??
      (invoice?.metadata as any)?.sku ??
      (obj?.metadata as any)?.sku ??
      null;

    // price_id desde invoice (línea 0) o metadata
    let price_id: string | null =
      (session?.metadata as any)?.price_id ??
      (invoice?.metadata as any)?.price_id ??
      (obj?.metadata as any)?.price_id ??
      null;

    if (!price_id && invoice?.lines?.data?.length) {
      const li: any = invoice.lines.data[0];
      price_id = li?.price?.id ?? null;
    }

    const l1 = {
      event_type: event.type,
      event_id: event.id,
      created_ts: event.created ? new Date(event.created * 1000).toISOString() : null,
      object: objectHint ?? null,
      session_mode,
      session_payment_status,
      payment_intent_id,
      invoice_id,
      amount_cents,
      currency,
      customer_id,
      sku,
      price_id,
      refetch: Boolean(session || invoice),
    };

    console.log('[webhook]', version, 'L1_OBS', l1);
  } catch (e) {
    console.error('[webhook]', version, 'L1_OBS error', (e as any)?.message ?? e);
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
