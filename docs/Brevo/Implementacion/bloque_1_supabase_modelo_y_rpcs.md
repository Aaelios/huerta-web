````md
# Bloque 1 · Supabase — Modelo y RPCs Brevo  
Versión: 1.1  
Fecha: 2025-12-05  
Archivo sugerido: `docs/brevo/bloque_1_supabase_modelo_y_rpcs.md`

---

## 0) Contexto

Bloque perteneciente a la integración **Brevo ↔ LOBRÁ** para Fase 1 (Free Class 09-dic y 16-dic).

Decisiones maestras relevantes:

- Supabase es la **única fuente de verdad** del contacto.
- Brevo es herramienta de **automatización de marketing**, no CRM.
- Dirección de sync: **LOBRÁ → Brevo**, nunca al revés (en F1/F2).
- Emails transaccionales siguen en **Resend**.
- `contacts` es la tabla central, sin tablas espejo.
- Estado de sync se guarda dentro de `contacts.metadata.marketing.brevo`.
- **Tags en `metadata.marketing.tags[]` son solo internos.  
  La integración externa con Brevo ahora es por *listas* (`listIds`), no por tags.**

Este bloque NO toca Next.js ni la API de Brevo directamente.  
Solo define modelo Supabase + RPCs + vistas QA.

---

## 1) Alcance del Bloque 1

### 1.1 Qué sí cubre

1. Extensión mínima del schema `contacts`:
   - Columna dura `brevo_contact_id text`.
   - Rama `metadata.marketing.*` (estructura lógica).

2. Extensión mínima del schema `live_class_instances`:
   - Columna dura `brevo_cohort_list_id integer` para almacenar el **ID de lista Brevo por cohorte**.

3. Nuevas funciones de orquestación y marketing:

   - Orquestadora v2:
     - `app.f_orch_contact_write_v2(p_input jsonb) → jsonb`
     - `public.f_orch_contact_write_v2(p_input jsonb) → jsonb`

   - RPC marketing:
     - `app.f_contacts_marketing_update_v1(p_input jsonb) → jsonb`
     - `public.f_contacts_marketing_update_v1(p_input jsonb) → jsonb`

4. Vistas QA en `public`:

   - `vista_sync_brevo`
   - `vista_freeclass_cohortes`
   - `vista_sync_error`
   - `vista_never_synced`
   - `vista_bounced`

5. Smoke tests básicos validados en Supabase.

---

### 1.2 Qué NO cubre

- No modifica:
  - `public.f_orch_contact_write`
  - `public.f_orch_contact_write_v1`
  - `app.f_subscription_events_log_v1`
  - Cualquier flujo legacy basado en v1.

- No implementa:
  - Llamadas HTTP en Next.js.
  - Cliente Brevo / manejo de listas.
  - Webhooks Stripe.
  - Webhook unsubscribe Brevo.

- No altera el modelo de consentimiento maestro:
  - `consent_status`, `consent_source`, `consent_at` se siguen manejando en `contacts` vía lógica existente de `app.f_contacts_upsert_v1`.

---

## 2) Objetos creados / modificados

### 2.1 Schema — Tabla `public.contacts`

Cambio físico:

