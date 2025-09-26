// app/gracias/page.tsx
import Stripe from 'stripe';
import Link from 'next/link';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;
type PageProps = { searchParams?: Promise<SearchParams> };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// Supabase SOLO para copy opcional (RLS SELECT público)
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY) as string,
  { auth: { persistSession: false } }
);

function isString(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0;
}
function safeSlug(x: unknown): string | null {
  if (!isString(x)) return null;
  return x.replace(/[^a-z0-9\-_/]/gi, '');
}
function maskEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  const [user, dom] = email.split('@');
  if (!user || !dom) return email;
  const shown = user.slice(0, 2);
  return `${shown}${user.length > 2 ? '***' : ''}@${dom}`;
}
async function detectLocaleCountry(): Promise<{ locale: string; country: string | null }> {
  const h = await headers();
  const al = h.get('accept-language') || '';
  const first = al.split(',')[0]?.trim() || '';
  if (/^[a-z]{2}-[A-Z]{2}$/.test(first)) {
    const [lang, region] = first.split('-');
    return { locale: `${lang}-${region}`, country: region };
  }
  if (first.startsWith('es')) return { locale: 'es-MX', country: 'MX' };
  if (first.startsWith('en')) return { locale: 'en-US', country: 'US' };
  return { locale: 'es-MX', country: 'MX' };
}

// Tipos y helper tipado para Stripe session
type GetSessionOk = { ok: true; s: Stripe.Checkout.Session };
type GetSessionErr = { ok: false; error: string };
type GetSessionResp = GetSessionOk | GetSessionErr;

async function getSession(sessionId: string): Promise<GetSessionResp> {
  try {
    const s = await stripe.checkout.sessions.retrieve(sessionId);
    return { ok: true, s };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'SESSION_FETCH_ERROR' };
  }
}

type TYCopy = { title: string; body_md: string; cta_label: string; cta_slug: string };
async function fetchThankYouCopy(sku: string, locale: string, country: string | null): Promise<TYCopy | null> {
  try {
    if (country) {
      const { data } = await supabase
        .from('thankyou_copy')
        .select('title,body_md,cta_label,cta_slug')
        .eq('sku', sku).eq('locale', locale).eq('country', country).maybeSingle();
      if (data) return data as TYCopy;
    }
    const { data: data2 } = await supabase
      .from('thankyou_copy')
      .select('title,body_md,cta_label,cta_slug')
      .eq('sku', sku).eq('locale', locale).is('country', null).maybeSingle();
    return (data2 as TYCopy) || null;
  } catch {
    return null;
  }
}

