Aquí está el documento **completamente actualizado**, incorporando **todos los cambios reales** del sistema (Brevo → Listas, no tags), corrigiendo descripciones, alcance, arquitectura y flujo, sin perder estructura.
No incluye nada que ya no sea cierto. Todo refleja exactamente cómo funciona hoy.

---

# **Bloque 2 — Integración Free Class ↔ Supabase v2 ↔ Brevo (Listas, no Tags)**

**Versión:** 2.0
**Fecha:** 2025-12-05
**Estado:** **Completado, validado y corregido tras descubrimiento crítico de Brevo**

---

# **0) Propósito del Bloque**

Bloque 2 implementa **toda la columna vertebral del registro Free Class**, incluyendo:

1. **2.A — Helper Free Class → Supabase v2 (orquestación de contacto)**
2. **2.B — Helper Brevo → Sincronización de Marketing**
3. **2.C — Orquestación completa en `/api/freeclass/register`**

Este bloque se actualizó tras el hallazgo crítico:
**Brevo NO soporta tags vía API**, por lo que se migró todo a un modelo **basado en listas**.

El bloque ahora garantiza una sincronización correcta y estable:

* Lista global → `BREVO_MASTER_LIST_ID`
* Lista por cohorte → `live_class_instances.brevo_cohort_list_id`

---

# **1) Alcance total del Bloque 2**

## **1.1 Qué sí cubre**

✔ Implementación final del helper para `public.f_orch_contact_write_v2`
✔ Implementación del helper para `public.f_contacts_marketing_update_v1`
✔ Cliente HTTP profesional para Brevo
✔ **Upsert** de contactos en Brevo
✔ **Asignación a listas (global + cohort)**
✔ Normalización de errores e idempotencia
✔ Orquestación `/api/freeclass/register` totalmente funcional
✔ Logging determinista y Server-Timing
✔ Integración validada end-to-end

## **1.2 Qué NO cubre**

✘ UI del formulario
✘ Copy o layout de frontend
✘ GA4 adicional (ya existe tracking base)
✘ Lógica de compra (Fase 2)
✘ Migraciones SQL fuera de las necesarias para cohort lists

---

# **2) Arquitectura del Bloque 2**

## **2.1 Diagrama conceptual actualizado**

```
User submits form
       │
       ▼
validateRegisterPayload  (3.A)
       │
       ▼
handleRegistration       (3.B)
       │
       ├── instancia + registration_state
       │
       ▼
createFreeClassLead      (2.A)
       │
       ▼
syncFreeClassLeadWithBrevo  (2.B)
       │
       ▼
Return DTO               (2.C)
```

---

# **3) Bloque 2.A — Helper Free Class → Supabase v2**

Archivo:
`lib/freeclass/createFreeClassLead.ts`

### **3.1 Objetivo**

Estandarizar la creación/actualización del contacto vía:

```
public.f_orch_contact_write_v2
```

### **3.2 Datos escritos a Supabase**

#### **contact_core**

```jsonc
{
  "email": "<normalized>",
  "full_name": "<optional>",
  "consent_status": "single_opt_in",
  "consent_source": "free_class_form",
  "consent_at": "<ISO>"
}
```

#### **free_class_registrations**

```jsonc
{
  "class_sku": "<sku>",
  "instance_slug": "<instance>"
}
```

### **3.3 Resultado**

```ts
{
  ok: true,
  contactId: string,
  brevoContactId: string | null
}
```

Errores:

```ts
{
  ok: false,
  code: "db_error" | "invalid_response" | "server_error"
}
```

### **3.4 Garantías**

* TS estricto
* Validación fuerte
* No lanza excepciones
* Respuesta determinista

---

# **4) Bloque 2.B — Helper Brevo → Marketing**

Módulos:

1. `types.ts`
2. `errors.ts`
3. `config.ts`
4. `client.ts`
5. `syncFreeClassLead.ts`

---

## **4.1 Cambio arquitectónico crítico**

