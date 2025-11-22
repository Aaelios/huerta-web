
**`docs/analytics/infra_data_layer_base.md`**

# Infraestructura Base del Data Layer  

Este documento describe la arquitectura, tipos, convenciones y reglas que todos los futuros módulos de tracking deben respetar.  
Es la referencia oficial del Data Layer para el proyecto.

---

## 1. Objetivo del módulo
Crear una infraestructura **tipada, centralizada y segura** para enviar eventos a `window.dataLayer` sin alterar el GTM existente.

Este módulo **no define** eventos finales como `view_content`, `begin_checkout`, `purchase` o `lead`.  
Solo establece la base que todos los hijos futuros deben usar.

---

## 2. Archivos creados / modificados

### 2.1. **Nuevo archivo**
`/lib/analytics/dataLayer.ts`

Incluye:

- Tipos congelados:
  - `AnalyticsContentType`
  - `AnalyticsItem`
  - `AnalyticsEventBase`

- Helpers:
  - `initDataLayer()`
  - `pushAnalyticsEvent()`
  - `pushAnalyticsTestEvent()`

- Sin redeclarar `window` (ya existe en `global.d.ts`).

---

### 2.2. **Archivo actualizado**
`/components/Gtm.tsx`

Cambios:

- Sustituye `window.dataLayer.push(...)` por:
  - `initDataLayer()`
  - `pushAnalyticsEvent({ event: "page_view", ... })`
- Agrega evento de prueba controlado por env:
  - `pushAnalyticsTestEvent("gtm_client_init")`

No se modifica el snippet GTM ni el bloque `<noscript>`.

---

## 3. Tipos congelados (obligatorios para todos los hijos)

### 3.1. `AnalyticsContentType`  
Debe coincidir **exactamente** con `fulfillment_type` usado en Stripe y Supabase.

```

course
template
live_class
one_to_one
subscription_grant
bundle

```

No agregar más valores sin validación global.

---

### 3.2. `AnalyticsItem`
Usado en todos los eventos transaccionales.

- `sku`: obligatorio  
- `fulfillment_type`: obligatorio  
- Montos en **centavos** si provienen de Stripe  
- `amount_total` y `unit_amount` alineados a los nombres de Stripe  
- Extensible mediante `[key: string]: unknown`

---

### 3.3. `AnalyticsEventBase`
Estructura base de todos los eventos.

Reglas:

- `event`: obligatorio, **snake_case**
- `content_type`: solo valores de `AnalyticsContentType`
- `content_id`: SKU o slug, la semántica se congela en Chat Hijo 04
- `items[]`: usar estructura estándar
- índice abierto para datos adicionales como `page_path`, `page_title`, etc.

---

## 4. Convenciones obligatorias para futuros chats hijos

### 4.1. Naming de eventos
- Siempre **snake_case**
- No usar prefijos de plataforma
- Ejemplos válidos:
  - `view_content`
  - `begin_checkout`
  - `purchase`
  - `lead`

---

### 4.2. `content_type`
Debe provenir **solo** de esta lista congelada:

```

course
template
live_class
one_to_one
subscription_grant
bundle

```

Ejemplos:
- “webinar” = `live_class`
- “tool” = `template`
- “module” = `bundle` (si aplica)

---

### 4.3. `content_id`
Debe ser:
- La **SKU principal**, o  
- El **slug** de la página

La regla exacta se fijará en Chat Hijo 04.

---

### 4.4. `items[]`
En compras, upsells, bundles y eventos transaccionales:

Cada item debe incluir:

- `sku`
- `fulfillment_type`
- montos en centavos (Stripe)
- `currency`

---

### 4.5. Montos y moneda
- Stripe usa centavos → `unit_amount` y `amount_total`
- Supabase usa `amount_cents`
- Data Layer puede recibir ambos

La semántica exacta de `value` se congela en Chat Hijo 04.

---

### 4.6. Reglas de infraestructura
Ningún módulo futuro puede:

- Reescribir `window.dataLayer`
- Crear nuevos helpers
- Crear tipos duplicados
- Generar eventos sin pasar por `pushAnalyticsEvent`

Esta capa es **única y centralizada**.

---

## 5. Variables de entorno nuevas

```

NEXT_PUBLIC_GTM_SEND_TEST_EVENT=true

```

Uso recomendado:
- Local: sí  
- Vercel Preview: sí  
- Producción: no

Controla si se envía `test_event`.

---

## 6. Validación en GTM Preview
Confirmar que:

1. Se ve `page_view` con:
   - `page_path`
   - `page_title`
2. Se ve `test_event` solo si `NEXT_PUBLIC_GTM_SEND_TEST_EVENT=true`.

---

## 7. Estado final de este módulo
- Infraestructura estable
- Tipado congruente con Stripe y Supabase
- Reemplazo limpio del tracking previo
- Preparado para:

  - **Chat Hijo 03** → helpers de eventos UI / navegación  
  - **Chat Hijo 04** → reglas finales de `value`, `content_id`, `items`, currency  
  - **Chat Hijo 05** → configuración GTM (tags, triggers, templates)

---

**Este documento queda como fuente de verdad del Data Layer en LOBRÁ.**
```
