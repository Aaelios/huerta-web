// lib/seo/schemas/buildEventSchemaFromWebinar.ts
// Builder de JSON-LD Event para páginas de webinars a partir de SchemaWebinarInput.

import type { SchemaWebinarInput } from "./jsonLdTypes";

/**
 * Tipo del objeto Event que este builder devuelve.
 * @context se agrega a nivel global en la infraestructura de schemas.
 */
export interface EventSchema {
  "@type": "Event";
  "@id": string;
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
 * El contenido de marketing usa [[...]] para énfasis visual.
 * Para JSON-LD los limpiamos para evitar ruido en SEO.
 */
function stripEmphasisMarkers(text: string): string {
  return text.replace(/\[\[/g, "").replace(/\]\]/g, "");
}

/**
 * buildEventSchemaFromWebinar
 * Builder principal para el schema Event de un webinar.
 *
 * Reglas:
 * - Usa SchemaWebinarInput (DTO ya normalizado por 02G).
 * - Requiere canonical no vacío y startDateIso válido.
 * - Omite Event si el evento ya no es relevante temporalmente.
 */
export function buildEventSchemaFromWebinar(params: {
  data: SchemaWebinarInput;
  canonical: string;
  now?: Date;
}): EventSchema | null {
  const { data, canonical, now = new Date() } = params;

  const trimmedCanonical = canonical.trim();
  if (!trimmedCanonical) {
    return null;
  }

  const startAtIso = data.startDateIso;
  if (!startAtIso) {
    return null;
  }

  const endDateIso = data.endDateIso;

  // Filtro de relevancia temporal (AI-first):
  if (!isEventStillRelevant(startAtIso, endDateIso, now)) {
    return null;
  }

  const eventStatus = resolveEventStatus(startAtIso, endDateIso, now);
  if (!eventStatus) {
    // Si no podemos determinar un estado coherente, omitimos el Event.
    return null;
  }

  const description = resolveDescription(data);

  const base: EventSchema = {
    "@type": "Event",
    "@id": buildEventId(trimmedCanonical, data.slug),
    name: stripEmphasisMarkers(data.title),
    description,
    startDate: startAtIso,
    eventStatus,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    location: {
      "@type": "VirtualLocation",
      url: trimmedCanonical,
    },
    organizer: {
      // Mantener alineado con el Organization global definido en 02A.
      "@id": "https://lobra.net/#organization",
    },
  };

  if (endDateIso) {
    base.endDate = endDateIso;
  }

  return base;
}

/**
 * buildEventId
 * Construye el @id del Event a partir del canonical y el slug.
 * Regla: @id = canonical + "#event-{slug}".
 */
function buildEventId(canonical: string, slug: string): string {
  const safeSlug = slug || "webinar";
  return `${canonical}#event-${safeSlug}`;
}

/**
 * resolveDescription
 * Usa la descripción ya normalizada en SchemaWebinarInput.
 * Si viene vacía, cae a title como último recurso.
 * Siempre limpia los marcadores [[...]].
 */
function resolveDescription(data: SchemaWebinarInput): string {
  const descRaw = data.description ?? "";
  const desc = stripEmphasisMarkers(descRaw).trim();
  if (desc.length > 0) {
    return desc;
  }
  return stripEmphasisMarkers(data.title);
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
