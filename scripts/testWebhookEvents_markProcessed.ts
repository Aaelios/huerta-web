// scripts/testWebhookEvents_markProcessed.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { f_webhookEvents_markProcessed } from "../lib/webhooks/f_webhookEvents_markProcessed";

async function main() {
  const stripeEventId = "evt_mark_received_test_001"; // el que insertaste antes
  const orderId = "11111111-1111-1111-1111-111111111111"; // UUID dummy de prueba

  console.log("→ Marcar como processed");
  const r1 = await f_webhookEvents_markProcessed({ stripeEventId, orderId });
  console.log("stripe_event_id:", r1.stripe_event_id, "processed_at:", r1.processed_at, "order_id:", r1.order_id);

  console.log("→ Reintento idempotente (mismo ID)");
  const r2 = await f_webhookEvents_markProcessed({ stripeEventId, orderId });
  console.log("stripe_event_id:", r2.stripe_event_id, "processed_at:", r2.processed_at, "order_id:", r2.order_id);
}

main().catch((e) => {
  console.error("Error en la prueba:", e);
  process.exit(1);
});
