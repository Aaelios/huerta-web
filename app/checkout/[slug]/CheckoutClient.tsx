// app/checkout/[slug]/CheckoutClient.tsx
'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import type { Webinar } from '@/lib/webinars/schema';
import type { CheckoutUI } from '@/lib/ui_checkout/buildCheckoutUI';
import type { SessionPayload } from '@/lib/ui_checkout/buildSessionPayload';
import { renderAccent } from '@/lib/ui/renderAccent';

type Props = {
  slug: string;
  webinar: Webinar;
  ui: CheckoutUI;
  sessionPayload: SessionPayload;
  query?: Record<string, string | string[] | undefined>;
};

type CreateSessionOk = { client_secret: string; session_id?: string; unit_amount?: number };
type CreateSessionErr = { error?: string; code?: string };
type CreateSessionResp = CreateSessionOk | CreateSessionErr;

type StripeEmbedded = { mount: (selector: string) => void };
type StripeLike = { initEmbeddedCheckout: (opts: { clientSecret: string }) => Promise<StripeEmbedded> };
type StripeFactory = (pk: string) => StripeLike;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
    Stripe?: StripeFactory;
  }
}

export default function CheckoutClient(props: Props) {
  return (
    <Suspense
      fallback={
        <main className="container py-10">
          <section className="section--surface">
            <div className="c-card">
              <p className="u-small animate-pulse">Preparando checkout…</p>
            </div>
          </section>
        </main>
      }
    >
      <Inner {...props} />
    </Suspense>
  );
}

