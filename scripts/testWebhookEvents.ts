// scripts/testWebhookEvents.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { f_webhookEvents_getByStripeId } from "../lib/webhooks/f_webhookEvents_getByStripeId";

async function main() {
  const existingId = "evt_full_004";
  const nonExistingId = "evt_does_not_exist_999";

  const found = await f_webhookEvents_getByStripeId(existingId);
  console.log("Existe:", found?.stripe_event_id, "type:", found?.type, "status:", found?.status);

  const notFound = await f_webhookEvents_getByStripeId(nonExistingId);
  console.log("No existe:", notFound);
}

main().catch((e) => {
  console.error("Error en la prueba:", e);
  process.exit(1);
});
