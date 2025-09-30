# docs/next_forms_integration.md 

# Guía para integración de formularios y RPC en Next.js

---

## Estado actual (2025-09-29)

- ✅ Schemas de validación (`zod`) listos.
- ✅ Helpers implementados: `h_validate_normalize`, `h_rate_limit_touch`, `h_call_orch_contact_write`, `h_hash`.
- ✅ Carpeta y estructura en `app/api/forms/submit/route.ts` creada.
- ✅ Contrato de entrada/salida validado contra RPC `f_orch_contact_write`.
- ✅ Rate limiting real: probado en producción (burst correcto, sustained requiere revisión de umbral).
- ✅ Logs estructurados JSON (`submit_ok`, `rpc_error`, `rate_limited`, `turnstile_fail`).
- ⏳ Integración con **Brevo** y **Resend**: diferida al **Paso 8**.
- ⏳ QA E2E formal: pendiente de ejecución completa (más allá de pruebas en prod).

---

## Objetivo
Dar al programador de Next.js las especificaciones necesarias para:
- Implementar los formularios de newsletter y contacto/soporte.
- Conectar con Supabase vía RPC `f_orch_contact_write`.
- Integrar con Brevo (marketing/CRM) y Resend (email transaccional).
- Cumplir con requisitos de seguridad, trazabilidad y analítica.

---

## 1. Endpoint en Next.js

**Ruta**: `POST /api/forms/submit`

- Solo servidor.  
- Llama `public.f_orch_contact_write` con `SUPABASE_SERVICE_ROLE_KEY`.  

### Request
JSON con estos campos:

| Campo              | Tipo        | Obligatorio | Notas |
| ------------------ | ----------- | ----------- | ----- |
| `email`            | string      | ✔️          | Email único, case-insensitive. |
| `request_id`       | uuid (v4)   | ✔️          | Generado en el cliente al enviar. |
| `type`             | string      | ✔️          | Ej: `contact_form`, `support`, `complaint`, `suggestion`, `newsletter`. |
| `source`           | string      | ✔️          | Ej: `web_form_contact`, `web_form_footer`, `checkout`. Normalizado a `web_form`. |
| `full_name`        | string      | opcional    | Nombre libre del lead. |
| `marketing_opt_in` | boolean     | opcional    | True dispara evento `opt_in`. |
| `payload`          | jsonb       | opcional    | Contenido principal (ej. `{ "message":"..." }`). |
| `utm`              | jsonb       | opcional    | `{ "source":"yt", "campaign":"..." }`. |
| `context`          | jsonb       | opcional    | `{ "path":"/contacto", "url":"...", "referrer":"..." }`. |
| `metadata`         | jsonb       | opcional    | Campos adicionales del integrador. |

### Response
La RPC devuelve un JSON con estructura:

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
  "submission_id": "uuid (request_id)",
  "version": "v1",
  "warnings": ["source_normalized:web_form"]
}
````

### Errores

* `invalid_input`: campos inválidos, payload > 64 KB, source no permitido.
* `duplicate`: request_id repetido.
* `db_error`: error SQL interno.
* `rls_blocked`: si alguien intenta llamar sin service_role.
* `rate_limited`: bloqueado por política de rate-limit.

---

## 2. Validaciones en Next.js

* Verificar token de **Turnstile** antes de llamar la RPC (skip si `FORMS_DISABLE_TURNSTILE=true`).
* Validar con Zod o similar:

  * Email válido.
  * `request_id` es UUID v4.
  * `type` dentro del catálogo permitido.
  * `source` dentro de variantes conocidas.
  * Tamaños: cada JSON ≤ 64 KB, `payload.message` ≤ 32 KB.
* Normalizar:

  * Email a lowercase.
  * Recortar strings largos.

---

## 3. Seguridad

* `SUPABASE_SERVICE_ROLE_KEY` **solo en servidor**. Nunca exponer en cliente.
* RPC ejecutada únicamente desde API routes o server actions.
* Rate-limit por IP y email implementado (burst probado, sustained requiere ajuste).
* Log de auditoría: `request_id`, `email`, `ip`, `ua`, `outcome`.
* **QA Guard**: si `FORMS_QA_GUARD=true`, el endpoint exige header `x-forms-qa-token`. Útil para entornos sin staging separado.

---

## 4. Idempotencia y reintentos

* Generar `request_id` en cliente al cargar el form o al presionar enviar.
* Si el usuario reintenta → usar el mismo `request_id`.
* Backend nunca debe re-generar `request_id`.
* Cliente puede reintentar seguro tras timeout.

