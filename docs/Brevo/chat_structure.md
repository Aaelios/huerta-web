````md
# Arquitectura de Implementación · Integración Brevo ↔ LOBRÁ  
**Árbol de Chats Hijo + Resumen de Responsabilidades**  
v1.0 — 28 nov 2025

Este documento define el **árbol de Chats Hijo** bajo un futuro **Chat de Control · Implementación Brevo**, alineado con:

- Documento Maestro de Arquitectura  
- Documento de Implementación de Alto Nivel  
- Roadmap Fase 1 (9/16-dic) y Fase 2 (27-dic → 13-ene-2026)

Cada nodo define su responsabilidad y entregable esperado en formato `.md`.  
Todos los chats trabajan **sin código**, solo diseño y plan de ejecución.

---

# 🧱 NIVEL SUPERIOR — Chat de Control · Implementación Brevo

## Responsabilidad principal
- Orquestar la implementación de Brevo ↔ LOBRÁ según arquitectura aprobada.  
- Abrir y cerrar Chats Hijo en orden, cuidando dependencias.  
- Mantener foco en:
  - Fase 1: Free Class 09/16-dic  
  - Fase 2: Compra → Brevo antes del 27-dic  
- Evitar cambios de arquitectura (solo implementación).  
- Al final: consolidar documento maestro de implementación y devolver resumen a Chat de Arquitectura.

Entregables:
- `docs/brevo/implementacion_brevo_master.md`  
- Resumen ejecutivo para Chat Arquitectura.

---

# 🧩 NIVEL 1 — ÁRBOL COMPLETO DE CHATS HIJO

