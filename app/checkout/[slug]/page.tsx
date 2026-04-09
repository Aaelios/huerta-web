// app/checkout/[slug]/page.tsx
/* Ruta: app/checkout/[slug]/page.tsx
 Descripción del programa:
 Página dinámica de checkout (no index) para resolver un webinar por slug,
 construir la UI de checkout y preparar el payload de sesión para Stripe.

 Cambio actual — 2026-04-08:
 - se elimina resolución local desde JSON vía loadWebinars
 - se sustituye por getWebinar(slug) como punto único de resolución
 - se mantiene UI, builders y payload actuales sin ampliar alcance*/

import { notFound } from "next/navigation";
import { buildMetadata } from "@/lib/seo/buildMetadata";
import { getWebinar } from "@/lib/webinars/load";
import type { Webinar } from "@/lib/types/webinars";
import {
  buildCheckoutUI,
  type CheckoutDefaults,
} from "@/lib/ui_checkout/buildCheckoutUI";
import { buildSessionPayload } from "@/lib/ui_checkout/buildSessionPayload";
import checkoutDefaults from "@/data/checkout.defaults.json";
import CheckoutClient from "./CheckoutClient";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-static";

// --- Metadata wiring ---
// Checkout sigue usando metadata fija de tipo "checkout".
// No resuelve contenido operativo para SEO en esta ruta.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return buildMetadata({
    typeId: "checkout",
    pathname: `/checkout/${slug}`,
    title: "Checkout",
    description: "Completa tu compra de forma segura.",
  });
}

// --- Static params ---
// Se mantiene fuera de alcance en esta ronda.
// No se toca generateStaticParams mientras Control no autorice revisar
// la estrategia completa de generación estática para checkout.
export async function generateStaticParams() {
  return [];
}

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const sp = (await searchParams) ?? {};

  // Resolución única del webinar vía helper aprobado en CT-03.
  let webinar: Webinar;
  try {
    webinar = await getWebinar(slug);
  } catch {
    return notFound();
  }

  // Normalización de query params para overrides permitidos del checkout.
  const qp = normalizeSearchParams(sp);

  const utmClean: Record<string, string> = Object.fromEntries(
    Object.entries(qp.utm ?? {}).filter(([, value]) => typeof value === "string"),
  ) as Record<string, string>;

  const overrides = {
    price_id: qp.price_id,
    mode: qp.mode,
    coupon: qp.coupon,
    utm: utmClean,
  } as const;

  // UI de checkout derivada del view model actual.
  const ui = buildCheckoutUI(
    webinar,
    checkoutDefaults as unknown as CheckoutDefaults,
  );

  // Payload que consumirá create-checkout-session.
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

type Norm = {
  price_id?: string;
  mode?: "payment" | "subscription";
  coupon?: string;
  utm?: Record<string, string | undefined>;
  raw: Record<string, string | string[] | undefined>;
};

function normalizeSearchParams(
  sp: Record<string, string | string[] | undefined>,
): Norm {
  const get = (key: string): string | undefined => {
    const value = sp[key];
    return Array.isArray(value) ? value[0] : value || undefined;
  };

  const price_id = get("price_id");

  const rawMode = get("mode");
  const mode: "payment" | "subscription" | undefined =
    rawMode === "payment"
      ? "payment"
      : rawMode === "subscription"
        ? "subscription"
        : undefined;

  const coupon = get("coupon");

  const utmKeys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ] as const;

  const utm: Record<string, string | undefined> = {};
  for (const key of utmKeys) {
    const value = get(key);
    if (typeof value === "string" && value.length) {
      utm[key] = value;
    }
  }

  return { price_id, mode, coupon, utm, raw: sp };
}