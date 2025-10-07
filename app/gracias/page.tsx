// app/gracias/page.tsx
import React from "react";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import Stripe from "stripe";
import { resolveNextStep } from "@/lib/postpurchase/resolveNextStep";
import { getWebinarBySku } from "@/lib/webinars/getWebinarBySku";
import type { Webinar } from "@/lib/webinars/schema";

// ==== Tipos locales estrictos ====
type Variant = "prelobby" | "bundle" | "download" | "schedule" | "community" | "generic" | "none";

type NextStepItem = { href: string; label?: string };
type NextStep = {
  variant: Variant;
  href?: string;
  label?: string;
  items?: NextStepItem[];
};

type WebinarThankyou = { title?: string; body_md?: string };
type WebinarShared = { supportEmail?: string };
type WebinarExtra = Partial<{ thankyou: WebinarThankyou; shared: WebinarShared }>;

const COPY_BY_VARIANT: Record<Variant, { title: string; lead: string; ctaLabel: string }> = {
  prelobby: {
    title: "¡Pago confirmado, ya eres parte del webinar!",
    lead: "En minutos recibirás tu correo de acceso. En el lobby tendrás checklist y materiales previos.",
    ctaLabel: "Ir al prelobby",
  },
  bundle: {
    title: "Pago confirmado, tu módulo está activo",
    lead: "Revisa las clases incluidas y entra al prelobby de cada una.",
    ctaLabel: "Ver accesos",
  },
  download: {
    title: "Pago confirmado, tus descargas están listas",
    lead: "Guarda los archivos y revisa las notas de uso.",
    ctaLabel: "Descargar",
  },
  schedule: {
    title: "Pago confirmado, agenda tu sesión",
    lead: "Elige fecha y hora para tu 1-a-1.",
    ctaLabel: "Agendar sesión",
  },
  community: {
    title: "Pago confirmado, ya puedes entrar a la comunidad",
    lead: "Sigue las instrucciones para unirte al canal.",
    ctaLabel: "Entrar a la comunidad",
  },
  generic: {
    title: "Pago confirmado",
    lead: "Tu acceso está listo.",
    ctaLabel: "Continuar",
  },
  none: {
    title: "Pago confirmado",
    lead: "Tu acceso está listo.",
    ctaLabel: "Continuar",
  },
};

// ==== Stripe helpers ====
async function fetchSession(sessionId: string) {
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) throw new Error("STRIPE_SECRET_KEY missing");
  const stripe = new Stripe(key);
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    // No expandimos *.metadata; solo line_items y product
    expand: ["line_items", "line_items.data.price.product"],
  });
  return session;
}

function extractSkuFulfillmentSuccess(session: Stripe.Checkout.Session) {
  const first = session.line_items?.data?.[0];
  const priceMeta = (first?.price?.metadata ?? {}) as Record<string, string | undefined>;

  const sku = (session.metadata?.sku ?? priceMeta.sku) as string | undefined;
  const fulfillment_type = (session.metadata?.fulfillment_type ?? priceMeta.fulfillment_type) as
    | string
    | undefined;
  const success_slug = (session.metadata?.success_slug ?? priceMeta.success_slug) as
    | string
    | undefined;

  return { sku, fulfillment_type, success_slug };
}

function getSupportEmail(w: Webinar | (Webinar & WebinarExtra) | null): string {
  if (w && (w as WebinarExtra).shared?.supportEmail) {
    return (w as WebinarExtra).shared!.supportEmail || "soporte@lobra.net";
  }
  return "soporte@lobra.net";
}

function applyThankyouOverrides(
  base: { title: string; lead: string },
  w: Webinar | (Webinar & WebinarExtra) | null
): { title: string; lead: string } {
  const extra = (w as WebinarExtra) || {};
  const t = extra.thankyou;
  if (!t) return base;
  return {
    title: t.title || base.title,
    lead: t.body_md || base.lead,
  };
}

// ==== Página ====
export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sessionId =
    typeof sp.session_id === "string" ? sp.session_id : Array.isArray(sp.session_id) ? sp.session_id[0] : undefined;
  if (!sessionId) return notFound();

  const session = await fetchSession(sessionId);
  const { sku, fulfillment_type, success_slug } = extractSkuFulfillmentSuccess(session);
  if (!sku || !fulfillment_type) return notFound();

  // Resolver siguiente paso
  const nextRaw = await resolveNextStep({
    fulfillment_type,
    sku,
    success_slug: success_slug || undefined,
  });

  // Normalizamos a NextStep sin usar any
  const next: NextStep = {
    variant: (nextRaw as NextStep).variant || "generic",
    href: (nextRaw as NextStep).href,
    label: (nextRaw as NextStep).label,
    items: Array.isArray((nextRaw as NextStep).items)
      ? ((nextRaw as NextStep).items || []).filter((x): x is NextStepItem => !!x && typeof x.href === "string")
      : undefined,
  };

  const copy = COPY_BY_VARIANT[next.variant] || COPY_BY_VARIANT.generic;
  let title = copy.title;
  let lead = copy.lead;
  const ctaLabel = copy.ctaLabel;

  // Overrides desde JSONC solo para live_class
  let supportEmail = "soporte@lobra.net";
  if (fulfillment_type === "live_class") {
    const webinar = (await getWebinarBySku(sku)) || null;
    supportEmail = getSupportEmail(webinar);
    const over = applyThankyouOverrides({ title, lead }, webinar);
    title = over.title;
    lead = over.lead;
  }

  if (process.env.NEXT_PUBLIC_DEBUG === "1") {
    console.log("[/gracias]", { variant: next.variant, sku, href: next.href || null });
  }

  const gaValue = typeof session.amount_total === "number" ? session.amount_total / 100 : undefined;
  const gaCurrency = session.currency?.toUpperCase();

  return (
    <main className="container u-py-8">
      {/* GTM purchase event (opcional) */}
      {process.env.NEXT_PUBLIC_GTM_ID && (
        <Script id="gracias-purchase" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            window.dataLayer.push({
              event: 'purchase',
              ecommerce: {
                transaction_id: '${session.id}',
                value: ${gaValue ?? "undefined"},
                currency: '${gaCurrency ?? ""}',
                items: [{
                  item_id: '${sku}',
                  item_name: '${sku}',
                  item_category: '${fulfillment_type}',
                  price: ${gaValue ?? "undefined"},
                  quantity: 1
                }]
              }
            });
          `}
        </Script>
      )}

      <section className="l-stack-6 u-text-center">
        <h1 className="h2">{title}</h1>
        <p className="u-lead">{lead}</p>

        {/* CTA dinámico */}
        {next.variant === "bundle" && next.items && next.items.length > 0 ? (
          <div className="l-stack-4 u-center">
            {next.items.map((it, i) => (
              <Link key={i} href={it.href} className="c-btn c-btn--solid" prefetch={false}>
                {it.label || "Abrir"}
              </Link>
            ))}
          </div>
        ) : next.variant !== "none" && next.href ? (
          <Link href={next.href} className="c-btn c-btn--solid" prefetch={false}>
            {next.label || ctaLabel}
          </Link>
        ) : null}

        {/* Nota de correo */}
        <div className="c-note u-mt-6">
          <h2 className="h5">¿No llegó tu correo?</h2>
          <ul className="u-list">
            <li>Revisa spam o promociones.</li>
            <li>Busca el remitente “LOBRÁ &lt;no-reply@mail.lobra.net&gt;”.</li>
            <li>
              Si no lo encuentras, escribe a <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
