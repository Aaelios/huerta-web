// app/api/dev/test-freeclass/route.ts
// Ruta de prueba para clases gratuitas: construye fixtures en memoria,
// llama a buildFreeClassOperationalState y devuelve los DTO resultantes en JSON.
// Uso: GET /api/dev/test-freeclass para validar estados open/full/ended/canceled/no_instance.

import { NextResponse } from "next/server";
import {
  buildFreeClassOperationalState,
  type BuildFreeClassOperationalStateParams,
  type FreeClassOperationalStateDTO,
  type LiveClassInstanceRow,
} from "@/lib/freeclass/registrationState";

/* -------------------------------------------------------------------------- */
/* Helpers locales para fixtures                                              */
/* -------------------------------------------------------------------------- */

const TEST_SKU = "liveclass-lobra-rhd-fin-freeintro-v001";
const DEFAULT_TZ = "America/Mexico_City";

/**
 * Suma horas a un Date y devuelve ISO UTC.
 */
function addHoursToIso(date: Date, hours: number): string {
  const ms = hours * 60 * 60 * 1000;
  const d = new Date(date.getTime() + ms);
  return d.toISOString();
}

/**
 * Crea una instancia base con campos genéricos.
 * Los parámetros variables se pasan explícitamente en cada caso.
 */
function createInstanceBase(params: {
  id: string;
  sku: string;
  instanceSlug: string;
  status: string;
  startAtIso: string;
  endAtIso: string | null;
  timezone?: string;
  capacity: number | null;
  seatsSold: number;
  waitlistEnabled?: boolean;
}): LiveClassInstanceRow {
  return {
    id: params.id,
    sku: params.sku,
    instance_slug: params.instanceSlug,
    status: params.status,
    start_at: params.startAtIso,
    end_at: params.endAtIso,
    timezone: params.timezone ?? DEFAULT_TZ,
    capacity: params.capacity,
    seats_sold: params.seatsSold,
    metadata: {
      waitlistEnabled: params.waitlistEnabled,
    },
    created_at: params.startAtIso,
    updated_at: null,
    brevo_cohort_list_id: null,
  };
}

/**
 * Arma los escenarios de prueba para diferentes estados.
 * Se usa un now fijo relativo para tener resultados reproducibles.
 */
