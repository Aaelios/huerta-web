
---

```md
# Arquitectura Maestro · Integración Brevo ↔ LOBRÁ  
Versión: 1.0  
Fecha: 28 nov 2025  
Objetivo crítico: impulsar la conversión al módulo “Tranquilidad Financiera” que inicia el **13 enero 2026**

---

# 0. Propósito del Documento
Definir la arquitectura completa para integrar Brevo dentro del ecosistema LOBRÁ como plataforma de **automatización de marketing**, sin convertirla en CRM ni fuente de verdad.

El diseño está optimizado para:
- Free classes del **9-dic-2025** y **16-dic-2025**  
- Campaña de venta fuerte **27-dic-2025 → 13-ene-2026**  
- Escalabilidad hacia futuros módulos, cohortes y marcas

---

# 1. Rol y Alcance de Brevo
Brevo SOLO hará:
- Gestión de automatizaciones (journeys)
- Envío de correos de:  
  - Confirmación  
  - Recordatorios (24h / 2h)  
  - Post-clase  
  - Nurturing suave post-clase  
- Ejecución de campañas broadcast (enero 2026)

Brevo NO hará:
- Emails transaccionales (Resend los cubre)  
- Persistencia principal de contactos  
- Lógica de negocio (SKU, reglas, fechas)  
- Procesamiento de compras  

**Decisión:** Brevo = herramienta de automatización (no CRM).

---

# 2. Modelo de Datos de Contacto (Supabase)
Supabase es la **única fuente de verdad** del contacto.

### 2.1 Estructura central
- `contact.email`  
- `contact.full_name`  
- `consent_status`, `consent_source`, `consent_at`  
- `segment`  
- `brevo_contact_id` (columna dura)  
- `metadata.marketing`:  
  - `tags[]`  
  - `brevo`:  
    - `last_sync_at`  
    - `last_status`  
    - `last_error_code?`  

### 2.2 Free Class
- `metadata.free_class_registrations[]`:  
  `{ ts, status, class_sku, instance_slug }`

**Decisión:** `brevo_contact_id` como columna fuerte + todo lo demás en `metadata`.

---

# 3. Identidad y Reconciliación
### 3.1 Identificador principal
**email**

### 3.2 Contacto existe en Brevo pero no en Supabase
Crear en Supabase **solo si es lead valioso** (free class o compra).

### 3.3 Duplicados
Actualizar siempre si Brevo ya tiene el email.

---

# 4. Segmentación y Etiquetado
Regla principal: **Tags por SKU + Tags por cohorte/instancia**

Ejemplo:
- `lead_freeclass_fin_freeintro`  
- `lead_freeclass_fin_freeintro_2025-12-09-1900`  
- `lead_freeclass_fin_freeintro_2025-12-16-1900`

Beneficios:
- Cohorts limpias  
- Journeys independientes  
- Campañas de enero segmentadas correctamente

---

# 5. Orígenes de Datos que Escriben en Brevo
Solo 1 origen activo en MVP:

### 5.1 Registro Free Class (Next → Supabase → Brevo)
- Sí se sincroniza siempre (opt-in implícito)
- Activa journeys automáticos

### 5.2 Compras → **Prioridad Nivel 2 (antes del 27-dic)**
- Webhook Stripe actualiza Supabase
- Tag `buyer_finanzas_2026`
- Se sincroniza hacia Brevo
- Excluye de campañas de venta fuerte

Todo lo demás → Parking Lot.

---

# 6. Dirección y Modo de Sincronización

### 6.1 Dirección
Unidireccional: **LOBRÁ → Brevo**

### 6.2 Momento
Híbrido:
- Síncrono mínimo en registro
- Retry diferido si falla

### 6.3 Idempotencia
1 intento síncrono  
Si falla → se marca “pendiente” y se reintenta offline

---

# 7. Contratos Técnicos

### 7.1 Contrato interno (marketingEvent)
``

type: "freeclass_registration"
email
full_name
class_sku
instance_slug
tags[]

```

### 7.2 Helper Brevo (único)
Entrada:
- email  
- full_name  
- tags[]  
- brevo_contact_id?  

Salida:
- ok  
- contact_id?  
- error?

### 7.3 Escritura Supabase
- `brevo_contact_id`  
- `last_sync_at`  
- `last_status`  
- `last_error_code?`

---

# 8. Integración con Flujos Existentes

### 8.1 `/api/freeclass/register`
Integración directa después del éxito en Supabase.

