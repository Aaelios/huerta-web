// lib/seo/schemas/buildEventSchemaFromWebinar.ts
// Builder de JSON-LD Event para páginas de webinars a partir del tipo Webinar.

import type { Webinar } from "@/lib/types/webinars";

// Entrada mínima necesaria para construir el Event.
// Se mantiene desacoplada del origen real (JSONC, Supabase, etc.).
export interface SchemaWebinarInput {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoCanonical: string;
  startAt: string;
  durationMin?: number;
}

// Tipo del objeto Event que este builder devuelve.
// @context se agrega a nivel global en la infraestructura de schemas.
export interface EventSchema {
  "@type": "Event";
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  eventStatus:
    | "https://schema.org/EventScheduled"
    | "https://schema.org/EventInProgress";
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode";
  location: {
    "@type": "VirtualLocation";
    url: string;
  };
  organizer: {
    "@id": string;
  };
}

/**
 * buildEventSchemaFromWebinar
 * Builder principal para el schema Event de un webinar.
 * - Recibe el contrato completo Webinar.
 * - Internamente mapea a SchemaWebinarInput.
 * - Aplica reglas de negocio para fechas, estado y descripción.
 * - Si el evento ya no es relevante, devuelve null (no se genera Event).
 */
export function buildEventSchemaFromWebinar(
  webinar: Webinar,
  now: Date = new Date()
): EventSchema | null {
  const input = mapWebinarToSchemaInput(webinar);
  const endDateIso = computeEndDateIso(input.startAt, input.durationMin);

  if (!isEventStillRelevant(input.startAt, endDateIso, now)) {
    // Regla AI-first: si no hay próxima fecha vigente, omitimos Event.
    return null;
  }

  const eventStatus = resolveEventStatus(input.startAt, endDateIso, now);
  if (!eventStatus) {
    // Si no podemos determinar un estado coherente, es más seguro omitir el Event.
    return null;
  }

  const description = resolveDescription(input, webinar);

  const base: EventSchema = {
    "@type": "Event",
    name: input.seoTitle,
    description,
    startDate: input.startAt,
    eventStatus,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: {
      "@type": "VirtualLocation",
      url: input.seoCanonical,
    },
    organizer: {
      "@id": "https://lobra.net/#organization",
    },
  };

  if (endDateIso) {
    base.endDate = endDateIso;
  }

  return base;
}

/**
 * mapWebinarToSchemaInput
 * Encapsula el mapeo desde el contrato completo Webinar
 * hacia la entrada mínima requerida por el builder.
 */
function mapWebinarToSchemaInput(webinar: Webinar): SchemaWebinarInput {
  const seoTitle = webinar.sales?.seo.title ?? webinar.shared.title;
  const seoDescription = webinar.sales?.seo.description ?? "";
  const seoCanonical = webinar.sales?.seo.canonical ?? "";

  return {
    slug: webinar.shared.slug,
    seoTitle,
    seoDescription,
    seoCanonical,
    startAt: webinar.shared.startAt,
    durationMin: webinar.shared.durationMin,
  };
}

/**
 * resolveDescription
 * Aplica la prioridad acordada para la descripción del Event:
 * 1) sales.seo.description
 * 2) shared.subtitle
 * 3) sales.hero.subtitle
 * 4) seoTitle (último recurso)
 */
function resolveDescription(
  input: SchemaWebinarInput,
  webinar: Webinar
): string {
  const trimmedSeoDescription = input.seoDescription.trim();
  if (trimmedSeoDescription.length > 0) {
    return trimmedSeoDescription;
  }

  const sharedSubtitle = webinar.shared.subtitle ?? "";
  if (sharedSubtitle.trim().length > 0) {
    return sharedSubtitle.trim();
  }

  const heroSubtitle = webinar.sales?.hero.subtitle ?? "";
  if (heroSubtitle.trim().length > 0) {
    return heroSubtitle.trim();
  }

  return input.seoTitle;
}

/**
 * computeEndDateIso
 * Calcula endDate a partir de startAt + durationMin.
 * - Si durationMin no es válida, se omite endDate.
 * - Devuelve ISO en UTC (toISOString), válido para schema.org.
 */
function computeEndDateIso(
  startAtIso: string,
  durationMin?: number
): string | undefined {
  if (!durationMin || !Number.isFinite(durationMin) || durationMin <= 0) {
    return undefined;
  }

  const startDate = new Date(startAtIso);
  if (Number.isNaN(startDate.getTime())) {
    return undefined;
  }

  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
  return endDate.toISOString();
}

/**
 * isEventStillRelevant
 * Determina si el Event debe existir:
 * - Si endDate existe: now <= endDate.
 * - Si no hay endDate: now <= startAt.
 */
function isEventStillRelevant(
  startAtIso: string,
  endDateIso: string | undefined,
  now: Date
): boolean {
  const nowTime = now.getTime();
  const startTime = Date.parse(startAtIso);

  if (Number.isNaN(startTime)) {
    return false;
  }

  if (endDateIso) {
    const endTime = Date.parse(endDateIso);
    if (Number.isNaN(endTime)) {
      return nowTime <= startTime;
    }
    return nowTime <= endTime;
  }

  return nowTime <= startTime;
}

/**
 * resolveEventStatus
 * Asigna eventStatus según la ventana temporal:
 * - EventScheduled: now < startAt
 * - EventInProgress: startAt <= now <= endDate (o sin endDate, asumimos en progreso).
 * Si el evento ya terminó, debe filtrarse antes con isEventStillRelevant.
 */
function resolveEventStatus(
  startAtIso: string,
  endDateIso: string | undefined,
  now: Date
): EventSchema["eventStatus"] | null {
  const nowTime = now.getTime();
  const startTime = Date.parse(startAtIso);

  if (Number.isNaN(startTime)) {
    return null;
  }

  if (nowTime < startTime) {
    return "https://schema.org/EventScheduled";
  }

  if (endDateIso) {
    const endTime = Date.parse(endDateIso);
    if (!Number.isNaN(endTime) && nowTime <= endTime) {
      return "https://schema.org/EventInProgress";
    }
    return null;
  }

  // Sin endDate: si ya pasamos startAt, consideramos InProgress mientras
  // isEventStillRelevant permita la existencia del Event.
  if (nowTime >= startTime) {
    return "https://schema.org/EventInProgress";
  }

  return null;
}
