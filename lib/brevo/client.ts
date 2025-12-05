// lib/brevo/client.ts
// Cliente HTTP para Brevo.
// - Implementa upsert robusto: buscar → crear o actualizar.
// - Asigna listas (master + cohorte) sin borrar las existentes.
// - Devuelve errores normalizados para el helper de sincronización.

import {
  BrevoMarketingEvent,
  SyncFreeClassLeadWithBrevoResult,
  BrevoHelperErrorCode,
} from "./types";
import { getBrevoConfig } from "./config";
import { mapBrevoErrorToCode, isInvalidEmailError } from "./errors";

/* -------------------------------------------------------
 * Utilidad interna para requests HTTP tipadas
 * ----------------------------------------------------- */

async function brevoRequest<T>(
  path: string,
  options: RequestInit,
): Promise<{ data: T | null; status: number | null; error: unknown | null }> {
  try {
    const res = await fetch(path, options);
    const status = res.status;

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as T | null;
      return {
        data: body,
        status,
        error: body,
      };
    }

    let json: T | null = null;
    try {
      json = (await res.json()) as T;
    } catch {
      // 2xx sin cuerpo (ej. 204 No Content) → se considera éxito sin error.
      json = null;
    }

    return { data: json, status, error: null };
  } catch (err) {
    return { data: null, status: null, error: err };
  }
}


/* -------------------------------------------------------
 * Buscar contacto por email en Brevo
 * ----------------------------------------------------- */

type BrevoGetContactResponse = {
  id: number;
  email: string;
  attributes?: Record<string, unknown>;
  emailBlacklisted?: boolean;
  smsBlacklisted?: boolean;
  listIds?: number[];
  unlinkListIds?: number[];
  smtpBlacklistSender?: string[];
} | null;

async function findContactByEmail(
  email: string,
  apiKey: string,
  endpoint: string,
): Promise<{ id: number | null; error: BrevoHelperErrorCode | null }> {
  const url = `${endpoint}/contacts/${encodeURIComponent(email)}`;

  const { data, status, error } = await brevoRequest<BrevoGetContactResponse>(
    url,
    {
      method: "GET",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    },
  );

  if (status === 404) {
    return { id: null, error: null };
  }

  if (error) {
    const code = mapBrevoErrorToCode(error, status);
    return { id: null, error: code };
  }

  return {
    id: data && typeof data.id === "number" ? data.id : null,
    error: null,
  };
}

/* -------------------------------------------------------
 * Crear contacto en Brevo
 * ----------------------------------------------------- */

type BrevoCreateContactResponse = {
  id: number;
} | null;

async function createContact(
  evt: BrevoMarketingEvent,
  apiKey: string,
  endpoint: string,
  listIds: number[],
): Promise<{ id: number | null; error: BrevoHelperErrorCode | null }> {
  const url = `${endpoint}/contacts`;

  const body: {
    email: string;
    attributes: Record<string, unknown>;
    updateEnabled: boolean;
    listIds?: number[];
  } = {
    email: evt.email,
    attributes: evt.fullName ? { FIRSTNAME: evt.fullName } : {},
    updateEnabled: false,
  };

  if (listIds.length > 0) {
    body.listIds = listIds;
  }

  const { data, status, error } = await brevoRequest<BrevoCreateContactResponse>(
    url,
    {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    },
  );

  if (error) {
    const brevoCode =
      typeof (error as { code?: string }).code === "string"
        ? (error as { code: string }).code
        : null;

    if (isInvalidEmailError(status, brevoCode)) {
      return { id: null, error: "invalid_email" };
    }

    return { id: null, error: mapBrevoErrorToCode(error, status) };
  }

  if (!data || typeof data.id !== "number") {
    return { id: null, error: "api_4xx" };
  }

  return { id: data.id, error: null };
}

/* -------------------------------------------------------
 * Actualizar contacto existente (atributos)
 * ----------------------------------------------------- */

type BrevoUpdateResponse = Record<string, unknown> | null;

