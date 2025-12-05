// lib/brevo/types.ts
// Tipos base y utilidades puras para el módulo Brevo.
// - Centraliza contratos y helpers deterministas.
// - Punto único de verdad para imports en syncFreeClassLead y client.

/* -------------------------------------------------------
 * Errores normalizados del helper Brevo
 * ----------------------------------------------------- */

export const BREVO_ERROR_CODES = [
  "invalid_email",
  "api_4xx",
  "api_5xx",
  "network_error",
  "rate_limited",
] as const;

export type BrevoHelperErrorCode = (typeof BREVO_ERROR_CODES)[number];

/* -------------------------------------------------------
 * Tipos de eventos de marketing (extendible a F2/F3)
 * ----------------------------------------------------- */

export type MarketingEventType = "freeclass_registration" | "purchase";

/* -------------------------------------------------------
 * Entrada del helper Brevo para sincronizar leads
 * ----------------------------------------------------- */

export type SyncFreeClassLeadWithBrevoInput = {
  contactId: string;
  currentBrevoContactId: string | null;

  email: string;
  fullName: string | null;

  sku: string;
  instanceSlug: string | null;

  cohortListId: number | null;
};

/* -------------------------------------------------------
 * Objeto interno enviado al cliente Brevo (HTTP)
 * ----------------------------------------------------- */

export type BrevoMarketingEvent = {
  type: MarketingEventType;

  email: string;
  fullName: string | null;

  classSku: string | null;
  instanceSlug: string | null;

  tags: string[];

  currentBrevoId: string | null;

  cohortListId: number | null;
};

/* -------------------------------------------------------
 * Resultado base de sincronización con Brevo
 * ----------------------------------------------------- */

export type SyncFreeClassLeadWithBrevoSuccess = {
  ok: true;
  brevoContactId: string;
  errorCode: null;
};

export type SyncFreeClassLeadWithBrevoFailure = {
  ok: false;
  brevoContactId: string | null;
  errorCode: BrevoHelperErrorCode;
};

export type SyncFreeClassLeadWithBrevoResult =
  | SyncFreeClassLeadWithBrevoSuccess
  | SyncFreeClassLeadWithBrevoFailure;

/* -------------------------------------------------------
 * Helpers deterministas
 * ----------------------------------------------------- */

// Normaliza email para uso consistente en Brevo.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Genera tags oficiales para free class.
// Mantiene compatibilidad con F1 y extensible a F2.
export function buildFreeClassTags(
  sku: string,
  instanceSlug: string | null,
): string[] {
  // Tag base fijo para la clase gratuita actual.
  // Si en el futuro hay múltiples SKUs de free class, este helper se expandirá.
  const baseTag = "lead_freeclass_fin_freeintro";

  const tags: string[] = [baseTag];

  if (instanceSlug && instanceSlug.length > 0) {
    tags.push(`${baseTag}_${instanceSlug}`);
  }

  return tags;
}