### 8.2 `/api/forms/submit`
No se usa para free class (evitar mezcla).

### 8.3 Stripe / compras
Fase 2 (muy deseada antes del 27-dic).

---

# 9. Consentimiento y Cumplimiento

### 9.1 Modelo
Registro free class = `single_opt_in`  
`consent_source = "free_class_form"`

### 9.2 Control maestro
Supabase manda, excepto **unsubscribe** (webhook futuro).

### 9.3 Double opt-in
No se usa antes del 13-ene.

---

# 10. Automatizaciones (Journeys)

### Journeys por clase:
- Journey 09-dic-2025  
- Journey 16-dic-2025  

### Estructura mínima por journey:
1. Confirmación  
2. Recordatorio 24h  
3. Recordatorio 2h  
4. Post-clase  
5. Nurturing suave (1 email)

### Trigger:
Tag de instancia.

### Ventas:
NO dentro del journey.  
Venta fuerte = campaña broadcast 1–13 ene 2026.

---

# 11. Eventos y Tracking
Brevo NO recibe eventos.  
Tracking real:
- GA4  
- Meta  
- Supabase  

Correlación:
- cohorts (tags)  
- buyer tags

---

# 12. Multi-producto / Multi-marca
Decisión:
- Cuentas Brevo separadas por marca (cuando sea necesario)
- LOBRÁ independiente  
- Contrato `marketingEvent` escalable por tipo

---

# 13. Seguridad y Límites
- API Keys separadas: **prod** / **dev+preview**  
- Solo server-side  
- Retry diferido  
- Logs estructurados mínimos  
- Sin datos sensibles adicionales

---

# 14. Observabilidad
- `last_status`, `last_error`, `last_sync_at`  
- Eventos clave: sync_started / success / error  
- Auditoría en Supabase (SQL manual)  
- Dashboard opcional → Parking Lot

---

# 15. Backfills y Migraciones
- Backfill manual controlado (Fase 2+)  
- Contratos versionables  
- Tag “backfill” para no disparar journeys antiguos

---

# 16. Entornos y Costos
- Dev+Preview = misma key  
- Prod = key separada  
- Tags `test_`  
- Journeys solo en prod  
- Bajo costo operativo

---

# 17. Roadmap por Fases

## Fase 1 — MVP (antes del 9-dic-2025)
- Integración Next → Brevo mínima  
- Journeys 09-dic y 16-dic  
- Confirmación, recordatorios, post, nurturing

## Fase 2 — Crítico (antes del 27-dic-2025)
- Integración compra → Supabase → Brevo  
- Buyer tags  
- Exclusión de compradores  
- Preparar campaña 1–13 ene 2026

## Fase 3 — Después del módulo
- Webhook unsubscribe  
- Dashboard  
- Backfills  
- Nuevos eventos  
- Funnels multi-producto  
- Nueva cuenta Brevo para Martha / HC

## Fase 4 — Madurez 2026
- Scoring  
- Segmentación avanzada  
- IA asistida  
- Automatizaciones complejas  
- Funnels unificados

---

# Estado Final
Arquitectura completa lista para implementación  
Compatible con fechas 9-dic, 16-dic, 27-dic y 13-ene.  
Escalable hacia 2026 sin deuda técnica estructural.

``

---

# Anexo A · Lista Oficial de Decisiones  
Integración Brevo ↔ LOBRÁ  
Versión: 1.0  
Fecha: 28 nov 2025

Este anexo consolida todas las decisiones arquitectónicas aprobadas para la integración Brevo ↔ LOBRÁ.  
Cada decisión incluye su punto de origen para trazabilidad.

---

## 1. Alcance y Rol de Brevo
**1.1** Brevo es herramienta de automatización, no CRM.  
**1.2** Resend envía emails transaccionales; Brevo envía marketing.  
**1.3** Supabase es la única fuente de verdad del contacto.

---

## 2. Modelo de Datos
**2.1** `contacts` es la tabla central (no habrá tablas espejo).  
**2.2** Se agrega columna dura `brevo_contact_id`.  
**2.3** Toda metadata nueva vive dentro de `metadata.marketing`.  
**2.4** Free class usa `metadata.free_class_registrations[]`.

---

## 3. Identidad y Reconciliación
**3.1** Identificador principal: `email`.  
**3.2** Crear contacto en Supabase solo si es lead valioso.  
**3.3** Si existe en Brevo, siempre actualizar (no duplicar).

---

