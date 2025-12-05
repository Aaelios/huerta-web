```md
# /docs/freeclass/03-registro-clase-gratuita.md
# BLOQUE 3 — REGISTRO DE CLASE GRATUITA  
Versión: v1 · Estado: **CONGELADO**

Este documento consolida todo el Bloque 3 del sistema de Free Class para LOBRÁ:  
Validación (3.A), Orquestación (3.B) y Endpoint HTTP (3.C).

---

# 0) OBJETIVO GENERAL

Implementar el flujo completo para **registrar una clase gratuita**:

```

POST /api/freeclass/register

````

El sistema debe:

1. Validar input (email, nombre, sku, consent, turnstile token, utm).
2. Determinar estado operacional de la clase e instancia.
3. Registrar o actualizar contacto vía orquestador.
4. Escribir acceso en `contacts.metadata.free_class_registrations`.
5. Escribir traza técnica en `contacts.tech_metrics.free_class_last_attempt`.
6. Enviar stub a Brevo (V1).
7. Devolver DTO final homogéneo y estable.

---

# 1) ARQUITECTURA (CONGELADA)

### 1.1. No existen entitlements para free class  
- Free class V1 **NO** crea entitlements.  
- **NO** depende de `auth.users`.  
- **NO** usa webhooks de Stripe.

### 1.2. Fuente de verdad del acceso  
Todo acceso se guarda en:

```jsonc
contacts.metadata.free_class_registrations: Array<{
  class_sku: string;
  instance_slug: string;
  status: "registered" | "waitlist" | "closed";
  ts: string; // ISO UTC
}>
````

### 1.3. Traza técnica

```jsonc
contacts.tech_metrics.free_class_last_attempt: {
  class_sku: string;
  instance_slug: string | null;
  result: "registered" | "waitlist" | "rejected_closed" 
        | "error_turnstile" | "error_validation";
  ts: string;
}
```

### 1.4. Función SQL obligatoria

Toda escritura de acceso se hace por:

```
app.f_contacts_free_class_upsert_v1
```

No se permite modificar `metadata` directamente desde TS.

---

# 2) FLUJO GENERAL

```
Client → POST /api/freeclass/register
  → 3.A validateRegisterPayload
    → Turnstile
  → 3.B handleRegistration
    → loadFreeClassPageBySku
    → load instances
    → resolveApplicableInstance
    → computeRegistrationState
    → h_call_orch_contact_write (crea/actualiza contacto)
    → f_contacts_free_class_upsert_v1
    → brevoFreeClassStub
  → 3.C route.ts
    → HTTP response + Server-Timing
