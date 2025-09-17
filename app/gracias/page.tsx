// app/gracias/page.tsx
import Stripe from 'stripe';
import Link from 'next/link';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = {
  searchParams?: Promise<SearchParams>;
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Supabase (solo lectura; SELECT público habilitado por RLS)
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) as string,
  { auth: { persistSession: false } }
)

function isString(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0;
}
function safeSlug(x: unknown): string | null {
  if (!isString(x)) return null;
  return x.replace(/[^a-z0-9\-_/]/gi, '');
}

async function detectLocaleCountry(): Promise<{ locale: string; country: string | null }> {
  const h = await headers();
  const al = h.get('accept-language') || '';
  // toma primer tag, ej: "es-MX,es;q=0.9,en-US;q=0.8"
  const first = al.split(',')[0]?.trim() || '';
  if (/^[a-z]{2}-[A-Z]{2}$/.test(first)) {
    const [lang, region] = first.split('-');
    return { locale: `${lang}-${region}`, country: region };
  }
  if (first.startsWith('es')) return { locale: 'es-MX', country: 'MX' };
  if (first.startsWith('en')) return { locale: 'en-US', country: 'US' };
  return { locale: 'es-MX', country: 'MX' };
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

type TYCopy = {
  title: string;
  body_md: string;
  cta_label: string;
  cta_slug: string;
};

async function fetchThankYouCopy(sku: string, locale: string, country: string | null): Promise<TYCopy | null> {
  try {
    // 1) sku + locale + country
    if (country) {
      const { data } = await supabase
        .from('thankyou_copy')
        .select('title,body_md,cta_label,cta_slug')
        .eq('sku', sku)
        .eq('locale', locale)
        .eq('country', country)
        .maybeSingle();
      if (data) return data as TYCopy;
    }
    // 2) sku + locale (country null)
    const { data: data2 } = await supabase
      .from('thankyou_copy')
      .select('title,body_md,cta_label,cta_slug')
      .eq('sku', sku)
      .eq('locale', locale)
      .is('country', null)
      .maybeSingle();
    if (data2) return data2 as TYCopy;

    // 3) sin coincidencia
    return null;
  } catch {
    return null;
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
  const success_slug_md = safeSlug(md.success_slug) || 'mis-compras';
  const sku = md.sku || '';
  const mode = s.mode || '';

  const paid =
    status === 'complete' ||
    payment_status === 'paid' ||
    payment_status === 'no_payment_required';

  // Copy dinámico por SKU/locale/country
  const { locale, country } = await detectLocaleCountry();
  const copy = sku ? await fetchThankYouCopy(sku, locale, country) : null;

  const title = copy?.title || 'Pago confirmado';
  const body = copy?.body_md || 'Gracias por tu compra.';
  const cta_label = copy?.cta_label || 'Continuar';
  const cta_slug = safeSlug(copy?.cta_slug) || success_slug_md;

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
          <h1 className="text-2xl font-semibold mb-2">{title}</h1>
          <p className="mb-4">{body}</p>
          <div className="mt-4">
            <Link href={`/${cta_slug}`} className="inline-block rounded bg-black px-4 py-2 text-white">
              {cta_label}
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
