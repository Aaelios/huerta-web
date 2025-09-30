# docs/forms_contacto.md

# 📄 Contrato y Documentación — Formularios de Contacto y Newsletter

Versión: **v1** · Última actualización: 2025-09-30  
Owner: **Huerta Consulting** · Namespace: `public`

---

## 1. Propósito

Unificar contrato y flujos de los formularios de **contacto** y **newsletter (footer)** bajo una sola fuente de verdad para frontend, API y Supabase.  
El documento es detallado y auto-contenible para evitar reanálisis en el futuro.

---

## 2. Situación inicial

* Divergencia entre validaciones frontend y backend:
  * Nombre requerido en UI, opcional en backend.
  * Mensaje ≥20 en UI, ≥1 en backend.
* Catálogo de motivos distinto en UI y backend (`soporte` faltaba en el catálogo).
* `request_id` se reutilizaba en reenvíos → duplicados.
* Honeypot (`company`) existía en UI pero no se validaba en servidor.
* 403 no diferenciaba QA guard de Turnstile.
* Normalización de `source` ocurría en JS y en SQL → duplicado.
* Comentarios inconsistentes en RPC (`p_input` vs `v_input`).

---

## 3. Decisiones v1

* **Nombre**:  
  * Requerido en contacto (2–128).  
  * Opcional en newsletter.  
* **Mensaje**: mínimo 20 chars (contacto).  
* **RPC param**: `p_input` como estándar único.  
* **`request_id`**: nuevo UUID en cada envío.  
* **Honeypot**: `company` validado en servidor. Si lleno → 422 `invalid_input` + `issues[]` + log `honeypot_blocked`.  
* **403 diferenciados**:  
  * QA guard → `qa_forbidden`.  
  * Turnstile inválido → `turnstile_invalid`.  
* **Turnstile bypass**: si `FORMS_DISABLE_TURNSTILE=true`, `turnstile_token` puede ser vacío.  
* **Source normalization**: solo en JS. SQL no repite warnings.  
* **Motivos válidos**: `[pago, acceso, mejora, consulta, soporte]`.  
* **Teléfono**: opcional, validado por regex en servidor. Recomendado si motivo=soporte.  
* **Schema versioning**: agregado `SCHEMA_VERSION = "v1"`.  

---

## 4. Impacto por capa

### Frontend
* Regenerar `request_id` en cada envío.  
* Catálogo `MOTIVOS` actualizado con `soporte`.  
* Validar `message ≥20`.  
* Mostrar mensajes distintos para `qa_forbidden` vs `turnstile_invalid`.  
* Manejar 413 específico.  
* Ajustar UI para mostrar `issues[]` de error 422.  

### API
* Schemas Zod: `full_name` requerido solo en contacto.  
* Validación `payload.message ≥20`.  
* Campo `company` validado explícitamente.  
* Errores diferenciados en 403.  
* `issues[]` incluidos en 422.  
* Header `Server-Timing` agregado.  
* Logs enriquecidos: `schema_version`, `warning_codes`, métricas de latencia.  

### SQL/RPC
* Param oficial `p_input`.  
* Quitar warning duplicado de source.  
* Validar `metadata.motivo` contra catálogo.  
* Validar `metadata.telefono` con regex.  

---

## 5. Orden de implementación

1. Documentación (este archivo).  
2. Frontend → `FormularioContacto.tsx`.  
3. API → `schemas.ts`, `h_validate_normalize.ts`, handler.  
4. SQL → validaciones `motivo` y `telefono`.  
5. Pruebas unitarias e integración.  

---

## 6. Criterios de aceptación

* `request_id` siempre único.  
* Honeypot bloquea y devuelve 422.  
* 403 diferenciados funcionan en UI.  
* Mensajes <20 chars rechazados con 422.  
* Motivo fuera de catálogo → 422.  
* Logs muestran `schema_version`, `issues[]`, `warning_codes`.  

---

## 7. Contrato final

### 7.1 Payload — `contact_form`

