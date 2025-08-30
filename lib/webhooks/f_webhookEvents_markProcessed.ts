// lib/webhooks/f_webhookEvents_markProcessed.ts
import { m_getSupabaseService } from "../supabase/m_getSupabaseService";
import type { TWebhookEvent } from "./f_webhookEvents_getByStripeId";

export class WebhookEventsMarkProcessedError extends Error {
  code = "WEBHOOK_EVENTS_MARK_PROCESSED_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "WebhookEventsMarkProcessedError";
  }
}

/**
 * Marca un webhook_event como procesado.
 * - Busca por stripe_event_id.
 * - Setea processed_at = now().
 * - Opcionalmente guarda order_id.
 * - Devuelve la fila final.
 */
export async function f_webhookEvents_markProcessed(params: {
  stripeEventId: string;
  orderId?: string | null;
}): Promise<TWebhookEvent> {
  const { stripeEventId, orderId } = params;

  if (!stripeEventId || typeof stripeEventId !== "string") {
    throw new WebhookEventsMarkProcessedError("stripeEventId inválido");
  }

  const supabase = m_getSupabaseService();

  const update: Record<string, any> = { processed_at: new Date().toISOString() };
  if (orderId) update.order_id = orderId;

  const { data, error } = await supabase
    .from("webhook_events")
    .update(update)
    .eq("stripe_event_id", stripeEventId)
    .select()
    .single();

  if (error) {
    throw new WebhookEventsMarkProcessedError(
      `UPDATE falló: ${error.message}`
    );
  }

  if (!data) {
    throw new WebhookEventsMarkProcessedError(
      "Evento no encontrado para marcar como processed"
    );
  }

  return data as TWebhookEvent;
}
