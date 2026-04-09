# Lobra — Aterrizaje Técnico MVP

## Bloque 1 — Supabase

### 1. Resumen ejecutivo

La base actual de Supabase ya soporta correctamente:

* Producto
* Precio (Stripe aligned)
* Orden (estructura base)
* Pago
* Entitlements (fuente de verdad de acceso)

Sin embargo, NO implementa aún:

* Funnel como entidad
* Estado del usuario dentro del funnel
* Modelo de contenido desacoplado controlado por funnel

---

### 2. Mapeo modelo vs realidad

Entidad: producto
Estado: ya existe
Notas: modelo robusto con separación product_prices, bundles, metadata

Entidad: order
Estado: ya existe (parcialmente operativo)
Notas: order_headers es la base real; order_items puede estar subutilizado

Entidad: entitlement
Estado: sólido
Notas: correctamente implementado como fuente de verdad

Entidad: funnel
Estado: no existe

Entidad: estadoUsuarioFunnel
Estado: no existe

Entidad: contenido desacoplado
Estado: parcial
Notas: existe contenido suelto (thankyou_copy, metadata), no sistema modular

---

### 3. Clasificación de acciones

NO TOCAR

* products
* product_prices
* entitlements
* entitlement_events
* payments
* webhook_events
* live_class_instances

AJUSTAR

* order_headers / order_items (validar uso real)
* consistencia source_id en entitlements
* semántica producto vs oferta
* uso de fulfillment_status e invoice_status

CREAR

* funnel
* estadoUsuarioFunnel
* modelo de contenido modular
* control de visibilidad por funnel

---

### 4. Riesgos identificados

1. Supabase no representa aún el modelo funnel-driven
2. Posible falsa sensación de completitud en orders
3. Riesgo de duplicar lógica al introducir “oferta”
4. Contenido no estructurado para reuso

---

### 5. Decisión para siguientes bloques

Base reutilizable confirmada:

* producto
* precio
* orden
* pago
* entitlement

Bloques a construir:

* funnel
* estado de usuario
* contenido modular

---

### 6. Estado del bloque

Bloque Supabase: CERRADO


# Lobra — Aterrizaje Técnico MVP

## Bloque 2 — App + Fuente de verdad

### 1. Estado actual (real)

* `/webinars` → usa API → Supabase (catálogo correcto)
* `/webinars/[slug]` → usa JSON (detalle)
* `/checkout` → usa JSON → backend valida
* `/gracias` → Stripe + Supabase (correcto)

### 2. Problema identificado

Existen dos fuentes de catálogo:

* Supabase → usado por el hub
* JSON → usado por detalle y checkout

Esto genera riesgo de inconsistencia entre listado, venta y acceso.

---

### 3. Decisión

NO crear sistema paralelo
NO migrar todo de golpe

SÍ unificar fuente operativa

---

### 4. Regla clave

* Supabase = fuente de verdad operativa
* JSON = contenido editorial temporal

---

### 5. Qué se mueve a Supabase

* slug
* sku
* pricing
* startAt / duración
* flags operativos
* datos necesarios para checkout

---

### 6. Qué se queda temporal en JSON

* sales (copy)
* hero
* SEO
* prelobby labels
* contenido editorial

---

### 7. Estrategia

* Detalle deja de depender de JSON para lo operativo
* Checkout deja de depender de JSON para SKU/precio
* JSON se usa solo como complemento de UI
* Merge temporal entre Supabase + JSON

---

### 8. Qué NO se toca

* CheckoutClient
* API de Stripe
* Gracias
* Entitlements
* Webhooks

---

### 9. Objetivo inmediato

Unificar:

slug → Supabase → checkout → order → entitlement → acceso

---

### 10. Estado

Bloque App + Fuente de verdad: DEFINIDO


# Lobra — Matriz de uso actual de `webinars.jsonc`

## Objetivo

Documentar qué funcionalidades y qué piezas técnicas dependen hoy del JSON de webinars, para controlar migración y pruebas sin omisiones.

---

## Fuente raíz

Archivo:

* `data/webinars.jsonc`

Loader raíz:

* `lib/webinars/loadWebinars.ts`

---

## Matriz de uso

| Área                  | Archivo / función                       | Uso del JSON                                            | Tipo de dependencia | Impacto si falla |
| --------------------- | --------------------------------------- | ------------------------------------------------------- | ------------------- | ---------------- |
| Loader base           | `lib/webinars/loadWebinars.ts`          | Lee `webinars.jsonc` y devuelve `WebinarMap`            | Directa             | Alto             |
| Helper                | `lib/webinars/load.ts` → `getWebinar()` | Busca webinar por slug                                  | Directa/puente      | Alto             |
| Helper                | `lib/webinars/getWebinarBySku.ts`       | Busca webinar por SKU                                   | Directa/puente      | Alto             |
| Helper                | `lib/webinars/getWebinarByPriceId.ts`   | Busca webinar por Stripe Price ID                       | Directa/puente      | Medio            |
| Detalle público       | `app/webinars/[slug]/page.tsx`          | Render de detalle, metadata, precio, CTA, static params | Funcional directa   | Alto             |
| Checkout              | `app/checkout/[slug]/page.tsx`          | Carga webinar para UI y sessionPayload                  | Funcional directa   | Alto             |
| Prelobby              | `app/webinars/[slug]/prelobby/page.tsx` | Resuelve webinar y acceso previo                        | Funcional directa   | Alto             |
| Verificación prelobby | `app/api/prelobby/verify/route.ts`      | Valida datos del webinar en backend                     | Funcional directa   | Alto             |
| ICS                   | `app/api/ics/[slug]/route.ts`           | Genera calendario/evento                                | Funcional directa   | Medio            |
| Gracias               | `app/gracias/page.tsx`                  | Obtiene webinar por SKU para copy/horario/UI            | Funcional parcial   | Medio            |
| Postcompra            | `lib/postpurchase/resolveNextStep.ts`   | Usa webinar por SKU para siguiente paso                 | Lógica negocio      | Medio            |
| Checkout UI           | `lib/ui_checkout/buildCheckoutUI.ts`    | Usa datos del webinar para UI                           | Lógica negocio      | Medio            |
| Checkout helper       | `lib/ui_checkout/findWebinarBySku.ts`   | Lookup por SKU                                          | Lógica negocio      | Medio            |
| Sitemap               | `app/sitemap.ts`                        | Genera URLs de webinars                                 | Infra/SEO           | Bajo             |

---

## Clasificación por criticidad

### Crítico operativo

* `loadWebinars`
* `getWebinar`
* `getWebinarBySku`
* `app/webinars/[slug]/page.tsx`
* `app/checkout/[slug]/page.tsx`
* `app/webinars/[slug]/prelobby/page.tsx`
* `app/api/prelobby/verify/route.ts`

### Lógica intermedia

* `resolveNextStep`
* `buildCheckoutUI`
* `findWebinarBySku`
* `app/gracias/page.tsx`

### Infra / soporte

* `app/api/ics/[slug]/route.ts`
* `app/sitemap.ts`

---

## Observación clave

Hoy el JSON no solo se usa para contenido editorial.
También participa en funcionalidad operativa crítica, especialmente en:

* detalle
* checkout
* prelobby
* helpers por slug / SKU

---

## Implicación para migración

No se debe eliminar `webinars.jsonc` de golpe.

Primero hay que:

1. sustituir dependencias operativas críticas
2. probar cada flujo
3. dejar el JSON solo para contenido editorial temporal, si todavía aplica

---

## Estado

Matriz documentada.
Pendiente siguiente paso:

* plan de pruebas por dependencia
* contrato mínimo de reemplazo


