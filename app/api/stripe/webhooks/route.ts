// app/api/stripe/webhooks/route.ts
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

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

// --- env ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY || '');
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// dominio base para el CTA del correo (producción)
const BASE_URL = 'https://huerta.consulting';

export async function POST(req: Request) {
  const version = 'route.v5+receipt';
  const sig = req.headers.get('stripe-signature');
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) return new Response('missing webhook secret', { status: 500 });
  if (!sig) return new Response('missing signature', { status: 400 });

  // 1) raw y verificación
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  // 2) idempotencia evento
  try {
    const existing = await f_webhookEvents_getByStripeId(event.id);
    if (existing) {
      return Response.json({ ok: true, replay: true, id: event.id, type: event.type }, { status: 200 });
    }
    await f_webhookEvents_markReceived({ stripeEventId: event.id, type: event.type, payload: raw });
  } catch {}

  // 3) refetch canónico
  let session: Stripe.Checkout.Session | null = null;
  let invoice: Stripe.Invoice | null = null;
  let payment_intent: Stripe.PaymentIntent | null = null;

  try {
    const obj: any = (event as any).data?.object;

    if (event.type === 'invoice.payment_succeeded') {
      const invoiceId = obj?.id as string | undefined;
      if (invoiceId) {
        invoice = await f_refetchInvoice(invoiceId);
        console.log('[webhook]', version, 'refetch invoice', invoice.id);
      }
    } else if (event.type === 'checkout.session.completed') {
      const sessionId = obj?.id as string | undefined;
      if (sessionId) {
        session = await f_refetchSession(sessionId);
        console.log('[webhook]', version, 'refetch session', session.id);
      }
    } else if (event.type === 'payment_intent.succeeded') {
      const piId =
        (typeof obj?.id === 'string' && obj.id.startsWith('pi_')) ? obj.id :
        (typeof obj?.payment_intent === 'string' ? obj.payment_intent : null);
      if (piId) {
        payment_intent = await stripe.paymentIntents.retrieve(piId, { expand: ['charges.data.balance_transaction'] });
        try {
          const sessList = await stripe.checkout.sessions.list({ payment_intent: piId, limit: 1, expand: ['data.line_items'] });
          const sess = sessList?.data?.[0] ?? null;
          if (sess?.id) session = await f_refetchSession(sess.id);
        } catch {}
        console.log('[webhook]', version, 'refetch payment_intent', payment_intent.id);
      }
    } else {
      console.log('[webhook]', version, 'ignored type', event.type);
    }
  } catch (e) {
    console.error('[webhook]', version, 'refetch error', (e as any)?.message ?? e);
  }

  // 3.1) observabilidad mínima
  try {
    const l1 = {
      type: event.type,
      id: event.id,
      session: session?.id ?? null,
      invoice: invoice?.id ?? null,
      payment_intent: payment_intent?.id ?? null
    };
    console.log('[webhook]', version, 'L1', l1);
  } catch {}

  // 4) orquestación core
  let processed = false;
  let linkedOrderId: string | null = null;

  try {
    if (session || invoice || payment_intent) {
      const result = await h_stripe_webhook_process({
        type: event.type,
        stripeEventId: event.id,
        session: session ?? undefined,
        invoice: invoice ?? undefined,
        payment_intent: payment_intent ?? undefined,
      } as any);

      processed = result?.outcome === 'processed';
      linkedOrderId = (result as any)?.details?.orderId ?? null;

      try {
        if (result?.outcome === 'processed') {
          await f_webhookEvents_markProcessed({ stripeEventId: event.id, orderId: linkedOrderId ?? undefined });
        } else if (result?.outcome === 'ignored') {
          await f_webhookEvents_markIgnored({ stripeEventId: event.id });
        }
      } catch {}
    } else {
      try { await f_webhookEvents_markIgnored({ stripeEventId: event.id }); } catch {}
    }
  } catch (e) {
    console.error('[webhook]', version, 'orchestrate error', (e as any)?.message ?? e);
  }

  // 5) correo post-compra (idempotencia simple en DB)
  try {
    // Regla: enviar SOLO en checkout.session.completed y cuando está pagado
    const paid =
      Boolean(session) &&
      (session!.payment_status === 'paid' || session!.payment_status === 'no_payment_required');

    if (event.type === 'checkout.session.completed' && session && paid) {
      const sessionId = session.id;
      const email =
        session.customer_details?.email ||
        (typeof session.customer_email === 'string' ? session.customer_email : null);

      const md = (session.metadata || {}) as Record<string, string | undefined>;
      const success_slug = (md.success_slug || 'mi-cuenta')!.replace(/[^a-z0-9\-_/]/gi, '');
      const sku = md.sku || '';

      if (email) {
        // Claim atómico: solo 1 proceso puede "tomar" el envío
        const { data: claimed, error: claimErr } = await supabase
          .from('order_headers')
          .update({ receipt_sent_at: new Date().toISOString() })
          .eq('stripe_session_id', sessionId)
          .is('receipt_sent_at', null)
          .select('id,user_id')
          .single();

        if (claimErr && (claimErr as any).code !== 'PGRST116') {
          console.error('[webhook]', version, 'receipt claim error', claimErr);
        }

        if (claimed?.id) {
          // Enviar correo
          const subject = 'Tu compra está confirmada';
          const href = `${BASE_URL}/${success_slug}`;
          const html = `
            <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto">
              <h1>Pago confirmado</h1>
              <p>Gracias por tu compra${sku ? ` (${sku})` : ''}.</p>
              <p>Tu acceso está listo.</p>
              <p><a href="${href}" style="display:inline-block;padding:12px 16px;background:#000;color:#fff;text-decoration:none;border-radius:8px">Continuar</a></p>
              <p style="color:#666;font-size:12px;margin-top:24px">Si el botón no funciona, copia y pega: ${href}</p>
            </div>
          `;

          const from = 'Huerta Consulting <no-reply@huerta.consulting>';
          const send = await resend.emails.send({ from, to: email, subject, html });

          if (send.data?.id) {
            await supabase
              .from('order_headers')
              .update({ receipt_provider_id: send.data.id })
              .eq('id', claimed.id);
          } else if (send.error) {
            console.error('[webhook]', version, 'resend error', send.error);
          }
        } else {
          console.log('[webhook]', version, 'receipt already sent or no matching order for session', sessionId);
        }
      } else {
        console.warn('[webhook]', version, 'no customer email on session', sessionId);
      }
    }
  } catch (e) {
    console.error('[webhook]', version, 'receipt block error', (e as any)?.message ?? e);
  }

  // 6) fin
  console.log('[webhook]', version, 'done', event.type, event.id, { processed, linkedOrderId });
  return new Response('ok', { status: 200 });
}
