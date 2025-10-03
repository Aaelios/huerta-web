// lib/webinars/schema.ts

import { z } from "zod";

// ---------------------------
// Tipos base
// ---------------------------

const TemplateSchema = z.object({
  mode: z.enum(["email", "link"]),
  url: z.string().url().optional(), // requerido si mode = link, validación extra opcional
});

const CalendarSchema = z.object({
  mode: z.enum(["generated", "static"]),
  url: z.string().url().optional(), // requerido si mode = static
});

const WhatsAppSupportSchema = z.object({
  enabled: z.boolean(),
  numberMasked: z.string().optional(),
  presetText: z.string().optional(),
});

const PricingSchema = z.object({
  sku: z.string(),
  amountCents: z.number().int().nonnegative(),
  currency: z.string(),
  interval: z.enum(["one_time", "recurring"]),
  stripePriceId: z.string().optional(),
  stripeProductId: z.string().optional(),
});

// ---------------------------
// Shared
// ---------------------------

export const SharedSchema = z.object({
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable().optional(),
  startAt: z.string(), // podemos validar ISO más adelante
  durationMin: z.number().int(),
  zoomJoinUrl: z.string().url().nullable(),
  supportEmail: z.string().email(),
  template: TemplateSchema,
  whatsAppSupport: WhatsAppSupportSchema,
  calendar: CalendarSchema,
  sku: z.string(),
  flags: z.object({
    showReplay: z.boolean(),
    replayUrl: z.string().url().nullable(),
  }),
  pricing: PricingSchema,
});

// ---------------------------
// Sales
// ---------------------------

const SalesHeroSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  subtitle: z.string(),
  note: z.string(),
  ctaText: z.string(),
  heroImageSrc: z.string(),
  heroImageAlt: z.string(),
});

const SalesClasePracticaSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  intro: z.string(),
  leftTitle: z.string(),
  bullets: z.array(z.string()),
  deliverableTitle: z.string(),
  deliverableBullets: z.array(z.string()),
  priceLine: z.string(),
  guarantee: z.string(),
  ctaText: z.string(),
});

export const SalesSchema = z.object({
  seo: z.object({
    title: z.string(),
    description: z.string(),
    canonical: z.string().url(),
  }),
  hero: SalesHeroSchema,
  clasePractica: SalesClasePracticaSchema,
});

// ---------------------------
// Prelobby
// ---------------------------

export const PrelobbySchema = z.object({
  labels: z.object({
    tooEarly: z.string(),
    early: z.string(),
    open: z.string(),
    live: z.string(),
    ended: z.string(),
  }),
});

// ---------------------------
// Webinar completo
// ---------------------------

export const WebinarSchema = z.object({
  shared: SharedSchema,
  sales: SalesSchema.optional(),
  prelobby: PrelobbySchema.optional(),
});

// Mapa de webinars (clave = slug, valor = Webinar)
export const WebinarMapSchema = z.record(z.string(), WebinarSchema);

// ---------------------------
// Tipos inferidos de Zod
// ---------------------------

export type Webinar = z.infer<typeof WebinarSchema>;
export type WebinarMap = z.infer<typeof WebinarMapSchema>;