```json
{
  "type": "contact_form",
  "source": "web_form",
  "request_id": "uuid-v4",
  "email": "correo@ejemplo.com",
  "full_name": "Nombre Apellido",
  "marketing_opt_in": true,
  "payload": {
    "message": "Texto con al menos 20 caracteres"
  },
  "metadata": {
    "motivo": "pago|acceso|mejora|consulta|soporte",
    "telefono": "+52 55 1234 5678"
  },
  "utm": { "campaign": "…" },
  "context": { "page": "/contacto" },
  "turnstile_token": "string >=10 chars",
  "company": ""   // Honeypot
}
````

### 7.2 Payload — `newsletter`

```json
{
  "type": "newsletter",
  "source": "web_form",
  "request_id": "uuid-v4",
  "email": "correo@ejemplo.com",
  "full_name": "Opcional",
  "marketing_opt_in": true,
  "utm": { "…" },
  "context": { "page": "/footer" },
  "metadata": {},
  "turnstile_token": "string >=10 chars (o vacío si bypass)",
  "company": ""
}
```

### 7.3 Respuesta (200 OK)

```json
{
  "submission_id": "uuid-v4",
  "contact_id": "uuid",
  "message_id": "uuid",
  "type": "contact_form",
  "status": "ok|duplicate",
  "warnings": ["source_normalized:web_form", "truncated_field:full_name"]
}
```

### 7.4 Errores

```jsonc
// 422 invalid_input
{
  "error_code": "invalid_input",
  "request_id": "uuid-v4",
  "issues": [
    { "path": ["full_name"], "code": "too_small", "message": "Debe tener al menos 2 caracteres" },
    { "path": ["payload","message"], "code": "too_small", "message": "Debe tener al menos 20 caracteres" }
  ]
}

// 403 qa_forbidden
{ "error_code": "qa_forbidden", "message": "Forbidden" }

// 403 turnstile_invalid
{ "error_code": "turnstile_invalid", "message": "Verificación fallida" }
```

Otros errores:

* 429 → rate limit.
* 413 → payload demasiado grande.
* 405 → método inválido.
* 500 → error interno o RPC.

---

## 8. Flujo y jerarquía

```
/app/contacto/page.tsx
└─ <FormularioContacto/>
    ├─ valida UI (nombre, email, motivo, tel, mensaje≥20, Turnstile)
    ├─ genera request_id
    └─ POST → /api/forms/submit
        ├─ h_parse_body + assertMaxBodyBytes
        ├─ Zod SubmitInputSchema
        ├─ h_validate_normalize
        ├─ honeypot check
        ├─ h_verify_turnstile (bypass opcional)
        ├─ h_rate_limit_touch (IP/email hash)
        ├─ h_call_orch_contact_write (RPC `p_input`)
        │    └─ public.f_orch_contact_write → v1
        │         ├─ app.f_contact_normalize_v1
        │         ├─ app.f_contact_validate_v1
        │         ├─ app.f_contacts_upsert_v1
        │         ├─ app.f_messages_idempotent_v1
        │         └─ app.f_subscription_events_log_v1
        └─ Respuesta 200/error + logs JSON
```

---

## 9. Esquema de BD relevante

### contacts

* PK: `id`
* UNIQUE: `email`
* FKs: `user_id → auth.users.id`
* Campos: `email citext`, `status`, `consent_status`, `consent_source`, `full_name`, `utm`, `metadata`.

### messages

* PK: `id`
* FK: `contact_id → contacts.id`
* UNIQUE: `(contact_id, metadata->>'request_id')`
* Campos: `payload jsonb`, `utm`, `context`, `processing_status`.

### subscription_events

* PK: `id`
* FK: `contact_id → contacts.id`
* UNIQUE: `idempotency_key`
* Campos: `event_type`, `source`, `campaign_id`, `metadata`.

---

## 10. Contratos internos

| capa    | entrada                                | salida                                                   |
| ------- | -------------------------------------- | -------------------------------------------------------- |
| UI→API  | payload contratos finales              | 200 ok/duplicate + warnings o error                      |
| API→RPC | safelist `RPC_SAFE_FIELDS` (`p_input`) | `{status, submission_id, contact, message}`              |
| RPC→BD  | normaliza/valida y upserts             | escribe en `contacts`, `messages`, `subscription_events` |

---

## 11. Diferencias vs situación inicial

* Nombre ahora requerido en contacto.
* Mínimo 20 chars en mensaje.
* Motivos unificados con “soporte”.
* `request_id` regenerado siempre.
* Honeypot validado en servidor.
* Errores 403 diferenciados.
* Respuesta 422 incluye `issues[]`.
* `Server-Timing` agregado en headers.
* Logs enriquecidos con métricas y `schema_version`.
* `p_input` confirmado como contrato oficial.
* Normalización de `source` solo en JS.

---

## 12. Checklist de implementación

### Frontend

* `request_id` nuevo en cada envío.
* Catálogo `MOTIVOS` actualizado.
* Manejo de errores 413 y 403 diferenciados.
* Mostrar `issues[]` de 422.

### API

* Validar honeypot.
* Validar nombre y mensaje.
* Incluir `issues[]` en 422.
* Headers `Server-Timing`.
* Logs con `schema_version` y warning codes.

### SQL

* Validar `metadata.motivo` y `telefono`.
* Mantener `p_input`.
* Evitar warnings duplicados.

```
