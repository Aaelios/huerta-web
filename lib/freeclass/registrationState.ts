// lib/freeclass/registrationState.ts
// Módulo de dominio para clases gratuitas: resuelve la instancia aplicable,
// calcula el registrationState técnico y construye un DTO operativo consumible
// por /api/freeclass/register y la landing /clases-gratuitas/[slug].
// No toca red ni DB, no usa FreeClassPage, solo lógica pura sobre instancias.

/* -------------------------------------------------------------------------- */
/* Tipos públicos                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Estados técnicos de registro expuestos por backend.
 * La UI decidirá textos y comportamiento final usando este estado + flags.
 */
export type RegistrationState =
  | "open"
  | "full"
  | "ended"
  | "canceled"
  | "upcoming"
  | "no_instance";

/**
 * Proyección mínima de una fila de public.live_class_instances.
 * Si en el futuro se usa Database[...] se puede mapear o pickear a este contrato.
 */
export interface LiveClassInstanceRow {
  id: string;
  sku: string;
  instance_slug: string;
  status: string; // "open" | "scheduled" | "canceled" | "sold_out" | otros futuros
  start_at: string; // ISO UTC
  end_at: string | null; // ISO UTC o null
  timezone: string;
  capacity: number | null;
  seats_sold: number;
  metadata: {
    waitlistEnabled?: boolean;
    [key: string]: unknown;
  };
  created_at: string;
  updated_at: string | null;
  brevo_cohort_list_id: number | null; // ID de lista de cohorte en Brevo
}

/**
 * DTO operativo que el endpoint puede devolver al frontend.
 * No incluye textos ni mensajes de UI, solo datos técnicos.
 */
export interface FreeClassOperationalStateDTO {
  sku: string;
  registrationState: RegistrationState;
  instanceSlug: string | null;
  startAt: string | null; // ISO UTC
  endAt: string | null; // ISO UTC
  timezone: string | null;
  capacity: number | null;
  seatsSold: number | null;
  isFull: boolean;
  isWaitlistEnabled: boolean;
  brevoCohortListId: number | null;
  nowIso: string; // ISO UTC del momento de cálculo (debug/QA)
}

/**
 * Parámetros de alto nivel para construir el DTO.
 * El endpoint orquesta IO, este módulo solo calcula en memoria.
 */
