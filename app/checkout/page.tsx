// app/checkout/page.tsx
'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';

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

// Tipos mínimos para la API pública de Stripe usados aquí
type StripeEmbedded = { mount: (selector: string) => void };
type StripeLike = { initEmbeddedCheckout: (opts: { clientSecret: string }) => Promise<StripeEmbedded> };
type StripeFactory = (pk: string) => StripeLike;

// ----- Outer wrapper with Suspense (required for useSearchParams) -----
export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-3xl px-4 py-10">
          <div className="rounded-lg border p-4">
            <p className="animate-pulse">Preparando checkout…</p>
          </div>
        </main>
      }
    >
      <CheckoutPageInner />
    </Suspense>
  );
}

// ----- Inner component that uses useSearchParams -----
function CheckoutPageInner() {
  const [mounted, setMounted] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [attempt, setAttempt] = useState<number>(0);
  const [mountedProgrammatic, setMountedProgrammatic] = useState(false);

  const searchParams = useSearchParams();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';
  const idemRef = useRef<string>(makeIdempotencyKey());
  const mountOnceRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Body a partir de query (?sku=..., ?price_id=..., etc.)
  const body = useMemo(() => {
    const payload: Record<string, string> = {};
    const keys = ['sku', 'mode', 'price_id', 'priceId', 'price_list', 'interval', 'success_slug', 'currency'];
    keys.forEach((k) => {
      const v = searchParams.get(k);
      if (v) payload[k] = v;
    });
    return payload;
  }, [searchParams]);

  // Crear la sesión
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

        const res = await fetch('/api/stripe/create-checkout-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idemRef.current,
          },
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

        if (!cancelled) setClientSecret(data.client_secret);
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
  }, [attempt, body, publishableKey]);

  // Montaje programático del Embedded Checkout
  useEffect(() => {
    const stripeFactory = (typeof window !== 'undefined'
      ? (window as unknown as { Stripe?: StripeFactory }).Stripe
      : undefined) as StripeFactory | undefined;

    const canMount =
      mounted &&
      stripeReady &&
      !!clientSecret &&
      !!publishableKey &&
      !!stripeFactory &&
      !mountOnceRef.current;

    if (!canMount) return;

    (async () => {
      try {
        const stripe = stripeFactory(publishableKey);
        const embedded = await stripe.initEmbeddedCheckout({ clientSecret: clientSecret! });
        embedded.mount('#stripe-embed');
        mountOnceRef.current = true;
        setMountedProgrammatic(true);
      } catch (e) {
        setError(getErrorMessage(e));
      }
    })();
  }, [mounted, stripeReady, clientSecret, publishableKey]);

  const retry = () => {
    idemRef.current = makeIdempotencyKey();
    setMountedProgrammatic(false);
    mountOnceRef.current = false;
    setAttempt((n) => n + 1);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      {/* Carga única del SDK base */}
      <Script src="https://js.stripe.com/v3" strategy="afterInteractive" onLoad={() => setStripeReady(true)} />

      <h1 className="text-2xl font-semibold mb-2">Finaliza tu compra</h1>
      <p className="text-sm text-gray-500 mb-6">Pagos seguros con Stripe. No almacenamos tus datos de tarjeta.</p>

      {loading && (
        <div className="rounded-lg border p-4">
          <p className="animate-pulse">Preparando checkout…</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-medium">No pudimos iniciar el checkout.</p>
          <p className="text-sm mt-1 break-words">{error}</p>
          <button className="mt-3 inline-flex items-center rounded-md border px-3 py-1.5 text-sm" onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      <div className="mt-4">
        {/* Contenedor del embed programático */}
        {mounted && <div id="stripe-embed" className="min-h-[520px]" />}

        {/* Mensaje si aún no puede montar */}
        {!loading && !error && (!clientSecret || !stripeReady) && (
          <div className="rounded-lg border p-4 mt-4">
            <p className="text-sm">
              {publishableKey ? 'Esperando al SDK de Stripe o a la sesión…' : 'Falta la clave pública de Stripe.'}
            </p>
          </div>
        )}
      </div>

      {mounted && (
        <div className="mt-8 text-xs text-gray-400 space-y-1">
          <p>
            Estado: pk {publishableKey ? 'ok' : 'faltante'} · script {stripeReady ? 'ok' : 'cargando'} · client_secret{' '}
            {clientSecret ? 'ok' : 'pendiente'} · modo {mountedProgrammatic ? 'programático' : 'pendiente'}
          </p>
          <p>
            Puedes pasar parámetros en la URL, p. ej. <code>?price_id=...&amp;mode=payment</code> o{' '}
            <code>?sku=...&amp;currency=MXN</code>.
          </p>
        </div>
      )}
    </main>
  );
}
