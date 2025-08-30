// scripts/testWebhookEvents_markFailed.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { f_webhookEvents_markFailed } from "../lib/webhooks/f_webhookEvents_markFailed";

async function main() {
  const stripeEventId = "evt_mark_received_test_001"; // ya existe
  console.log("→ Marcar como failed (no cierra processed_at)");
  const r1 = await f_webhookEvents_markFailed({
    stripeEventId,
    errorCode: "DB_LOCK",
    errorMessage: "Bloqueo transitorio en base de datos",
  });
  console.log("stripe_event_id:", r1.stripe_event_id, "processed_at:", r1.processed_at);
  console.log("last_error:", (r1 as any)?.payload?.last_error);

  console.log("→ Segundo fallo (sobrescribe last_error)");
  const r2 = await f_webhookEvents_markFailed({
    stripeEventId,
    errorMessage: "Timeout al llamar Stripe",
  });
  console.log("stripe_event_id:", r2.stripe_event_id, "processed_at:", r2.processed_at);
  console.log("last_error:", (r2 as any)?.payload?.last_error);
}

main().catch((e) => {
  console.error("Error en la prueba:", e);
  process.exit(1);
});
