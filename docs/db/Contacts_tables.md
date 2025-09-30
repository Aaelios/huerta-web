Perfecto. Te armo un archivo **consolidado y auto-contenido** en formato `.md` con toda la información de **formularios, contactos, mensajes y eventos de suscripción**.
Esto incluye: tablas, índices, constraints, triggers, funciones, RPCs, validaciones, contratos y seguridad.

---

````markdown
# 📄 Documentación Consolidada — Formularios, Contactos y Suscripciones

Versión: **v1** · Última actualización: 2025-09-30  
Owner: **Huerta Consulting**  
Entorno: **Supabase (Postgres 15)**  

---

## 1. Propósito

Centralizar en un único documento todas las reglas, tablas, funciones, RPCs, contratos y validaciones que soportan los **formularios unificados** (contacto y newsletter) y su flujo completo en base de datos.  
Este archivo es **fuente de verdad** para cualquier desarrollador o integración.

---

## 2. Extensiones requeridas

```sql
citext             -- emails case-insensitive
pgcrypto           -- gen_random_uuid()
uuid-ossp          -- uuid_generate_v4()
plpgsql            -- lenguaje de funciones
pg_stat_statements -- métricas
pg_graphql         -- soporte GraphQL en Supabase
supabase_vault     -- manejo de secretos
````

---

## 3. Tablas y restricciones

### 3.1 contacts

```sql
id               uuid  PK, default gen_random_uuid()
email            citext UNIQUE NOT NULL
user_id          uuid FK → auth.users.id (ON DELETE SET NULL)
status           text  NOT NULL CHECK ∈ {active, unsubscribed, bounced, blocked}
consent_status   text  NOT NULL CHECK ∈ {none, single_opt_in, double_opt_in}
consent_source   text  NULL    CHECK ∈ {web_form, checkout, import, api}
consent_at       timestamptz
double_opt_in_at timestamptz
segment          text
utm              jsonb NOT NULL default '{}'
tech_metrics     jsonb NOT NULL default '{}'
metadata         jsonb NOT NULL default '{}'
created_at       timestamptz NOT NULL default now()
updated_at       timestamptz
full_name        text
```

**Índices**

* `ux_contacts__email` (UNIQUE)
* `idx_contacts__status`
* `idx_contacts__consent_status`
* `idx_contacts__created_at`
* `idx_contacts__user_id`

---

### 3.2 messages

```sql
id                uuid  PK, default gen_random_uuid()
contact_id        uuid  FK → contacts.id (ON DELETE RESTRICT)
source            text  NOT NULL CHECK ∈ {web_form, checkout, import, api}
payload           jsonb NOT NULL default '{}'
utm               jsonb NOT NULL default '{}'
context           jsonb NOT NULL default '{}'
processing_status text  NOT NULL CHECK ∈ {received, queued, sent_to_crm, discarded}
metadata          jsonb NOT NULL default '{}'
created_at        timestamptz NOT NULL default now()
updated_at        timestamptz
```

**Índices**

* `ux_messages_contact_request` UNIQUE(contact_id, metadata->>'request_id')
* `idx_messages__contact_id`
* `idx_messages__created_at`
* `idx_messages__processing_status`
* `idx_messages__source`

---

### 3.3 subscription_events

```sql
id              uuid  PK, default gen_random_uuid()
contact_id      uuid  FK → contacts.id (ON DELETE RESTRICT)
event_type      text  NOT NULL CHECK ∈ {opt_in, double_opt_in, unsubscribe, bounce, complaint}
source          text  NOT NULL CHECK ∈ {web_form, checkout, import, api, provider_webhook}
reason          text
campaign_id     text
idempotency_key text UNIQUE
metadata        jsonb NOT NULL default '{}'
occurred_at     timestamptz NOT NULL default now()
created_at      timestamptz NOT NULL default now()
updated_at      timestamptz
```

**Índices**

* `subscription_events_idempotency_key_key` UNIQUE(idempotency_key)
* `idx_subscription_events__contact_id`
* `idx_subscription_events__event_type`
* `idx_subscription_events__occurred_at`

---

## 4. Triggers

### Función audit

```sql
CREATE OR REPLACE FUNCTION app.f_audit_updated_at_only_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### Triggers instalados

```sql
CREATE TRIGGER trg_contacts_updated_at
BEFORE UPDATE ON public.contacts
FOR EACH ROW EXECUTE FUNCTION app.f_audit_updated_at_only_update();

CREATE TRIGGER trg_messages_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION app.f_audit_updated_at_only_update();

CREATE TRIGGER trg_subscription_events_updated_at
BEFORE UPDATE ON public.subscription_events
FOR EACH ROW EXECUTE FUNCTION app.f_audit_updated_at_only_update();
```

---

## 5. Funciones principales

### 5.1 Normalización

```sql
app.f_contact_normalize_v1(p_input jsonb) → jsonb
```

* Normaliza email, type, source.
* `web_form_contact` y `web_form_footer` → `web_form`.

---

### 5.2 Validación

```sql
app.f_contact_validate_v1(p_input jsonb) → void
```

Reglas:

