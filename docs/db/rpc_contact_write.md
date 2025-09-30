Listo. Documento corregido y alineado con el contrato actual (SQL v1 y caller Next.js).

````md
# RPC `public.f_orch_contact_write` — Contrato y guía de integración

Versión: **v1** · Última actualización: **2025-09-29**  
Owner: **Huerta Consulting** · Namespace: `public`

---

## 1) Propósito
Único punto de **orquestación de writes** para contacto y newsletter.  
Aplica **normalización**, asegura **idempotencia** por `request_id` y registra: `contacts`, `messages` y `subscription_events` cuando corresponda.

---

## 2) Firma y seguridad
- **Nombre estable (alias):** `public.f_orch_contact_write` → apunta a `*_v1`
- **Firma:** `(v_input jsonb) RETURNS jsonb`
- **Permisos:** ejecutar **solo** con `service_role` o `postgres`
- **RLS:** activo en tablas; la RPC es `SECURITY DEFINER` con rol interno
- **Timeout caller recomendado:** 5 s

---

## 3) Entrada (`v_input jsonb`)
Campos aceptados (lista blanca). Otros se ignoran.

| Campo              | Tipo                                                       | Req | Notas |
|--------------------|------------------------------------------------------------|-----|------|
| `request_id`       | `uuid` (v4)                                                | ✔︎  | Idempotencia por envío. |
| `type`             | `"contact_form" \| "support" \| "complaint" \| "suggestion" \| "newsletter"` | ✔︎ | Catálogo validado en DB. |
| `email`            | `text`                                                     | ✔︎  | Normalizado a lowercase (`citext` en DB). |
| `full_name`        | `text`                                                     | –   | Truncado a 128 chars si excede (normalizador). |
| `marketing_opt_in` | `boolean`                                                  | –   | Para `newsletter` el default efectivo es `true` si falta. |
| `payload`          | `jsonb`                                                    | –   | **`contact_form` requiere `{ "message": "..." }`**. |
| `utm`              | `jsonb`                                                    | –   | Metadatos de campaña. |
| `context`          | `jsonb`                                                    | –   | `{ path, url, referrer, ua, lang }` según caller. |
| `source`           | `text`                                                     | ✔︎  | Catálogo: **`web_form`**, `checkout`, `import`, `api`. Variantes se normalizan. |
| `metadata`         | `jsonb`                                                    | –   | Técnico `{ ip_hash, ip_class, request_ts, form_version }`. |

### Límites
- **Aplicados en la RPC (DB):**
  - `v_input` se valida por secciones con tope **64 KB** cada una (`utm`, `context`, `payload`, `metadata`, `tech_metrics` si existe).
  - `type`, `source`, `email`, `request_id` validados (formato y catálogos).
  - `contact_form` exige `payload.message` no vacío.
- **Aplicados en el caller (Next.js) para endurecer:**
  - `payload.message` ≤ **2 KB**.
  - `utm`, `context`, `metadata` ≤ **2 KB** cada uno.
  - `full_name` ≤ **128** chars.

> Si el caller envía tamaños mayores, la RPC puede aceptarlos hasta 64 KB por sección; el caller es la “policía” de límites estrictos.

---

## 4) Comportamiento por `type`

### 4.1) `contact_form` \| `support` \| `complaint` \| `suggestion`
1. **Upsert `contacts`** por `email` (crea o enriquece `full_name`, `utm`, `tech_metrics`, `metadata`).
2. **Inserta `messages`** con `payload.message` y enlaza `contact_id`.  
   - Idempotencia por `request_id` en `messages.metadata.request_id`.
3. Si `marketing_opt_in = true`, **registra `subscription_events`** con `event_type = 'opt_in'`.
4. Devuelve `status: "ok"` o `"duplicate"` si ya se procesó ese `request_id`.

### 4.2) `newsletter`
1. **Upsert `contacts`** por `email`.
2. `marketing_opt_in` faltante se considera `true` por convenio del caller.
3. Si `marketing_opt_in = true`, **`subscription_events: 'opt_in'`**.
4. No crea `messages` salvo que se reciba `payload` explícito.
5. Devuelve `status: "ok"` o `"duplicate"`.

---

## 5) Idempotencia
- Clave: `request_id` (UUID v4).
- Segundo llamado con el mismo `request_id` devuelve `status:"duplicate"` y referencias previas.

---

## 6) Salida (`RETURNS jsonb`)
```json
{
  "status": "ok | duplicate | error",
  "contact": {
    "id": "uuid",
    "email": "string",
    "consent_status": "none | single_opt_in | double_opt_in"
  },
  "message": { "id": "uuid|null" },
  "subscription_event": { "id": "uuid|null", "event_type": "opt_in|double_opt_in|unsubscribe|bounce|complaint|null" },
  "submission_id": "uuid",
  "version": "v1",
  "warnings": ["source_normalized:web_form", "truncated_field:full_name"]
}
````

Notas:

* En `newsletter` sin mensaje: `"message": { "id": null }`.
* `warnings[]` incluye claves estándar (`source_normalized:*`, `truncated_field:*`).

---

## 7) Errores y mapeo

* La RPC retorna `"error"` solo por fallos de negocio internos; errores SQL escalan al motor.
* El **endpoint Next.js** mapea:

  * 422 `invalid_input` (Zod)
  * 403 `turnstile_invalid`
  * 429 `rate_limited`
  * 500 `db_error|server_error`

---

## 8) Observabilidad

Output siempre incluye:

* `submission_id` = `request_id`
* `version` = `"v1"`
* `warnings[]` cuando hubo normalizaciones o truncamientos

Log recomendado en el caller:

* `request_id`, `type`, `source`, `status`, `latency_ms_rpc`, `contact_id`, `message_id`

---

## 9) Ejemplos

### 9.1) Contacto

**Entrada**

```json
{
  "request_id": "111e4567-e89b-42d3-a456-426614174000",
  "type": "contact_form",
  "email": "lead@example.com",
  "full_name": "Cliente Demo",
  "marketing_opt_in": false,
  "payload": { "message": "Quiero más información" },
  "utm": { "campaign": "launch" },
  "context": { "path": "/contacto", "lang": "es" },
  "source": "web_form",
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
  "source": "web_form",
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

### 9.3) Reintento

**Entrada:** repetir 9.1 con el mismo `request_id`.
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

## 10) Versionado

* **Alias estable:** `f_orch_contact_write` → `*_v1`.
* Cambios incompatibles publicarán `*_v2`; el alias se moverá tras migrar el caller.
* En v1 solo se **agregan** campos; no se renombra ni elimina ninguno existente.

---

## 11) Operación

* **Reintentos** del caller seguros por `request_id`.
* **Rate limit** fuera de la RPC (en el endpoint Next.js).
* **Imports/backfills:** usar `source:"import"` con pipeline dedicado; evitar este entrypoint público para cargas masivas.

```
```
