# Lista Base de Implementación · F1 Free Class  
Versión: 1.0  
Fecha: 28 nov 2025  
Archivo sugerido: `docs/brevo/implementacion_f1_lista_base.md`

Orden optimizado considerando dependencias.  
Esta lista define las tareas para chats hijo de implementación.

---

## 1) Supabase · Estructura y RPCs (fundacional)

### 1.1 Confirmar estado actual
- Verificar que `contacts` sigue vacía.  
- Confirmar estructura existente de `metadata.freeclass*`.  
- Validar RPCs legacy:
  - `public.f_orch_contact_write` → `app.f_orch_contact_write_v1`.  
  - `app.f_contacts_free_class_upsert`.

### 1.2 Extender schema de `contacts`
- Agregar columna `brevo_contact_id`.  
- Agregar rama `metadata.marketing.*`:
  - `metadata.marketing.tags[]`  
  - `metadata.marketing.brevo.last_status`  
  - `metadata.marketing.brevo.last_sync_at`  
  - `metadata.marketing.brevo.last_error_code?`

### 1.3 Crear orquestadora nueva v2 (interno `app`)
- `app.f_orch_contact_write_v2`:
  - Upsert contacto (core).  
  - Reutilizar `app.f_contacts_free_class_upsert` para `free_class_*`.  
  - Soportar `user_id` (aunque no se use aún en F1).

### 1.4 Crear wrapper público v2
- `public.f_orch_contact_write_v2` → llama a `app.f_orch_contact_write_v2`.  
- Mantener v1 intacta (**no romper forms legacy**).

### 1.5 Crear RPC marketing
- `app.f_contacts_marketing_update_v1`  
- `public.f_contacts_marketing_update_v1`  
- Responsabilidades:
  - Actualizar `brevo_contact_id`.  
  - Actualizar `metadata.marketing.tags[]`.  
  - Actualizar `metadata.marketing.brevo.*`.  
  - Ajustar `contacts.status = 'bounced'` si `invalid_email`.

---

## 2) Next.js · Conexión con Supabase + Brevo

### 2.1 Variables de entorno Brevo
- Definir `BREVO_API_KEY_NONPROD` (local/preview).  
- Definir `BREVO_API_KEY_PROD` (producción).  
- No usarlas aún en código.

### 2.2 Actualizar helper Free Class → usar v2
- Sustituir la lógica actual:
  - `public.f_orch_contact_write` + `f_contacts_free_class_upsert`.  
- Usar **solo** `public.f_orch_contact_write_v2`.  
- Devolver desde helper:
  - `contact_id`,  
  - estado de negocio,  
  - `brevo_contact_id` si viene.

### 2.3 Crear helper de marketing (Supabase)
- Enviar a `public.f_contacts_marketing_update_v1`:
  - `contact_id`,  
  - tags finales,  
  - resultado Brevo (`ok`, `brevo_contact_id?`, `error_code?`).

### 2.4 Implementar helper Brevo
- Entrada: `marketingEvent`:
  - `type`,  
  - `email`, `full_name`,  
  - `class_sku`, `instance_slug`,  
  - `tags[]`,  
  - `currentBrevoId?`.
- Lógica:
  - Normalizar email.  
  - Deduplicar tags.  
  - Upsert en Brevo (id o email).  
  - Aplicar tags sin borrar otros.  
- Salida:
  - `{ ok, brevo_contact_id?, error_code? }`.  
- Logging estructurado obligatorio.

### 2.5 Actualización de `/api/freeclass/register`
Flujo final:
1. Validaciones + Turnstile + rate-limit.  
2. Helper Free Class → `public.f_orch_contact_write_v2`.  
3. Helper Brevo.  
4. Helper Marketing Supabase → actualizar tags y estado Brevo.  
5. Responder a UI sin bloquear por fallas de Brevo.

---

## 3) Brevo · Configuración inicial

### 3.1 Confirmar atributos/core
- `EMAIL` y `FIRSTNAME` presentes.  
- Lista general de contactos LOBRÁ definida.

### 3.2 Crear tags F1
- `lead_freeclass_fin_freeintro`  
- `lead_freeclass_fin_freeintro_2025-12-09-1900`  
- `lead_freeclass_fin_freeintro_2025-12-16-1900`

### 3.3 Configurar journeys (PROD)
- Journey 09-dic:
  - Trigger: tag de cohorte 09-dic.  
- Journey 16-dic:
  - Trigger: tag de cohorte 16-dic.  
- Config:
  - no reinscribir,  
  - pasos: confirmación → 24h → 2h → post → nurturing.

### 3.4 Validar entornos Brevo
- NONPROD: journeys apagados.  
- PROD: journeys 09/16 activos.

---

## 4) QA · Antes del 9-dic y 16-dic

### 4.1 Prueba punta a punta 09-dic
- Registro real desde landing.  
- En Supabase:
  - fila creada,  
  - `free_class_registrations` correcta,  
  - tags correctos,  
  - `brevo_contact_id` no nulo,  
  - `metadata.marketing.brevo.last_status = 'synced_ok'`.  
- En Brevo PROD:
  - contacto con tags correctos,  
  - journey 09-dic activado.

### 4.2 Prueba de error Brevo
- Forzar error en NONPROD.  
- Validar:
  - UI responde éxito si Supabase fue correcto,  
  - `last_status = 'sync_error'`,  
  - `last_error_code`,  
  - `bounced` si `invalid_email`.

### 4.3 Prueba 16-dic
- Registro real cohorte 16-dic.  
- Validar separación de cohortes y journeys.

---

## 5) Extras recomendados (no bloquean F1)

### 5.1 Crear vistas QA en Supabase
- `vista_sync_brevo`  
- `vista_freeclass_cohortes`  
- `vista_sync_error`  
- `vista_never_synced`  
- `vista_bounced`

### 5.2 Actualizar documentación maestro
- Registrar:
  - nombres reales de RPCs,  
  - helpers Next,  
  - tags y journeys en Brevo.

---

# Estado
Lista optimizada basada en dependencias.  
Lista lista para crear chats hijos de implementación.  
