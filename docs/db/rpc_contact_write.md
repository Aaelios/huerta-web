# docs/rpc_contact_write.md 

# RPC `public.f_orch_contact_write` — Contrato y guía de integración

Versión: **v1** · Última actualización: **2025-09-28**  
Owner: **Huerta Consulting** · Namespace: `public`

---

## 1) Propósito

Punto único de **orquestación de writes** para formularios de contacto y newsletter.  
Garantiza **idempotencia** por `request_id`, aplica **normalización** y registra entidades: `contacts`, `messages`, y `subscription_events` cuando corresponda.

---

## 2) Firma y seguridad

- **Nombre:** `public.f_orch_contact_write`
- **Firma:** `(v_input jsonb) RETURNS jsonb`
- **Permisos:** ejecutable **solo** con `service_role` (o `postgres`)
- **RLS:** tablas subyacentes con RLS activo; la RPC usa `SECURITY DEFINER` bajo roles internos controlados
- **Timeout recomendado (caller):** 5 s

---

## 3) Contrato de entrada (`v_input jsonb`)

Campos aceptados (lista blanca). Cualquier otro campo será ignorado.

| Campo              | Tipo             | Req | Notas |
|--------------------|------------------|-----|-------|
| `request_id`       | `uuid` (v4)      | ✔︎  | Clave de idempotencia por envío. |
| `type`             | `"contact" \| "newsletter"` | ✔︎ | Discriminante de flujo. |
| `email`            | `text`           | ✔︎  | Normalizado a lowercase. `citext` en DB. |
| `full_name`        | `text`           | –   | Truncado a 128 chars si excede. |
| `marketing_opt_in` | `boolean`        | –   | Default `true` para `newsletter` si no viene. |
| `payload`          | `jsonb`          | –   | Para `contact`: `{ "message": "..." }` requerido. |
| `utm`              | `jsonb`          | –   | Metadatos de campaña. |
| `context`          | `jsonb`          | –   | `{ path, url, referrer, ua, lang }`. |
| `source`           | `text`           | ✔︎  | Catálogo: `web_form_contact`, `web_form_footer`, `checkout`, `api`. |
| `metadata`         | `jsonb`          | –   | Técnico: `{ ip_hash, ip_class, request_ts, form_version }`. |

**Límites defensivos aplicados por la RPC:**
- Tamaño total de `v_input`: ≤ 64 KB
- `payload.message`: ≤ 2 KB (si excede se trunca y se agrega warning)
- `utm`/`context`/`metadata`: ≤ 2 KB cada uno

---

## 4) Comportamiento por `type`

### 4.1) `type = "contact"`
1. **Upsert de contacto** por `email`.  
2. **Inserta `messages`** con `payload.message` y enlaza a `contact_id`.  
3. Si `marketing_opt_in = true`, **log de `subscription_events`** (`opt_in`).  
4. Devuelve `status:"ok"` o `status:"duplicate"` si `request_id` ya fue procesado.

### 4.2) `type = "newsletter"`
1. **Upsert de contacto** por `email`.  
2. Si `marketing_opt_in` es `true` (o vacío → default `true`), **log `subscription_events:opt_in`**.  
3. **No crea `messages`** salvo que venga `payload` explícito (no requerido).  
4. Devuelve `status:"ok"` o `duplicate`.

---

## 5) Idempotencia

- Clave: `request_id` (UUID v4).  
- La RPC es **idempotente**: segundo llamado con el mismo `request_id` devuelve `status:"duplicate"` y las mismas IDs previamente generadas cuando existan.

---

## 6) Respuesta (`RETURNS jsonb`)

