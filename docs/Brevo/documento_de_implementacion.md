````md
# Implementación · Integración Brevo ↔ LOBRÁ  
Versión: 1.1  
Fecha: 05 dic 2025  

Contexto clave:
- Arquitectura maestra aprobada el 28-nov-2025.
- Tabla `contacts` estaba vacía al inicio, lo que simplificó migraciones (sin backfill inicial).
- RPC legacy de forms existe pero se usa muy poco; se mantiene como legacy.
- Durante la implementación se descubrió que **la API de Brevo NO soporta tags vía HTTP** como se había asumido.  
  La integración externa se corrigió para trabajar **por listas (lists)**, y los `tags` quedaron como concepto **interno de Supabase**, no como objeto API en Brevo.

---

## 0. Propósito del documento

Definir cómo se implementa la integración Brevo ↔ LOBRÁ a nivel alto:

- Supabase (schema, RPCs, vistas).
- Next.js (API routes, helpers, flujos).
- Brevo (listas, journeys, entornos).
- Sincronización y logging.
- Plan por fases (F1, F2, F3) alineado a fechas: 9-dic, 16-dic, 27-dic, 13-ene.

Sin código, solo responsabilidades y orden.

---

## 1. Supabase · Modelo y RPCs

### 1.1 Estado base de `contacts`

Situación actual:
- Tabla `contacts` en uso solo por la nueva arquitectura.
- Campos relevantes:
  - `email`, `full_name`
  - `status`
  - `consent_status`, `consent_source`, `consent_at`
  - `segment`
  - `utm`, `tech_metrics`
  - `metadata` (JSONB) con:
    - `freeclass`
    - `free_class_last_attempt`
    - `free_class_registrations[]`

Decisión clave:
- `contacts` sigue siendo la **única fuente de verdad** de contacto y marketing.

### 1.2 Extensiones de schema (Brevo + marketing)

Cambios requeridos:

1) Columna nueva en `contacts`:
- `brevo_contact_id text`  
  - Identificador del contacto en Brevo.
  - Nullable (leads pueden no estar aún sincronizados).

2) Rama `marketing` en `metadata` (uso interno LOBRÁ):

- `metadata.marketing.tags[]`  
  - Lista de tags lógicos internos para segmentación/analytics en Supabase.  
  - Ejemplo: `"lead_freeclass_fin_freeintro"`, `"lead_freeclass_fin_freeintro_2025-12-16-1900"`.
  - **No se sincronizan como tags a Brevo.**

- `metadata.marketing.brevo`:
  - `last_status`:
    - `NULL` = nunca sincronizado (implícito “never_synced”).
    - `"synced_ok"`
    - `"sync_error"`
  - `last_sync_at`:
    - timestamp del último intento de sync (éxito o error según la implementación de RPC).
  - `last_error_code?`:
    - código corto cuando `last_status = "sync_error"`, ej. `"api_4xx"`, `"network_error"`, `"invalid_email"`.

Se mantiene intacta la rama actual de free class:

- `metadata.freeclass`
- `metadata.free_class_last_attempt`
- `metadata.free_class_registrations[]`

### 1.3 Extensión de schema · `live_class_instances`

Para vincular cohorts con listas de Brevo se añadió:

- `brevo_cohort_list_id integer` en `public.live_class_instances`:

  - Contiene el **ID de la lista de Brevo** asociada a esa instancia de clase gratuita.
  - Esta columna se usa desde Next.js para construir `listIds` al llamar a la API de Brevo, junto con una lista maestra global.

Convención operativa:

- Lista global: `BREVO_MASTER_LIST_ID` (variable de entorno).
- Lista de cohorte: `live_class_instances.brevo_cohort_list_id`.

---

### 1.4 RPCs

#### 1.4.1 Orquestadora de contacto v2

`f_orch_contact_write_v2`:

- Upsert de contacto (`contacts`):
  - `email`, `full_name`
  - `status`
  - consentimiento (`consent_status`, `consent_source`, `consent_at`)
  - `segment`
  - `user_id` (NULL para leads, obligatorio para buyers en F2).

- Manejo de free class:
  - Reutiliza la lógica actual de `f_contacts_free_class_upsert_v1` para:
    - `metadata.freeclass`
    - `metadata.free_class_last_attempt`
    - `metadata.free_class_registrations[]`.

