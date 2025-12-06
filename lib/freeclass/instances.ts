// lib/freeclass/instances.ts
// Loader de solo lectura para instancias de free class.
// - Lee public.live_class_instances desde Supabase (service role).
// - Mapea a LiveClassInstanceRow (contrato de dominio).
// - Aplica buildFreeClassOperationalState como única fuente de verdad.
// - Diseñado para uso en landing /clases-gratuitas/[slug] y otros consumidores.

import { getServiceClient } from "../supabase/server";
import {
  buildFreeClassOperationalState,
  type BuildFreeClassOperationalStateParams,
  type FreeClassOperationalStateDTO,
  type LiveClassInstanceRow,
} from "./registrationState";

/* -------------------------------------------------------------------------- */
/* Tipos internos                                                              */
/* -------------------------------------------------------------------------- */

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

/**
 * Parámetros de alto nivel para resolver el estado operativo desde DB.
 * - sku: identificador de la clase gratuita.
 * - forceInstanceSlug: reservado para Opción B futura (selección manual).
 * - now: permite fijar el tiempo de cálculo (tests / QA).
 * - fallbackTimezone: zona horaria por defecto si la instancia no la define.
 */
export interface LoadFreeClassOperationalStateParams {
  sku: string;
  forceInstanceSlug?: string | null;
  now?: BuildFreeClassOperationalStateParams["now"];
  fallbackTimezone?: BuildFreeClassOperationalStateParams["fallbackTimezone"];
}

/* -------------------------------------------------------------------------- */
/* Helper de acceso a DB                                                      */
/* -------------------------------------------------------------------------- */

/**
 * loadFreeClassOperationalStateFromDb
 * - Ejecuta el SELECT a live_class_instances.
 * - Mapea a LiveClassInstanceRow[].
 * - Delega la lógica de resolución a buildFreeClassOperationalState.
 *
 * No lanza en caso de error de IO: ante error devuelve DTO con:
 * - instances = [] → registrationState = "no_instance".
 */
export async function loadFreeClassOperationalStateFromDb(
  params: LoadFreeClassOperationalStateParams,
): Promise<FreeClassOperationalStateDTO> {
  const supabase = getServiceClient();

  // Base query: todas las instancias para el SKU, ordenadas por start_at ASC.
  let query = supabase
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
    .eq("sku", params.sku)
    .order("start_at", { ascending: true });

  // Opción B futura: selección manual de instancia por slug.
  if (params.forceInstanceSlug) {
    query = query.eq("instance_slug", params.forceInstanceSlug);
  }

  const { data, error } = await query;

  // En landing preferimos degradar a "no_instance" antes que romper la página.
  const rows = !error && data ? ((data ?? []) as unknown as RawLiveClassInstanceRow[]) : [];

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

  return buildFreeClassOperationalState({
    sku: params.sku,
    instances,
    now: params.now,
    fallbackTimezone: params.fallbackTimezone,
  });
}