export default async function Page({ searchParams }: PageProps) {
  const sp = searchParams ? await searchParams : undefined;
  const session_id = isString(sp?.session_id) ? sp!.session_id : '';
  const debugOn = process.env.NEXT_PUBLIC_DEBUG === '1';

  if (!session_id) {
    return (
      <main className="container py-10">
        <section className="section--surface">
          <div className="c-card stack-3">
            <h1 className="h2">Falta confirmar el pago</h1>
            <p className="u-small text-weak">No recibimos el identificador de la sesión de pago.</p>
            <Link href="/checkout" className="c-btn w-fit">Volver al checkout</Link>
          </div>
        </section>
      </main>
    );
  }

  const resp = await getSession(session_id);
  if (!resp.ok) {
    return (
      <main className="container py-10">
        <section className="section--surface">
          <div className="c-card stack-3">
            <h1 className="h2">No pudimos validar tu pago</h1>
            <p className="u-small text-weak">Detalle: {resp.error}</p>
            <Link href="/checkout" className="c-btn w-fit">Intentar de nuevo</Link>
          </div>
        </section>
      </main>
    );
  }
  const s = resp.s;

  const status = s.status;
  const payment_status = s.payment_status;
  const md = (s.metadata || {}) as Record<string, string | undefined>;
  const sku = md.sku || '';
  const mode = s.mode || '';

  const success_slug_md = safeSlug(md.success_slug) || 'gracias';
  const lobby_slug_md = safeSlug(md.lobby_slug) || 'lobby/webinar';

  const paid =
    status === 'complete' ||
    payment_status === 'paid' ||
    payment_status === 'no_payment_required';

  const { locale, country } = await detectLocaleCountry();
  const copyDB = sku ? await fetchThankYouCopy(sku, locale, country) : null;

  const title = copyDB?.title || '¡Pago confirmado, ya eres parte del webinar!';
  const body =
    copyDB?.body_md ||
    'En minutos recibirás un correo con tu acceso. En el lobby encontrarás una checklist de preparación (pruebas técnicas, Zoom y materiales) para que entres sin contratiempos el día del evento.';

  const cta_label = 'Ir al lobby del webinar';
  const lobbyHref = `/${lobby_slug_md}`; // siempre activo

  // Datos para soporte
  const amount = ((s.amount_total ?? 0) / 100).toFixed(2);
  const currency = (s.currency || 'mxn').toUpperCase();
  const email = s.customer_details?.email || '';
  const emailMasked = maskEmail(email);
  const mailSubject = encodeURIComponent('Ayuda compra webinar');
  const mailBody = encodeURIComponent(
    [
      'No recibí el correo de acceso.',
      '',
      `Email: ${email || '(desconocido)'}`,
      `Stripe session: ${s.id}`,
      `SKU: ${sku || '(sin sku)'}`,
      `Monto: ${amount} ${currency}`,
      `Estado: ${payment_status || '(sin estado)'}`
    ].join('\n')
  );
  const mailtoHref = `mailto:soporte@lora.net?subject=${mailSubject}&body=${mailBody}`;

  // Métrica purchase
  const dl = {
    event: 'purchase',
    stripe_session_id: s.id,
    mode,
    currency: s.currency,
    value: (s.amount_total ?? 0) / 100,
    sku,
  };

  return (
    <main className="container py-10">
      <section className="section--surface">
        <div className="c-card stack-4">
          {paid ? (
            <>
              <h1 className="h2">{title}</h1>
              <p className="u-small text-weak">{body}</p>

              <Link href={lobbyHref} className="c-btn c-btn--solid">
                {cta_label}
              </Link>

              {/* Troubleshoot corto */}
              <div className="stack-2 mt-4">
                <h2 className="h5">¿No llegó tu correo?</h2>
                <ul className="u-small text-weak list-disc pl-5">
                  <li>Espera 5 minutos.</li>
                  <li>Revisa Spam y Promociones.</li>
                  <li>Confirma que usaste el correo correcto{emailMasked ? ` (${emailMasked})` : ''}.</li>
                  <li>Busca “Huerta Consulting” o “Stripe”.</li>
                </ul>
                <p className="u-small">
                  Si sigues con problemas, escríbenos a <a className="link" href={mailtoHref}>soporte@lora.net</a>.
                </p>
              </div>
            </>
          ) : status === 'open' ? (
            <>
              <h1 className="h2">Tu pago está en proceso</h1>
              <p className="u-small text-weak">Si pagaste con OXXO o SPEI puede tardar. Recibirás un correo cuando se confirme.</p>
              <Link href="/checkout" className="c-btn w-fit">Volver al inicio</Link>
            </>
          ) : (
            <>
              <h1 className="h2">Sesión expirada o cancelada</h1>
              <p className="u-small text-weak">Vuelve a intentar el pago para completar tu compra.</p>
              <Link href="/checkout" className="c-btn w-fit">Volver al checkout</Link>
            </>
          )}
        </div>
      </section>

      {/* purchase event */}
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

      {/* Panel técnico solo en debug */}
      {debugOn && (
        <section className="mt-6">
          <div className="u-small text-weak">
            <div>Ref: {s.id}</div>
            <div>Estado: {String(status)} / {String(payment_status)}</div>
            <div>success_slug: {success_slug_md}</div>
            <div>lobby_slug: {lobby_slug_md}</div>
            <div>Email: {email || '(no disponible)'}</div>
          </div>
        </section>
      )}
    </main>
  );
}
