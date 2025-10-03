// lib/types/webinars.ts

// ---------------------------
// Tipos base
// ---------------------------

export type TemplateMode = "email" | "link";
export type CalendarMode = "generated" | "static";
export type Interval = "one_time" | "recurring";

export type WhatsAppSupport = {
  enabled: boolean;
  numberMasked?: string; // opcional, solo visual
  presetText?: string;   // opcional, texto prellenado
};

export type Template = {
  mode: TemplateMode;
  url?: string; // requerido si mode = "link"
};

export type Calendar = {
  mode: CalendarMode;
  url?: string; // requerido si mode = "static"
};

// ---------------------------
// Sección Shared
// ---------------------------

export interface Shared {
  slug: string;
  title: string;
  subtitle?: string | null;
  startAt: string;       // ISO con TZ CDMX, ej. "2025-10-07T20:30:00-06:00"
  durationMin: number;
  zoomJoinUrl: string | null;
  supportEmail: string;
  template: Template;
  whatsAppSupport: WhatsAppSupport;
  calendar: Calendar;
  sku: string;           // para validación de entitlement
  flags: {
    showReplay: boolean;
    replayUrl: string | null;
  };
  pricing: {
    sku: string;
    amountCents: number;
    currency: string;
    interval: Interval;
    stripePriceId?: string;
    stripeProductId?: string;
  };
}

// ---------------------------
// Sección Sales
// ---------------------------

export interface Sales {
  seo: {
    title: string;
    description: string;
    canonical: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    note: string;
    ctaText: string;
    heroImageSrc: string;
    heroImageAlt: string;
  };
  clasePractica: {
    eyebrow: string;
    title: string;
    intro: string;
    leftTitle: string;
    bullets: string[];
    deliverableTitle: string;
    deliverableBullets: string[];
    priceLine: string;
    guarantee: string;
    ctaText: string;
  };
}

// ---------------------------
// Sección Prelobby
// ---------------------------

export interface Prelobby {
  labels: {
    tooEarly: string;
    early: string;
    open: string;
    live: string;
    ended: string;
  };
}

// ---------------------------
// Contrato Webinar
// ---------------------------

export interface Webinar {
  shared: Shared;
  sales?: Sales;
  prelobby?: Prelobby;
}

// ---------------------------
// Compatibilidad Legacy
// ---------------------------

/**
 * @deprecated
 * Tipo antiguo, usado antes de migrar a shared/sales/prelobby.
 * Mantener solo mientras haya código legacy.
 */
export interface LegacyWebinar {
  slug: string;
  title: string;
  subtitle: string | null;
  startAt: string;
  durationMin: number;
  zoomJoinUrl: string | null;
  supportEmail: string;
  template: Template;
  whatsAppSupport: WhatsAppSupport;
  calendar: Calendar;
  sku: string;
}

// ---------------------------
// Map
// ---------------------------

export type WebinarMap = Record<string, Webinar>;