async function updateContact(
  brevoId: number,
  evt: BrevoMarketingEvent,
  apiKey: string,
  endpoint: string,
): Promise<{ ok: boolean; error: BrevoHelperErrorCode | null }> {
  const url = `${endpoint}/contacts/${brevoId}`;

  const body = {
    attributes: evt.fullName ? { FIRSTNAME: evt.fullName } : {},
  };

  const { error, status } = await brevoRequest<BrevoUpdateResponse>(url, {
    method: "PUT",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (error) {
    const code = mapBrevoErrorToCode(error, status);
    return { ok: false, error: code };
  }

  return { ok: true, error: null };
}

/* -------------------------------------------------------
 * Asignar contacto a listas (incremental)
 * ----------------------------------------------------- */

type BrevoListAddResponse = Record<string, unknown> | null;

async function addContactToLists(
  brevoId: number,
  listIds: number[],
  apiKey: string,
  endpoint: string,
): Promise<{ ok: boolean; error: BrevoHelperErrorCode | null }> {
  for (const listId of listIds) {
    const url = `${endpoint}/contacts/lists/${listId}/contacts/add`;

    const body = {
      ids: [brevoId],
    };

    const { error, status } = await brevoRequest<BrevoListAddResponse>(url, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    // Idempotent success: Brevo devuelve 400 cuando el contacto ya está en la lista.
    // Operativamente es éxito (no hay nada más que agregar).
    if (status === 400 && error && typeof error === "object") {
      const payload = error as { code?: string; message?: string };
      if (
        payload.code === "invalid_parameter" &&
        typeof payload.message === "string" &&
        payload.message.includes("Contact already in list")
      ) {
        continue;
      }
    }

    if (error) {
      const code = mapBrevoErrorToCode(error, status);
      return { ok: false, error: code };
    }
  }

  return { ok: true, error: null };
}

/* -------------------------------------------------------
 * Cliente principal: upsert + listas
 * ----------------------------------------------------- */

export async function sendBrevoMarketingEvent(
  evt: BrevoMarketingEvent,
): Promise<SyncFreeClassLeadWithBrevoResult> {
  const { apiKey, endpoint, masterListId } = getBrevoConfig();

  const listIds: number[] = [];
  if (masterListId !== null && Number.isFinite(masterListId)) {
    listIds.push(masterListId);
  }
  if (evt.cohortListId !== null && Number.isFinite(evt.cohortListId)) {
    listIds.push(evt.cohortListId);
  }

  // 1) Si ya tenemos brevoId desde Supabase → actualizar directo
  if (evt.currentBrevoId && !Number.isNaN(Number(evt.currentBrevoId))) {
    const brevoId = Number(evt.currentBrevoId);

    const updateRes = await updateContact(brevoId, evt, apiKey, endpoint);
    if (!updateRes.ok) {
      return {
        ok: false,
        brevoContactId: evt.currentBrevoId,
        errorCode: updateRes.error!,
      };
    }

    if (listIds.length > 0) {
      const listRes = await addContactToLists(
        brevoId,
        listIds,
        apiKey,
        endpoint,
      );
      if (!listRes.ok) {
        return {
          ok: false,
          brevoContactId: evt.currentBrevoId,
          errorCode: listRes.error!,
        };
      }
    }

    return {
      ok: true,
      brevoContactId: String(brevoId),
      errorCode: null,
    };
  }

  // 2) Si no hay brevoId → buscar por email
  const lookup = await findContactByEmail(evt.email, apiKey, endpoint);
  if (lookup.error) {
    return {
      ok: false,
      brevoContactId: null,
      errorCode: lookup.error,
    };
  }

  let brevoId = lookup.id;

  // 3) Si no existe → crear contacto
  if (!brevoId) {
    const createRes = await createContact(evt, apiKey, endpoint, listIds);
    if (createRes.error || !createRes.id) {
      return {
        ok: false,
        brevoContactId: null,
        errorCode: createRes.error ?? "api_4xx",
      };
    }
    brevoId = createRes.id;
  }

  if (!brevoId) {
    return {
      ok: false,
      brevoContactId: null,
      errorCode: "api_4xx",
    };
  }

  // 4) Actualizar atributos (FIRSTNAME)
  const updateRes = await updateContact(brevoId, evt, apiKey, endpoint);
  if (!updateRes.ok) {
    return {
      ok: false,
      brevoContactId: String(brevoId),
      errorCode: updateRes.error!,
    };
  }

  // 5) Asignar listas incrementales (master + cohorte)
  if (listIds.length > 0) {
    const listRes = await addContactToLists(brevoId, listIds, apiKey, endpoint);
    if (!listRes.ok) {
      return {
        ok: false,
        brevoContactId: String(brevoId),
        errorCode: listRes.error!,
      };
    }
  }

  // 6) Éxito
  return {
    ok: true,
    brevoContactId: String(brevoId),
    errorCode: null,
  };
}
