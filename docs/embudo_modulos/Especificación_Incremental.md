# Documento Maestro — Implementación Webinars / Bundles / 1-a-1

## Resumen ejecutivo

Sistema de venta y entrega de productos digitales bajo tres tipos principales:

* **Clases en vivo (live_class)**
* **Módulos o programas (bundle)**
* **Sesiones 1-a-1 (one_to_one)**

Flujo de usuario: **Home → Hub → Checkout → Gracias → Mail → Prelobby**.
Cada etapa opera de forma dinámica con datos provenientes de **Supabase**, **Stripe** y **Resend**. La infraestructura corre en **Next.js (App Router)** desplegado en **Vercel**.

### Objetivo

Unificar el proceso de compra, acceso y comunicación post-venta en un único flujo, garantizando:

* Idempotencia en pagos y correos.
* Datos en tiempo real (Supabase como verdad única).
* Experiencia consistente para clases sueltas, módulos y 1-a-1.

### Principios de diseño

* **Modularidad:** cada bloque (Home, Hub, Checkout, etc.) opera de forma independiente pero con contrato de datos común.
* **Reutilización:** componentes y RPCs compartidos (ej. `f_bundle_children_next_start`).
* **Idempotencia:** ningún flujo crítico puede ejecutarse dos veces.
* **Trazabilidad:** todos los eventos tienen log o tracking GA4.
* **Escalabilidad:** cada fuente de datos (JSONC → Supabase) puede migrarse sin romper dependencias.

---

## Convenciones de desarrollo y QA

### Nomenclatura

* Prefijos: `f_` (función), `m_` (módulo), `t_` (tabla), `s_` (sesión/estado), `cfg_` (configuración).
* Archivos: snake_case para SQL y kebab-case para rutas Next.js.
* Variables: camelCase en JS/TS.

### Control de versiones

* Rama por bloque (`feature/home`, `feature/checkout`, etc.).
* Commits con mensaje `[tipo]: descripción` (`feat`, `fix`, `docs`, `refactor`).
* Revisiones QA antes de mergear a `main`.

### QA global

1. Render correcto en Desktop y Mobile.
2. Logs en consola sin errores.
3. Eventos GA4 presentes (`begin_checkout`, `purchase`, `prelobby_enter`).
4. Email enviado e idempotente.
5. Stripe checkout sin duplicados.
6. Validación Supabase correcta.
7. Códigos HTTP 2xx en endpoints.

---

# Documento Consolidado — Flujo Webinars / Bundles / 1‑a‑1

---

## Bloque: Home / Featured

### Estado actual (confirmado por código)

* Usa `webinars.jsonc` como fuente de datos visual para destacar un producto en la página principal.
* Renderizado mediante componente `WebinarDestacado`.
* Obtiene solo un elemento (featured) sin discriminación de tipo (`live_class`, `bundle`, etc.).
* Datos cargados por `loadWebinars()`.

### Cambios necesarios

* Permitir mostrar también **módulos (bundles)** además de webinars individuales.
* Agregar campo `next_start_at` obtenido desde RPC `f_bundle_children_next_start` para mostrar fecha próxima de inicio.
* Mostrar tipo del producto (clase o módulo) en la UI.
* Mantener fallback manual (`next_startAt` en JSONC) si la RPC no responde.

### Impactos o dependencias secundarias

* La RPC `f_bundle_children_next_start` será compartida con `/gracias` y `Mail` para mostrar fechas de hijos.

### Archivos afectados

* `/components/WebinarDestacado.tsx` → lectura de `bundle` y presentación.
* `/lib/homefeatured.ts` → agregar soporte para `bundle` y RPC.

### Analítica

* Evento GA4 `featured_view` con `{sku,type}` al renderizar.

### QA de aceptación

1. Se muestra correctamente un módulo (bundle) en la sección destacada.
2. Fecha próxima calculada por RPC se visualiza.
3. Si falla la RPC, se muestra fecha estática de JSONC.
4. Evento `featured_view` se registra.

---

## Bloque: Webinars Hub

### Estado actual (confirmado por código)

* Carga catálogo desde Supabase: `v_products_public`, `v_prices_vigente`, `m_catalogo`.
* Filtra por tipo de producto (`live_class`, `bundle`, `one_to_one`).
* UI de tarjetas generadas dinámicamente con `WebinarCard`.
* Links construidos usando `page_slug` o `instance_slug`.

### Cambios necesarios

* Consolidar lectura de `landing_slug` desde `products.page_slug` para bundles.
* Añadir soporte visual de tipo de producto.
* Integrar `m_precios.ts` para estandarizar precios.
* Implementar filtro opcional por categoría.

### Impactos o dependencias secundarias

* Reutiliza la misma RPC `f_bundle_children_next_start` para mostrar fecha próxima de inicio en módulos.

### Archivos afectados

* `/app/webinars/page.tsx` → actualizar props de tarjetas.
* `/components/WebinarCard.tsx` → manejar bundle y mostrar próxima fecha.
* `/lib/m_catalogo.ts` → exponer `next_start_at` para módulos.

### Analítica

* Evento `hub_view` (carga de grilla) y `hub_click` (clic a landing_slug).

### QA de aceptación

1. Tarjetas muestran clases y módulos correctamente.
2. Precio y próxima fecha visibles en bundles.
3. Clic redirige al slug correcto (page_slug o instance_slug).
4. Eventos de analítica se registran.