* `email`, `type`, `source`, `request_id` requeridos.
* `email` regex válido.
* `request_id` debe ser UUID v4.
* `type ∈ {newsletter, contact_form}`.
* `source ∈ {web_form, checkout, import, api}`.
* `payload.message` requerido si `type=contact_form`.
* `metadata.motivo ∈ {pago, acceso, mejora, consulta, soporte}` si existe.
* `metadata.telefono` regex `^[+0-9][0-9 +\-]{6,19}$` si existe.
* Tamaño de `utm/tech/context/payload/metadata` ≤ 65 KB.
* `RAISE EXCEPTION ... USING ERRCODE '22023'` → `invalid_input`.

---

### 5.3 Upsert de contactos

```sql
app.f_contacts_upsert_v1(p jsonb) → uuid
```

* Busca por email.
* Inserta o actualiza `contacts`.
* Aplica consentimiento vía `app.f_contacts_apply_consent_v1`.

---

### 5.4 Mensajes idempotentes

```sql
app.f_messages_idempotent_v1(p_contact_id uuid, p jsonb) → uuid
```

* Dedupe por `(contact_id, metadata->>'request_id')`.
* Guarda payload y auditoría (`original_hash`, `size_bytes`, `original_input`).

---

### 5.5 Eventos de suscripción

```sql
app.f_subscription_events_log_v1(p_contact_id uuid, p jsonb) → uuid
```

* `event_type ∈ {opt_in, double_opt_in, unsubscribe, bounce, complaint}`.
* `source` normalizado.
* Idempotencia por `f_event_idempotency_key_v1(...)`.

---

### 5.6 Orquestación RPC

```sql
public.f_orch_contact_write(p_input jsonb) → jsonb
```

* Entry point RPC.
* Delegado a `f_orch_contact_write_v1`.

```sql
public.f_orch_contact_write_v1(p_input jsonb) → jsonb
```

Flujo:

1. Normaliza con `f_contact_normalize_v1`.
2. Valida con `f_contact_validate_v1`.
3. Upsert contacto.
4. Insert mensaje idempotente.
5. Si `marketing_opt_in=true` → log de `subscription_event`.
6. Devuelve JSON con `status=ok|duplicate`, ids de contacto/mensaje/evento.

---

## 6. Seguridad

### Grants

* `anon` y `authenticated`: **sin permisos** en `contacts|messages|subscription_events`.
* `service_role`: acceso solo vía RLS policies (ver abajo).
* `postgres`: full acceso.

### Policies activas

* `contacts_all_service_role` → ALL para `service_role`.
* `messages_all_service_role` → ALL para `service_role`.
* `subscription_events_insert_sr` → INSERT para `service_role`.
* `subscription_events_select_sr` → SELECT para `service_role`.

---

## 7. Contratos de entrada/salida

### 7.1 Contact Form (input)

```json
{
  "type": "contact_form",
  "source": "web_form",
  "request_id": "uuid-v4",
  "email": "qa@example.com",
  "full_name": "Nombre Apellido",
  "payload": { "message": "≥20 caracteres" },
  "metadata": {
    "motivo": "pago|acceso|mejora|consulta|soporte",
    "telefono": "+52 55 1234 5678"
  },
  "utm": { "campaign": "…" },
  "context": { "page": "/contacto" }
}
```

### 7.2 Newsletter (input)

```json
{
  "type": "newsletter",
  "source": "web_form",
  "request_id": "uuid-v4",
  "email": "qa@example.com",
  "full_name": "Opcional",
  "marketing_opt_in": true,
  "utm": { "campaign": "…" },
  "context": { "page": "/footer" }
}
```

### 7.3 RPC Output

```json
{
  "version": "v1",
  "submission_id": "uuid-v4",
  "status": "ok|duplicate",
  "contact": { "id": "uuid", "email": "qa@example.com", "consent_status": "none|single_opt_in|double_opt_in" },
  "message": { "id": "uuid" },
  "subscription_event": { "id": "uuid|null", "event_type": "opt_in|null" },
  "warnings": []
}
```

### 7.4 Errores

* `invalid_input` (422) con detalle.
* `qa_forbidden` (403).
* `turnstile_invalid` (403).
* `duplicate` (200 con `status=duplicate`).
* `rate_limit`, `payload too large`, `method not allowed`, `internal error`.

---

## 8. Flujo jerárquico

```
API → /api/forms/submit → RPC public.f_orch_contact_write
   ├─ app.f_contact_normalize_v1
   ├─ app.f_contact_validate_v1
   ├─ app.f_contacts_upsert_v1
   ├─ app.f_messages_idempotent_v1
   └─ app.f_subscription_events_log_v1 (opt-in)
```

---

## 9. Pruebas de integración (SQL)

Casos validados:

1. OK contacto soporte con teléfono válido.
2. KO motivo fuera de catálogo.
3. KO teléfono inválido.
4. Duplicate por `request_id`.
5. OK newsletter sin metadata.
6. KO `request_id` inválido.

---

## 10. Checklist de aceptación

* `request_id` único → duplicate manejado.
* Honeypot (`company`) validado en API, no en SQL.
* `metadata.motivo` validado en SQL.
* `metadata.telefono` validado en SQL.
* Consentimiento reflejado en `contacts.consent_status`.
* Eventos de suscripción registrados con idempotencia.
* Seguridad: acceso real solo vía `service_role`.

---
