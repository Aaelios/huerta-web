// app/gracias/page.tsx
import Stripe from 'stripe';
import Link from 'next/link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  searchParams?: Promise<SearchParams>;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

function isString(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0;
}
function safeSlug(x: unknown): string | null {
  if (!isString(x)) return null;
  return x.replace(/[^a-z0-9\-_/]/gi, '');
}

async function getSession(sessionId: string) {
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    return { ok: true as const, s };
  } catch (e: unknown) {
    let msg = 'SESSION_FETCH_ERROR';
    if (typeof e === 'object' && e !== null && 'message' in e) {
      msg = String((e as { message?: string }).message);
    }
    return { ok: false as const, error: msg };
  }
}

export default async function Page({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const session_id = isString(sp?.session_id) ? sp!.session_id : '';

  if (!session_id) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">Falta confirmar el pago</h1>
        <p className="mb-4">No recibimos el identificador de la sesión de pago.</p>
        <Link href="/checkout" className="underline">Volver al checkout</Link>
      </main>
    );
  }

  const { ok, s, error } = await getSession(session_id);
  if (!ok || !s) {
    return (
      <main className="mx-auto max-w-xl p-6">
        <h1 className="text-2xl font-semibold mb-2">No pudimos validar tu pago</h1>
        <p className="mb-4">Detalle: {error}</p>
        <Link href="/checkout" className="underline">Intentar de nuevo</Link>
      </main>
    );
  }

  const status = s.status;
  const payment_status = s.payment_status;
  const md = (s.metadata || {}) as Record<string, string | undefined>;
  const success_slug = safeSlug(md.success_slug) || 'mis-compras';
  const sku = md.sku || '';
  const mode = s.mode || '';

  const paid =
    status === 'complete' ||
    payment_status === 'paid' ||
    payment_status === 'no_payment_required';

  const dl = {
    event: 'purchase',
    stripe_session_id: s.id,
    mode,
    currency: s.currency,
    value: (s.amount_total ?? 0) / 100,
    sku,
  };

  return (
    <main className="mx-auto max-w-xl p-6">
      {paid ? (
        <>
          <h1 className="text-2xl font-semibold mb-2">Pago confirmado</h1>
          <p className="mb-4">Gracias por tu compra.</p>
          <div className="mt-4">
            <Link href={`/${success_slug}`} className="inline-block rounded bg-black px-4 py-2 text-white">
              Continuar
            </Link>
          </div>
        </>
      ) : status === 'open' ? (
        <>
          <h1 className="text-2xl font-semibold mb-2">Tu pago está en proceso</h1>
          <p className="mb-4">Si pagaste con OXXO o SPEI puede tardar.</p>
          <div className="mt-4">
            <Link href="/mis-compras" className="underline">Ver mis compras</Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold mb-2">Sesión expirada o cancelada</h1>
          <p className="mb-4">Vuelve a intentar el pago para completar tu compra.</p>
          <div className="mt-4">
            <Link href="/checkout" className="underline">Volver al checkout</Link>
          </div>
        </>
      )}

      {paid ? (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push(${JSON.stringify(dl)});
            `,
          }}
        />
      ) : null}

      <div className="mt-8 text-xs text-neutral-500">
        <div>Ref: {s.id}</div>
        <div>Estado: {String(status)} / {String(payment_status)}</div>
      </div>
    </main>
  );
}
