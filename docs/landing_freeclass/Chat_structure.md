# Arquitectura de Implementación · Landing de Clases Gratuitas
**Árbol de Chats Hijo + Resumen de Responsabilidades**  
v1.0 — LOBRÁ · 2025

Este documento define el **árbol completo de Chats Hijo** bajo el Chat de Control, ordenado y estructurado para minimizar retrabajo, manejar dependencias y permitir una ejecución clara en 2–3 días.

Cada nodo describe su responsabilidad y el resultado esperado (entregable).

---

# 🧱 NIVEL SUPERIOR — Chat de Control

## **Responsabilidad principal**
Orquestar todo el proyecto.  
Asegurar que cada Chat Hijo entregue su parte en orden, sin solaparse ni romper contratos.

---

# 🧩 NIVEL 1 — ÁRBOL COMPLETO DE CHATS HIJO

```
Chat de Control
│
├─ 1) Datos / Fuente de Verdad
│   ├─ 1.A Productos (Supabase.products)
│   ├─ 1.B Instancias (live_class_instances)
│   └─ 1.C FreeClassPage JSONC + Loader
│
├─ 2) Estado Operacional (registration_state)
│   ├─ 2.A Resolución de Instancia Aplicable
│   ├─ 2.B Cálculo de registration_state
│   └─ 2.C Tipos TS + Tester de DTO
│
├─ 3) API /api/freeclass/register
│   ├─ 3.A Validación + Turnstile
│   ├─ 3.B Orquestación (contacts + entitlement + Brevo)
│   └─ 3.C Respuesta estandarizada + manejo de errores
│
├─ 4) Landing Page /clases-gratuitas/[slug]
│   ├─ 4.A UI Base Funcional
│   ├─ 4.B Curaduría UI Estructural
│   └─ 4.C Curaduría de Copy / Conversión
│
├─ 5) Integración Brevo + Refactor Forms
│   ├─ 5.A Helper Brevo (upsert + lists + tags)
│   ├─ 5.B Integración en freeclass/register
│   └─ 5.C Extensión mínima en forms/submit
│
├─ 6) SEO + JSON-LD + Analytics
│   ├─ 6.A SEO + Schema Event
│   └─ 6.B Analytics (GA4 + Pixel + GTM Data Layer)
│
├─ 7) QA Técnico Integral
│
└─ 8) Release + Documentación Final
```

---

# 📘 RESUMEN BREVE DE CADA SECCIÓN

---

## **1) Datos / Fuente de Verdad**
Define la estructura de **producto, instancia y contenido UI**.

### 1.A · Productos (`Supabase.products`)
- Crear/registrar el SKU del free class.  
- Configurar metadata mínima (duración, cover, module_sku si aplica).  
- Asegurar compatibilidad con entitlements.

### 1.B · Instancias (`live_class_instances`)
- Definir `instance_slug`.  
- Usar `status`, `capacity`, `seats_sold`, `start_at`, `end_at`.  
- Garantizar un modelo estable para schedule futuro.

### 1.C · FreeClassPage JSONC + Loader
- Definir shape `FreeClassPage`.  
- Crear loader con validación.  
- Content-first: textos, mensajesEstado, integraciones, waitlistEnabled.

---

## **2) Estado Operacional**
Logica pura de backend.

### 2.A · Resolver instancia aplicable
- Determinar instancia activa o próxima.  
- Manejar múltiples instancias futuras.

### 2.B · Calcular `registration_state`
- Estados finales: `open`, `full`, `ended`, `upcoming`, `no_instance`, `canceled`.  
- Reglas claras entre status + fechas + cupo.

### 2.C · Tipos TS + Tester de DTO
- Definir contrato backend → frontend.  
- Crear fixtures de prueba (ejemplos reales).  
- Validar DTO antes de tocar UI.

---

## **3) API `/api/freeclass/register`**
Orquestador del registro.

### 3.A · Validación + Turnstile
- Sanitizar entrada.  
- Validar token Turnstile.  
- Manejo de errores controlados.

### 3.B · Orquestación (contacts + entitlement + Brevo)
- `f_orch_contact_write_v1`  
- Creación de entitlement si `state=open`.  
- Llamada al helper Brevo con lista, tags y atributos.

### 3.C · Respuesta estandarizada
- `ui_state`, `registration_state`, `result`, `nextStepUrl`, `leadTracking`.  
- Error contract uniforme para UI y GTM.

---

## **4) Landing Page `/clases-gratuitas/[slug]`**
Tres fases claras.

### 4.A · UI Base Funcional
- Consume loaders y API.  
- Estructura mínima y estados funcionales.  
- Sin diseño elaborado.

### 4.B · Curaduría UI Estructural (Fase 1 de diseño)
- Orden final de secciones.  
- Jerarquía visual.  
- Comportamientos (scroll, bloqueos, aforo).  
- Sin copy emocional aún.

### 4.C · Curaduría de Copy / Conversión (Fase 2)
- Titulares optimizados.  
- Microcopys persuasivos.  
- Mensajes según estado (`full`, `closed`, `success`).  
- Coherencia con el funnel completo.

---

## **5) Integración Brevo + Refactor de Forms**
Centralización de marketing.

### 5.A · Helper Brevo
- Upsert contacto.  
- Tags y atributos dinámicos.  
- Mapa `listKey → listId`.

### 5.B · Integración en freeclass/register
- Lead stage `"free_class"`.  
- Tags con sku e instance_slug.  
- Manejo de errores silencioso.

### 5.C · Extensión de forms/submit
- Integración opcional para newsletter/contacto.  
- Sin romper la API actual.

---

## **6) SEO + JSON-LD + Analytics**
Optimización y medición.

### 6.A · SEO + Schema Event
- Calcular `Event` usando datos reales.  
- Tipo SEO `"landing"`.  
- Canonical fijo.  
- `noindex` según regla del entorno.

### 6.B · Analytics
- Data Layer: `generate_lead` con `context="free_class"`.  
- Parámetros: `class_sku`, `instance_slug`, `utm_*`.  
- Pixel Lead (sin tocar GTM).

---

## **7) QA Técnico Integral**
Pruebas end-to-end.

- Casos open / full / ended / upcoming / no_instance.  
- Registro doble.  
- UTM.  
- Brevo.  
- SEO JSON-LD.  
- GTM / GA4 / Pixel.  
- Turnstile.

---

## **8) Release + Documentación Final**
Cierre operativo.

- Notas de release.  
- Documentación para el equipo.  
- Checklist de deploy.  
- Verificación post-producción.  

---

# ✔ Estado  
Este documento sirve como **base del Prompt Maestro del Chat de Control**.  
Cada Chat Hijo es independiente, con responsabilidades claras y entregables exactos.

