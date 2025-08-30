// scripts/testWebhookEvents_markIgnored.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { f_webhookEvents_markIgnored } from "../lib/webhooks/f_webhookEvents_markIgnored";

async function main() {
  const stripeEventId = "evt_mark_received_test_001"; // ya existe por las pruebas previas

  console.log("→ Marcar como ignored (cierra con processed_at)");
  const r1 = await f_webhookEvents_markIgnored({ stripeEventId });
  console.log("stripe_event_id:", r1.stripe_event_id, "processed_at:", r1.processed_at);

  console.log("→ Reintento idempotente (mismo ID)");
  const r2 = await f_webhookEvents_markIgnored({ stripeEventId });
  console.log("stripe_event_id:", r2.stripe_event_id, "processed_at:", r2.processed_at);
}

main().catch((e) => {
  console.error("Error en la prueba:", e);
  process.exit(1);
});
