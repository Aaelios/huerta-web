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

  const router = useRouter();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const debugOn = process.env.NEXT_PUBLIC_DEBUG === '1';
  const idemRef = useRef<string>(makeIdempotencyKey());
  const mountOnceRef = useRef(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    try {
      const value =
        typeof webinar?.shared?.pricing?.amountCents === 'number'
          ? webinar.shared.pricing.amountCents / 100
          : undefined;
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({
        event: 'begin_checkout',
        sku: sessionPayload.sku,
        price_id: sessionPayload.price_id,
        product_id: sessionPayload.product_id,
        mode: sessionPayload.mode,
        currency: sessionPayload.currency,
        value,
        ui_title: ui.title,
        ui_price_display: ui.priceDisplay,
      });
    } catch {
      // noop
    }
  }, [sessionPayload, webinar, ui.title, ui.priceDisplay]);

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

  useEffect(() => {
    if (mountedProgrammatic || loading) return;
    const t = setTimeout(() => setShowFallback(true), 8000);
    return () => clearTimeout(t);
  }, [mountedProgrammatic, loading]);

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

            <div className="stack-1">
              <p className="text-strong">{renderAccent(ui.title)}</p>
              <p className="u-small text-weak">{renderAccent(ui.desc)}</p>
            </div>

            <ul className="list-check u-small">
              {(ui.bullets || []).map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>

            <div className="stack-1">
              <div className="flex-between">
                <span className="u-small text-weak">
                  <span className="sr-only">Total a pagar</span> Total
                </span>
                <strong className="price">{ui.priceDisplay}</strong>
              </div>
              <p className="u-small text-weak">Sin cargos ocultos.</p>
              <p className="u-small text-weak">
                {ui.refundLine || 'Garantía LOBRÁ: 7 días. Si no te aporta valor, te devolvemos el dinero.'}
              </p>
            </div>

            <p className="u-small">
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
