// lib/webhooks/f_webhookEvents_markReceived.ts
import { m_getSupabaseService } from "../supabase/m_getSupabaseService";
import type { TWebhookEvent } from "./f_webhookEvents_getByStripeId";

export class WebhookEventsMarkReceivedError extends Error {
  code = "WEBHOOK_EVENTS_MARK_RECEIVED_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "WebhookEventsMarkReceivedError";
  }
}

/**
 * Inserta registro preliminar en webhook_events.
 * Idempotente por unique(stripe_event_id):
 *  - Si ya existe, devuelve el existente sin modificarlo.
 */
export async function f_webhookEvents_markReceived(params: {
  stripeEventId: string;
  type: string;
  payload: unknown; // objeto Stripe.Event o parcial
}): Promise<TWebhookEvent> {
  const { stripeEventId, type, payload } = params;

  if (!stripeEventId || typeof stripeEventId !== "string") {
    throw new WebhookEventsMarkReceivedError("stripeEventId inválido");
  }
  if (!type || typeof type !== "string") {
    throw new WebhookEventsMarkReceivedError("type inválido");
  }

  const supabase = m_getSupabaseService();

  // Normaliza payload para jsonb
  let payloadObj: any = payload;
  if (typeof payload === "string") {
    try {
      payloadObj = JSON.parse(payload);
    } catch {
      payloadObj = { raw: payload };
    }
  }

  // INSERT directo; si choca con unique → SELECT existente
  const { data, error } = await supabase
    .from("webhook_events")
    .insert({
      stripe_event_id: stripeEventId,
      type,
      payload: payloadObj, // jsonb
      received_at: new Date().toISOString(), // NOT NULL
    })
    .select()
    .single();

  if (!error && data) return data as TWebhookEvent;

  // 23505 = unique_violation → ya existe
  if ((error as any)?.code === "23505") {
    const { data: existing, error: selErr } = await supabase
      .from("webhook_events")
      .select("*")
      .eq("stripe_event_id", stripeEventId)
      .single();

    if (selErr) {
      throw new WebhookEventsMarkReceivedError(
        `Conflicto y SELECT falló: ${selErr.message}`
      );
    }
    return existing as TWebhookEvent;
  }

  throw new WebhookEventsMarkReceivedError(
    `INSERT falló: ${(error as any)?.message || "desconocido"}`
  );
}
