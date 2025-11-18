// app/api/admin/stripe/reprocess-event/route.ts
// Huerta Consulting — Reprocess Stripe Event v1 — 2025-11-17

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

import { f_webhookEvents_getByStripeId } from '@/lib/webhooks/f_webhookEvents_getByStripeId';
import { f_webhookEvents_markProcessed } from '@/lib/webhooks/f_webhookEvents_markProcessed';
import { f_webhookEvents_markIgnored } from '@/lib/webhooks/f_webhookEvents_markIgnored';

import f_refetchSession from '@/lib/stripe/f_refetchSession';
import f_refetchInvoice from '@/lib/stripe/f_refetchInvoice';

import h_stripe_webhook_process from '@/lib/orch/h_stripe_webhook_process';

// -----------------------------------------------------
// Clientes
// -----------------------------------------------------
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

// -----------------------------------------------------
// Tipos
// -----------------------------------------------------
type TRequestBody =
  | { mode: 'stripe_event_id'; id: string }
  | { mode: 'webhook_event_id'; id: string };

type TWebhookRow = {
  id: string;
  stripe_event_id: string;
  type: string;
  payload: unknown;
  received_at: string;
  processed_at: string | null;
  order_id: string | null;
};

type THasId = { id: string };
type THasPaymentIntent = { payment_intent: string };

type TWebhookResult =
  | { outcome: 'processed'; details?: { orderId?: string } }
  | { outcome: 'ignored'; reason: string; details?: unknown }
  | { outcome: 'error_transient'; reason: string; details?: unknown }
  | { outcome: 'error_fatal'; reason: string; details?: unknown };

// -----------------------------------------------------
// POST
// -----------------------------------------------------
export async function POST(req: Request): Promise<Response> {
  // -----------------------------------------
  // 1) Seguridad en producción
  // -----------------------------------------
  const requiredKey = process.env.ADMIN_REPROCESS_KEY;
  if (requiredKey) {
    const adminKey = req.headers.get('x-admin-key');
    if (!adminKey || adminKey !== requiredKey) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
  }

  // -----------------------------------------
  // 2) Parse body
  // -----------------------------------------
  let body: TRequestBody;
  try {
    body = (await req.json()) as TRequestBody;
  } catch {
    return Response.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (
    !body ||
    typeof body.id !== 'string' ||
    (body.mode !== 'stripe_event_id' && body.mode !== 'webhook_event_id')
  ) {
    return Response.json({ error: 'invalid_body' }, { status: 400 });
  }

  // -----------------------------------------
  // 3) Buscar webhook_event
  // -----------------------------------------
  let row: TWebhookRow | null = null;

  if (body.mode === 'stripe_event_id') {
    const r = await f_webhookEvents_getByStripeId(body.id);
    if (
      r &&
      typeof r.id === 'string' &&
      typeof r.stripe_event_id === 'string' &&
      typeof r.type === 'string' &&
      r.payload !== null &&
      typeof r.received_at === 'string'
    ) {
      row = {
        id: r.id,
        stripe_event_id: r.stripe_event_id,
        type: r.type,
        payload: r.payload,
        received_at: r.received_at,
        processed_at: r.processed_at ?? null,
        order_id: r.order_id ?? null,
      };
    } else {
      return Response.json({ error: 'invalid_row' }, { status: 422 });
    }
  } else {
    const { data, error } = await supabase
      .from('webhook_events')
      .select('*')
      .eq('id', body.id)
      .limit(1)
      .maybeSingle();

    if (error) {
      return Response.json({ error: 'db_error' }, { status: 500 });
    }

    if (
      data &&
      typeof data.id === 'string' &&
      typeof data.stripe_event_id === 'string' &&
      typeof data.type === 'string' &&
      data.payload !== null &&
      typeof data.received_at === 'string'
    ) {
      row = {
        id: data.id,
        stripe_event_id: data.stripe_event_id,
        type: data.type,
        payload: data.payload,
        received_at: data.received_at,
        processed_at: data.processed_at ?? null,
        order_id: data.order_id ?? null,
      };
    } else if (data) {
      return Response.json({ error: 'invalid_row' }, { status: 422 });
    }
  }

  if (!row) {
    return Response.json({ error: 'not_found' }, { status: 404 });
  }

  // -----------------------------------------
  // 4) Reconstruir Stripe.Event
  // -----------------------------------------
  const event = row.payload as Stripe.Event;

  // -----------------------------------------
  // 5) Refetch canónico (misma lógica que webhook)
// -----------------------------------------
  let session: Stripe.Checkout.Session | null = null;
  let invoice: Stripe.Invoice | null = null;
  let payment_intent: Stripe.PaymentIntent | null = null;

  const objUnknown = event.data?.object as unknown;

  if (event.type === 'invoice.payment_succeeded') {
    if (
      objUnknown &&
      typeof objUnknown === 'object' &&
      'id' in objUnknown &&
      typeof (objUnknown as THasId).id === 'string'
    ) {
      const invoiceId: string = (objUnknown as THasId).id;
      invoice = await f_refetchInvoice(invoiceId);
    }
  }

  if (event.type === 'checkout.session.completed') {
    if (
      objUnknown &&
      typeof objUnknown === 'object' &&
      'id' in objUnknown &&
      typeof (objUnknown as THasId).id === 'string'
    ) {
      const sessionId: string = (objUnknown as THasId).id;
      session = await f_refetchSession(sessionId);
    }
  }

  if (event.type === 'payment_intent.succeeded') {
    let piId: string | null = null;

    if (
      objUnknown &&
      typeof objUnknown === 'object' &&
      'id' in objUnknown &&
      typeof (objUnknown as THasId).id === 'string' &&
      (objUnknown as THasId).id.startsWith('pi_')
    ) {
      piId = (objUnknown as THasId).id;
    } else if (
      objUnknown &&
      typeof objUnknown === 'object' &&
      'payment_intent' in objUnknown &&
      typeof (objUnknown as THasPaymentIntent).payment_intent === 'string'
    ) {
      piId = (objUnknown as THasPaymentIntent).payment_intent;
    }

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
        const sess = sessList.data?.[0] ?? null;
        if (sess?.id) {
          session = await f_refetchSession(sess.id);
        }
      } catch {
        // silencioso
      }
    }
  }

  // -----------------------------------------
  // 6) Orquestador
  // -----------------------------------------
  const result = (await h_stripe_webhook_process({
    type: event.type,
    stripeEventId: event.id,
    session: session ?? undefined,
    invoice: invoice ?? undefined,
    payment_intent: payment_intent ?? undefined,
  })) as TWebhookResult;

  // -----------------------------------------
  // 7) Marcar estado
  // -----------------------------------------
  try {
    if (result.outcome === 'processed') {
      const orderId: string | null =
        result.details && typeof result.details.orderId === 'string'
          ? result.details.orderId
          : null;

      await f_webhookEvents_markProcessed({
        stripeEventId: event.id,
        orderId,
      });
    }

    if (result.outcome === 'ignored') {
      await f_webhookEvents_markIgnored({ stripeEventId: event.id });
    }
  } catch {
    // silencioso
  }

  // -----------------------------------------
  // 8) Respuesta
  // -----------------------------------------
  if (result.outcome === 'error_transient') {
    return Response.json(
      {
        status: 'error',
        kind: 'error_transient',
        stripe_event_id: event.id,
        webhook_event_id: row.id,
      },
      { status: 500 }
    );
  }

  return Response.json(
    {
      status: 'ok',
      outcome: result.outcome,
      stripe_event_id: event.id,
      webhook_event_id: row.id,
      type: event.type,
    },
    { status: 200 }
  );
}