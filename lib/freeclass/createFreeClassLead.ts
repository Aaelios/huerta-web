// lib/freeclass/createFreeClassLead.ts

// Helper v2: crea/actualiza contacto de free class vía f_orch_contact_write_v2.
// - Recibe solo datos limpios de free class (no métricas ni UTM).
// - Construye contact_core y free_class según contrato Supabase v2.
// - Devuelve solo contactId y brevoContactId; el resto se maneja en otros módulos.

import { getServiceClient } from "../supabase/server";

/** Datos mínimos limpios que necesita el helper para crear el lead de free class. */
export type CreateFreeClassLeadInput = {
  email: string;
  fullName: string | null;
  sku: string;
  instanceSlug: string | null;
  consent: boolean;
};

/** Códigos de error controlados por el helper. */
export type CreateFreeClassLeadErrorCode =
  | "db_error"
  | "invalid_response"
  | "server_error";

/** Resultado de éxito: contacto creado/actualizado en Supabase. */
export type CreateFreeClassLeadSuccess = {
  ok: true;
  contactId: string;
  brevoContactId: string | null;
};

/** Resultado de error: la capa superior decide qué hacer (log, fallback, etc.). */
export type CreateFreeClassLeadFailure = {
  ok: false;
  code: CreateFreeClassLeadErrorCode;
  message: string;
};

export type CreateFreeClassLeadResult =
  | CreateFreeClassLeadSuccess
  | CreateFreeClassLeadFailure;

/** Shape mínimo de contact_core que espera la orquestadora v2. */
type OrchContactCore = {
  email: string;
  full_name?: string;
  consent_status?: string;
  consent_source?: string;
  consent_at?: string;
  segment?: string;
  user_id?: string | null;
};

/** Bloque free_class opcional según contrato de f_orch_contact_write_v2. */
type OrchFreeClassBlock = {
  class_sku: string;
  instance_slug: string;
  status?: string;
  ts?: string;
};

/** Payload completo que se envía a f_orch_contact_write_v2. */
type OrchV2Input = {
  contact_core: OrchContactCore;
  free_class?: OrchFreeClassBlock;
};

/** Respuesta esperada desde f_orch_contact_write_v2 (resumen operativo). */
type OrchV2Response = {
  version?: string;
  status?: string;
  contact?: {
    id?: string;
    email?: string;
    brevo_contact_id?: string | null;
  } | null;
  free_class?: {
    processed?: boolean | null;
  } | null;
} | null;

/**
 * Helper principal:
 * - Mapea datos limpios de free class al contrato JSONB de f_orch_contact_write_v2.
 * - No escribe métricas, utm ni marketing; solo contacto y free_class.
 */
export async function createFreeClassLead(
  input: CreateFreeClassLeadInput,
): Promise<CreateFreeClassLeadResult> {
  const contactCore: OrchContactCore = {
    email: input.email,
  };

  if (input.fullName) {
    contactCore.full_name = input.fullName;
  }

  if (input.consent) {
    const nowIso = new Date().toISOString();
    contactCore.consent_status = "single_opt_in";
    contactCore.consent_source = "web_form";
    contactCore.consent_at = nowIso;
  }

  const payload: OrchV2Input = {
    contact_core: contactCore,
  };

  if (input.instanceSlug) {
    payload.free_class = {
      class_sku: input.sku,
      instance_slug: input.instanceSlug,
    };
  }
 
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase.rpc(
      "f_orch_contact_write_v2",
      { p_input: payload },
    );

    if (error) {
      return {
        ok: false,
        code: "db_error",
        message: error.message ?? "RPC error calling f_orch_contact_write_v2",
      };
    }

    const resp = data as OrchV2Response;

    if (!resp || resp.status !== "ok" || !resp.contact || !resp.contact.id) {
      return {
        ok: false,
        code: "invalid_response",
        message: "Invalid response from f_orch_contact_write_v2",
      };
    }

    return {
      ok: true,
      contactId: resp.contact.id,
      brevoContactId:
        typeof resp.contact.brevo_contact_id === "string"
          ? resp.contact.brevo_contact_id
          : null,
    };
  } catch (e: unknown) {
    let code: CreateFreeClassLeadErrorCode = "server_error";
    let message = "Unexpected server error";

    if (typeof e === "object" && e !== null) {
      const maybeError = e as { code?: unknown; message?: unknown };

      if (maybeError.code === "db_error" || maybeError.code === "server_error") {
        code = maybeError.code;
      }

      if (typeof maybeError.message === "string") {
        message = maybeError.message;
      }
    }

    return {
      ok: false,
      code,
      message,
    };
  }
}
