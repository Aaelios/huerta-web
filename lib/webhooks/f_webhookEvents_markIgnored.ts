// lib/webhooks/f_webhookEvents_markIgnored.ts
import { m_getSupabaseService } from "../supabase/m_getSupabaseService";
import type { TWebhookEvent } from "./f_webhookEvents_getByStripeId";

export class WebhookEventsMarkIgnoredError extends Error {
  code = "WEBHOOK_EVENTS_MARK_IGNORED_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "WebhookEventsMarkIgnoredError";
  }
}

/**
 * Caso no recuperable: marcamos como “ignorado” cerrando el evento.
 * En tu tabla no existe columna status, así que solo seteamos processed_at.
 * Evita reintentos posteriores en tu lógica de handler.
 */
export async function f_webhookEvents_markIgnored(params: {
  stripeEventId: string;
}): Promise<TWebhookEvent> {
  const { stripeEventId } = params;

  if (!stripeEventId || typeof stripeEventId !== "string") {
    throw new WebhookEventsMarkIgnoredError("stripeEventId inválido");
  }

  const supabase = m_getSupabaseService();

  const { data, error } = await supabase
    .from("webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("stripe_event_id", stripeEventId)
    .select()
    .single();

  if (error) {
    throw new WebhookEventsMarkIgnoredError(`UPDATE falló: ${error.message}`);
  }
  if (!data) {
    throw new WebhookEventsMarkIgnoredError(
      "Evento no encontrado para marcar como ignored"
    );
  }

  return data as TWebhookEvent;
}