---

## 5. Variables de entorno

* `SUPABASE_URL`
* `SUPABASE_SERVICE_ROLE_KEY`
* `TURNSTILE_SECRET_KEY`
* `FORMS_QA_GUARD` (`true|false`)
* `FORMS_QA_TOKEN`
* `FORMS_DISABLE_TURNSTILE` (`true|false`)
* `FORMS_DISABLE_RL` (`true|false`)
* `RESEND_API_KEY`
* `BREVO_API_KEY`
* `BREVO_LIST_NEWSLETTER`, `BREVO_LIST_CONTACT` (IDs de listas)
* `SENTRY_DSN`
* `GTM_ID`, `GA4_ID`, `META_PIXEL_ID`

---

## 6. Formularios UI/UX

### Newsletter Footer

* Campos: `email`
* `marketing_opt_in` = true por default
* `source=web_form_footer`
* `type=newsletter`
* Éxito: mostrar confirmación inmediata. GA4 → `subscribe`.

### Contacto/Soporte

* Campos: `full_name`, `email`, `message`, `marketing_opt_in` opcional.
* `source=web_form_contact`
* `type=contact_form` o `support`
* Éxito: “recibido”. GA4 → `generate_lead`.

---

## 7. Emails y CRM

### Resend (transaccional)

* Disparar desde Next tras respuesta `"status":"ok"|"duplicate"`.
* Solo para `support` o `complaint`.
* Contenido mínimo:

  * `to`: soporte interno.
  * `replyTo`: usuario.
  * `subject`: tipo de mensaje.
  * `body`: incluye `email`, `full_name`, `message`, `request_id`.
* No bloquear respuesta si falla. Reintentar async.

### Brevo (marketing/CRM)

* Alta/actualización de contacto async tras la RPC.
* Campos: `email`, `FULL_NAME`, `TAGS`.
* Añadir a `BREVO_LIST_NEWSLETTER` si `marketing_opt_in=true` o `type=newsletter`.
* Manejar rate-limit y errores con cola/reintentos.

---

## 8. Analítica

* GA4:

  * `subscribe` en newsletter éxito.
  * `generate_lead` en contacto éxito.
  * `form_error` con `reason` en errores.
* Meta Pixel: evento `Lead` en éxito.

---

## 9. Estados UI

* `ok`: “Gracias, te contactaremos pronto.”
* `duplicate`: “Ya recibimos tu envío.”
* `invalid_input`: “Revisa los campos e inténtalo de nuevo.”
* `rate_limited`: “Demasiados intentos, intenta más tarde.”
* `server_error`: “Hubo un problema, intenta de nuevo.”

---

## 10. Casos de prueba para QA

* Newsletter con opt-in ✔️
* Contacto con opt-in ✔️
* Contacto sin opt-in ✔️
* Reintento con mismo request_id → duplicate ✔️
* Payload grande → error invalid_input ✔️
* Source variante `web_form_footer` → warning ✔️
* Turnstile inválido → error 400 antes de la RPC ✔️
* Rate-limit burst → bloquea después del 3.º/4.º ✔️
* Rate-limit sustained → pendiente ajuste

---

## 11. Operación

* Timeout RPC: 5 s
* Timeout endpoint: 10 s
* Retries cliente: 0.5s, 1s, 2s
* Logging en server: `request_id`, `email`, `status`, `latency_ms`
* Sentry: captura excepciones con `request_id`

---

## 12. Entregables al dev

1. Este documento (`docs/next_forms_integration.md`).
2. Contrato de RPC en `docs/rpc_contact_write.md`.
3. Lista de env vars y valores de staging.
4. IDs de listas de Brevo.
5. Dirección de Resend para soporte interno.
6. Ejemplos de payloads para Postman:

```json
// Newsletter
{
  "type":"newsletter",
  "email":"user@example.com",
  "source":"web_form_footer",
  "request_id":"111e4567-e89b-42d3-a456-426614174000",
  "marketing_opt_in": true
}

// Contacto
{
  "type":"contact_form",
  "email":"lead@example.com",
  "full_name":"Cliente Demo",
  "source":"web_form_contact",
  "request_id":"222e4567-e89b-42d3-a456-426614174000",
  "marketing_opt_in": false,
  "payload":{"message":"quiero más información"},
  "utm":{"campaign":"test"},
  "context":{"path":"/contacto"}
}
```

```