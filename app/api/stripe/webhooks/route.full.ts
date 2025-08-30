// app/api/stripe/webhooks/route.ts
export const runtime = "nodejs";

// Paso 0 — Configuración del handler de App Router
export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';

// Helpers locales (respetando nombres y paths provistos)
import { f_verifySignature } from '@/lib/stripe/f_verifySignature';
import f_refetchSession from '@/lib/stripe/f_refetchSession';
import f_refetchInvoice from '@/lib/stripe/f_refetchInvoice';


import { f_webhookEvents_getByStripeId } from '@/lib/webhooks/f_webhookEvents_getByStripeId';
import { f_webhookEvents_markReceived } from '@/lib/webhooks/f_webhookEvents_markReceived';
import { f_webhookEvents_markProcessed } from '@/lib/webhooks/f_webhookEvents_markProcessed';
import { f_webhookEvents_markIgnored } from '@/lib/webhooks/f_webhookEvents_markIgnored';
import { f_webhookEvents_markFailed } from '@/lib/webhooks/f_webhookEvents_markFailed';

import h_stripe_webhook_process from '@/lib/orch/h_stripe_webhook_process';


// Tipado mínimo local para respuestas
type JsonOut = Record<string, unknown>;

/**
 * Paso 1 — Lectura de body crudo y verificación de firma
 * - Lee `req.text()` en lugar de `req.json()`.
 * - Extrae el header `stripe-signature`.
 * - Verifica con `f_verifySignature` y obtiene `{ id, type }`.
 */
async function step1_readAndVerify(req: NextRequest) {
  const sig = req.headers.get('stripe-signature') || '';
  if (!sig) {
    return { ok: false, status: 400, err: 'missing_stripe_signature' } as const;
  }
  const rawBody = await req.text();
  try {
    const { id, type } = await f_verifySignature(rawBody, sig); // debe lanzar si es inválida
    return { ok: true, rawBody, id, type } as const;
  } catch (e: any) {
    // Firma inválida → 400
    return { ok: false, status: 400, err: 'invalid_signature', detail: e?.message } as const;
  }
}

/**
 * Paso 2 — Idempotencia y marca de “received”
 * - Si el evento ya fue procesado → 200 idempotente.
 * - Si no existe, marca `received` y guarda payload crudo.
 */
async function step2_idempotencyMarkReceived(id: string, type: string, rawBody: string) {
  const existing = await f_webhookEvents_getByStripeId(id);
  if (existing?.processed_at) {
    return { replay: true } as const;
  }
  await f_webhookEvents_markReceived({ stripe_event_id: id, type, payload: rawBody });
  return { replay: false } as const;
}

/**
 * Paso 3 — Refetch del objeto principal según el tipo
 * - checkout.session.completed → refetch session
 * - invoice.payment_succeeded → refetch invoice
 * - Tipos no soportados → “ignored”
 */
async function step3_refetchPayload(id: string, type: string) {
  if (type === 'checkout.session.completed') {
    const payload = await f_refetchSession(id);
    return { kind: 'session', payload } as const;
  }
  if (type === 'invoice.payment_succeeded') {
    const payload = await f_refetchInvoice(id);
    return { kind: 'invoice', payload } as const;
  }
  return { kind: 'ignored', reason: 'unsupported_event_type' } as const;
}

/**
 * Paso 4 — Orquestación en Node
 * - Delegar a `h_stripe_webhook_process({ type, payload })`.
 * - Esta función invoca **una sola** RPC: `public.f_orch_orders_upsert(jsonb)`.
 * - La lógica de órdenes, pagos y entitlements vive en SQL.
 */
async function step4_orchestrate(type: string, payload: any) {
  return h_stripe_webhook_process({ type, payload });
}

/**
 * Paso 5 — Marcas finales y respuesta
 * - processed: set `processed_at` (y `order_id` si aplica).
 * - ignored: set `ignored` con razón concreta.
 */
async function step5_finalize_ok(
  id: string,
  result:
    | { status: 'processed'; order_id?: string | null }
    | { status: 'ignored'; reason: string }
) {
  if (result.status === 'processed') {
    await f_webhookEvents_markProcessed({ stripe_event_id: id, order_id: result.order_id || null });
    return Response.json({ ok: true } satisfies JsonOut, { status: 200 });
  }
  // ignored
  await f_webhookEvents_markIgnored({ stripe_event_id: id, reason: result.reason });
  return Response.json({ ok: true, ignored: result.reason } satisfies JsonOut, { status: 200 });
}

/**
 * Paso 6 — Manejo de errores
 * - Fallos de negocio o infra → marcar `failed` con detalle.
 * - Responder 500 para permitir reintentos controlados.
 */
async function step6_finalize_error(id: string, error: any) {
  const safe = {
    name: error?.name || 'Error',
    message: error?.message || String(error),
    code: error?.code,
    stack: error?.stack,
  };
  await f_webhookEvents_markFailed({ stripe_event_id: id, error: safe });
  return Response.json({ ok: false, error: 'internal_error' } satisfies JsonOut, { status: 500 });
}

// Handler principal
export async function POST(req: NextRequest) {
  // Paso 1 — lectura + firma
  const v1 = await step1_readAndVerify(req);
  if (!v1.ok) {
    return Response.json(
      { ok: false, error: v1.err, detail: v1.detail } satisfies JsonOut,
      { status: v1.status }
    );
  }

  const { rawBody, id, type } = v1;

  try {
    // Paso 2 — idempotencia + received
    const idemp = await step2_idempotencyMarkReceived(id, type, rawBody);
    if (idemp.replay) {
      // Repetición de evento ya procesado
      return Response.json({ ok: true, replay: true } satisfies JsonOut, { status: 200 });
    }

    // Paso 3 — refetch del objeto principal
    const ref = await step3_refetchPayload(id, type);
    if (ref.kind === 'ignored') {
      return step5_finalize_ok(id, { status: 'ignored', reason: ref.reason });
    }

    // Paso 4 — orquestación
    const orch = await step4_orchestrate(type, ref.payload);
    // Se espera uno de dos estados: processed | ignored
    if (orch?.status === 'processed') {
      return step5_finalize_ok(id, { status: 'processed', order_id: orch.order_id });
    }
    if (orch?.status === 'ignored') {
      return step5_finalize_ok(id, { status: 'ignored', reason: orch.reason || 'no_op' });
    }

    // Si la orquestación no devuelve un estado conocido, tratar como error controlado
    throw new Error('unexpected_orchestration_result');

  } catch (e: any) {
    // Paso 6 — error → markFailed + 500
    return step6_finalize_error(id, e);
  }
}
