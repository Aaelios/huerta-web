

````md
/docs/freeclass/sql_free_class_upsert_v1.md
# SQL · app.f_contacts_free_class_upsert_v1 · Free Class v1

Función interna en el esquema `app` para manejar el registro de free class dentro de `contacts.metadata`.  
Es la **única vía permitida** para escribir en:

```jsonc
contacts.metadata.free_class_registrations: Array<{
  class_sku: string;
  instance_slug: string;
  status: "registered" | "waitlist" | "closed";
  ts: string; // ISO-8601 (UTC)
}>
````

---

## 1. Firma y seguridad

```sql
CREATE OR REPLACE FUNCTION app.f_contacts_free_class_upsert_v1(
  p_contact_id    uuid,
  p_class_sku     text,
  p_instance_slug text,
  p_status        text,
  p_ts            timestamptz
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'app';
```

Permisos:

```sql
REVOKE ALL ON FUNCTION app.f_contacts_free_class_upsert_v1(
  uuid, text, text, text, timestamptz
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.f_contacts_free_class_upsert_v1(
  uuid, text, text, text, timestamptz
) TO service_role;
```

Decisiones:

* Vive en `app.*` porque es función interna, **no endpoint público**.
* `SECURITY DEFINER` con owner interno; RLS sigue activo, pero el owner tiene permisos sobre `public.contacts`.
* Solo `service_role` (y el owner/postgres) pueden ejecutarla.

---

## 2. Contrato funcional

### 2.1 Parámetros de entrada

* `p_contact_id uuid`
  ID de `public.contacts.id`. Debe existir.

* `p_class_sku text`
  SKU de la clase gratuita. Obligatorio, no vacío.

* `p_instance_slug text`
  Slug de la instancia (ej. `fin-freeintro-open-future`). Obligatorio, no vacío.

* `p_status text`
  Estado del registro de free class. Solo se aceptan:

  * `"registered"`
  * `"waitlist"`
  * `"closed"`

* `p_ts timestamptz`
  Timestamp de la operación. Se guarda como string ISO-8601 UTC en `ts`.

### 2.2 Validaciones

La función revienta con `RAISE EXCEPTION` cuando:

* `p_contact_id` es `NULL` o no existe en `public.contacts`.
* `p_class_sku` es `NULL` o string vacío.
* `p_instance_slug` es `NULL` o string vacío.
* `p_status` no está en `('registered','waitlist','closed')`.

---

## 3. Comportamiento sobre `contacts.metadata`

Dado un contacto existente:

1. **Lee y normaliza `metadata`**

   * `metadata` se lee con `FOR UPDATE`.
   * Si es `NULL`, se normaliza a `'{}'::jsonb`.

2. **Lee y normaliza `free_class_registrations`**

   * Se toma `metadata->'free_class_registrations'` en `l_registrations`.
   * Si es `NULL` o no es `array`, se sanea a `[]::jsonb`.
   * A partir de aquí, `l_registrations` siempre es un array JSON.

3. **Construye la entrada nueva**

   * Objeto base:

     ```jsonc
     {
       "class_sku": p_class_sku,
       "instance_slug": p_instance_slug,
       "status": p_status,
       "ts": "<p_ts en ISO-8601 UTC>"
     }
     ```

4. **Upsert por `(class_sku, instance_slug)`**

   * Recorre el array `l_registrations`.
   * Si encuentra un elemento donde:

     * `elem.class_sku == p_class_sku` y
     * `elem.instance_slug == p_instance_slug`:

       * Hace merge: `elem := elem || new_entry`.
       * Esto:

         * Sobrescribe `class_sku`, `instance_slug`, `status`, `ts`.
         * **Preserva claves extra** que ya existan (p.ej. `channel`, `note`).
       * Reemplaza el elemento en la misma posición.
   * Si **no encuentra** ningún elemento con esa combinación:

     * Apendea `new_entry` al final del array.

   Resultado:

   * Idempotencia por `(class_sku, instance_slug)`.
   * No hay duplicados para la misma combinación.

5. **Actualiza `metadata` sin tocar otras claves**

   * Reconstruye `metadata` como objeto original + `free_class_registrations` actualizado.
   * No se alteran claves existentes como:

     * `"motivo"`, `"ip_hash"`, `"telefono"`, etc.
   * Solo cambia:

     * `metadata.free_class_registrations`
     * `contacts.updated_at` (se setea a `now()`)

---

## 4. Ejemplos de uso

### 4.1. Estado inicial típico

Antes:

```jsonc
{
  "motivo": "pago",
  "ip_hash": "f19cf2b3...",
  "ip_class": "ipv4",
  "telefono": "+5255...",
  "request_ts": "2025-11-26T18:57:41.520Z",
  "form_version": "v1"
}
```

Llamada:

```sql
select app.f_contacts_free_class_upsert_v1(
  'cf34ecb4-539b-4db4-bb25-f3deee6db6a3'::uuid,
  'liveclass-lobra-rhd-fin-freeintro-v001',
  'fin-freeintro-open-future',
  'registered',
  now()
);
```

Después:

```jsonc
{
  "motivo": "pago",
  "ip_hash": "f19cf2b3...",
  "ip_class": "ipv4",
  "telefono": "+5255...",
  "request_ts": "2025-11-26T18:57:41.520Z",
  "form_version": "v1",
  "free_class_registrations": [
    {
      "ts": "2025-11-26T19:50:56.329Z",
      "status": "registered",
      "class_sku": "liveclass-lobra-rhd-fin-freeintro-v001",
      "instance_slug": "fin-freeintro-open-future"
    }
  ]
}
```

---

### 4.2. Upsert sobre la misma combinación

Segunda llamada:

```sql
select app.f_contacts_free_class_upsert_v1(
  'cf34ecb4-539b-4db4-bb25-f3deee6db6a3'::uuid,
  'liveclass-lobra-rhd-fin-freeintro-v001',
  'fin-freeintro-open-future',
  'waitlist',
  now() + interval '5 minutes'
);
```

Después:

```jsonc
"free_class_registrations": [
  {
    "ts": "2025-11-26T20:00:09.595Z",
    "status": "waitlist",
    "class_sku": "liveclass-lobra-rhd-fin-freeintro-v001",
    "instance_slug": "fin-freeintro-open-future"
  }
]
```

* El array sigue con **1 solo elemento**.
* Se actualizan `status` y `ts`.

---

### 4.3. Múltiples instancias para el mismo contacto

Llamada extra:

```sql
select app.f_contacts_free_class_upsert_v1(
  'cf34ecb4-539b-4db4-bb25-f3deee6db6a3'::uuid,
  'liveclass-lobra-rhd-otro-ejemplo-v001',
  'fin-freeintro-second-instance',
  'registered',
  now()
);
```

Después:

```jsonc
"free_class_registrations": [
  {
    "ts": "2025-11-26T20:00:09.595Z",
    "status": "waitlist",
    "class_sku": "liveclass-lobra-rhd-fin-freeintro-v001",
    "instance_slug": "fin-freeintro-open-future"
  },
  {
    "ts": "2025-11-26T19:56:49.200Z",
    "status": "registered",
    "class_sku": "liveclass-lobra-rhd-otro-ejemplo-v001",
    "instance_slug": "fin-freeintro-second-instance"
  }
]
```

---

## 5. Uso previsto desde `/api/freeclass/register`

Flujo backend (Next.js) resumido:

1. **Registrar/actualizar contacto** vía orquestador:

   ```ts
   const { data, error } = await supabaseService.rpc(
     "f_orch_contact_write",
     {
       p_input: {
         email,
         full_name,
         source: "freeclass_form",
         // utm, tech_metrics, opt_in, etc.
       },
     }
   );

   const contactId = data?.contact?.id;
   ```

2. **Registrar la free class**:

   ```ts
   await supabaseService.rpc("f_contacts_free_class_upsert_v1", {
     p_contact_id: contactId,
     p_class_sku: classSku,
     p_instance_slug: instanceSlug,
     p_status: "registered",          // o "waitlist" | "closed"
     p_ts: new Date().toISOString(),  // Supabase → timestamptz
   });
   ```

Reglas:

* `/api/freeclass/register` **no toca `contacts.metadata` directo**.
* Solo escribe en `free_class_registrations` usando esta función.
* El prelobby, en el futuro, lee únicamente de `contacts.metadata.free_class_registrations`.

---

## 6. QA recomendado

Casos mínimos validados:

1. `metadata` inicial sin `free_class_registrations` → crea array con 1 entrada.
2. Segunda llamada con mismo `(class_sku, instance_slug)` → no duplica, solo actualiza.
3. Múltiples combinaciones para un mismo contacto → mantiene todas las entradas.
4. Manejo de errores:

   * `p_class_sku` vacío → `invalid_input: class_sku requerido`.
   * `p_instance_slug` vacío → `invalid_input: instance_slug requerido`.
   * `p_status` no permitido → `invalid_input: status inválido`.
   * `p_contact_id` inexistente → `contact_not_found`.

---

## 7. Rollback

Para revertir esta función sin tocar datos existentes:

```sql
DROP FUNCTION IF EXISTS app.f_contacts_free_class_upsert_v1(
  uuid, text, text, text, timestamptz
);
```

Notas:

* El `DROP FUNCTION` **no borra ni modifica** ninguna fila de `public.contacts`.
* Solo elimina la función. El contenido ya escrito en `metadata.free_class_registrations` permanece.

```
