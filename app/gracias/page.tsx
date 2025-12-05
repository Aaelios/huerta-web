// app/gracias/page.tsx
import React from "react";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { resolveNextStep } from "@/lib/postpurchase/resolveNextStep";
import { getWebinarBySku } from "@/lib/webinars/getWebinarBySku";
import type { Webinar } from "@/lib/webinars/schema";
import type {
  AnalyticsContentType,
  AnalyticsItem,
  AnalyticsEventBase,
} from "@/lib/analytics/dataLayer";
import { PurchaseTracker } from "./PurchaseTracker";
import { buildMetadata } from "@/lib/seo/buildMetadata";
import type { Metadata } from "next";

export const metadata: Metadata = buildMetadata({
  typeId: "thankyou",
  pathname: "/gracias",
  title: "Pago confirmado",
  description:
    "Validamos tu compra y activamos tus accesos. Desde aquí puedes entrar a tu webinar, módulo o sesión 1 a 1 según tu compra.",
});

// ==== Tipos locales estrictos ====
type Variant =
  | "prelobby"
  | "bundle"
  | "download"
  | "schedule"
  | "community"
  | "generic"
  | "none";

type NextStepItem = { href: string; label?: string };
type NextStep = {
  variant: Variant;
  href?: string;
  label?: string;
  items?: NextStepItem[];
};

type WebinarThankyou = { title?: string; body_md?: string };
type WebinarShared = {
  supportEmail?: string;
  startAt?: string;
  durationMin?: number;
};
type WebinarExtra = Partial<{ thankyou: WebinarThankyou; shared: WebinarShared }>;

type OrderWithPaymentsRow = {
  order_id: string;
  order_total_cents: number;
  currency: string | null;
  is_paid: boolean;
};

type PurchaseEventPayload = AnalyticsEventBase & {
  event: "purchase";
  value: number;
  currency: string;
  content_id: string;
  content_type: AnalyticsContentType;
  items: AnalyticsItem[];
  order_id: string;
  stripe_session_id: string;
  payment_status: "paid";
  order_currency_raw?: string | null;
  stripe_currency_raw?: string | null;
  billing_type?: "one_time" | "subscription";
  billing_interval?: string | null;
};

const COPY_BY_VARIANT: Record<
  Variant,
  { title: string; lead: string; ctaLabel: string }
> = {
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

// ==== Stripe / Supabase helpers (server) ====
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // En entorno de build, esto ayuda a detectar misconfig.
  // En runtime, Supabase sólo se usa cuando hay session_id.
  console.warn(
    "[/gracias] SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configurados"
  );
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

async function fetchSession(sessionId: string) {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY missing");
  }
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["line_items", "line_items.data.price.product"],
  });
  return session;
}

async function fetchOrderBySessionId(
  sessionId: string
): Promise<OrderWithPaymentsRow | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("v_orders_with_payments")
    .select("order_id, order_total_cents, currency, is_paid")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (error) {
    console.error("[/gracias] Supabase error", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    order_id: data.order_id,
    order_total_cents: data.order_total_cents,
    currency: data.currency ?? null,
    is_paid: data.is_paid,
  };
}

function extractSkuFulfillmentSuccess(session: Stripe.Checkout.Session) {
  const first = session.line_items?.data?.[0];
  const priceMeta = (first?.price?.metadata ?? {}) as Record<
    string,
    string | undefined
  >;

  const sku = (session.metadata?.sku ?? priceMeta.sku) as string | undefined;
  const fulfillment_type = (session.metadata?.fulfillment_type ??
    priceMeta.fulfillment_type) as string | undefined;
  const success_slug = (session.metadata?.success_slug ??
    priceMeta.success_slug) as string | undefined;

  return { sku, fulfillment_type, success_slug };
}

function mapFulfillmentToContentType(
  raw: string | undefined
): AnalyticsContentType | undefined {
  switch (raw) {
    case "course":
    case "template":
    case "live_class":
    case "one_to_one":
    case "subscription_grant":
    case "bundle":
      return raw;
    default:
      return undefined;
  }
}

