// app/api/stripe/create-checkout-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { f_parseInput } from '@/lib/checkout/f_parseInput';
import { f_callCatalogPrice } from '@/lib/checkout/f_callCatalogPrice';
import { f_mapSqlError } from '@/lib/checkout/f_mapSqlError';
import { f_createStripeEmbeddedSession } from '@/lib/checkout/f_createStripeEmbeddedSession';
import { f_buildReturnUrl } from '@/lib/checkout/f_buildReturnUrls';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

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

    // 2) Catálogo → price_id y metadatos auxiliares
    const tRpc0 = Date.now();
    const row = await f_callCatalogPrice({ sku, currency }); // -> { stripe_price_id, amount_cents, currency, metadata? }
    const rpc_ms = Date.now() - tRpc0;

    const priceId = String(row.stripe_price_id);

    // 3) Stripe Price canónico → tipo y metadata
    const tStripePrice0 = Date.now();
    const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
    const stripe_ms_price = Date.now() - tStripePrice0;

    const mode: 'payment' | 'subscription' =
      price.type === 'recurring' ? 'subscription' : 'payment';

    const pmeta = price.metadata || {};
    const price_list = (row?.metadata as any)?.price_list ?? '';
    const interval =
      (price.type === 'recurring' ? price.recurring?.interval : null) ??
      ((row?.metadata as any)?.interval ?? '');

    // 4) Crear sesión Embedded con metadata requerida
    const returnUrl = f_buildReturnUrl(); // usa NEXT_PUBLIC_SITE_URL o equivalente interno si así lo definiste
    const idempotencyKey =
      req.headers.get('idempotency-key') || `chk_${reqId}_${sku}_${Date.now()}`;

    const tStripe0 = Date.now();
    const session = await f_createStripeEmbeddedSession({
      priceId,
      mode,
      returnUrl,
      quantity: 1,
      idempotencyKey,
      metadata: {
        sku: String(pmeta.sku ?? sku),
        fulfillment_type: pmeta.fulfillment_type ?? '',
        success_slug: pmeta.success_slug ?? '',
        price_list: price_list ?? '',
        interval: interval ?? '',
        price_id: priceId,
      },
    });
    const stripe_ms = Date.now() - tStripe0;

    // 5) Respuesta
    console.log(
      JSON.stringify({
        event: 'checkout.create',
        reqId,
        sku,
        currency,
        rpc_ms,
        stripe_ms_price,
        stripe_ms,
        mode,
        price_id_suffix: priceId.slice(-8),
        outcome: 'ok',
        sessionId: session.sessionId,
      })
    );

    return json({ client_secret: session.client_secret, sessionId: session.sessionId }, 200);
  } catch (e: any) {
    // Validación propia
    if (e?.code === 'BAD_REQUEST') {
      return json({ code: 'BAD_REQUEST' }, 400);
    }

    // Errores SQL mapeados
    if (
      e?.code === 'P0002' ||
      e?.code === '22023' ||
      e?.code === 'P0001' ||
      /^NOT_FOUND|INVALID_CURRENCY|AMBIGUOUS_PRICE/i.test(e?.message || '')
    ) {
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
    console.log(JSON.stringify({ event: 'checkout.create.done', reqId, took_ms }));
  }
}

export async function GET() {
  return NextResponse.json({ code: 'METHOD_NOT_ALLOWED' }, { status: 405 });
}
