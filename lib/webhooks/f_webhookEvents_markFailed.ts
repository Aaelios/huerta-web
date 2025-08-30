// lib/webhooks/f_webhookEvents_markFailed.ts
import { m_getSupabaseService } from "../supabase/m_getSupabaseService";
import type { TWebhookEvent } from "./f_webhookEvents_getByStripeId";

export class WebhookEventsMarkFailedError extends Error {
  code = "WEBHOOK_EVENTS_MARK_FAILED_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "WebhookEventsMarkFailedError";
  }
}

/**
 * Registra un fallo sin cerrar el evento:
 * - No modifica processed_at (permite reintento).
 * - Adjunta last_error en payload: { code, message, at }.
 */
export async function f_webhookEvents_markFailed(params: {
  stripeEventId: string;
  errorCode?: string;
  errorMessage: string;
}): Promise<TWebhookEvent> {
  const { stripeEventId, errorCode, errorMessage } = params;

  if (!stripeEventId || typeof stripeEventId !== "string") {
    throw new WebhookEventsMarkFailedError("stripeEventId inválido");
  }
  if (!errorMessage || typeof errorMessage !== "string") {
    throw new WebhookEventsMarkFailedError("errorMessage inválido");
  }

  const supabase = m_getSupabaseService();

  // 1) Leer payload actual
  const { data: current, error: selErr } = await supabase
    .from("webhook_events")
    .select("*")
    .eq("stripe_event_id", stripeEventId)
    .single();

  if (selErr || !current) {
    throw new WebhookEventsMarkFailedError(
      `Evento no encontrado: ${selErr?.message || "sin detalle"}`
    );
  }

  // 2) Adjuntar last_error al payload
  const nowIso = new Date().toISOString();
  let payloadObj: any = current.payload ?? {};
  if (typeof payloadObj === "string") {
    try {
      payloadObj = JSON.parse(payloadObj);
    } catch {
      payloadObj = { raw: payloadObj };
    }
  }
  payloadObj.last_error = {
    code: errorCode || null,
    message: errorMessage,
    at: nowIso,
  };

  // 3) Update sin tocar processed_at
  const { data: updated, error: updErr } = await supabase
    .from("webhook_events")
    .update({ payload: payloadObj })
    .eq("stripe_event_id", stripeEventId)
    .select()
    .single();

  if (updErr || !updated) {
    throw new WebhookEventsMarkFailedError(
      `UPDATE falló: ${updErr?.message || "sin detalle"}`
    );
  }

  return updated as TWebhookEvent;
}