```json
{
  "status": "ok | duplicate | error",
  "contact": {
    "id": "uuid",
    "email": "string",
    "consent_status": "none | single_opt_in | double_opt_in"
  },
  "message": {
    "id": "uuid"
  },
  "subscription_event": {
    "id": "uuid|null",
    "event_type": "opt_in|double_opt_in|unsubscribe|bounce|complaint|null"
  },
  "submission_id": "uuid",   // igual a request_id
  "version": "v1",
  "warnings": ["source_normalized:web_form_footer", "truncated_field:payload.message"]
}
````

Notas:

* En `newsletter` sin mensaje no habrá `message.id`.
* `subscription_event.id` puede ser `null` si no aplica.

---

## 7) Errores y mensajes

La RPC devuelve `status:"error"` únicamente por fallos de negocio **no** relacionados a permisos.
Errores de permisos o SQL graves suben como error del motor y deben mapearse a `500` en el caller.

| Código interno | Causa típica                              | Acción caller                |
| -------------- | ----------------------------------------- | ---------------------------- |
| `error`        | Validación de negocio en DB (ej. tamaños) | 500 (db_error) con log       |
| `duplicate`    | Idempotencia por `request_id`             | 200 con `status:"duplicate"` |
| SQL exception  | Violación unique, permisos, otros         | 500 (db_error) con log       |

> La clasificación `invalid_input`, `turnstile_invalid`, `rate_limited` se determina **antes** en el endpoint de Next.js. No son responsabilidad de esta RPC.

---

## 8) Observabilidad

Campos garantizados en output para correlación:

* `submission_id` = `request_id`
* `warnings[]` con claves estándar (`source_normalized:*`, `truncated_field:*`)
* `version` = `"v1"`

Recomendación de logs en el caller:

* `request_id`, `status`, `contact_id`, `message_id`, `latency_ms_rpc`

---

## 9) Ejemplos

### 9.1) Contacto

**Entrada**

```json
{
  "request_id": "111e4567-e89b-42d3-a456-426614174000",
  "type": "contact",
  "email": "lead@example.com",
  "full_name": "Cliente Demo",
  "marketing_opt_in": false,
  "payload": { "message": "Quiero más información" },
  "utm": { "campaign": "launch" },
  "context": { "path": "/contacto", "lang": "es" },
  "source": "web_form_contact",
  "metadata": { "ip_hash": "…", "ip_class": "ipv4", "request_ts": "2025-09-28T10:00:00Z", "form_version": "v1" }
}
```

**Salida**

```json
{
  "status": "ok",
  "contact": { "id": "1c1f…", "email": "lead@example.com", "consent_status": "none" },
  "message": { "id": "7a9b…" },
  "subscription_event": { "id": null, "event_type": null },
  "submission_id": "111e4567-e89b-42d3-a456-426614174000",
  "version": "v1",
  "warnings": []
}
```

### 9.2) Newsletter

**Entrada**

```json
{
  "request_id": "222e4567-e89b-42d3-a456-426614174000",
  "type": "newsletter",
  "email": "user@example.com",
  "marketing_opt_in": true,
  "source": "web_form_footer",
  "context": { "path": "/", "lang": "es" },
  "metadata": { "ip_hash": "…", "ip_class": "ipv6", "request_ts": "2025-09-28T10:05:00Z", "form_version": "v1" }
}
```

**Salida**

```json
{
  "status": "ok",
  "contact": { "id": "9d3e…", "email": "user@example.com", "consent_status": "single_opt_in" },
  "message": { "id": null },
  "subscription_event": { "id": "a0b1…", "event_type": "opt_in" },
  "submission_id": "222e4567-e89b-42d3-a456-426614174000",
  "version": "v1",
  "warnings": []
}
```

### 9.3) Reintento (idempotencia)

**Entrada**: repetir el caso 9.1 con el mismo `request_id`.
**Salida**

```json
{
  "status": "duplicate",
  "contact": { "id": "1c1f…", "email": "lead@example.com", "consent_status": "none" },
  "message": { "id": "7a9b…" },
  "subscription_event": { "id": null, "event_type": null },
  "submission_id": "111e4567-e89b-42d3-a456-426614174000",
  "version": "v1",
  "warnings": []
}
```

---

## 10) Compatibilidad y versión

* **Alias estable:** `f_orch_contact_write` apunta a implementación `*_v1`.
* Cambios que rompan contrato deberán publicar `*_v2` y mover el alias solo tras migración del caller.
* No se modificarán claves de salida existentes en v1; solo se pueden **agregar** campos no disruptivos.

---

## 11) Consideraciones de operación

* **Reintentos del caller:** seguros por `request_id`.
* **Rate limit:** externo a esta RPC (aplicado en el endpoint de Next.js).
* **Backfills/importaciones:** usar `source:"import"` vía una RPC distinta o feature flag, no este endpoint público.

---

```
```
