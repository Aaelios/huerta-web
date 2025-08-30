// app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { f_parseInput } from '@/lib/checkout/f_parseInput';
import { f_callCatalogPrice } from '@/lib/checkout/f_callCatalogPrice';
import { f_mapSqlError } from '@/lib/checkout/f_mapSqlError';
import { f_createStripeEmbeddedSession } from '@/lib/checkout/f_createStripeEmbeddedSession';
import { f_buildReturnUrl } from '@/lib/checkout/f_buildReturnUrls';

export const runtime = 'nodejs'; // Stripe SDK requiere Node.js (no Edge)
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const reqId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return json({ code: 'BAD_REQUEST', message: 'invalid_content_type' }, 400);
    }

    // 1) Inputs
    const raw = await req.json().catch(() => ({}));
    const { sku, currency } = f_parseInput(raw);

    // 2) RPC catálogo → resolver price_id
    const tRpc0 = Date.now();
    const row = await f_callCatalogPrice({ sku, currency });
    const rpc_ms = Date.now() - tRpc0;

    // 3) Stripe Embedded
    const returnUrl = f_buildReturnUrl();
    const idempotencyKey =
      req.headers.get('idempotency-key') || `chk_${reqId}_${sku}_${Date.now()}`;

    const tStripe0 = Date.now();
    const session = await f_createStripeEmbeddedSession({
      priceId: row.stripe_price_id,
      mode: 'payment', // si ese price es de subscripción: 'subscription'
      returnUrl,
      quantity: 1,
      idempotencyKey,
    });
    const stripe_ms = Date.now() - tStripe0;

    // 4) Respuesta
    // Opcional: log estructurado mínimo
    console.log(
      JSON.stringify({
        event: 'checkout.create',
        reqId,
        sku,
        currency,
        rpc_ms,
        stripe_ms,
        outcome: 'ok',
        sessionId: session.sessionId,
      })
    );

    return json({ client_secret: session.client_secret, sessionId: session.sessionId }, 200);
  } catch (e: any) {
    // Errores de validación propia
    if (e?.code === 'BAD_REQUEST') {
      return json({ code: 'BAD_REQUEST' }, 400);
    }

    // Errores SQL mapeados
    if (e?.code === 'P0002' || e?.code === '22023' || e?.code === 'P0001' || /^NOT_FOUND|INVALID_CURRENCY|AMBIGUOUS_PRICE/i.test(e?.message || '')) {
      const mapped = f_mapSqlError(e);
      console.warn(
        JSON.stringify({
          event: 'checkout.create',
          reqId,
          outcome: 'sql_error',
          status: mapped.status,
          code: mapped.code,
        })
      );
      return json({ code: mapped.code }, mapped.status);
    }

    // Errores Stripe
    if (e?.type && String(e.type).toLowerCase().includes('stripe')) {
      console.error(
        JSON.stringify({
          event: 'checkout.create',
          reqId,
          outcome: 'stripe_error',
          type: e.type,
          message: e.message,
        })
      );
      return json({ code: 'STRIPE_ERROR' }, 502);
    }

    // Desconocido
    console.error(
      JSON.stringify({
        event: 'checkout.create',
        reqId,
        outcome: 'internal_error',
        message: e?.message || String(e),
      })
    );
    return json({ code: 'INTERNAL_ERROR' }, 500);
  } finally {
    const took_ms = Date.now() - t0;
    // Trace simple
    console.log(JSON.stringify({ event: 'checkout.create.done', reqId, took_ms }));
  }
}

// Bloquea otros métodos
export async function GET() {
  return NextResponse.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