```sql
ALTER TABLE public.contacts
ADD COLUMN brevo_contact_id text;
````

Resto de columnas sin cambios.
`metadata` sigue siendo `jsonb` y se aprovecha para la rama `marketing`.

---

### 2.1.b Schema — Tabla `public.live_class_instances`

Columna nueva para enlazar cohorts con listas de Brevo:

```sql
ALTER TABLE public.live_class_instances
ADD COLUMN brevo_cohort_list_id integer;
```

Uso:

* Contiene el **ID numérico de la lista Brevo** asociada a esa instancia.
* La lógica de Next.js/Brevo combina:

  * `BREVO_MASTER_LIST_ID` (env var, lista global) y
  * `live_class_instances.brevo_cohort_list_id` (lista de cohorte)
    para construir `listIds` en la llamada a Brevo.

---

### 2.2 Funciones nuevas

#### 2.2.1 Orquestadora v2 (interna)

**Nombre:**
`app.f_orch_contact_write_v2(p_input jsonb) RETURNS jsonb`

**Rol:**

* Orquestar escritura de contacto + free class.
* Centralizar la lógica de creación/actualización usada por `/api/freeclass/register` y futuros flujos (ej. compras en F2).

**Resumen de comportamiento:**

1. Lee `p_input` como JSONB y extrae:

   * `contact_core` (objeto)
   * `free_class` (objeto opcional)

2. Normaliza email:

   * `email` → minúsculas + trim.
   * Si `email` vacío → `RAISE EXCEPTION 'invalid_input: contact_core.email requerido ...'`.

3. Reconstruye `contact_core` normalizado:

   * Reemplaza `email` por la versión normalizada.
   * El resto de campos se preservan tal cual (incluye `consent_*`, `segment`, `user_id` si vienen).

4. Llama a `app.f_contacts_upsert_v1(v_contact_core_norm)`:

   * Upsert de fila en `public.contacts`.
   * Aplica lógica existente de:

     * consent,
     * merge de `utm`, `tech_metrics`, `metadata`,
     * `consent_source` si está vacío.

5. Si viene `free_class`:

   * Llama `app.f_contacts_free_class_upsert_v1` con:

     * `contact_id`
     * `class_sku`
     * `instance_slug`
     * `status` (default `registered` si no viene)
     * `ts` (default `now()` si no viene).

6. Lee `brevo_contact_id` actual desde `public.contacts`.

7. Devuelve JSONB con estructura:

```jsonc
{
  "version": "v2",
  "status": "ok",
  "contact": {
    "id": "uuid",
    "email": "email_normalizado",
    "brevo_contact_id": "string | null"
  },
  "free_class": {
    "processed": true | false
  }
}
```

**Notas:**

* No crea ni toca `messages`.
* No interactúa con `subscription_events`.
* No escribe nada en `metadata.marketing`.
* En F1 solo se usa para free class.
  El bloque de compra se agregará en F2 sin romper el contrato actual.

---

#### 2.2.2 Orquestadora v2 (wrapper público)

**Nombre:**
`public.f_orch_contact_write_v2(p_input jsonb) RETURNS jsonb`

**Rol:**

* Exponer `app.f_orch_contact_write_v2` a Next.js y otros clientes.
* Mantener el patrón:

  * `public.*` = API estable.
  * `app.*` = implementación interna.

**Cuerpo:**

```sql
CREATE OR REPLACE FUNCTION public.f_orch_contact_write_v2(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'app'
AS $function$
  SELECT app.f_orch_contact_write_v2(p_input);
$function$;
```

---

#### 2.2.3 RPC Marketing (interno)

**Nombre:**
`app.f_contacts_marketing_update_v1(p_input jsonb) RETURNS jsonb`

**Contrato de entrada (`p_input`):**

> Nota: aquí los `tags` son **internos de Supabase**.
> Brevo ya no recibe tags; solo se usan para segmentación propia y analytics.

```jsonc
{
  "contact_id": "uuid",              // obligatorio
  "tags": ["string"] | null,         // lista deseada (marketing interno)
  "ok": true | false,                // resultado del helper Brevo
  "brevo_contact_id": "string"|null, // opcional, de Brevo
  "error_code": "string"|null        // ej. "invalid_email", "network_error"
}
```

**Reglas de negocio:**

* `contact_id` obligatorio. Si es nulo/invalid → excepción `invalid_input`.

* `last_status`:

  * `ok = true`  → `"synced_ok"`.
  * `ok = false` → `"sync_error"`.

* Rama `metadata.marketing.brevo`:

  * `last_status` siempre se actualiza.
  * `last_sync_at = now()`.
  * `last_error_code` se guarda solo si `error_code` no es null.

* Tags internos:

  * Se leen desde `metadata.marketing.tags[]`.
  * Si se pasan tags en `p_input`, se hace **unión** sin duplicados.
  * Si no se pasan tags, se conservan los existentes.

* `brevo_contact_id`:

  * Si `p_input.brevo_contact_id` no es null/empty → sobrescribe columna.
  * Si es null → se mantiene valor actual.

* Estado `status` del contacto:

  * Si `error_code = 'invalid_email'` → `contacts.status = 'bounced'`.
  * Si no → se preserva el estado actual.

**Contrato de salida:**

```jsonc
{
  "contact_id": "uuid",
  "brevo_contact_id": "string|null",
  "last_status": "synced_ok" | "sync_error",
  "last_error_code": "string|null",
  "tags": ["string"]           // conjunto final interno
}
```

---

#### 2.2.4 RPC Marketing (wrapper público)

**Nombre:**
`public.f_contacts_marketing_update_v1(p_input jsonb) RETURNS jsonb`

**Rol:**
Exponer `app.f_contacts_marketing_update_v1` a Next.js.

**Cuerpo:**

```sql
CREATE OR REPLACE FUNCTION public.f_contacts_marketing_update_v1(p_input jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public', 'pg_catalog', 'app'
AS $function$
  SELECT app.f_contacts_marketing_update_v1(p_input);
$function$;
```

---

### 2.3 Vistas QA

Sin cambios de contrato, pero se apoyan en:

* `contacts.brevo_contact_id`
* `contacts.metadata.marketing.*`
* `live_class_instances` + `metadata.free_class_registrations[]`

(Definiciones tal como en la versión 1.0.)

---

## 3) Contratos finales (resumen operativo)

### 3.1 `public.f_orch_contact_write_v2`

Input y output se mantienen igual a la versión 1.0 (ver arriba).
No tiene ninguna noción de listas; solo gestiona contacto + free class.

---

### 3.2 `public.f_contacts_marketing_update_v1`

Input:

```jsonc
{
  "contact_id": "uuid",
  "tags": ["string"] | null,          // internos
  "ok": true | false,
  "brevo_contact_id": "string" | null,
  "error_code": "string" | null
}
```

Output:

```jsonc
{
  "contact_id": "uuid",
  "brevo_contact_id": "string|null",
  "last_status": "synced_ok" | "sync_error",
  "last_error_code": "string|null",
  "tags": ["string"]
}
```

Las listas de Brevo (**global + cohorte**) se manejan fuera de Supabase, en el helper de Node, tomando:

* `BREVO_MASTER_LIST_ID` (env)
* `live_class_instances.brevo_cohort_list_id` (esta columna nueva)

---

## 4) QA mínimo validado

Sigue aplicando la misma batería de pruebas SQL para:

* `public.f_orch_contact_write_v2`
* `public.f_contacts_marketing_update_v1`

La única diferencia es que ahora, en pruebas de punta a punta, la lista de cohorte proviene de `live_class_instances.brevo_cohort_list_id` y **no** de ningún tag externo.

---

## 5) Riesgos y consideraciones

Sin cambios de fondo respecto a la versión 1.0, con dos notas nuevas:

1. Si `brevo_cohort_list_id` es null para una instancia, el helper Brevo solo podrá agregar al contacto a la lista global.
   Esto puede implicar que no se dispare el journey de esa cohorte.

2. El mapeo entre `live_class_instances.brevo_cohort_list_id` y las listas configuradas en Brevo es manual y se considera parte del **checklist previo a campaña**.

---

## 6) Pendientes futuros relacionados

1. Checklist de **pre-campaña**:

   * Crear listas de cohorte en Brevo.
   * Asignar `brevo_cohort_list_id` correcto a cada fila de `live_class_instances`.
   * Verificar que `BREVO_MASTER_LIST_ID` esté configurado en entorno.

2. Documentar en un bloque separado la convención de nombres para listas de cohorte, por ejemplo:
   `cohort_freeclass__<sku>__<instance_slug>`.

---

## 7) Estado del bloque

* Modelo Supabase para integración Brevo actualizado a **listas externas + tags internos**.
* Orquestadora v2 operativa.
* RPC marketing operativo y alineado con el nuevo modelo.
* Vistas QA sin cambios de contrato.

Bloque 1 se mantiene **cerrado a nivel Supabase**, alineado con la corrección arquitectónica Brevo (tags → listas) y listo para consumo estable por Next.js.

```
::contentReference[oaicite:0]{index=0}
```
