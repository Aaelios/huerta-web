// lib/freeclass/handleRegistration.ts
// Bloque 3.B v2 — Orquestación de /api/freeclass/register.
// Responsabilidad v2:
// - Resuelve FreeClassPage
// - Carga instancias desde Supabase
// - Determina instancia aplicable + registrationState
// - Calcula result + ui_state + leadTracking + timings
// - Nunca escribe contacto ni llama Brevo (eso pasa en la route 2.C)

import type {
  RegistrationState,
  LiveClassInstanceRow,
} from "./registrationState";
import {
  resolveApplicableInstance,
  computeRegistrationState,
} from "./registrationState";
import { loadFreeClassPageBySku } from "./load";
import type { FreeClassValidatedInput } from "./validateRegisterPayload";
import { getServiceClient } from "../supabase/server";

/* -------------------------------------------------------------------------- */
/* Tipos internos                                                              */
/* -------------------------------------------------------------------------- */

export type RegistrationStateWithClosed = RegistrationState | "closed";

type UiState = "open" | "waitlist" | "closed";

type RegistrationResult = "registered" | "waitlist" | "rejected_closed";

export type RegistrationOrchestrationResult = {
  /**
   * Campo legacy: en v2 el contactId real lo provee createFreeClassLead en la route.
   * Se mantiene por compatibilidad de tipos; aquí siempre será cadena vacía.
   */
  contactId: string;
  registrationState: RegistrationStateWithClosed;
  result: RegistrationResult;
  instanceSlug: string | null;
  sku: string;
  ui_state: UiState;
  brevoCohortListId: number | null;
  leadTracking: {
    class_sku: string;
    instance_slug: string | null;
    utm: Record<string, unknown> | null;
  };
  timings: Record<string, number | undefined>;
};

export type FreeClassRegistrationInput = FreeClassValidatedInput & {
  timings?: {
    parse?: number;
    zod?: number;
    ts?: number;
  };
};

/**
 * Fila cruda en Supabase para live_class_instances.
 * Se mapea a LiveClassInstanceRow antes de usar lógica de dominio.
 */
type RawLiveClassInstanceRow = {
  id: string;
  sku: string;
  instance_slug: string;
  status: string;
  start_at: string;
  end_at: string | null;
  timezone: string;
  capacity: number | null;
  seats_sold: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string | null;
  brevo_cohort_list_id: number | null;
};

/* -------------------------------------------------------------------------- */
/* Helpers puros                                                               */
/* -------------------------------------------------------------------------- */

function initTimings(
  inputTimings?: FreeClassRegistrationInput["timings"],
): Record<string, number | undefined> {
  return {
    parse: inputTimings?.parse,
    zod: inputTimings?.zod,
    ts: inputTimings?.ts,
  };
}

function setTiming(
  timings: Record<string, number | undefined>,
  key: string,
  start: number,
): void {
  timings[key] = Date.now() - start;
}

function mapWaitlistEnabled(instance: LiveClassInstanceRow | null): boolean {
  if (!instance) return false;
  const meta = instance.metadata ?? {};
  const raw = (meta as { waitlistEnabled?: unknown }).waitlistEnabled;
  return raw === true;
}

function resolveOutcome(
  registrationState: RegistrationStateWithClosed,
  waitlistEnabled: boolean,
): {
  result: RegistrationResult;
  uiState: UiState;
} {
  if (registrationState === "open") {
    return {
      result: "registered",
      uiState: "open",
    };
  }

  if (registrationState === "full" && waitlistEnabled) {
    return {
      result: "waitlist",
      uiState: "waitlist",
    };
  }

  // Todo lo demás se trata como cerrado
  return {
    result: "rejected_closed",
    uiState: "closed",
  };
}

/* -------------------------------------------------------------------------- */
/* Capa de orquestación principal                                             */
/* -------------------------------------------------------------------------- */

