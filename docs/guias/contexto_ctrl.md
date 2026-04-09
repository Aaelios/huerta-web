# Lobra — Documento Maestro (para Chat de Control)

## Objetivo

Alinear el sistema actual para que:

* la **verdad operativa viva en Supabase**
* el **core transaccional no se toque**
* se habilite base para funnels sin romper el MVP

---

## 1. Estado actual (real)

### Core (correcto)

* Stripe (checkout + webhooks)
* Supabase (orders, payments, entitlements)
* Gracias (validación real de compra)
* Resend (email post-compra)

### App

* `/webinars` → Supabase (correcto)
* `/webinars/[slug]` → JSON (detalle)
* `/checkout` → JSON → backend valida
* `/gracias` → Supabase + Stripe (correcto)
* `/clases-gratuitas` → modelo separado (correcto)

### Tracking

* view_content → existe
* begin_checkout → existe (1 solo punto)
* purchase → existe (con deduplicación)
* entrada_funnel → NO existe
* cambio_etapa → NO existe

---

## 2. Problema central

Existe **doble fuente de verdad**:

* Supabase → catálogo real (hub)
* JSON → detalle + checkout + helpers

Esto genera:

* riesgo de inconsistencia
* dependencia innecesaria en JSON
* freno para evolucionar a funnels

---

## 3. Decisión clave

```text
Supabase = fuente de verdad operativa
JSON = contenido editorial temporal
```

---

## 4. Qué NO se toca

* create-checkout-session
* webhook route + orquestador
* orders / payments / entitlements
* página de gracias
* Resend
* GTM base
* UI actual

---

## 5. Qué SÍ se cambia

### Fuente de datos

* detalle deja de depender de JSON (operativo)
* checkout deja de depender de JSON (operativo)
* prelobby deja de depender de JSON (operativo)

### Helpers críticos

* loadWebinars
* getWebinar
* getWebinarBySku

→ deben resolver contra Supabase (directo o vía adapter temporal)

---

## 6. Qué se mantiene temporalmente en JSON

* sales (copy)
* hero
* SEO
* prelobby labels
* contenido editorial

---

## 7. Qué falta crear (no crítico para venta actual)

* funnel
* estado_usuario_funnel
* tracking:

  * entrada_funnel
  * cambio_etapa
* contenido modular por funnel

---

## 8. Riesgos clave

* metadata de Stripe (sku, fulfillment_type, success_slug) es crítica
* múltiples dependencias indirectas a loadWebinars
* cambio incorrecto rompe:

  * detalle
  * checkout
  * prelobby
  * next step
* doble fuente de verdad debe eliminarse sin romper UI

---

## 9. Validaciones obligatorias antes de mover

* webhook procesa SKUs nuevos correctamente
* metadata de Stripe está completa
* checkout resuelve slug → sku → price correctamente
* entitlements siguen funcionando
* gracias mantiene flujo correcto
* prelobby valida acceso correctamente
* purchase no se duplica
* begin_checkout sigue siendo único

---

## 10. Mandato para Control

### Sí debe hacer

* unificar fuente operativa en Supabase
* definir contrato mínimo para detalle/checkout
* migrar helpers sin romper el shape actual
* ejecutar cambio sin crear sistema paralelo
* construir base de funnel sobre esta arquitectura

### NO debe hacer

* rediseñar el core transaccional
* eliminar JSON de golpe
* duplicar catálogo
* inventar flujos nuevos innecesarios
* regresar a Discovery
* cambiar UI sin necesidad

---

## 11. Resultado esperado

```text
slug → Supabase → checkout → order → entitlement → acceso
```

Sin dependencia operativa del JSON.

