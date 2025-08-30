// scripts/testWebhookEvents_markReceived.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { f_webhookEvents_markReceived } from "../lib/webhooks/f_webhookEvents_markReceived";

async function main() {
  const stripeEventId = "evt_mark_received_test_001";
  const type = "test.event";
  const payload = { foo: "bar", time: new Date().toISOString() };

  console.log("→ Insert inicial");
  const r1 = await f_webhookEvents_markReceived({ stripeEventId, type, payload });
  console.log("id:", r1.id, "stripe_event_id:", r1.stripe_event_id, "received_at:", r1.received_at);

  console.log("→ Reintento idempotente (mismo ID)");
  const r2 = await f_webhookEvents_markReceived({ stripeEventId, type, payload });
  console.log("id:", r2.id, "stripe_event_id:", r2.stripe_event_id, "received_at:", r2.received_at);
}

main().catch((e) => {
  console.error("Error en la prueba:", e);
  process.exit(1);
});