```

---

# 3) SUB-BLOQUE 3.A — VALIDACIÓN + TURNSTILE

Archivo:

```
lib/freeclass/validateRegisterPayload.ts
```

### 3.A.1 Responsabilidades

* Validar cuerpo con Zod.
* Sanitizar valores.
* Validar consent.
* Validar turnstile (con bypass env).
* Serializar errores a un union estricto para 3.C.
* Generar `request_id`.
* Extraer `utm` crudo y normalizado.

### 3.A.2 Output

```ts
type ValidRegisterPayload = {
  email: string;
  full_name: string | null;
  sku: string;
  consent: boolean;
  instanceSlug: string | null;
  utm: UTMData | null;
  rawUTM: Record<string,string> | null;
  requestId: string;
  timings: { parse: number; zod: number; ts: number | null };
}
```

### 3.A.3 Errores posibles

* `invalid_input`
* `payload_too_large`
* `turnstile_invalid`

Todos compatibles con 3.C.

---

# 4) SUB-BLOQUE 3.B — ORQUESTACIÓN

Archivo:

```
lib/freeclass/handleRegistration.ts
```

### 4.B.1 Responsabilidad general

Convertir la validación en un resultado de negocio + escritura en DB.

### 4.B.2 Pasos

1. `loadFreeClassPageBySku(sku)`
2. `loadInstancesForSku(sku)`
3. `resolveApplicableInstance`
4. `computeRegistrationState`
5. Determinar:

   * `ui_state` (open | waitlist | closed)
   * `result` (registered | waitlist | rejected_closed)
   * `sql_status` (registered | waitlist | closed)
6. Registrar traza técnica en:

   * `tech_metrics.free_class_last_attempt`
7. RPC contacto:

   * `h_call_orch_contact_write`
8. SQL acceso:

   * `f_contacts_free_class_upsert_v1`
9. Brevo Stub:

   * `brevoFreeClassStub`
10. Retornar DTO para 3.C.

### 4.B.3 Output

```ts
export interface RegistrationOrchestrationResult {
  ok: boolean;
  contactId: string | null;
  sku: string;
  instanceSlug: string | null;
  registration_state: string;
  result: "registered" | "waitlist" | "rejected_closed";
  ui_state: "open" | "waitlist" | "closed";
  leadTracking: {
    class_sku: string;
    instance_slug: string | null;
    utm: Record<string,string> | null;
  };
  timings: {
    load_page: number | null;
    load_instances: number | null;
    contact_write: number | null;
    free_class_upsert: number | null;
    brevo_stub: number | null;
  };
}
```

### 4.B.4 Errores controlados

* Nunca lanza excepción a 3.C.
* En falla de DB/RPC → resultado: `rejected_closed`, `ok: false`.

---

# 5) SUB-BLOQUE 3.C — HTTP + RESPUESTA

Archivo:

```
app/api/freeclass/register/route.ts
```

### 5.C.1 Responsabilidades

* Endpoint HTTP completo.
* Enlazar 3.A + 3.B.
* Server-Timing.
* Logging estructurado.
* Respuestas consistentes.

### 5.C.2 Contrato final de respuesta

```jsonc
{
  "registration_state": "open" | "full" | "ended" | "canceled" | "upcoming" | "no_instance" | "closed",
  "result": "registered" | "waitlist" | "rejected_closed",
  "ui_state": "open" | "waitlist" | "closed",
  "leadTracking": {
    "class_sku": "...",
    "instance_slug": "...",
    "utm": { ... } | null
  },
  "nextStepUrl": null
}
```

### 5.C.3 Errores HTTP

| error_code         | HTTP |
| ------------------ | ---- |
| invalid_input      | 422  |
| payload_too_large  | 413  |
| turnstile_invalid  | 403  |
| method_not_allowed | 405  |
| server_error       | 500  |

### 5.C.4 Logging

* `validation_error`
* `turnstile_fail`
* `orchestration_ok`
* `orchestration_error`
* `unhandled_exception`

---

# 6) SQL — FUNCIÓN DE ESCRITURA (CONGELADA)

Archivo:

```
docs/freeclass/sql_free_class_upsert_v1.md
```

Nombre:

```
app.f_contacts_free_class_upsert_v1
```

Responsabilidad:

* Única vía para escribir:

  * `contacts.metadata.free_class_registrations[]`

Características principales:

* Upsert por `(class_sku, instance_slug)`
* Idempotente
* No borra claves existentes
* Mantiene array limpio y determinista
* Valida estado permitido: `registered | waitlist | closed`

---

# 7) BREVO STUB

Archivo:

```
lib/brevo/freeclass.ts
```

Siempre devuelve:

```ts
{ ok: true }
```

No envía correos.
Es intercambiable cuando llegue Brevo V2.

---

# 8) QA DEL BLOQUE 3

### A) Validación 3.A

* Payload vacío → 422
* Campos con tamaño excesivo → 422
* Turnstile inválido (bypass apagado) → 403
* Límite de bytes → 413

### B) Orquestación 3.B

* Instancia futura disponible → registered
* Instancia full + waitlistEnabled = true → waitlist
* Instancia full + waitlistEnabled = false → rejected_closed
* No hay instancia → rejected_closed
* RPC contacto falla → rejected_closed (200)

### C) Endpoint 3.C

* Solo POST → 405
* Server-Timing siempre presente
* Logging estructurado
* DTO completo y sin nulls inesperados

---

# 9) RIESGOS Y PENDIENTES

* Validar en staging `FREECLASS_DISABLE_TURNSTILE`.
* Confirmar carga correcta de FreeClassPage JSONC.
* Confirmar propagación de `instanceSlug` a Brevo en V2.
* Fase 2: `nextStepUrl` dinámico y prelobby.

---

# 10) RESUMEN PARA CHAT DE CONTROL

**Bloque 3 — Registro de Clase Gratuita**
Completado: **3.A + 3.B + 3.C + SQL + Stub Brevo**.

Sistema estable, determinista, extensible a V2 sin breaking changes.
Listo para QA técnico y pruebas manuales en local.

---

```
```
