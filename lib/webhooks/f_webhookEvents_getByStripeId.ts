// lib/webhooks/f_webhookEvents_getByStripeId.ts
import { m_getSupabaseService } from "../supabase/m_getSupabaseService";

export class WebhookEventsLookupError extends Error {
  code = "WEBHOOK_EVENTS_LOOKUP_FAILED";
  constructor(message: string) {
    super(message);
    this.name = "WebhookEventsLookupError";
  }
}

export type TWebhookEvent = {
  id: string;
  stripe_event_id: string;
  type: string | null;
  status?: "received" | "processed" | "ignored" | "failed" | string | null;
  attempt?: number | null;
  raw_hash?: string | null;
  processed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  error_code?: string | null;
  error_message?: string | null;
  order_id?: string | null;
  [k: string]: any;
};

export async function f_webhookEvents_getByStripeId(
  stripeEventId: string
): Promise<TWebhookEvent | null> {
  if (!stripeEventId || typeof stripeEventId !== "string") {
    throw new WebhookEventsLookupError("stripeEventId inválido");
  }

  const supabase = m_getSupabaseService();

  const { data, error } = await supabase.rpc(
    "f_webhookevents_getbystripeid",
    { p_stripe_event_id: stripeEventId }
  );

  if (error) {
    throw new WebhookEventsLookupError(
      `RPC f_webhookevents_getbystripeid falló: ${error.message}`
    );
  }

  // La función puede devolver un registro con todos NULL cuando no existe.
  if (!data || (data as any).id === null) return null;

  return data as TWebhookEvent;
}