- Entrada conceptual:
  - Bloque `contact_core` (obligatorio).
  - Bloque `free_class` (opcional, solo F1).
  - Bloque de compra (opcional, para F2).

- Salida conceptual:
  - `contact_id`
  - Estado lógico del intento de registro (en implementación real se simplificó a un JSON con `status = 'ok'` + `id`).
  - `brevo_contact_id` actual si ya existía en `contacts`.

`f_orch_contact_write_v1` se mantiene como legacy (ej. forms), sin tocar.

#### 1.4.2 RPC de marketing

`f_contacts_marketing_update_v1`:

- Dado un `contact_id`:
  - Actualiza `brevo_contact_id` si llega uno nuevo desde Brevo.
  - Actualiza `metadata.marketing.tags[]` con el **conjunto final** deseado (unión de existentes + nuevos, sin duplicados).
  - Actualiza `metadata.marketing.brevo`:
    - `last_status = 'synced_ok'` o `'sync_error'`.
    - `last_sync_at = now()`.
    - `last_error_code` solo si llega un error.
  - Si `error_code = 'invalid_email'`:
    - Ajusta `contacts.status = 'bounced'`.

Entrada conceptual:

- `contact_id`
- `tags` internos (ej. `["lead_freeclass_fin_freeintro", "lead_freeclass_fin_freeintro_2025-12-16-1900"]`)
- Resultado Brevo:
  - `ok`
  - `brevo_contact_id?`
  - `error_code?` (normalizado).

Ningún campo de este RPC tiene conocimiento de listas de Brevo.  
Las listas son responsabilidad de la capa Node (cliente Brevo).

#### 1.4.3 Vistas recomendadas (QA / operación)

Vistas lógicas en `public`:

- `vista_sync_brevo`:
  - email, status, brevo_contact_id, last_status, last_sync_at, last_error_code.

- `vista_freeclass_cohortes`:
  - email, sku, instance_slug, fecha/estado de registro.

- `vista_sync_error`:
  - contactos con `marketing.brevo.last_status = 'sync_error'`.

- `vista_never_synced`:
  - contactos sin `marketing.brevo.last_status`.

- `vista_bounced`:
  - contactos con `status = 'bounced'`.

---

## 2. Next.js · API y helpers

### 2.1 `/api/freeclass/register`

Flujo alto nivel (implementado):

1) Validaciones previas:
   - Método POST.
   - Parseo seguro + validación Zod.
   - Verificación de Turnstile.
   - Rate-limit (a nivel de diseño).

2) Paso 1 → Orquestación funcional (`handleRegistration`):

   - Usa `loadFreeClassPageBySku` + `live_class_instances` para:
     - Resolver instancia aplicable.
     - Determinar `registration_state` (`open`, `full`, `ended`, `canceled`, `upcoming`, `no_instance`).
     - Decidir `result` (`registered`, `waitlist`, `rejected_closed`).
     - Calcular `ui_state` (`open`, `waitlist`, `closed`).
     - Armar `leadTracking` (sku, instance_slug, utm).
   - No escribe en DB ni llama a Brevo.
   - Si no es registrable, el endpoint responde 200 con ese estado y no llama a nada más.

3) Paso 2 → Supabase v2 (`createFreeClassLead`):

   - Solo si el caso es registrable (`registered` o `waitlist`).
   - Construye `contact_core` con:
     - email, full_name
     - consentimiento `single_opt_in`
     - `consent_source = "free_class_form"`
     - `consent_at = now()`
   - Bloque `free_class` (sku + instance_slug).
   - Llama a `public.f_orch_contact_write_v2`.
   - Obtiene:
     - `contactId`
     - `brevoContactId` actual (si existía).