function Inner({ webinar, ui, sessionPayload }: Props) {
  const [mounted, setMounted] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [attempt, setAttempt] = useState<number>(0);
  const [mountedProgrammatic, setMountedProgrammatic] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [localScheduleDisplay, setLocalScheduleDisplay] = useState<string>('');

  const router = useRouter();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const debugOn = process.env.NEXT_PUBLIC_DEBUG === '1';
  const idemRef = useRef<string>(makeIdempotencyKey());
  const mountOnceRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Analytics: begin_checkout
  useEffect(() => {
    try {
      const value =
        typeof webinar?.shared?.pricing?.amountCents === 'number'
          ? webinar.shared.pricing.amountCents / 100
          : undefined;
      window.dataLayer = window.dataLayer ?? [];
      const payload: Record<string, unknown> = {
        event: 'begin_checkout',
        sku: sessionPayload.sku,
        price_id: sessionPayload.price_id,
        product_id: sessionPayload.product_id,
        mode: sessionPayload.mode,
        currency: sessionPayload.currency,
        value,
        ui_title: ui.title,
        ui_price_display: ui.priceDisplay,
      };
      if (ui.schedule?.startISO) payload['start_at'] = ui.schedule.startISO;
      if (ui.schedule?.endISO) payload['end_at'] = ui.schedule.endISO;
      window.dataLayer.push(payload);
    } catch {
      // noop
    }
  }, [sessionPayload, webinar, ui.title, ui.priceDisplay, ui.schedule?.startISO, ui.schedule?.endISO]);

  // Session creation
  useEffect(() => {
    let cancelled = false;
    async function createSession(): Promise<void> {
      if (!publishableKey) {
        setError('Falta configuración: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        setShowFallback(false);

        const res = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idemRef.current },
          body: JSON.stringify(sessionPayload),
          cache: 'no-store',
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status}: ${txt}`);
        }

        const data: CreateSessionResp = (await res.json()) as CreateSessionResp;
        if ('error' in data && data.error) throw new Error(data.error);
        if (!('client_secret' in data) || !data.client_secret) throw new Error('Falta client_secret');

        if (!cancelled) setClientSecret(data.client_secret);
      } catch (e: unknown) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    createSession();
    return () => {
      cancelled = true;
    };
  }, [attempt, publishableKey, sessionPayload]);

  // Mount Stripe Embedded
  useEffect(() => {
    const stripeFactory: StripeFactory | undefined =
      typeof window !== 'undefined' ? window.Stripe : undefined;

    const canMount =
      mounted && stripeReady && !!clientSecret && !!publishableKey && !!stripeFactory && !mountOnceRef.current;
    if (!canMount) return;

    (async () => {
      try {
        const stripe = stripeFactory!(publishableKey);
        const embedded = await stripe.initEmbeddedCheckout({ clientSecret: clientSecret! });
        embedded.mount('#stripe-embed');
        mountOnceRef.current = true;
        setMountedProgrammatic(true);
      } catch (e: unknown) {
        setError(getErrorMessage(e));
      }
    })();
  }, [mounted, stripeReady, clientSecret, publishableKey]);

  // Fallback if SDK didn't mount
  useEffect(() => {
    if (mountedProgrammatic || loading) return;
    const t = setTimeout(() => setShowFallback(true), 8000);
    return () => clearTimeout(t);
  }, [mountedProgrammatic, loading]);

  // Compute "local time" display on client
  useEffect(() => {
    if (!mounted) return;
    if (!ui.schedule?.startISO) {
      setLocalScheduleDisplay('');
      return;
    }
    try {
      const txt = formatLocalSchedule(ui.schedule.startISO, ui.schedule.endISO);
      setLocalScheduleDisplay(txt);
    } catch {
      setLocalScheduleDisplay('');
    }
  }, [mounted, ui.schedule?.startISO, ui.schedule?.endISO]);

  const retry = (): void => {
    idemRef.current = makeIdempotencyKey();
    setMountedProgrammatic(false);
    setShowFallback(false);
    mountOnceRef.current = false;
    setAttempt((n) => n + 1);
  };

  return (
    <main className="container py-10">
      <Script src="https://js.stripe.com/v3" strategy="afterInteractive" onLoad={() => setStripeReady(true)} />

      {/* Encabezado */}
      <header className="stack-2 mb-6">
        <button
          onClick={() => router.back()}
          className="c-btn c-btn--ghost u-small inline-flex w-auto"
          aria-label="Regresar a la página anterior"
        >
          ← Volver
        </button>
        <div className="stack-1">
          <h1 className="h2">Finaliza tu compra</h1>
          <p className="u-small text-weak">Pagos seguros con Stripe. No almacenamos tus datos de tarjeta.</p>
        </div>
      </header>

      {/* Grid */}
      <section className="grid-2 gap-6">
        {/* Resumen */}
          <aside className="section--surface" role="complementary" aria-labelledby="resumen-heading">
            <div className="c-card stack-4">
              <h2 id="resumen-heading" className="h4">Resumen de tu compra</h2>

              {/* Título y descripción */}
              <div className="stack-2">
                <p className="text-strong">{renderAccent(ui.title)}</p>
                <p className="u-small text-weak u-mt-1">{renderAccent(ui.desc)}</p>
              </div>

              {/* Fecha y horario */}
              {ui.schedule && (
                <div className="stack-2 u-mt-2 u-mb-1">
                  <p className="u-small text-strong">Fecha y horario</p>
                  <p className="u-small">{ui.schedule.tzDisplay.replace('GMT-6', '').trim()}</p>
                  <p className="u-small text-weak">
                    En tu hora local: {localScheduleDisplay || 'detectando…'}
                  </p>
                </div>
              )}

              {/* Bullets */}
              <ul className="list-check u-small u-mt-2">
                {(ui.bullets || []).map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>

              {/* Precio y garantía */}
              <div className="stack-2 u-mt-3">
                <div className="flex-between">
                  <span className="u-small text-strong">Total </span>
                  <strong className="price accent">{ui.priceDisplay}</strong>
                </div>
                <p className="u-small text-weak">Sin cargos ocultos.</p>
                <p className="u-small text-weak">
                  {ui.refundLine || 'Garantía LOBRÁ: 7 días. Si no te aporta valor, te devolvemos el dinero.'}
                </p>
              </div>

              {/* Soporte */}
              <p className="u-small u-mt-2 u-mb-3">
                ¿Necesitas ayuda?{' '}
                <a href={`mailto:${ui.supportEmail || 'soporte@lobra.net'}`} className="link text-weak">
                  {ui.supportEmail || 'soporte@lobra.net'}
                </a>
              </p>
            </div>
          </aside>

        {/* Stripe */}
        <div className="section--surface">
          {loading && (
            <div className="c-card">
              <p className="u-small animate-pulse">Preparando checkout…</p>
            </div>
          )}

          {error && (
            <div className="c-card border-red-300 bg-red-50">
              <div className="stack-2">
                <p className="text-strong">No pudimos iniciar el checkout.</p>
                <p className="u-small break-words">{error}</p>
                <div className="stack-row gap-2">
                  <button className="c-btn" onClick={retry}>Reintentar</button>
                  <a className="c-btn c-btn--ghost" href={`mailto:${ui.supportEmail || 'soporte@lobra.net'}`}>Pedir ayuda</a>
                </div>
              </div>
            </div>
          )}

          {!error && (
            <div className="c-card">
              <div
                id="stripe-embed"
                className="min-h-[520px]"
                aria-label="Formulario de pago con Stripe"
                aria-busy={loading ? 'true' : 'false'}
              />
              {!loading && !mountedProgrammatic && (
                <p className="u-small text-weak mt-2">Esperando al SDK de Stripe o a la sesión…</p>
              )}
              {showFallback && (
                <div className="u-small mt-3">
                  <p className="mb-2">Si el formulario no aparece, intenta de nuevo o contáctanos.</p>
                  <div className="stack-row gap-2">
                    <button className="c-btn" onClick={retry}>Reintentar</button>
                    <a className="c-btn c-btn--ghost" href={`mailto:${ui.supportEmail || 'soporte@lobra.net'}`}>Soporte por email</a>
                  </div>
                </div>
              )}
            </div>
          )}

          <footer className="u-small text-weak mt-3">
            Al continuar aceptas los Términos de Stripe y nuestras{' '}
            <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="link">
              Políticas de Privacidad
            </a>{' '}
            y{' '}
            <a href="/reembolsos" target="_blank" rel="noopener noreferrer" className="link">
              Reembolsos
            </a>
            .
          </footer>

          {mounted && debugOn && (
            <div className="u-small text-weak mt-4">
              <p>
                Estado: pk {publishableKey ? 'ok' : 'faltante'} · script {stripeReady ? 'ok' : 'cargando'} · client_secret{' '}
                {clientSecret ? 'ok' : 'pendiente'} · modo {mountedProgrammatic ? 'programático' : 'pendiente'}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

/* ------------ utils ------------ */

function hasMessage(e: unknown): e is { message: string } {
  return !!e && typeof e === 'object' && 'message' in e && typeof (e as { message: unknown }).message === 'string';
}
function getErrorMessage(e: unknown): string {
  return hasMessage(e) ? e.message : typeof e === 'string' ? e : 'Error desconocido';
}
function makeIdempotencyKey(): string {
  const rnd =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('')
      : Math.random().toString(16).slice(2);
  return `chk-${Date.now()}-${rnd}`;
}

/**
 * Formatea la línea "En tu hora local: ..." usando la zona del dispositivo.
 * Usa los ISO UTC provistos por buildCheckoutUI.
 */
function formatLocalSchedule(startISO: string, endISO?: string): string {
  const locale = undefined; // usa preferencia del navegador
  const localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const start = new Date(startISO);
  if (isNaN(start.getTime())) return '';

  const datePart = new Intl.DateTimeFormat('es-MX', {
    timeZone: localTZ,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(start);

  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: localTZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const startTime = timeFmt.format(start);
  const endTime =
    endISO && !isNaN(new Date(endISO).getTime())
      ? timeFmt.format(new Date(endISO))
      : undefined;

  const tzName = new Intl.DateTimeFormat(locale, {
    timeZone: localTZ,
    timeZoneName: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(start)
    .find((p) => p.type === 'timeZoneName')?.value;

  const range = endTime ? `${startTime}–${endTime}` : startTime;
  const tzSuffix = tzName ? ` ${tzName}` : '';
  return `${capitalize(datePart)}, ${range}${tzSuffix}`;
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
