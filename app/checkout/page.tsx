// app/checkout/page.tsx
'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { useRouter, useSearchParams } from 'next/navigation';

type CreateSessionOk = { client_secret: string; session_id?: string };
type CreateSessionErr = { error?: string; code?: string };
type CreateSessionResp = CreateSessionOk | CreateSessionErr;

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
function clampText(v: string | null, max: number): string | null {
  if (!v) return null;
  const s = v.trim().slice(0, max);
  return s.length ? s : null;
}

// Tipos mínimos para Stripe
type StripeEmbedded = { mount: (selector: string) => void };
type StripeLike = { initEmbeddedCheckout: (opts: { clientSecret: string }) => Promise<StripeEmbedded> };
type StripeFactory = (pk: string) => StripeLike;

// dataLayer tipado
type DataLayerEvent = Record<string, unknown>;
declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
    Stripe?: StripeFactory;
  }
}
function pushDL(ev: DataLayerEvent) {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(ev);
}

export default function CheckoutPage() {
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
      <CheckoutPageInner />
    </Suspense>
  );
}

function CheckoutPageInner() {
  const [mounted, setMounted] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [attempt, setAttempt] = useState<number>(0);
  const [mountedProgrammatic, setMountedProgrammatic] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const debugOn = process.env.NEXT_PUBLIC_DEBUG === '1';
  const idemRef = useRef<string>(makeIdempotencyKey());
  const mountOnceRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // ---- Parámetros de UI desde la página anterior (presentación, no cobro) ----
  const ui = useMemo(() => {
    const title = clampText(searchParams.get('title'), 90);
    const desc = clampText(searchParams.get('desc'), 160);
    const priceDisplay = clampText(searchParams.get('price_display'), 32);

    return {
      title: title || 'Webinar en vivo — Octubre 2025',
      desc: desc || 'Finanzas para pequeños negocios. Sesión interactiva en Zoom.',
      priceDisplay: priceDisplay || 'MX$490',
    };
  }, [searchParams]);

  // Body para crear sesión (fuente de verdad del cobro)
  const body = useMemo(() => {
    const payload: Record<string, string> = {};
    const keys = [
      'sku',
      'mode',
      'price_id',
      'priceId',
      'price_list',
      'interval',
      'success_slug',
      'currency',
      'product_id',
    ];
    keys.forEach((k) => {
      const v = searchParams.get(k);
      if (v) payload[k] = v;
    });
    return payload;
  }, [searchParams]);

  // Crear sesión
  useEffect(() => {
    let cancelled = false;

    async function createSession() {
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
          body: Object.keys(body).length ? JSON.stringify(body) : '{}',
          cache: 'no-store',
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`HTTP ${res.status}: ${txt}`);
        }

        const data: CreateSessionResp = (await res.json()) as CreateSessionResp;
        if ('error' in data && data.error) throw new Error(data.error);
        if (!('client_secret' in data) || !data.client_secret) throw new Error('Falta client_secret');

        if (!cancelled) {
          setClientSecret(data.client_secret);

          // Métrica
          pushDL({
            event: 'begin_checkout',
            stripe_session_id: 'session_id' in data ? data.session_id || null : null,
            sku: body.sku || null,
            price_id: (body.price_id || body.priceId) ?? null,
            product_id: body.product_id || null,
            mode: body.mode || 'payment',
            currency: body.currency || 'MXN',
            ui_title: ui.title,
            ui_price_display: ui.priceDisplay,
          });
        }
      } catch (e) {
        if (!cancelled) setError(getErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    createSession();
    return () => {
      cancelled = true;
    };
  }, [attempt, body, publishableKey, ui.title, ui.priceDisplay]);

  // Montaje programático
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
      } catch (e) {
        setError(getErrorMessage(e));
      }
    })();
  }, [mounted, stripeReady, clientSecret, publishableKey]);

  // Fallback si no monta en 8s
  useEffect(() => {
    if (mountedProgrammatic || loading) return;
    const t = setTimeout(() => setShowFallback(true), 8000);
    return () => clearTimeout(t);
  }, [mountedProgrammatic, loading]);

  const retry = () => {
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
              <p className="text-strong">{ui.title}</p>
              <p className="u-small text-weak">{ui.desc}</p>
            </div>

            <ul className="list-check u-small">
              <li>Acceso al evento en vivo</li>
              <li>Acceso a la grabación durante 7 días</li>
              <li>Plantilla práctica de apoyo</li>
              <li>Soporte por email</li>
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
                Garantía LOBRÁ: 7 días. Si no te aporta valor, te devolvemos el dinero.
              </p>
            </div>

            <p className="u-small">
              ¿Necesitas ayuda?{' '}
              <a href="mailto:soporte@lobra.net" className="link text-weak">
                roberto@huerta.consulting
              </a>
            </p>
          </div>
        </aside>

        {/* Stripe */}
        <div className="section--surface">
          {/* Estados */}
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
                  <a className="c-btn c-btn--ghost" href="mailto:soporte@lobra.net">Pedir ayuda</a>
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
                    <a className="c-btn c-btn--ghost" href="mailto:soporte@lobra.net">Soporte por email</a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Legal */}
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

          {/* Debug */}
          {mounted && debugOn && (
            <div className="u-small text-weak mt-4">
              <p>
                Estado: pk {publishableKey ? 'ok' : 'faltante'} · script {stripeReady ? 'ok' : 'cargando'} · client_secret{' '}
                {clientSecret ? 'ok' : 'pendiente'} · modo {mountedProgrammatic ? 'programático' : 'pendiente'}
              </p>
              <p>
                URL params p. ej. <code>?title=...&amp;desc=...&amp;price_display=MX%24490&amp;price_id=...</code>
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
