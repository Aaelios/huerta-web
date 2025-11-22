// lib/analytics/dataLayer.ts

export type AnalyticsContentType =
  | "course"
  | "template"
  | "live_class"
  | "one_to_one"
  | "subscription_grant"
  | "bundle";

export interface AnalyticsItem {
  sku: string;
  fulfillment_type: AnalyticsContentType;
  quantity?: number;
  unit_amount?: number; // centavos, alineado con Stripe
  amount_total?: number; // centavos, alineado con Stripe
  currency?: string;
  [key: string]: unknown;
}

export interface AnalyticsEventBase {
  event: string;
  value?: number;
  currency?: string;
  content_id?: string;
  content_type?: AnalyticsContentType;
  items?: AnalyticsItem[];
  [key: string]: unknown;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Asegura que window.dataLayer exista en entorno cliente.
 * No hace nada en SSR.
 */
export function initDataLayer(): void {
  if (!isBrowser()) {
    return;
  }

  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }
}

/**
 * Envía un evento tipado al dataLayer.
 * Requiere al menos un "event" no vacío.
 * No hace nada en SSR ni si el payload es inválido.
 */
export function pushAnalyticsEvent(payload: AnalyticsEventBase): void {
  if (!isBrowser()) {
    return;
  }

  if (payload.event.length === 0) {
    return;
  }

  if (!Array.isArray(window.dataLayer)) {
    window.dataLayer = [];
  }

  window.dataLayer!.push(payload);
}

/**
 * Evento de prueba para smoke-test de infraestructura.
 * Opcionalmente recibe una etiqueta que se usa como content_id.
 */
export function pushAnalyticsTestEvent(label?: string): void {
  const event: AnalyticsEventBase = {
    event: "test_event",
  };

  if (label && label.length > 0) {
    event.content_id = label;
  }

  pushAnalyticsEvent(event);
}