function buildFixtures(now: Date): {
  name: string;
  description: string;
  params: BuildFreeClassOperationalStateParams;
}[] {
  const nowIso = now.toISOString();

  // Caso 1: open futuro, con cupo disponible.
  const startOpenFuture = addHoursToIso(now, 48); // +48h
  const endOpenFuture = addHoursToIso(now, 50); // +50h
  const instancesOpenFuture: LiveClassInstanceRow[] = [
    createInstanceBase({
      id: "inst-open-future-1",
      sku: TEST_SKU,
      instanceSlug: "fin-freeintro-open-future",
      status: "open",
      startAtIso: startOpenFuture,
      endAtIso: endOpenFuture,
      capacity: 100,
      seatsSold: 10,
    }),
  ];

  // Caso 2: full sin waitlist (capacity lleno, waitlistEnabled = false).
  const startFullNoWaitlist = addHoursToIso(now, 24);
  const endFullNoWaitlist = addHoursToIso(now, 26);
  const instancesFullNoWaitlist: LiveClassInstanceRow[] = [
    createInstanceBase({
      id: "inst-full-nowait-1",
      sku: TEST_SKU,
      instanceSlug: "fin-freeintro-full-no-waitlist",
      status: "open",
      startAtIso: startFullNoWaitlist,
      endAtIso: endFullNoWaitlist,
      capacity: 10,
      seatsSold: 10,
      waitlistEnabled: false,
    }),
  ];

  // Caso 3: full con waitlist (capacity lleno, waitlistEnabled = true).
  const startFullWaitlist = addHoursToIso(now, 24);
  const endFullWaitlist = addHoursToIso(now, 26);
  const instancesFullWaitlist: LiveClassInstanceRow[] = [
    createInstanceBase({
      id: "inst-full-wait-1",
      sku: TEST_SKU,
      instanceSlug: "fin-freeintro-full-waitlist",
      status: "open",
      startAtIso: startFullWaitlist,
      endAtIso: endFullWaitlist,
      capacity: 20,
      seatsSold: 20,
      waitlistEnabled: true,
    }),
  ];

  // Caso 4: ended (instancia en el pasado, ya terminó).
  const startEnded = addHoursToIso(now, -48); // -48h
  const endEnded = addHoursToIso(now, -46); // -46h
  const instancesEnded: LiveClassInstanceRow[] = [
    createInstanceBase({
      id: "inst-ended-1",
      sku: TEST_SKU,
      instanceSlug: "fin-freeintro-ended",
      status: "open",
      startAtIso: startEnded,
      endAtIso: endEnded,
      capacity: 50,
      seatsSold: 30,
    }),
  ];

  // Caso 5: canceled única instancia.
  const startCanceled = addHoursToIso(now, 24);
  const endCanceled = addHoursToIso(now, 26);
  const instancesCanceled: LiveClassInstanceRow[] = [
    createInstanceBase({
      id: "inst-canceled-1",
      sku: TEST_SKU,
      instanceSlug: "fin-freeintro-canceled",
      status: "canceled",
      startAtIso: startCanceled,
      endAtIso: endCanceled,
      capacity: 50,
      seatsSold: 0,
    }),
  ];

  // Caso 6: no_instance (sin filas).
  const instancesNoInstance: LiveClassInstanceRow[] = [];

  return [
    {
      name: "open_future",
      description:
        "Instancia futura con status=open, capacidad disponible, debe dar registrationState='open'.",
      params: {
        sku: TEST_SKU,
        instances: instancesOpenFuture,
        now: nowIso,
        fallbackTimezone: DEFAULT_TZ,
      },
    },
    {
      name: "full_no_waitlist",
      description:
        "Instancia futura con status=open pero capacity==seats_sold y waitlistEnabled=false, debe dar 'full' y isWaitlistEnabled=false.",
      params: {
        sku: TEST_SKU,
        instances: instancesFullNoWaitlist,
        now: nowIso,
        fallbackTimezone: DEFAULT_TZ,
      },
    },
    {
      name: "full_waitlist",
      description:
        "Instancia futura con status=open pero capacity==seats_sold y waitlistEnabled=true, debe dar 'full' y isWaitlistEnabled=true.",
      params: {
        sku: TEST_SKU,
        instances: instancesFullWaitlist,
        now: nowIso,
        fallbackTimezone: DEFAULT_TZ,
      },
    },
    {
      name: "ended_past",
      description:
        "Instancia en el pasado, ventana terminada, debe dar registrationState='ended'.",
      params: {
        sku: TEST_SKU,
        instances: instancesEnded,
        now: nowIso,
        fallbackTimezone: DEFAULT_TZ,
      },
    },
    {
      name: "canceled_only",
      description:
        "Única instancia con status='canceled', debe seleccionar esa instancia y dar registrationState='canceled'.",
      params: {
        sku: TEST_SKU,
        instances: instancesCanceled,
        now: nowIso,
        fallbackTimezone: DEFAULT_TZ,
      },
    },
    {
      name: "no_instance_empty_array",
      description:
        "Sin filas para el SKU, debe dar registrationState='no_instance' y campos de instancia en null.",
      params: {
        sku: TEST_SKU,
        instances: instancesNoInstance,
        now: nowIso,
        fallbackTimezone: DEFAULT_TZ,
      },
    },
  ];
}

/* -------------------------------------------------------------------------- */
/* Handler principal                                                          */
/* -------------------------------------------------------------------------- */

export function GET(): NextResponse {
  // Usamos un now fijo relativo a la hora actual para este request.
  // Si necesitas pruebas 100% deterministas, puedes fijar un ISO concreto.
  const now = new Date();
  const fixtures = buildFixtures(now);

  const results: {
    name: string;
    description: string;
    input: {
      sku: string;
      instanceCount: number;
    };
    dto: FreeClassOperationalStateDTO;
  }[] = fixtures.map((fixture) => {
    const dto = buildFreeClassOperationalState(fixture.params);
    return {
      name: fixture.name,
      description: fixture.description,
      input: {
        sku: fixture.params.sku,
        instanceCount: fixture.params.instances.length,
      },
      dto,
    };
  });

  return NextResponse.json({
    ok: true,
    nowIso: now.toISOString(),
    sku: TEST_SKU,
    timezoneDefault: DEFAULT_TZ,
    cases: results,
  });
}