4) Paso 3 → Brevo + marketing (`syncFreeClassLeadWithBrevo`):

   - Si `createFreeClassLead` fue ok, llama a:
     - `syncFreeClassLeadWithBrevo({ contactId, email, fullName, sku, instanceSlug, currentBrevoContactId })`.

   - Este helper:
     - Construye tags internos para Supabase (no para Brevo).
     - Normaliza email.
     - Combina listas:
       - `BREVO_MASTER_LIST_ID`
       - `live_class_instances.brevo_cohort_list_id` (obtenido indirectamente por la lógica).
     - Llama al cliente Brevo:
       - Upsert de contacto (crear/actualizar).
       - Añadir el contacto a ambas listas (global + cohorte).

   - El cliente Brevo:
     - Interpreta `400 invalid_parameter` con mensaje `"Contact already in list and/or does not exist"` como **“contacto ya está en la lista”** y lo trata como éxito lógico.
     - Solo marca error real cuando:
       - Problemas de red (`network_error`),
       - 4xx/5xx que no son “ya está en lista”,
       - rate limiting, etc.

   - El resultado (`ok`, `brevoContactId`, `errorCode`) se envía a `public.f_contacts_marketing_update_v1`, que:
     - Actualiza `metadata.marketing.tags[]` internos.
     - Actualiza `metadata.marketing.brevo.*`.
     - Actualiza `brevo_contact_id`.
     - Marca `status = 'bounced'` si `errorCode = 'invalid_email'`.

   - Un fallo de Brevo **no rompe la UX**:
     - La route responde 200 si el registro en Supabase fue correcto.
     - El estado de error queda guardado para QA.

