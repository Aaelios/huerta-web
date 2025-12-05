````md
# Módulo de Estado Operacional para Free Class  
`lib/freeclass/registrationState.ts`

Este documento describe el diseño, responsabilidades y API pública del módulo encargado de calcular el **estado técnico de registro** para las clases gratuitas en LOBRÁ.

El módulo es 100% puro. No toca red, no toca Supabase, no toca UI.  
Solo procesa filas ya cargadas de `live_class_instances` y devuelve un DTO operativo.

---

## 1. Objetivo del Módulo

Resolver de forma consistente:

1. **2.A — Instancia aplicable**  
   Dado un arreglo de `live_class_instances` para un SKU, seleccionar la instancia relevante según reglas de negocio.

2. **2.B — `registration_state`**  
   Calcular un estado técnico estable usado por el backend y consumido por `/api/freeclass/register`.

3. **2.C — DTO Operativo**  
   Proveer un objeto final con datos mínimos pero suficientes para:
   - el endpoint `/api/freeclass/register`
   - la landing `/clases-gratuitas/[slug]`
   - pruebas automáticas o manuales

---

## 2. Estados Técnicos del Backend

El backend usa una **única lista congelada** de estados:

```ts
"open" 
"full"
"ended"
"canceled"
"upcoming"
"no_instance"
````

Correspondencias con arquitectura previa:

* `closed_past` → `ended`
* `closed_future` → `upcoming`
* `no_instance` → `no_instance`
* `error_config` lo resuelve el endpoint, **no** este módulo.

---

## 3. Entrada del Módulo

Tipo base de fila (proyección mínima de `public.live_class_instances`):

```ts
LiveClassInstanceRow {
  id: string
  sku: string
  instance_slug: string
  status: string  // open | scheduled | canceled | sold_out | otros
  start_at: string
  end_at: string | null
  timezone: string
  capacity: number | null
  seats_sold: number
  metadata: { waitlistEnabled?: boolean }
}
```

El módulo **no consulta Supabase**.
Recibe un arreglo ya cargado por el endpoint.

---

## 4. 2.A — Resolución de Instancia Aplicable

Reglas en orden de prioridad:

1. **Instancias `open`**

   * Que aún no han terminado (`end_at >= now`)
   * Priorizar:

     1. futuras (por start ascendente)
     2. en curso (por start ascendente)

2. **Instancias `scheduled`**

   * Futuras
   * Tomar la más próxima (start ascendente)

3. **Instancias pasadas (no canceladas)**

   * Tomar la más reciente (start descendente)

4. **Solo canceladas**

   * Tomar la más reciente (start descendente)

5. Sin filas → `null` → producirá `no_instance`

Se toleran instancias sin `end_at` → se asume duración de 2 horas.

---

## 5. 2.B — Cálculo de `registration_state`

Reglas:

1. Sin instancia → `"no_instance"`
2. `status="canceled"` → `"canceled"`
3. `status="sold_out"` o cupo lleno → `"full"`
4. Ventana temporal ya terminó → `"ended"`
5. `status="scheduled"` → `"upcoming"`
6. `status="open"` → `"open"` mientras `now <= end_at`
7. Estado desconocido → fallback según tiempo (`upcoming` / `open` / `ended`)

Cálculo de cupo:

```
isFull = 
  status === "sold_out" 
  OR 
  (capacity > 0 AND seats_sold >= capacity)
```

---

## 6. 2.C — DTO Operativo

Salida final:

```ts
FreeClassOperationalStateDTO {
  sku: string
  registrationState: RegistrationState
  instanceSlug: string | null
  startAt: string | null
  endAt: string | null
  timezone: string | null
  capacity: number | null
  seatsSold: number | null
  isFull: boolean
  isWaitlistEnabled: boolean
  nowIso: string
}
```

Este DTO es consumido por:

* `/api/freeclass/register`
* la landing
* herramientas de test

No contiene texto de UI ni copy.

---

## 7. API Pública del Módulo

```ts
resolveApplicableInstance(instances, now) 
→ LiveClassInstanceRow | null
```

```ts
computeRegistrationState(instance, now) 
→ RegistrationState
```

```ts
buildFreeClassOperationalState({
  sku,
  instances,
  now?,
  fallbackTimezone?,
}) 
→ FreeClassOperationalStateDTO
```

---

## 8. Ruta de Pruebas

Ruta propuesta:

```
GET /api/dev/test-freeclass
```

Devuelve un JSON con 6 escenarios:

1. `open_future`
2. `full_no_waitlist`
3. `full_waitlist`
4. `ended_past`
5. `canceled_only`
6. `no_instance_empty_array`

Cada caso incluye:

* las instancias de prueba
* el DTO final
* el `registrationState` esperado

---

## 9. Checklist de QA

1. El módulo compila sin warnings, sin `any`, ESLint estricto (Next 15.5).
2. Las 6 pruebas devuelven los estados correctos.
3. `isWaitlistEnabled` se respeta exactamente desde `metadata.waitlistEnabled`.
4. `no_instance` ocurre solo con arreglo vacío o sin instancia aplicable.
5. El módulo no toca UI, no toca Supabase, no toca FreeClassPage.

---

## 10. Integración con el siguiente Chat Hijo (API)

Este módulo ya está listo para usarse en:

```
/api/freeclass/register
```

Ese endpoint usará:

* `buildFreeClassOperationalState`
* reglas de negocio (registered, waitlist, rejected)
* Brevo
* f_orch_contact_write_v1
* FreeClassPage para copy

Este módulo **no** hace nada de eso.
Solo calcula estado técnico.

---

Fin del documento.

```
```