function buildPurchasePayload(args: {
  session: Stripe.Checkout.Session;
  orderRow: OrderWithPaymentsRow | null;
  sku: string | undefined;
  fulfillment_type_raw: string | undefined;
}): PurchaseEventPayload | null {
  const { session, orderRow, sku, fulfillment_type_raw } = args;

  // 1) Orden debe existir
  if (!orderRow) return null;

  // 2) Pago considerado "paid" si BD o Stripe lo marcan como pagado
  const isPaidFromDb = !!orderRow.is_paid;
  const isPaidFromStripe =
    typeof session.payment_status === "string" &&
    session.payment_status.toLowerCase() === "paid";
  const isPaid = isPaidFromDb || isPaidFromStripe;

  if (!isPaid) return null;
  if (!sku) return null;

  const content_type = mapFulfillmentToContentType(fulfillment_type_raw);
  if (!content_type) return null;

  const orderTotalCents =
    typeof orderRow.order_total_cents === "number"
      ? orderRow.order_total_cents
      : 0;
  if (!Number.isFinite(orderTotalCents) || orderTotalCents <= 0) return null;

  const value = Math.round(orderTotalCents / 100);
  if (value <= 0) return null;

  const orderCurrencyRaw = orderRow.currency || null;
  const stripeCurrencyRaw =
    typeof session.currency === "string" ? session.currency : null;
  const currencyRaw = orderCurrencyRaw || stripeCurrencyRaw || "mxn";
  const currency = currencyRaw.toUpperCase();

  let billingType: "one_time" | "subscription" = "one_time";
  let billingInterval: string | null = null;

  if (session.mode === "subscription") {
    billingType = "subscription";
    const li0 = session.line_items?.data?.[0];
    const price = li0?.price;
    if (price && price.type === "recurring") {
      billingInterval = price.recurring?.interval ?? null;
    }
  }

  const item: AnalyticsItem = {
    sku,
    fulfillment_type: content_type,
    quantity: 1,
    unit_amount: orderTotalCents,
    amount_total: orderTotalCents,
    currency,
  };

  const payload: PurchaseEventPayload = {
    event: "purchase",
    value,
    currency,
    content_id: sku,
    content_type,
    items: [item],
    order_id: orderRow.order_id,
    stripe_session_id: session.id,
    payment_status: "paid",
    order_currency_raw: orderCurrencyRaw,
    stripe_currency_raw: stripeCurrencyRaw,
    billing_type: billingType,
    billing_interval: billingInterval,
  };

  return payload;
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

// ==== Helpers de horario (server) ====
function safeDate(iso?: string): Date | null {
  if (!iso || typeof iso !== "string") return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}
function toISO(d: Date | null | undefined): string | undefined {
  if (!d) return undefined;
  return new Date(d.getTime()).toISOString();
}
function formatScheduleInSiteTZ(start: Date, end?: Date): string {
  const tz = process.env.SITE_TZ || "America/Mexico_City";
  const locale = "es-MX";

  const dayPart = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(start);

  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const startTime = timeFmt.format(start);
  const endTime = end ? timeFmt.format(end) : undefined;

  const range = endTime ? `${startTime}–${endTime}` : startTime;
  return `${capitalize(dayPart)}, ${range} (Ciudad de México)`;
}
function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

// ==== Página ====
export default async function GraciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const sessionId =
    typeof sp.session_id === "string"
      ? sp.session_id
      : Array.isArray(sp.session_id)
      ? sp.session_id[0]
      : undefined;
  if (!sessionId) return notFound();

  const session = await fetchSession(sessionId);
  const { sku, fulfillment_type, success_slug } =
    extractSkuFulfillmentSuccess(session);
  if (!sku || !fulfillment_type) return notFound();

  const orderRow = await fetchOrderBySessionId(session.id);
  const purchasePayload = buildPurchasePayload({
    session,
    orderRow,
    sku,
    fulfillment_type_raw: fulfillment_type,
  });

  if (process.env.NEXT_PUBLIC_DEBUG === "1") {
    console.log("[/gracias][purchase-check]", {
      session_id: session.id,
      session_status: session.payment_status,
      has_order: !!orderRow,
      is_paid: orderRow?.is_paid ?? null,
      order_id: orderRow?.order_id ?? null,
      will_fire_purchase: !!purchasePayload,
    });
  }

  // Resolver siguiente paso
  const nextRaw = await resolveNextStep({
    fulfillment_type,
    sku,
    success_slug: success_slug || undefined,
  });

  const next: NextStep = {
    variant: (nextRaw as NextStep).variant || "generic",
    href: (nextRaw as NextStep).href,
    label: (nextRaw as NextStep).label,
    items: Array.isArray((nextRaw as NextStep).items)
      ? ((nextRaw as NextStep).items || []).filter(
          (x): x is NextStepItem => !!x && typeof x.href === "string"
        )
      : undefined,
  };

  const copy = COPY_BY_VARIANT[next.variant] || COPY_BY_VARIANT.generic;
  let title = copy.title;
  let lead = copy.lead;
  const ctaLabel = copy.ctaLabel;

  // Datos extra para live_class
  let supportEmail = "soporte@lobra.net";
  let tzDisplay: string | undefined;
  let startISO: string | undefined;
  let endISO: string | undefined;

  if (fulfillment_type === "live_class") {
    const webinar = (await getWebinarBySku(sku)) || null;

    supportEmail = getSupportEmail(webinar);
    const over = applyThankyouOverrides({ title, lead }, webinar);
    title = over.title;
    lead = over.lead;

    const start = safeDate((webinar as WebinarExtra)?.shared?.startAt);
    const dur = (webinar as WebinarExtra)?.shared?.durationMin;
    const end =
      start && typeof dur === "number"
        ? new Date(start.getTime() + Math.max(0, Math.trunc(dur)) * 60_000)
        : null;

    if (start) {
      tzDisplay = formatScheduleInSiteTZ(start, end ?? undefined);
      startISO = toISO(start);
      endISO = toISO(end ?? undefined);
    }
  }

  return (
    <main className="container u-py-8">
      {/* Tracker de compra, sin duplicados */}
      {purchasePayload ? <PurchaseTracker payload={purchasePayload} /> : null}

      <section className="l-stack-6 u-text-center">
        <h1 className="h2">{title}</h1>
        <p className="u-lead">{lead}</p>

        {/* Bloque de fecha y horario */}
        {tzDisplay && (
          <div className="l-stack-2 u-center u-mt-2">
            <p className="u-small text-strong">Fecha y horario</p>
            <p className="u-small">{tzDisplay}</p>
            <p className="u-small text-weak">
              En tu hora local:{" "}
              <span id="local-schedule">{/* filled by script */}</span>
            </p>

            {/* Script cliente para hora local */}
            <Script id="local-schedule-fill" strategy="afterInteractive">
              {`
                (function() {
                  try {
                    var startISO='${startISO ?? ""}';
                    var endISO='${endISO ?? ""}';
                    if(!startISO) return;
                    var localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
                    var start = new Date(startISO);
                    var end = endISO ? new Date(endISO) : null;

                    var datePart = new Intl.DateTimeFormat('es-MX', {
                      timeZone: localTZ,
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }).format(start);

                    var timeFmt = new Intl.DateTimeFormat(undefined, {
                      timeZone: localTZ,
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });

                    var startTime = timeFmt.format(start);
                    var endTime = end ? timeFmt.format(end) : '';
                    var tzName = new Intl.DateTimeFormat(undefined, {
                      timeZone: localTZ,
                      timeZoneName: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }).formatToParts(start).find(function(p){return p.type==='timeZoneName'})?.value || '';

                    var txt = datePart + ', ' + startTime + (endTime ? '–' + endTime : '') + (tzName ? ' ' + tzName : '');
                    var node = document.getElementById('local-schedule');
                    if (node) node.textContent = txt;
                  } catch(e) {}
                })();
              `}
            </Script>
          </div>
        )}

        {/* CTA dinámico */}
        {next.variant === "bundle" && next.items && next.items.length > 0 ? (
          <div className="l-stack-4 u-center">
            {next.items.map((it, i) => (
              <Link
                key={i}
                href={it.href}
                className="c-btn c-btn--solid"
                prefetch={false}
              >
                {it.label || "Abrir"}
              </Link>
            ))}
          </div>
        ) : next.variant !== "none" && next.href ? (
          <Link
            href={next.href}
            className="c-btn c-btn--solid"
            prefetch={false}
          >
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
              Si no lo encuentras, escribe a{" "}
              <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
