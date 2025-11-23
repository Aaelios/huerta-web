// app/checkout/[slug]/page.tsx
// Página dinámica · Checkout (no index) — Metadata vía buildMetadata

import { notFound } from 'next/navigation';
import { buildMetadata } from '@/lib/seo/buildMetadata';
import { loadWebinars } from '../../../lib/webinars/loadWebinars';
import type { Webinar } from '@/lib/webinars/schema';
import { buildCheckoutUI, type CheckoutDefaults } from '../../../lib/ui_checkout/buildCheckoutUI';
import { buildSessionPayload } from '../../../lib/ui_checkout/buildSessionPayload';
import checkoutDefaults from '../../../data/checkout.defaults.json';
import CheckoutClient from './CheckoutClient';

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = 'force-static';

// --- Metadata wiring ---
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return buildMetadata({
    typeId: 'checkout',
    pathname: `/checkout/${slug}`,
    title: 'Checkout',
    description: 'Completa tu compra de forma segura.',
  });
}

// --- Static params ---
export async function generateStaticParams() {
  const raw = await loadWebinars();
  const list = toArray(raw);
  return list
    .filter((w) => typeof w?.shared?.slug === 'string')
    .map((w) => ({ slug: String(w.shared.slug) }));
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};

  const raw = await loadWebinars();
  const webinars = toArray(raw);
  const webinar = webinars.find((w) => w?.shared?.slug === slug);
  if (!webinar) return notFound();

  const qp = normalizeSearchParams(sp);

  const utmClean: Record<string, string> = Object.fromEntries(
    Object.entries(qp.utm ?? {}).filter(([, v]) => typeof v === 'string')
  ) as Record<string, string>;

  const overrides = {
    price_id: qp.price_id,
    mode: qp.mode,
    coupon: qp.coupon,
    utm: utmClean,
  } as const;

  const ui = buildCheckoutUI(
    webinar,
    checkoutDefaults as unknown as CheckoutDefaults
  );

  const sessionPayload = buildSessionPayload(webinar, overrides);

  return (
    <CheckoutClient
      slug={slug}
      webinar={webinar}
      ui={ui}
      sessionPayload={sessionPayload}
      query={qp.raw}
    />
  );
}

/* ----------------------------- utils ----------------------------- */

function toArray(raw: unknown): Webinar[] {
  if (Array.isArray(raw)) return raw as Webinar[];
  if (raw && typeof raw === 'object') return Object.values(raw as Record<string, Webinar>);
  return [];
}

type Norm = {
  price_id?: string;
  mode?: 'payment' | 'subscription';
  coupon?: string;
  utm?: Record<string, string | undefined>;
  raw: Record<string, string | string[] | undefined>;
};

function normalizeSearchParams(
  sp: Record<string, string | string[] | undefined>
): Norm {
  const get = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v || undefined;
  };

  const price_id = get('price_id');

  const m = get('mode');
  const mode: 'payment' | 'subscription' | undefined =
    m === 'payment' ? 'payment' : m === 'subscription' ? 'subscription' : undefined;

  const coupon = get('coupon');

  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const;
  const utm: Record<string, string | undefined> = {};
  for (const k of utmKeys) {
    const v = get(k);
    if (typeof v === 'string' && v.length) utm[k] = v;
  }

  return { price_id, mode, coupon, utm, raw: sp };
}