---

## Bloque: Checkout / Stripe Embedded

### Estado actual (confirmado por código)

* Cliente envía `sku`, `currency`, `mode`, `coupon`, `utm`. No depende del JSONC.
* `/api/stripe/create-checkout-session` resuelve `price_id` y `product_id` dinámicamente desde Supabase → Stripe.
* Metadata consolidada con `{sku, fulfillment_type, success_slug, price_id, product_id, utm_*}`.

### Cambios necesarios

* Agregar metadata específica por tipo (`instance_id`, `instance_slug` para live_class).
* Validar coherencia `sku ↔ price_id` con `Stripe.Price.metadata.sku`.
* Mantener `mode:'payment'` para todos.
* Aceptar cupones y utm passthrough.

### Impactos o dependencias secundarias

* Afecta `Gracias`, `Mail` y `Webhook` porque leen metadata.

### Archivos afectados

* `/lib/ui_checkout/buildSessionPayload.ts` → agregar metadata extra.
* `/app/api/stripe/create-checkout-session/route.ts` → validador SKU/Price.
* `/lib/checkout/f_createStripeEmbeddedSession.ts` → documentar idempotencyKey.

### Analítica

* `begin_checkout` al iniciar.
* `purchase` disparado en `/gracias` al confirmar sesión.

### QA de aceptación

1. Crea sesión correctamente por `sku`.
2. Metadata completa.
3. Validación SKU/Price activa.
4. Eventos `begin_checkout` y `purchase` funcionan.

---

## Bloque: /gracias (Post‑Compra)

### Estado actual (confirmado por código)

* Usa `resolveNextStep()` para determinar siguiente paso.
* Render dinámico según `variant` (bundle, live_class, one_to_one).
* Webhook reutiliza la misma función.

### Cambios necesarios

* Eliminar enlaces de prelobby; mostrar solo texto y fechas.
* `bundle`: listar hijos con fecha próxima (via RPC `f_bundle_children_next_start`).
* `live_class`: priorizar `instance_id|instance_slug` para fecha exacta.
* `one_to_one`: CTA WhatsApp `https://wa.me/525541930690?text=Hola%2C%20compr%C3%A9%20la%20sesi%C3%B3n%201-a-1.%20Mi%20correo%20es%20{email}.`
* Analítica `purchase` con `{variant,sku,items_count}`.

### Impactos o dependencias secundarias

* RPC compartida con Home/Featured.

### Archivos afectados

* `f_bundle_children_next_start.sql` (RPC nueva).
* `/lib/postpurchase/resolveNextStep.ts`.
* `/app/gracias/page.tsx`.

### Analítica

* Evento `purchase` final.

### QA de aceptación

1. Fechas correctas.
2. CTA WhatsApp activo.
3. Analítica OK.

---

## Bloque: Mail (Resend)

### Estado actual (confirmado por código)

* Webhook invoca `renderEmail(next, opts)`.
* Idempotencia activa.
* Plantillas por variant (bundle, live_class, one_to_one).

### Cambios necesarios

* `bundle`: listar hijos y fechas próximas.
* `live_class`: fecha exacta de instancia.
* `one_to_one`: CTA WhatsApp simple.
* Copia admin a `confirmados@lobra.net`.

### Impactos o dependencias secundarias

* Usa `resolveNextStep`.

### Archivos afectados

* `/lib/emails/renderers/index.ts`.
* `/lib/postpurchase/resolveNextStep.ts`.
* `/app/api/stripe/webhooks/route.ts`.

### Analítica

* Evento interno `email.receipt.sent`.

### QA de aceptación

1. Un solo correo por sesión.
2. Copia admin llega.
3. Fechas correctas.
4. CTA WhatsApp visible.

---

## Bloque: Prelobby

### Estado actual (confirmado por código)

* `PrelobbyClient` maneja estados de tiempo, validación de email y CTA dinámico.
* `verify` controla acceso.
* `api/ics` genera archivo calendario.

### Cambios necesarios

* Implementar RPC `f_entitlement_has_email(p_email text,p_sku text)`.
* Prioridad de validación: dominio → local → RPC → deny.
* Agregar tabla `prelobby_overrides`.
* UX de error con CTA WhatsApp `https://wa.me/525541930690?text=Hola%2C%20no%20puedo%20entrar%20al%20prelobby.%20Mi%20correo%20es%20{email}.%20SKU%3A%20{sku}.`
* Evento GA4 `prelobby_enter`.
* UID .ics `${instance_slug}@lobra.net`.

### Impactos o dependencias secundarias

* Requiere `SUPABASE_SERVICE_ROLE_KEY` y `PRELOBBY_TEST_DOMAIN`.

### Archivos afectados

* `f_entitlement_has_email.sql` (RPC).
* `prelobby_overrides.sql` (opcional).
* `/app/api/prelobby/verify/route.ts`.
* `/app/webinars/[slug]/prelobby/PrelobbyClient.tsx`.
* `/app/api/ics/[slug]/route.ts`.

### Analítica

* `prelobby_enter` con `{sku,ok}`.

### QA de aceptación

1. Acceso válido por dominio lobra.net.
2. Acceso válido por entitlement.
3. Mensaje de error y CTA WhatsApp visibles.
4. Evento GA registrado.
5. UID correcto en `.ics`.
