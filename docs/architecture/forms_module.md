# docs/architecture/forms_module.md

# Arquitectura — Módulo de Formularios

Versión: 2025-09-28  
Owner: Huerta Consulting

---

## 1) Objetivo

Centralizar la recepción de formularios públicos (contacto, soporte, newsletter) en Next.js.  
El módulo aplica validaciones, seguridad y orquestación antes de invocar la RPC `f_orch_contact_write`.

---

## 2) Componentes principales

### 2.1 API Route
- **Ruta:** `app/api/forms/submit/route.ts`
- **Responsabilidad:**
  - Recibir `POST` requests.
  - Validar `turnstile_token`.
  - Parsear body JSON (`h_parse_body`).
  - Validar esquema (`SubmitInputSchema` con Zod).
  - Aplicar rate limit (`h_rate_limit_touch`).
  - Normalizar inputs (`h_validate_normalize`).
  - Llamar RPC vía `h_call_orch_contact_write`.
  - Devolver respuesta contractuada.

### 2.2 Helpers

| Archivo                               | Rol principal |
|---------------------------------------|---------------|
| `lib/forms/schemas.ts`                | Esquemas Zod y tipos TypeScript. |
| `lib/forms/h_parse_body.ts`           | Validación de tamaño y parseo JSON seguro. |
| `lib/forms/h_validate_normalize.ts`   | Reglas de normalización y warnings. |
| `lib/security/h_verify_turnstile.ts`  | Verifica token Turnstile contra API Cloudflare. |
| `lib/rate_limit/h_rate_limit_touch.ts`| Lógica de rate limiting por IP/email. |
| `lib/supabase/h_call_orch_contact_write.ts` | Cliente Supabase, llamada a RPC. |
| `lib/utils/h_hash.ts`                 | Hash SHA-256 (ej. de IP). |

---

## 3) Flujo de ejecución

1. Cliente envía formulario → `POST /api/forms/submit`.
2. API route ejecuta:
   1. Validar método = POST.
   2. Parsear body y verificar tamaño (`h_parse_body`).
   3. Validar y normalizar contra `SubmitInputSchema`.
   4. Verificar Turnstile (`h_verify_turnstile`).
   5. Aplicar rate limit (`h_rate_limit_touch`).
   6. Llamar RPC (`h_call_orch_contact_write`).
   7. Mapear respuesta a contrato público.
   8. Registrar logs básicos.
   9. Responder con JSON final.

---

## 4) Errores y status codes

| Error interno           | HTTP | Devuelve                                   |
|--------------------------|------|--------------------------------------------|
| `invalid_input`          | 422  | Campos inválidos o fuera de límites.       |
| `turnstile_invalid`      | 403  | Verificación de bot fallida.               |
| `rate_limited`           | 429  | Demasiados intentos por IP/email.          |
| `duplicate` (RPC)        | 200  | `status:"duplicate"` en cuerpo.            |
| `db_error` / `rpc_error` | 500  | `status:"error"`.                          |

---

## 5) Seguridad

- `SUPABASE_SERVICE_ROLE_KEY` solo en server (API routes).  
- Campos whitelist: solo se reenvían a la RPC los definidos en `SubmitInputSchema`.  
- Hash de IP antes de persistir (GDPR friendly).  
- Logs no deben contener PII en crudo.  
- Rate limit defendido por clave compuesta (IP + email).  

---

## 6) Logs y observabilidad

Formato JSON estructurado en server:

```json
{
  "level": "info",
  "event": "submit_ok",
  "request_id": "111e4567-e89b-42d3-a456-426614174000",
  "type": "contact",
  "status": "ok|duplicate",
  "latency_ms": 134,
  "ip_hash": "ab12…"
}
````

Eventos previstos:

* `submit_ok`
* `turnstile_fail`
* `rate_limited`
* `rpc_error`

---

## 7) Extensibilidad

* Nuevos `type` de formulario → agregar al schema y al contrato de RPC.
* Nuevos backends (ej. otro CRM) → integrar vía worker async después de la RPC.
* Múltiples dominios → controlar con campo `source` y warnings normalizados.

---

## 8) Estado actual

* Helpers creados y tipados.
* RPC contractuada.
* Endpoint estructurado pero aún pendiente de pruebas E2E y rate limit real.
* Integración con Brevo y Resend diferida a fases posteriores.

---