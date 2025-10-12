// lib/ui_checkout/buildCheckoutUI.ts

/**
 * Construye los textos de UI para la página de Checkout a partir del nodo de webinars.jsonc.
 * No lee query params ni Stripe. Solo presenta información.
 *
 * Reglas:
 * - Título: shared.title
 * - Descripción: sales.hero.subtitle (se recomienda pasar accentRenderer si usas acentos/markups)
 * - Precio mostrado: shared.pricing.amountCents + currency (puede sobreescribirse con priceCentsFromStripe para evitar discrepancias visuales)
 * - Bullets / refundLine / legalLinks: de webinar.checkout si existe; si no, de defaults
 * - supportEmail: shared.supportEmail
 * - schedule: derivado de shared.startAt y shared.durationMin. Se muestra en SITE_TZ.
 */

export type CheckoutDefaults = {
  bullets: string[];
  refundLine?: string;
  legalLinks?: { privacySlug?: string; refundSlug?: string };
};

export type CheckoutUI = {
  title: string;
  desc: string;
  priceDisplay: string;
  bullets: string[];
  refundLine?: string;
  supportEmail?: string;
  legalLinks?: { privacySlug?: string; refundSlug?: string };
  /** Información de horario del evento. Presente solo si startAt es válido. */
  schedule?: { tzDisplay: string; startISO: string; endISO?: string };
};

type Pricing = {
  amountCents: number;
  currency: string; // ej. "MXN", "USD"
  stripePriceId?: string;
  stripeProductId?: string;
  interval?: 'one_time' | 'month' | 'year' | string;
};

type WebinarNode = {
  shared: {
    slug: string;
    title: string;
    supportEmail?: string;
    pricing: Pricing;
    /** ISO con offset local de CDMX, p. ej. "2025-10-14T20:30:00-06:00" */
    startAt?: string;
    /** Duración en minutos. Opcional. */
    durationMin?: number;
  };
  sales?: {
    hero?: {
      subtitle?: string; // Confirmado: usamos este campo para la descripción
    };
    seo?: {
      title?: string;
      description?: string;
    };
  };
  checkout?: {
    bullets?: string[];
    refundLine?: string;
    legalLinks?: { privacySlug?: string; refundSlug?: string };
  };
};

export type BuildCheckoutUIOptions = {
  /**
   * Si Stripe devuelve unit_amount distinto del JSONC, pásalo para alinear la UI.
   * En centavos de la misma moneda que shared.pricing.currency.
   */
  priceCentsFromStripe?: number;

  /**
   * Renderer opcional para aplicar estilos a la descripción (acentos, marcas).
   * Si no se provee, se usa tal cual el texto del JSONC.
   */
  accentRenderer?: (raw: string) => string;
};

export function buildCheckoutUI(
  webinar: WebinarNode,
  defaults: CheckoutDefaults,
  opts: BuildCheckoutUIOptions = {}
): CheckoutUI {
  assertWebinar(webinar);

  const title = safeString(webinar.shared.title);

  const rawDesc =
    webinar.sales?.hero?.subtitle ??
    webinar.sales?.seo?.description ??
    '';

  const desc =
    typeof opts.accentRenderer === 'function'
      ? opts.accentRenderer(rawDesc)
      : rawDesc;

  const priceCents =
    typeof opts.priceCentsFromStripe === 'number' &&
    Number.isFinite(opts.priceCentsFromStripe)
      ? Math.max(0, Math.trunc(opts.priceCentsFromStripe))
      : clampCents(webinar.shared.pricing.amountCents);

  const currency = safeCurrency(webinar.shared.pricing.currency);
  const priceDisplay = formatMoney(priceCents, currency);

  const bullets =
    webinar.checkout?.bullets?.length
      ? webinar.checkout!.bullets!.slice()
      : defaults.bullets.slice();

  const refundLine =
    webinar.checkout?.refundLine ?? defaults.refundLine ?? undefined;

  const legalLinks =
    webinar.checkout?.legalLinks ?? defaults.legalLinks ?? undefined;

  const supportEmail = webinar.shared.supportEmail ?? undefined;

  // ---- Horario (opcional) ----
  const startAtISO = typeof webinar.shared.startAt === 'string' ? webinar.shared.startAt : undefined;
  const durationMin =
    typeof webinar.shared.durationMin === 'number' && Number.isFinite(webinar.shared.durationMin)
      ? Math.max(0, Math.trunc(webinar.shared.durationMin))
      : undefined;

  let schedule: CheckoutUI['schedule'] | undefined;
  const startDate = safeDate(startAtISO);
  if (startDate) {
    const endDate = typeof durationMin === 'number' ? new Date(startDate.getTime() + durationMin * 60_000) : undefined;
    schedule = {
      tzDisplay: formatScheduleInSiteTZ(startDate, endDate),
      startISO: toISO(startDate),
      endISO: endDate ? toISO(endDate) : undefined,
    };
  }

  return {
    title,
    desc,
    priceDisplay,
    bullets,
    refundLine,
    supportEmail,
    legalLinks,
    schedule,
  };
}

/* ------------------------ utilidades internas ------------------------ */

function formatMoney(amountCents: number, currency: string): string {
  const amount = amountCents / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Si el currency es inválido, caemos a MXN como fallback.
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(amount);
  }
}

function clampCents(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  const t = Math.trunc(n);
  return t < 0 ? 0 : t;
}

function safeString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function safeCurrency(v: unknown): string {
  if (typeof v === 'string' && v.length >= 3 && v.length <= 5) return v;
  return 'MXN';
}

function assertWebinar(w: WebinarNode): void {
  if (!w || !w.shared || !w.shared.pricing) {
    throw new Error('buildCheckoutUI: webinar inválido o sin pricing.shared');
  }
  if (typeof w.shared.title !== 'string') {
    throw new Error('buildCheckoutUI: shared.title requerido');
  }
  if (
    typeof w.shared.pricing.amountCents !== 'number' ||
    typeof w.shared.pricing.currency !== 'string'
  ) {
    throw new Error('buildCheckoutUI: pricing.amountCents y currency requeridos');
  }
}

/**
 * Devuelve un Date válido si el ISO es parseable. Si no, null.
 */
function safeDate(iso?: string): Date | null {
  if (!iso || typeof iso !== 'string') return null;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formatea start/end en la zona del sitio (SITE_TZ) con texto compacto en español.
 * Ejemplo: "Mar 14 oct 2025, 20:30–22:00 GMT-6 (Ciudad de México)"
 */
function formatScheduleInSiteTZ(start: Date, end?: Date): string {
  const tz = process.env.SITE_TZ || 'America/Mexico_City';

  const locale = 'es-MX';
  const dayPart = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(start);

  const timeFmt = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const startTime = timeFmt.format(start);
  const endTime = end ? timeFmt.format(end) : undefined;

  // Nombre corto de zona (puede ser "GMT-6" o "CST" según plataforma)
  const tzName = new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    timeZoneName: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .formatToParts(start)
    .find((p) => p.type === 'timeZoneName')?.value;

  const range = endTime ? `${startTime}–${endTime}` : `${startTime}`;
  const tzSuffix = tzName ? ` ${tzName}` : '';
  return `${capitalize(dayPart)}, ${range}${tzSuffix} (Ciudad de México)`;
}

function toISO(d: Date): string {
  return new Date(d.getTime()).toISOString();
}

function capitalize(s: string): string {
  return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}
