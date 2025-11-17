// app/api/stripe/webhooks/route.ts
// Huerta Consulting — v8 webhook-fix — 2025-11-17

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

// Idempotencia en Next
import { f_webhookEvents_getByStripeId } from '@/lib/webhooks/f_webhookEvents_getByStripeId';
import { f_webhookEvents_markReceived } from '@/lib/webhooks/f_webhookEvents_markReceived';
import { f_webhookEvents_markProcessed } from '@/lib/webhooks/f_webhookEvents_markProcessed';
import { f_webhookEvents_markIgnored } from '@/lib/webhooks/f_webhookEvents_markIgnored';

// Refetch canónico
import f_refetchSession from '@/lib/stripe/f_refetchSession';
import f_refetchInvoice from '@/lib/stripe/f_refetchInvoice';

// Nuevo orquestador v2
import h_stripe_webhook_process from '@/lib/orch/h_stripe_webhook_process';

// Email postcompra
import { resolveNextStep } from '@/lib/postpurchase/resolveNextStep';
import { renderEmail } from '@/lib/emails/renderers';

// env
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY || '');
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const BASE_URL = (process.env.APP_URL || '').trim();

export async function POST(req: Request) {
  const version = 'route.v8+fix';
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return new Response('missing webhook secret', { status: 500 });
  if (!sig) return new Response('missing signature', { status: 400 });

  // 1) raw y verificación de firma
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2) idempotencia (Next)
  try {
    const existing = await f_webhookEvents_getByStripeId(event.id);
    if (existing) {
      return Response.json(
        { ok: true, replay: true, id: event.id, type: event.type },
        { status: 200 }
      );
    }
    await f_webhookEvents_markReceived({
      stripeEventId: event.id,
      type: event.type,
      payload: raw,
    });
  } catch {}

  // 3) refetch canónico
  let session: Stripe.Checkout.Session | null = null;
  let invoice: Stripe.Invoice | null = null;
  let payment_intent: Stripe.PaymentIntent | null = null;

  try {
    const obj: any = (event as any).data?.object;

    if (event.type === 'invoice.payment_succeeded') {
      const invoiceId = obj?.id;
      if (invoiceId) invoice = await f_refetchInvoice(invoiceId);
    } else if (event.type === 'checkout.session.completed') {
      const sessionId = obj?.id;
      if (sessionId) session = await f_refetchSession(sessionId);
    } else if (event.type === 'payment_intent.succeeded') {
      const piId =
        typeof obj?.id === 'string' && obj.id.startsWith('pi_')
          ? obj.id
          : typeof obj?.payment_intent === 'string'
          ? obj.payment_intent
          : null;
      if (piId) {
        payment_intent = await stripe.paymentIntents.retrieve(piId, {
          expand: ['charges.data.balance_transaction'],
        });
        try {
          const sessList = await stripe.checkout.sessions.list({
            payment_intent: piId,
            limit: 1,
            expand: ['data.line_items'],
          });
          const sess = sessList?.data?.[0] ?? null;
          if (sess?.id) session = await f_refetchSession(sess.id);
        } catch {}
      }
    }
  } catch (e) {}

  // Observabilidad mínima
  try {
    console.log('[webhook]', version, 'L1', {
      type: event.type,
      eventId: event.id,
      session: session?.id ?? null,
      invoice: invoice?.id ?? null,
      payment_intent: payment_intent?.id ?? null,
    });
  } catch {}

  // 4) nuevo orquestador v2
  let result:
    | { outcome: 'processed'; details?: any }
    | { outcome: 'ignored'; reason: string; details?: any }
    | { outcome: 'error_transient'; reason: string; details?: any }
    | { outcome: 'error_fatal'; reason: string; details?: any };

  try {
    result = await h_stripe_webhook_process({
      type: event.type,
      stripeEventId: event.id,
      session: session ?? undefined,
      invoice: invoice ?? undefined,
      payment_intent: payment_intent ?? undefined,
    } as any);
  } catch (e: any) {
    result = {
      outcome: 'error_transient',
      reason: 'UNHANDLED_EXCEPTION',
      details: { message: e?.message ?? String(e) },
    };
  }

  // 4.1) marcar eventos según outcome
  try {
    if (result.outcome === 'processed') {
      await f_webhookEvents_markProcessed({
        stripeEventId: event.id,
        orderId: (result as any)?.details?.orderId ?? undefined,
      });
    } else if (result.outcome === 'ignored') {
      await f_webhookEvents_markIgnored({ stripeEventId: event.id });
    }
    // error_transient y error_fatal → NO marcar (solo received)
  } catch {}

  // 5) correo post-compra (independiente del outcome)
  try {
    if (
      event.type === 'checkout.session.completed' &&
      session &&
      (session.payment_status === 'paid' ||
        session.payment_status === 'no_payment_required')
    ) {
      if (process.env.SEND_RECEIPTS === '1') {
        const sessionId = session.id;
        const email =
          session.customer_details?.email ||
          (typeof session.customer_email === 'string'
            ? session.customer_email
            : null);

        if (email) {
          const { data: claimed, error: claimErr } = await supabase
            .from('order_headers')
            .update({ receipt_sent_at: new Date().toISOString() })
            .eq('stripe_session_id', sessionId)
            .is('receipt_sent_at', null)
            .select('id,user_id')
            .single();

          if (!claimErr && claimed?.id) {
            const md = (session.metadata || {}) as Record<string, string | undefined>;
            const li0 = session.line_items?.data?.[0] as any;
            const priceMd = (li0?.price?.metadata || {}) as Record<string, string | undefined>;
            const productMd =
              (typeof li0?.price?.product === 'object' && li0?.price?.product
                ? ((li0.price.product as any).metadata || {})
                : {}) as Record<string, string | undefined>;

            const sku = md.sku || priceMd.sku || productMd.sku || '';
            const fulfillment_type =
              md.fulfillment_type ||
              priceMd.fulfillment_type ||
              productMd.fulfillment_type ||
              '';
            const success_slug = (
              md.success_slug ||
              priceMd.success_slug ||
              productMd.success_slug ||
              'mi-cuenta'
            )!.replace(/[^a-z0-9\-_/]/gi, '');

            const next = await resolveNextStep({
              fulfillment_type,
              sku,
              success_slug,
            });

            const rel = 'href' in next && next.href ? next.href : `/${success_slug}`;
            const href = rel.startsWith('http')
              ? rel
              : `${BASE_URL.replace(/\/+$/, '')}${rel}`;

            const { subject, html, from } = renderEmail(
              { ...(next as any), href },
              {
                appUrl: BASE_URL,
                supportEmail: 'soporte@lobra.net',
                from: process.env.RESEND_FROM || 'LOBRÁ <no-reply@mail.lobra.net>',
                subjectPrefix: process.env.EMAIL_SUBJECT_PREFIX || null,
              }
            );

            const send = await resend.emails.send({
              from: from || 'LOBRÁ <no-reply@mail.lobra.net>',
              to: email,
              subject,
              html,
            });

            if (send.data?.id) {
              await supabase
                .from('order_headers')
                .update({ receipt_provider_id: send.data.id })
                .eq('id', claimed.id);
            }
          }
        }
      }
    }
  } catch {}

  // 6) respuesta HTTP según outcome
  try {
    console.log('[webhook]', version, 'final', {
      eventId: event.id,
      type: event.type,
      outcome: result.outcome,
      reason: (result as any)?.reason ?? null,
    });
  } catch {}

  if (result.outcome === 'error_transient') {
    return new Response('transient', { status: 500 });
  }

  // processed | ignored | error_fatal
  return new Response('ok', { status: 200 });
}