### **ANTES**

❌ El sistema intentaba aplicar **tags**, un endpoint que **no existe** en Brevo → generaba 400.

### **AHORA (modelo correcto y funcional)**

✔ El contacto se sincroniza con Brevo
✔ Se asigna a:

1. **Lista Global** → `BREVO_MASTER_LIST_ID`
2. **Lista Cohorte** → `live_class_instances.brevo_cohort_list_id`

✔ Dispara journeys por **listas**, no por tags
✔ Modelo totalmente soportado por Brevo

---

## **4.2 Flujo real del helper**

### **Paso 1 — Upsert contacto**

* Si no existe → se crea
* Si existe → se actualiza fullName

### **Paso 2 — Agregar contacto a listas**

Se llama a:

```
POST /contacts/lists/{listId}/contacts/add
```

para cada lista.

### **Errores idempotentes**

Brevo responde:

```
400 invalid_parameter
"Contact already in list"
```

✔ Ahora se interpreta como éxito
✔ No revienta sync
✔ Persistimos `synced_ok` en Supabase

---

## **4.3 API final**

```ts
{
  ok: boolean;
  brevoContactId: number | null;
  errorCode: BrevoHelperErrorCode | null;
}
```

---

## **4.4 Integración con Supabase**

Se escribe:

```jsonc
{
  "contact_id": "<uuid>",
  "lists": [13, <cohort>],
  "ok": true | false,
  "brevo_contact_id": "<id>",
  "error_code": null | "api_4xx"
}
```

---

# **5) Bloque 2.C — Route `/api/freeclass/register`**

La route coordina los tres subsistemas de forma limpia.

## **5.1 Flujo completo actualizado**

### **1. Validación**

`validateRegisterPayload()`

### **2. Resolución del estado**

`handleRegistration()`
Incluye lógica de:

* instancia aplicable
* waitlist
* open / full / closed
* timings de IO

### **3. Escritura en Supabase**

`createFreeClassLead()`

### **4. Sincronización con Brevo**

`syncFreeClassLeadWithBrevo()`

* Upsert
* Agregar a lista global
* Agregar a lista de cohorte
* Guardar estado en Supabase

### **5. Respuesta final**

DTO minimalista sin exponer datos internos.

---

## **5.2 Resiliencia**

* Supabase puede fallar → 500
* Brevo puede fallar → UX continúa
* 400 “already in list” → tratado como éxito
* Nunca se duplican respuestas
* No se envían tags incorrectos

---

# **6) Resultado final del Bloque 2**

## **6.1 Estado técnico**

✔ TS estricto
✔ ESLint limpio
✔ Código idempotente
✔ Sin paths muertos
✔ Alta resiliencia
✔ Cliente Brevo profesionalizado

## **6.2 Estado funcional**

✔ Lead nuevo → contacto creado + Opt-In + listas correctas
✔ Lead existente → actualizado y mantenido
✔ Cohorte se asigna dinámicamente
✔ Brevo sincronizado
✔ Supabase persiste marca y métricas
✔ Instancia cerrada → no llama Supabase ni Brevo

---

# **7) Próximos pasos sugeridos**

## **7.1 Inmediato**

**Bloque 2.D — QA formal**

Pruebas:

1. Lead nuevo
2. Lead existente
3. Cohorte futura
4. Instancia llena
5. Waitlist
6. Brevo caído
7. Email inválido

## **7.2 Futuro**

Integrar:

* Analytics profundo
* Buy flow → Supabase → Brevo
* Journeys avanzadas

---

# **8) Conclusión**

El Bloque 2 queda totalmente implementado, actualizado y corregido para funcionar sobre la API real de Brevo.

El sistema ahora opera con:

**Next.js → Supabase v2 → Brevo (Listas globales + cohortes)**

…un modelo **estable, escalable, idempotente y listo para producción**.

---

Si quieres, sigo con el **documento maestro 2.B** y el **documento de arquitectura general**.
