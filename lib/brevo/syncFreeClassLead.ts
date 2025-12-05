// lib/brevo/syncFreeClassLead.ts
// Helper v1: orquesta Brevo + Supabase marketing para leads de Free Class.
// - Usa el output de createFreeClassLead (contactId + brevoContactId actual).
// - Envía evento a Brevo, aplica tags oficiales y actualiza estado en contacts.metadata.marketing.

import { getServiceClient } from "../supabase/server";
import {
  BrevoMarketingEvent,
  SyncFreeClassLeadWithBrevoInput,
  SyncFreeClassLeadWithBrevoResult,
  normalizeEmail,
  buildFreeClassTags,
} from "./types";
import { sendBrevoMarketingEvent } from "./client";

/**
 * Sincroniza un lead de Free Class con Brevo y actualiza el estado de marketing en Supabase.
 *
 * Flujo:
 * 1) Construye tags oficiales de Free Class (helper centralizado).
 * 2) Normaliza email y arma BrevoMarketingEvent.
 * 3) Llama a Brevo (sendBrevoMarketingEvent).
 * 4) Llama a public.f_contacts_marketing_update_v1 con el resultado.
 * 5) Devuelve SyncFreeClassLeadWithBrevoResult (enfocado solo en resultado Brevo).
 *
 * Nota para expertx:
 * - Cualquier fallo en el RPC de marketing lanza Error y debe manejarse en la capa superior.
 * - Este helper NO decide UX; solo asegura side-effects en Brevo + Supabase.
 */
export async function syncFreeClassLeadWithBrevo(
  input: SyncFreeClassLeadWithBrevoInput,
): Promise<SyncFreeClassLeadWithBrevoResult> {
  // 1) Tags oficiales según SKU e instancia (internos para Supabase/analytics).
  const tags = buildFreeClassTags(input.sku, input.instanceSlug);

  // 2) Normalización de email para Brevo.
  const normalizedEmail = normalizeEmail(input.email);

  // 3) Construir evento de marketing para Brevo.
  const marketingEvent: BrevoMarketingEvent = {
    type: "freeclass_registration",
    email: normalizedEmail,
    fullName: input.fullName,
    classSku: input.sku,
    instanceSlug: input.instanceSlug,
    tags,
    currentBrevoId: input.currentBrevoContactId,
    cohortListId: input.cohortListId,
  };

  // 4) Enviar a Brevo (upsert + listas / side-effects externos).
  const brevoResult = await sendBrevoMarketingEvent(marketingEvent);

  // 5) Actualizar estado en Supabase vía RPC marketing.
  const supabase = getServiceClient();

  const rpcPayload = {
    contact_id: input.contactId,
    tags,
    ok: brevoResult.ok,
    brevo_contact_id: brevoResult.brevoContactId,
    error_code: brevoResult.errorCode,
  };

  const { error: rpcError } = await supabase.rpc(
    "f_contacts_marketing_update_v1",
    { p_input: rpcPayload },
  );

  if (rpcError) {
    throw new Error(
      rpcError.message ??
        "Failed to update marketing state via f_contacts_marketing_update_v1",
    );
  }

  // 6) Devolver resultado Brevo.
  return brevoResult;
}