```text
Chat de Control · Implementación Brevo
│
├─ 1) Supabase · Modelo y RPCs
│   ├─ 1.A Esquema contacts + metadata.marketing
│   ├─ 1.B Orquestadora v2 (f_orch_contact_write_v2)
│   └─ 1.C RPC marketing (f_contacts_marketing_update_v1 + vistas QA)
│
├─ 2) Next.js · Flujo Free Class → Supabase → Brevo
│   ├─ 2.A Helper Free Class → v2 (contacts + free_class)
│   ├─ 2.B Helper Brevo (marketingEvent → Brevo)
│   └─ 2.C Encadenado en /api/freeclass/register
│
├─ 3) Brevo · Configuración Tags + Journeys Free Class
│   ├─ 3.A Atributos, listas y tags (SKU + instancia)
│   ├─ 3.B Journeys 09-dic y 16-dic
│   └─ 3.C Validación entornos (NONPROD vs PROD)
│
├─ 4) Fase 2 · Compra → Supabase → Brevo (Buyer)
│   ├─ 4.A Integración Stripe webhook → contacts (v2)
│   ├─ 4.B Buyer tags y sincronización a Brevo
│   └─ 4.C Segmentos para campaña fuerte 1–13 ene 2026
│
├─ 5) Sincronización, Logging y QA Técnico
│   ├─ 5.A Estados de sync (last_status, last_sync_at, last_error_code)
│   ├─ 5.B Escenarios de error + retry conceptual
│   └─ 5.C Plan de pruebas punta a punta (09/16-dic + buyer F2)
│
└─ 6) Cierre · Documentación Final + Resumen a Arquitectura
    ├─ 6.A Documento de implementación consolidado (.md)
    ├─ 6.B Checklist final F1/F2
    └─ 6.C Resumen ejecutivo para Chat Arquitectura
````

---

# 📘 RESUMEN BREVE POR CHAT HIJO

---

## 1) Supabase · Modelo y RPCs

### 1.A · Esquema `contacts` + `metadata.marketing`

Responsabilidad:

* Bajar a nivel “qué columnas y ramas JSON” se crean/modifican.
* Validar que `brevo_contact_id` y `metadata.marketing.*` cubren:

  * tags,
  * estado de sync,
  * error codes,
  * relación con `status` (active/bounced/unsubscribed).

Entregable:

* `docs/brevo/implementacion_supabase_schema.md`

---

### 1.B · Orquestadora v2 (`f_orch_contact_write_v2`)

Responsabilidad:

* Definir entrada/salida conceptual de v2 (sin SQL).
* Separar claramente:

  * `contact_core`
  * bloque `free_class`
  * bloque compra (solo estructura, para F2).

Entregable:

* `docs/brevo/implementacion_supabase_orch_v2.md`

---

### 1.C · RPC marketing (`f_contacts_marketing_update_v1` + vistas)

Responsabilidad:

* Diseñar cómo se actualizan:

  * `brevo_contact_id`,
  * tags,
  * `metadata.marketing.brevo.*`,
  * `contacts.status` cuando haya `invalid_email`.
* Definir vistas QA recomendadas.

Entregable:

* `docs/brevo/implementacion_supabase_marketing_rpc.md`

---

## 2) Next.js · Flujo Free Class → Supabase → Brevo

### 2.A · Helper Free Class → v2

Responsabilidad:

* Definir cómo `/api/freeclass/register` construye la llamada a v2:

  * mapeo de payload UI → `contact_core` + `free_class`.
  * manejo de estados (registrado / ya registrado / cerrado).

Entregable:

* `docs/brevo/implementacion_next_freeclass_helper.md`

---

### 2.B · Helper Brevo (marketingEvent)

Responsabilidad:

* Bajar el diseño del helper único Brevo:

  * entrada `marketingEvent`,
  * normalización de email/tags,
  * lógica upsert+tags,
  * error codes normalizados,
  * logging conceptual,
  * distinción NONPROD/PROD.

Entregable:

* `docs/brevo/implementacion_next_helper_brevo.md`

---

### 2.C · Encadenado en `/api/freeclass/register`

Responsabilidad:

* Unir piezas:

  * Validaciones ya existentes
  * Llamada v2
  * Helper Brevo
  * RPC marketing
  * Respuesta final a UI

Entregable:

* `docs/brevo/implementacion_next_freeclass_route.md`

---

## 3) Brevo · Configuración Tags + Journeys Free Class

### 3.A · Atributos, listas y tags

Responsabilidad:

* Definir qué atributos usa LOBRÁ en Brevo.
* Definir tags oficiales:

  * `lead_freeclass_fin_freeintro`
  * `lead_freeclass_fin_freeintro_2025-12-09-1900`
  * `lead_freeclass_fin_freeintro_2025-12-16-1900`
  * `test_*` si se requiere.

Entregable:

* `docs/brevo/configuracion_brevo_contactos_tags.md`

---

### 3.B · Journeys 09-dic y 16-dic

Responsabilidad:

* Diseñar los pasos exactos de cada journey:

  * Trigger por tag
  * Confirmación
  * Recordatorios 24h / 2h
  * Post-clase
  * Nurturing 1 email
* Regla de no-reinscripción.

Entregable:

* `docs/brevo/configuracion_brevo_journeys_freeclass.md`

---

### 3.C · Validación entornos (NONPROD vs PROD)

Responsabilidad:

* Dejar claro:

  * Qué se prueba en NONPROD (sin journeys productivos).
  * Qué solo vive en PROD.
  * Cómo evitar confusiones y costos.

Entregable:

* `docs/brevo/configuracion_brevo_entornos.md`

---

## 4) Fase 2 · Compra → Supabase → Brevo (Buyer)

### 4.A · Integración Stripe webhook → contacts (v2)

Responsabilidad:

* Definir cómo el webhook actual se conecta a v2:

  * resolución/creación `user_id`,
  * actualización de contacto buyer.

Entregable:

* `docs/brevo/implementacion_f2_stripe_to_contacts.md`

---

### 4.B · Buyer tags y sync a Brevo

Responsabilidad:

* Definir:

  * uso de `buyer_finanzas_2026`,
  * cambios en marketingEvent (`type="purchase"`),
  * recorrido completo compra → Supabase → Brevo.

Entregable:

* `docs/brevo/implementacion_f2_buyer_tags_brevo.md`

---

### 4.C · Segmentos para campaña fuerte

Responsabilidad:

* Definir segmentos en Brevo para:

  * “leads freeclass no compradores”
  * “compradores finanzas 2026”
* Asegurar exclusión de buyers en campaña 1–13 ene 2026.

Entregable:

* `docs/brevo/implementacion_f2_segmentos_venta_fuerte.md`

---

## 5) Sincronización, Logging y QA Técnico

### 5.A · Estados de sync

Responsabilidad:

* Detallar reglas para:

  * `last_status`, `last_sync_at`, `last_error_code`
  * relación con `contacts.status`
  * casos tipo `invalid_email`.

Entregable:

* `docs/brevo/implementacion_sync_estados.md`

---

### 5.B · Escenarios de error + retry conceptual

Responsabilidad:

* Enumerar escenarios:

  * network, rate limit, invalid email, 4xx/5xx, etc.
* Definir política de retry diferido conceptual (aunque se implemente después).

Entregable:

* `docs/brevo/implementacion_sync_errores_retry.md`

---

### 5.C · Plan de QA punta a punta

Responsabilidad:

* Plan de pruebas para:

  * 09-dic, 16-dic,
  * errores Brevo,
  * cohorte correcta,
  * separación buyers/no buyers en F2.

Entregable:

* `docs/brevo/qa_plan_brevo_integracion.md`

---

## 6) Cierre · Documentación Final + Resumen a Arquitectura

### 6.A · Documento implementación consolidado

Responsabilidad:

* Integrar todos los .md anteriores en un solo documento maestro:

  * Estructura final de implementación
  * Referencias a arquitectura
  * Relación Fase 1 / Fase 2

Entregable:

* `docs/brevo/implementacion_brevo_master.md`

---

### 6.B · Checklist final F1/F2

Responsabilidad:

* Checklist tipo “go/no-go” de:

  * Fase 1 (free class 09/16)
  * Fase 2 (buyer + campaña venta fuerte)

Entregable:

* `docs/brevo/checklist_release_brevo.md`

---

### 6.C · Resumen ejecutivo para Arquitectura

Responsabilidad:

* Resumen de 1–2 páginas para devolver al Chat de Arquitectura:

  * qué se implementó,
  * qué quedó en Parking Lot,
  * riesgos y próximos pasos.

Entregable:

* `docs/brevo/resumen_impl_arq_brevo.md`

---

# ✔ Estado

* Árbol de chats hijo definido.
* Responsabilidades claras por bloque.
* Cada chat hijo tiene entregable `.md` asociado.
* Listo para que el siguiente paso sea:

  * Definir el **Prompt Maestro del Chat de Control · Implementación Brevo**, usando esta estructura como base.

```
```