export interface BuildFreeClassOperationalStateParams {
  sku: string;
  instances: LiveClassInstanceRow[];
  now?: Date | string;
  fallbackTimezone?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers internos de tiempo y cupo                                          */
/* -------------------------------------------------------------------------- */

interface InstanceWithDates {
  instance: LiveClassInstanceRow;
  start: Date;
  end: Date;
}

/**
 * Normaliza el "now" de entrada a Date en UTC.
 * Si el valor es inválido, usa new Date() como fallback.
 */
function normalizeNow(input?: Date | string): Date {
  if (input instanceof Date) {
    if (!Number.isNaN(input.getTime())) {
      return input;
    }
    return new Date();
  }

  if (typeof input === "string") {
    const parsed = new Date(input);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
    return new Date();
  }

  return new Date();
}

/**
 * Intenta parsear un string ISO a Date.
 * Devuelve null si el valor es nulo o inválido.
 */
function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Si end es nulo o inválido, asume una duración por defecto (2 horas).
 * Esto evita que una instancia sin end_at rompa la lógica de ventana.
 */
function ensureEndDate(start: Date, end: Date | null): Date {
  if (end && !Number.isNaN(end.getTime())) {
    return end;
  }
  const twoHoursMs = 2 * 60 * 60 * 1000;
  return new Date(start.getTime() + twoHoursMs);
}

/**
 * Convierte un Date a ISO UTC. Devuelve null si el Date es nulo.
 */
function toIsoUtc(date: Date | null): string | null {
  if (!date) return null;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/**
 * Calcula si una instancia está llena por cupo.
 * - status "sold_out" fuerza lleno aunque capacity sea null.
 * - capacity <= 0 se interpreta como "sin límite", por lo que no se llena.
 */
function computeIsFull(instance: LiveClassInstanceRow): boolean {
  if (instance.status === "sold_out") {
    return true;
  }

  if (instance.capacity === null || instance.capacity <= 0) {
    return false;
  }

  return instance.seats_sold >= instance.capacity;
}

/**
 * Extrae el flag de waitlist desde metadata.
 * No crea reglas de negocio, solo lee el valor booleano.
 */
function getWaitlistEnabled(instance: LiveClassInstanceRow | null): boolean {
  if (!instance) return false;
  return instance.metadata.waitlistEnabled === true;
}

/**
 * Mapea una lista de instancias a estructura con fechas ya parseadas.
 */
function mapWithDates(rows: LiveClassInstanceRow[]): InstanceWithDates[] {
  return rows.map((row) => {
    const startParsed = parseDate(row.start_at) ?? new Date(0);
    const endParsed = ensureEndDate(startParsed, parseDate(row.end_at));
    return {
      instance: row,
      start: startParsed,
      end: endParsed,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* 2.A Resolución de instancia aplicable                                      */
/* -------------------------------------------------------------------------- */

/**
 * resolveApplicableInstance
 * Decide qué instancia de live_class_instances es la relevante para el estado.
 *
 * Prioridad:
 * 1) Instancias "open" futuras u ocurriendo ahora (por start_at más cercano).
 * 2) Si no hay "open", instancias "scheduled" futuras (próxima por start_at).
 * 3) Si no hay futuras, última instancia pasada (no cancelada).
 * 4) Si solo hay canceladas, se toma la última cancelada.
 * 5) Si no hay filas, null (no_instance).
 */
export function resolveApplicableInstance(
  instances: LiveClassInstanceRow[],
  now: Date,
): LiveClassInstanceRow | null {
  if (instances.length === 0) {
    return null;
  }

  const nowTime = now.getTime();
  const nonCanceled = instances.filter(
    (row) => row.status !== "canceled",
  );
  const canceled = instances.filter((row) => row.status === "canceled");

  const nonCanceledWithDates = mapWithDates(nonCanceled);
  const canceledWithDates = mapWithDates(canceled);

  const sortByStartAsc = (a: InstanceWithDates, b: InstanceWithDates): number =>
    a.start.getTime() - b.start.getTime();

  const sortByStartDesc = (
    a: InstanceWithDates,
    b: InstanceWithDates,
  ): number => b.start.getTime() - a.start.getTime();

  // 1) Instancias "open" con ventana vigente (hasta end_at)
  const openCandidates = nonCanceledWithDates.filter(
    (item) =>
      item.instance.status === "open" &&
      item.end.getTime() >= nowTime,
  );

  if (openCandidates.length > 0) {
    const futureOpen = openCandidates.filter(
      (item) => item.start.getTime() >= nowTime,
    );
    const ongoingOpen = openCandidates.filter(
      (item) =>
        item.start.getTime() < nowTime &&
        item.end.getTime() >= nowTime,
    );

    if (futureOpen.length > 0) {
      futureOpen.sort(sortByStartAsc);
      return futureOpen[0].instance;
    }

    if (ongoingOpen.length > 0) {
      ongoingOpen.sort(sortByStartAsc);
      return ongoingOpen[0].instance;
    }
  }

  // 2) Instancias "scheduled" futuras
  const scheduledCandidates = nonCanceledWithDates.filter(
    (item) =>
      item.instance.status === "scheduled" &&
      item.start.getTime() >= nowTime,
  );

  if (scheduledCandidates.length > 0) {
    scheduledCandidates.sort(sortByStartAsc);
    return scheduledCandidates[0].instance;
  }

  // 3) Última instancia pasada (no cancelada)
  const pastNonCanceled = nonCanceledWithDates.filter(
    (item) => item.end.getTime() < nowTime,
  );

  if (pastNonCanceled.length > 0) {
    pastNonCanceled.sort(sortByStartDesc);
    return pastNonCanceled[0].instance;
  }

  // 4) Solo canceladas: tomar la última por fecha de inicio
  if (nonCanceled.length === 0 && canceledWithDates.length > 0) {
    canceledWithDates.sort(sortByStartDesc);
    return canceledWithDates[0].instance;
  }

  // 5) Fallback absoluto: sin contexto usable
  return null;
}

/* -------------------------------------------------------------------------- */
/* 2.B Cálculo de registration_state                                          */
/* -------------------------------------------------------------------------- */

/**
 * computeRegistrationState
 * Mapea instancia + tiempo actual a uno de los estados RegistrationState.
 *
 * - "no_instance" si no hay instancia aplicable.
 * - "canceled" si la instancia está cancelada.
 * - "full" si está sold_out o sin cupo.
 * - "ended" si la ventana temporal ya pasó.
 * - "upcoming" si está programada y aún no sucede.
 * - "open" si está vigente con cupo.
 */
export function computeRegistrationState(
  instance: LiveClassInstanceRow | null,
  now: Date,
): RegistrationState {
  if (!instance) {
    return "no_instance";
  }

  const nowTime = now.getTime();
  const startParsed = parseDate(instance.start_at) ?? new Date(0);
  const endParsed = ensureEndDate(startParsed, parseDate(instance.end_at));

  if (instance.status === "canceled") {
    return "canceled";
  }

  const isFull = computeIsFull(instance);
  if (instance.status === "sold_out" || isFull) {
    return "full";
  }

  if (endParsed.getTime() < nowTime) {
    return "ended";
  }

  if (instance.status === "scheduled") {
    return "upcoming";
  }

  if (instance.status === "open") {
    if (nowTime <= endParsed.getTime()) {
      return "open";
    }
    return "ended";
  }

  // Estados desconocidos: fallback por ventana temporal
  const startTime = startParsed.getTime();
  const endTime = endParsed.getTime();

  if (startTime > nowTime) {
    return "upcoming";
  }

  if (endTime < nowTime) {
    return "ended";
  }

  return "open";
}

/* -------------------------------------------------------------------------- */
/* 2.C Builder de DTO operativo                                               */
/* -------------------------------------------------------------------------- */

/**
 * buildFreeClassOperationalState
 * Función de alto nivel: recibe SKU + instancias y devuelve el DTO operativo.
 *
 * Responsabilidades:
 * - Normalizar "now".
 * - Resolver instancia aplicable.
 * - Calcular registrationState.
 * - Empaquetar datos mínimos para frontend/endpoint.
 */
export function buildFreeClassOperationalState(
  params: BuildFreeClassOperationalStateParams,
): FreeClassOperationalStateDTO {
  const nowDate = normalizeNow(params.now);
  const applicableInstance = resolveApplicableInstance(
    params.instances,
    nowDate,
  );
  const registrationState = computeRegistrationState(
    applicableInstance,
    nowDate,
  );

  const startDate =
    applicableInstance !== null
      ? parseDate(applicableInstance.start_at)
      : null;
  const endDate =
    applicableInstance !== null && startDate !== null
      ? ensureEndDate(startDate, parseDate(applicableInstance.end_at))
      : null;

  const startAtIso = toIsoUtc(startDate);
  const endAtIso = toIsoUtc(endDate);

  const timezone =
    applicableInstance?.timezone ??
    params.fallbackTimezone ??
    "America/Mexico_City";

  const capacity =
    applicableInstance !== null ? applicableInstance.capacity : null;

  const seatsSold =
    applicableInstance !== null ? applicableInstance.seats_sold : null;

  const isFull =
    applicableInstance !== null ? computeIsFull(applicableInstance) : false;

  const isWaitlistEnabled = getWaitlistEnabled(applicableInstance);

  const brevoCohortListId =
    applicableInstance !== null
      ? applicableInstance.brevo_cohort_list_id
      : null;

  return {
    sku: params.sku,
    registrationState,
    instanceSlug: applicableInstance?.instance_slug ?? null,
    startAt: startAtIso,
    endAt: endAtIso,
    timezone,
    capacity,
    seatsSold,
    isFull,
    isWaitlistEnabled,
    brevoCohortListId,
    nowIso: nowDate.toISOString(),
  };
}