export async function handleRegistration(
  input: FreeClassRegistrationInput,
): Promise<RegistrationOrchestrationResult> {
  const timings = initTimings(input.timings);

  // Defaults defensivos: si algo falla, devolvemos "rejected_closed"
  let registrationState: RegistrationStateWithClosed = "no_instance";
  let uiState: UiState = "closed";
  let result: RegistrationResult = "rejected_closed";
  let instanceSlug: string | null = input.instanceSlug ?? null;
  let brevoCohortListId: number | null = null;
  // Legacy: en v2 el contacto real se crea en la route; aquí se mantiene vacío.
  const contactId = "";
  let waitlistEnabled = false;

  const supabase = getServiceClient();

  try {
    /* --------------------------------- 3.1 Page --------------------------------- */
    const tPage = Date.now();
    const page = await loadFreeClassPageBySku(input.sku);
    setTiming(timings, "load_page", tPage);

    if (page) {
      /* ---------------------------- 3.2 Instancias DB --------------------------- */
      const tInstances = Date.now();
      const { data, error } = await supabase
        .from("live_class_instances")
        .select(
          [
            "id",
            "sku",
            "instance_slug",
            "status",
            "start_at",
            "end_at",
            "timezone",
            "capacity",
            "seats_sold",
            "metadata",
            "created_at",
            "updated_at",
            "brevo_cohort_list_id",
          ].join(","),
        )
        .eq("sku", input.sku)
        .order("start_at", { ascending: true });
      setTiming(timings, "load_instances", tInstances);

      if (!error && data) {
        const rows = (data ?? []) as unknown as RawLiveClassInstanceRow[];

        const instances: LiveClassInstanceRow[] = rows.map(
          (row: RawLiveClassInstanceRow) => ({
            id: row.id,
            sku: row.sku,
            instance_slug: row.instance_slug,
            status: row.status,
            start_at: row.start_at,
            end_at: row.end_at,
            timezone: row.timezone,
            capacity: row.capacity,
            seats_sold: row.seats_sold,
            metadata: (row.metadata ?? {}) as {
              waitlistEnabled?: boolean;
              [key: string]: unknown;
            },
            created_at: row.created_at,
            updated_at: row.updated_at,
            brevo_cohort_list_id: row.brevo_cohort_list_id,
          }),
        );

        const now = new Date();

        // 3.3 Instancia aplicable + registrationState
        const applicableInstance = resolveApplicableInstance(instances, now);
        waitlistEnabled = mapWaitlistEnabled(applicableInstance);

        if (applicableInstance) {
          instanceSlug = applicableInstance.instance_slug;
          brevoCohortListId = applicableInstance.brevo_cohort_list_id ?? null;
        }

        const computedState = computeRegistrationState(applicableInstance, now);
        registrationState = computedState;

        const outcome = resolveOutcome(registrationState, waitlistEnabled);
        result = outcome.result;
        uiState = outcome.uiState;
      } else {
        // Error de IO en instancias → tratamos como cerrado
        registrationState = "closed";
        const outcome = resolveOutcome(registrationState, false);
        result = outcome.result;
        uiState = outcome.uiState;
      }
    } else {
      // SKU sin FreeClassPage configurada → cerrado
      registrationState = "closed";
      const outcome = resolveOutcome(registrationState, false);
      result = outcome.result;
      uiState = outcome.uiState;
    }
  } catch {
    // 3.B nunca revienta: ante cualquier error, respondemos como cerrado.
    registrationState = "closed";
    result = "rejected_closed";
    uiState = "closed";
  }

  const leadUtm: Record<string, unknown> | null = input.utm?.raw ?? null;

  return {
    contactId,
    registrationState,
    result,
    instanceSlug,
    sku: input.sku,
    ui_state: uiState,
    brevoCohortListId,
    leadTracking: {
      class_sku: input.sku,
      instance_slug: instanceSlug,
      utm: leadUtm,
    },
    timings,
  };
}