5) Paso 4 → respuesta HTTP:

   - Devuelve DTO estable al frontend:

   ```ts
   {
     registration_state,
     result,
     ui_state,
     leadTracking,
     nextStepUrl: null
   }
````

* No expone detalles de Brevo.
* Logs estructurados en consola (`ns = "freeclass_register"`) para trazabilidad.

### 2.2 `/api/stripe/webhooks` (Fase 2, diseño)

Flujo alto nivel previsto:

1. Recibir eventos de Stripe (ej. `checkout.session.completed`).
2. Resolver o crear `auth.user`:

   * Garantizar `user_id`.
3. Construir sobre para `f_orch_contact_write_v2`:

   * `contact_core`:

     * email, full_name
     * `user_id`
     * `status` y `segment` de buyer.
   * Bloque compra (campos a definir).
4. Llamar v2 → obtener `contact_id` + `brevo_contact_id`.
5. Construir `marketingEvent` `"purchase"`:

   * email, full_name, sku.
   * tags internos de buyer.
   * listas Brevo para buyers (por definir).
6. Llamar cliente Brevo → obtener `{ ok, brevo_contact_id?, error_code? }`.
7. Llamar `f_contacts_marketing_update_v1`.
8. `/gracias` solo refleja el estado de compra, no depende del resultado de Brevo.

### 2.3 Helpers en Next (visión consolidada)

* Helper “registro free class”:

  * Encapsulado en `createFreeClassLead`.
  * Usa `f_orch_contact_write_v2` internamente.

* Helper Brevo:

  * `sendBrevoMarketingEvent`:

    * Recibe `BrevoMarketingEvent` (tipo, email, fullName, sku, instanceSlug, tags internos, listIds).
    * Aplica upsert de contacto + alta en listas.
    * Mapea errores a `BrevoHelperErrorCode`.

* Helper de marketing Supabase:

  * `syncFreeClassLeadWithBrevo`:

    * Orquesta `sendBrevoMarketingEvent` + `f_contacts_marketing_update_v1`.

* Orquestador HTTP:

  * `/api/freeclass/register`:

    * validación → `handleRegistration` → `createFreeClassLead` → `syncFreeClassLeadWithBrevo` → respuesta.

---

## 3. Helper Brevo · Diseño lógico (corregido a listas)

### 3.1 Entrada

`BrevoMarketingEvent`:

* `type`:

  * `"freeclass_registration"` (F1),
  * `"purchase"` (F2) u otros futuros.
* `email` (normalizado).
* `fullName`.
* `classSku`, `instanceSlug` (si aplica).
* `tags` internos (para Supabase, no enviados a Brevo como tags API).
* `currentBrevoId` (opcional, string).
* `listIds` (implícito en la implementación: lista maestra + lista cohorte).

### 3.2 Comportamiento

1. Detección de entorno:

   * Dev/preview → API key NONPROD.
   * Prod → API key PROD.

2. Normalización:

   * Email a minúsculas, sin espacios.
   * Deduplicación de tags internos antes de pasar a RPC marketing.

3. Upsert en Brevo:

   * Si `currentBrevoId` válido:

     * Actualizar contacto por ID (FIRSTNAME).
   * Si no:

     * Buscar por email.
     * Si no existe → crear contacto.
     * Si existe → usar su ID.

4. Listas Brevo:

   * Se construye `listIds` con:

     * `BREVO_MASTER_LIST_ID` (global).
     * `brevo_cohort_list_id` desde `live_class_instances` para la instancia aplicable.

   * Para cada `listId`:

     * POST `/contacts/lists/{listId}/contacts/add` con `{ ids: [brevoId] }`.

   * Si la API responde `400 invalid_parameter` con mensaje `"Contact already in list and/or does not exist"`:

     * Se interpreta como **éxito lógico** para esa lista (ya estaba incluido).
     * No se marca `sync_error` por ese motivo.

   * Otros 4xx/5xx se mapean a error.

### 3.3 Salida

* `ok: boolean`.
* `brevoContactId: string | null`.
* `errorCode: BrevoHelperErrorCode | null`, donde:

  * `invalid_email`
  * `network_error`
  * `api_4xx`
  * `api_5xx`
  * `rate_limited`.

### 3.4 Manejo de emails inválidos

* Si Brevo devuelve estructura consistente con email inválido:

  * `ok = false`
  * `errorCode = "invalid_email"`
  * `f_contacts_marketing_update_v1` actualiza:

    * `last_status = "sync_error"`
    * `last_error_code = "invalid_email"`
    * `contacts.status = 'bounced'`.

---

## 4. Sincronización y logging

### 4.1 Estados de sync en `contacts`

En `metadata.marketing.brevo`:

* `last_status`:

  * `NULL` → nunca sincronizado.
  * `"synced_ok"` → último intento exitoso.
  * `"sync_error"` → último intento fallido.

* `last_sync_at`:

  * timestamp del último intento.

* `last_error_code?`:

  * solo cuando hay error.

Relación con `contacts.status`:

* `status` permitido:

  * `active`, `unsubscribed`, `bounced`, `blocked`.
* Cuando `error_code = 'invalid_email'` desde Brevo:

  * `status = 'bounced'`.

### 4.2 Logging en Next

Para `/api/freeclass/register`:

* Logs con `ns = "freeclass_register"`:

  * `at`: `validation_error`, `turnstile_fail`, `orchestration_ok`, `orchestration_error`, `brevo_sync_error`, `unhandled_exception`.
  * `contact_id`, `sku`, `instance_slug`, `registration_state`, `result`, `ui_state`.
  * `brevo_ok`, `brevo_error_code`.
  * `timings` detallados (parse, zod, turnstile, load_page, load_instances, contact_write, brevo_sync, total).

Para el cliente Brevo:

* Logs con `ns = "brevo_client"`:

  * `at`: `api_error`.
  * `statusCode`, `body` (sin PII sensible).

### 4.3 Consultas operativas típicas

* Leads nunca sincronizados:

  * `metadata->'marketing'->'brevo'->>'last_status' IS NULL`.

* Leads con error:

  * `metadata->'marketing'->'brevo'->>'last_status' = 'sync_error'`.

* Invalid emails:

  * `contacts.status = 'bounced'`.

* Contactos sanos para email:

  * `status = 'active'`
  * `last_status = 'synced_ok'`.

---

## 5. Configuración Brevo (listas, segmentos, journeys)

### 5.1 Atributos de contacto

Mínimos para la integración actual:

* `EMAIL` obligatorio.
* `FIRSTNAME` recomendado (se alimenta desde `full_name`).

Otros atributos no son obligatorios a nivel arquitectura; se pueden agregar después.

### 5.2 “Tags” oficiales (uso interno Supabase)

Aunque Brevo no recibe tags vía API, a nivel de modelo interno se usan nombres consistentes para `metadata.marketing.tags[]`, por ejemplo:

1. Free class (internos Supabase):

* `lead_freeclass_fin_freeintro`
* `lead_freeclass_fin_freeintro_2025-12-09-1900`
* `lead_freeclass_fin_freeintro_2025-12-16-1900`

2. Buyer (F2, internos Supabase):

* `buyer_finanzas_2026`.

Estos tags internos sirven para:

* vistas,
* filtros de reporting,
* lógica futura de marketing que lea directamente de Supabase.

### 5.3 Lists y segmentos en Brevo

En Brevo la segmentación se apoya en **listas**, no en tags API:

* Lista global:

  * ID = `BREVO_MASTER_LIST_ID` (ej. 13).
  * Recibe todos los contactos de LOBRÁ que deban entrar en funnels de email.

* Listas por cohorte de free class:

  * Una lista por instancia.
  * IDs numéricos configurados manualmente.
  * Se mapean en `live_class_instances.brevo_cohort_list_id`.

Segmentos dinámicos (en Brevo):

* Se pueden construir sobre la membresía a listas:

  * “Cohorte fin-freeintro 16-dic” = miembros de lista cohorte `X`.
  * “Leads no buyers” = combinación entre lista global y ausencia de listas/tags de buyer (definido en Brains de Brevo).

### 5.4 Journeys 09-dic y 16-dic

Por cada free class:

* Trigger recomendado:

  * pertenencia a la **lista de cohorte** correspondiente
    (en lugar de tags API).

* Config:

  * No reinscribir si ya pasó por el journey.
  * Exclusiones basadas en buyers si aplica.

Pasos típicos:

1. Confirmación registro.
2. Recordatorio 24h.
3. Recordatorio 2h.
4. Post-clase.
5. Nurturing ligero.

### 5.5 Relación journeys ↔ buyers

* Cuando un lead compra (F2), se podrán usar:

  * listas específicas de buyers,
  * tags internos en Supabase (`buyer_finanzas_2026`)
  * más adelante, segmentos en Brevo configurados manualmente.

---

## 6. Entornos (dev / preview / prod)

### 6.1 Next / Vercel

* Local/Dev:

  * API key Brevo NONPROD.
  * Eventos GA4/Pixel de prueba o deshabilitados.
  * Sin journeys productivos.

* Preview:

  * API key Brevo NONPROD.
  * Mismo Supabase que prod.
  * Sin journeys activos.

* Prod:

  * API key Brevo PROD.
  * Journeys free class activos.
  * Campañas de venta para módulo finanzas.

### 6.2 Supabase

* Un solo proyecto para todos los entornos Next.
* Diferencias provienen de:

  * API key Brevo usada,
  * configuración de listas en Brevo,
  * configuración de journeys/campañas.

### 6.3 Brevo

* Dos contextos de uso:

  * NONPROD:

    * pruebas de creación/actualización/listas.
    * Sin journeys reales.

  * PROD:

    * journeys y campañas definitivas.
    * listas productivas (global + cohortes).

---

## 7. Plan por fases y fechas

### 7.1 Fase 1 · MVP Free Class (9-dic y 16-dic)

Entregables:

* Supabase:

  * `brevo_contact_id` en `contacts`.
  * `metadata.marketing.tags` + `metadata.marketing.brevo.*`.
  * `f_orch_contact_write_v2` operativo.
  * `f_contacts_marketing_update_v1` operativo.
  * `live_class_instances.brevo_cohort_list_id` poblado para las instancias activas.

* Next:

  * `/api/freeclass/register` usando:

    * `handleRegistration`,
    * `createFreeClassLead`,
    * `syncFreeClassLeadWithBrevo`.
  * Logging estructurado.

* Brevo:

  * Listas global y de cohorte creadas.
  * Journeys 09-dic y 16-dic preparados sobre listas de cohorte.

Checklists por fecha:

* 9-dic:

  * Registro real produce:

    * contacto en Supabase,
    * `free_class_registrations[]`,
    * entrada en listas Brevo (global + cohorte),
    * estado `synced_ok` o `sync_error` trazable.

* 16-dic:

  * Misma lógica aplicada a la nueva cohorte sin interferir con la anterior.

### 7.2 Fase 2 · Compra → Supabase → Brevo (antes del 27-dic)

* Reutilizar `f_orch_contact_write_v2` desde webhooks de Stripe.
* Agregar lógica de buyer (tags internos, listas/segmentos en Brevo).
* Mantener Resend para correos transaccionales.

### 7.3 Fase 3 · Post-módulo (después del 13-ene)

* Webhook unsubscribe Brevo → Supabase:

  * Actualización de `consent_status` y `consent_at`.

* Backfills:

  * reprocesar `never_synced` y errores no fatales.

* Vistas adicionales para análisis por cohorte y por buyer.

---

# Estado

* Diseño de implementación alto nivel actualizado a la realidad de la API de Brevo (tags API no disponibles).
* Integración **Next.js → Supabase v2 → Brevo (listas)** operativa para el flujo de free class.
* Modelo y RPCs en Supabase alineados con esta arquitectura.
* Documentación lista para coordinar configuración de listas y journeys en Brevo y para extender a compras (F2).

```
::contentReference[oaicite:0]{index=0}
```
