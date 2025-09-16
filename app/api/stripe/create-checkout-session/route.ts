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

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const reqId = req.headers.get('x-request-id') || crypto.randomUUID();

  try {
    if (!req.headers.get('content-type')?.includes('application/json')) {
      return json({ code: 'BAD_REQUEST', message: 'invalid_content_type' }, 400);
    }
    if (!process.env.APP_URL) {
      return json({ code: 'SERVER_MISCONFIG', message: 'Missing APP_URL' }, 500);
    }

    // ---- 1) Inputs ---------------------------------------------------------
    const raw = await req.json().catch(() => ({} as any));
    const priceIdInput: string | undefined = raw.price_id ?? raw.priceId ?? undefined;
    const modeInput: 'payment' | 'subscription' | undefined =
      raw.mode && (raw.mode === 'subscription' || raw.mode === 'payment') ? raw.mode : undefined;

    // Para compatibilidad con tu flujo previo basado en catálogo:
    // si NO viene price_id, usamos f_parseInput (sku + currency) y resolvemos price en BD.
    let sku: string | undefined;
    let currency: string | undefined;
    let priceId: string;
    let mode: 'payment' | 'subscription';
    let price_list = '';
    let interval = '';
    let pmeta: Record<string, string> = {};

    if (priceIdInput) {
      // ---- 2A) Camino con price_id directo ---------------------------------
      const tStripePrice0 = Date.now();
      const price = await stripe.prices.retrieve(priceIdInput, { expand: ['product'] });
      const stripe_ms_price = Date.now() - tStripePrice0;

      priceId = price.id;
      mode = modeInput ?? (price.type === 'recurring' ? 'subscription' : 'payment');
      currency = price.currency?.toUpperCase();
      pmeta = price.metadata || {};
      interval =
        (price.type === 'recurring' ? price.recurring?.interval : null) ?? '' as string;

      console.log(
        JSON.stringify({
          event: 'checkout.price_refetch',
          reqId,
          stripe_ms_price,
          price_id_suffix: priceId.slice(-8),
          mode,
          currency,
        })
      );
    } else {
      // ---- 2B) Camino con catálogo (sku + currency) ------------------------
      const parsed = f_parseInput(raw); // puede lanzar BAD_REQUEST si faltan campos
      sku = parsed.sku;
      currency = parsed.currency;

      const tRpc0 = Date.now();
      const row = await f_callCatalogPrice({ 
        sku, 
        currency: currency?.toUpperCase() as 'MXN' | 'USD' 
      });
      const rpc_ms = Date.now() - tRpc0;

      priceId = String(row.stripe_price_id);

      const tStripePrice0 = Date.now();
      const price = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const stripe_ms_price = Date.now() - tStripePrice0;

      mode = price.type === 'recurring' ? 'subscription' : 'payment';
      pmeta = price.metadata || {};
      const rowMeta = (row?.metadata as any) ?? {};
      price_list = rowMeta.price_list ?? '';
      interval =
        (price.type === 'recurring' ? price.recurring?.interval : null) ??
        (rowMeta.interval ?? '');

      console.log(
        JSON.stringify({
          event: 'checkout.catalog_price',
          reqId,
          rpc_ms,
          stripe_ms_price,
          price_id_suffix: priceId.slice(-8),
          mode,
          sku,
          currency,
        })
      );
    }

    // ---- 3) Crear sesión Embedded -----------------------------------------
    const returnUrl = f_buildReturnUrl(); // construye usando APP_URL
    const idempotencyKey =
      req.headers.get('idempotency-key') || `chk_${reqId}_${priceId}_${Date.now()}`;

    const tStripe0 = Date.now();
    const session = await f_createStripeEmbeddedSession({
      priceId,
      mode,
      returnUrl,
      quantity: 1,
      idempotencyKey,
      metadata: {
        sku: String(pmeta.sku ?? sku ?? ''),
        fulfillment_type: pmeta.fulfillment_type ?? '',
        success_slug: pmeta.success_slug ?? '',
        price_list: price_list ?? '',
        interval: interval ?? '',
        price_id: priceId,
      },
    });
    const stripe_ms = Date.now() - tStripe0;

    // ---- 4) Respuesta ------------------------------------------------------
    console.log(
      JSON.stringify({
        event: 'checkout.create',
        reqId,
        mode,
        currency,
        price_id_suffix: priceId.slice(-8),
        stripe_ms,
        outcome: 'ok',
        sessionId: session.sessionId,
      })
    );

    return json({ client_secret: session.client_secret, session_id: session.sessionId }, 200);
  } catch (e: any) {
    // Validación propia
    if (e?.code === 'BAD_REQUEST') {
      return json({ code: 'BAD_REQUEST' }, 400);
    }

    // Errores SQL mapeados (catálogo)
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