## 4. Segmentación y Etiquetado
**4.1** Tags por SKU y tags por instancia (cohorte).  
**4.2** Cohorts independientes para 09-dic y 16-dic.  
**4.3** Buyer tag planificado: `buyer_finanzas_2026`.

---

## 5. Orígenes de Datos
**5.1** Único origen activo MVP: registro free class.  
**5.2** Compra → Supabase → Brevo = prioridad nivel 2 antes del 27-dic.  
**5.3** Formularios secundarios → Parking Lot.  
**5.4** Importaciones CSV → Parking Lot.

---

## 6. Dirección y Modo de Sincronización
**6.1** Dirección unidireccional: LOBRÁ → Brevo.  
**6.2** Síncrono mínimo + retry diferido.  
**6.3** Intento único síncrono; si falla → reintento offline.  
**6.4** Logs mínimos por cada intento.

---

## 7. Contratos Técnicos
**7.1** `marketingEvent` tipo: `"freeclass_registration"`.  
**7.2** Helper Brevo único (upsert + tags).  
**7.3** Retorno minimalista (`ok`, `contact_id`, `error`).  
**7.4** Escritura en Supabase:  
- `brevo_contact_id`  
- `last_sync_at`  
- `last_status`  
- `last_error_code?`

---

## 8. Integración con Flujos Existentes
**8.1** Integración Brevo en `/api/freeclass/register`.  
**8.2** `/api/forms/submit` no se usa para free class (limpio).  
**8.3** Stripe/compras → Fase 2 (antes del 27-dic).

---

## 9. Consentimiento y Cumplimiento
**9.1** Registro free class = `single_opt_in`.  
**9.2** Supabase controla consentimiento (Brevo replica).  
**9.3** Unsubscribe en Brevo se reflejará en Supabase vía webhook (Fase 3).  
**9.4** Double opt-in no se activa antes del 13-ene-2026.

---

## 10. Automatizaciones (Journeys)
**10.1** Journeys separados para 09-dic y 16-dic.  
**10.2** Estructura mínima: confirmación → 24h → 2h → post → nurturing 1 email.  
**10.3** Trigger = tag de instancia.  
**10.4** Venta fuerte NO está dentro del journey.  
**10.5** Venta fuerte = campaña broadcast del 1–13 ene.

---

## 11. Eventos y Tracking
**11.1** No se envían eventos a Brevo.  
**11.2** GA4 + Supabase manejan tracking real.  
**11.3** Cohorts + buyer tags = correlación perfecta.

---

## 12. Multi-producto / Multi-marca
**12.1** LOBRÁ mantiene cuenta independiente de Brevo.  
**12.2** Otras marcas (HC, Martha) pueden tener cuentas separadas.  
**12.3** Contrato `marketingEvent` es extensible por tipo.

---

## 13. Seguridad y Límites
**13.1** API Keys separadas: prod / dev+preview.  
**13.2** Brevo solo accesible desde server-side.  
**13.3** Retry diferido.  
**13.4** No enviar datos sensibles.  
**13.5** Logs estructurados mínimos.

---

## 14. Observabilidad
**14.1** Guardar estado de sync en Supabase.  
**14.2** Eventos: sync_started / success / error.  
**14.3** Auditoría manual como primera fase.  
**14.4** Dashboard operativo → Parking Lot.

---

## 15. Backfills y Migraciones
**15.1** Backfill manual controlado (no automático).  
**15.2** Contratos versionables.  
**15.3** Tag “backfill” para evitar journeys involuntarios.

---

## 16. Entornos y Costos
**16.1** Dev+Preview comparten key; prod separado.  
**16.2** Tags `test_` para QA interna.  
**16.3** Journeys solo activos en prod.  
**16.4** Arquitectura optimizada para costos bajos a escala.

---

## 17. Roadmap por Fases
### Fase 1 — MVP (antes del 9-dic-2025)
- Next → Brevo  
- Journeys free class

### Fase 2 — Antes del 27-dic-2025
- Compra → Supabase → Brevo  
- Buyer tags para excluir de campañas  
- Segmentos para venta fuerte

### Fase 3 — Post módulo (enero 2026)
- Webhook unsubscribe  
- Panel básico  
- Backfills  
- Nuevos eventos

### Fase 4 — Madurez 2026
- Scoring  
- Automatizaciones complejas  
- Funnels multi-producto  
- IA de segmentación

---

# Estado
Todas las decisiones quedaron aprobadas y trazadas.  
Documento listo para incorporarse al archivo maestro LOBRÁ-2026.
