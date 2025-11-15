# Documento Maestro — Página de Venta de Módulos LOBRÁ (v1)

## 1. Objetivo del proyecto
Crear una página de venta especializada para **módulos** usando la ruta actual  
`/webinars/[slug]` con slugs tipo `ms-…`, sin alterar la arquitectura existente del hub, checkout o webhooks.

El módulo debe:
- Mostrar contenido detallado del bundle (beneficios, qué incluye, hijos, precios).
- Reutilizar al máximo las piezas actuales (checkout, Supabase, cards, etc.).
- No romper absolutamente nada de lo que ya funciona para **webinars individuales** (`w-…`).

---

## 2. Qué SÍ vamos a hacer

### 2.1. Nuevo layout para módulos dentro de `/webinars/[slug]`
- Si el slug inicia con `ms-` (o `fulfillment_type = bundle`):
  - La página dejará de utilizar `getWebinar` y el layout `SalesHero + SalesClase`.
  - Usará un **nuevo layout de módulo**.
- El nuevo layout incluirá:
  - Hero comercial del módulo.
  - Beneficios del módulo.
  - Lista de clases hijas obtenidas desde Supabase.
  - Precio regular (suma de hijos) vs precio del paquete.
  - CTA principal → checkout del módulo.

**Motivo:** la experiencia actual está construida para webinars individuales, no para módulos.

---

### 2.2. Crear nueva fuente de copy para módulos
Archivo: `data/modules_marketing.jsonc`.

Usos:
- Hero.
- Subtítulo.
- Bullets.
- Beneficios.
- Incluye.
- Para quién es.
- FAQs opcionales.
- SEO básico para módulos.

No incluye:
- Precios.
- Hijos.

**Motivo:** no queremos saturar `webinars.jsonc` ni tablas de Supabase con copy comercial.

---

### 2.3. Leer composición del módulo desde Supabase
Usaremos:

- Tabla `products` → `sku` del módulo.
- Tabla `bundles` → relación del bundle.
- Tabla `bundle_items` → lista de SKUs hijos.

Para cada `child_sku`:
- Buscar en `products`.
- Obtener `page_slug`.
- Si es `live_class`, buscar contenido del card en `webinars.jsonc`.

**Motivo:** estas tablas son la **única fuente de verdad** de la composición del módulo.

---

### 2.4. Reutilizar checkout actual sin cambios
- CTA: `getCheckoutUrl(slug, { mode })`.
- `slug` sigue siendo `ms-…`.
- Todo el flujo de checkout y webhooks permanece intacto.

**Motivo:** checkout ya funciona hoy, no queremos tocar áreas críticas.

---

### 2.5. Calcular precio regular dinámicamente
- Obtener hijos vía `bundle_items`.
- Sumar precios hijos desde `products.amount_cents`.
- Mostrar:
  - Precio regular: suma de hijos.
  - Precio paquete: precio del módulo (`products.amount_cents` del bundle).

**Motivo:** evita duplicidad de información y permite cambios dinámicos.

---

### 2.6. Mantener intacto el hub `/webinars`
No se tocará:

- `app/webinars/page.tsx`
- `HubItemDTO`
- `SectionGrid`
- `FiltersBar`
- `Pagination`
- `WebinarCard`

**Motivo:** ya funciona correctamente y toma datos directamente de Supabase.

---

### 2.7. Mantener intacto el sistema de webinars individuales
No se alterará:

- `webinars.jsonc`
- `getWebinar`
- `WebinarSchema`
- `SalesHero`
- `SalesClase`
- SEO desde `webinars.jsonc`

**Motivo:** no se puede romper ni una sola clase individual.

---

## 3. Qué NO vamos a hacer (y por qué)

### 3.1. No agregar más contenido de módulos a `webinars.jsonc`
**Razón:** este archivo es exclusivo para webinars individuales y está sujeto a `WebinarSchema`.

---

### 3.2. No usar nuevas rutas como `/modulos/…` en esta fase
**Razón:** implica cambios en SEO, Supabase (`page_slug`) y redirects. No aporta valor inmediato.

---

### 3.3. No modificar el hub `/webinars`
**Razón:** alto riesgo en filtros, paginación y tipos. Ya muestra módulos correctamente.

---

### 3.4. No alterar el checkout ni su endpoint
**Razón:** flujo delicado pero estable. No se debe modificar.

---

### 3.5. No duplicar lógica en Supabase
**Razón:** la composición del módulo ya está bien modelada con `bundles` y `bundle_items`.

---

## 4. Estructura final deseada de `/webinars/[slug]`

### Caso 1 — Clases individuales (`w-…`)
- Flujo actual:
  - `getWebinar`
  - `SalesHero`
  - `SalesClase`
  - SEO desde JSON
  - CTA con slug individual

### Caso 2 — Módulos (`ms-…`)
- Nuevo flujo:
  - **NO** usar `getWebinar`.
  - Cargar datos del módulo:
    - `products`
    - `bundles`
    - `bundle_items`
    - `modules_marketing.jsonc`
  - Renderizar:
    - Nuevo `ModuleHero`
    - Nuevo `ModuleBenefits`
    - Nueva sección `ModuleClasses`
    - Precio regular vs precio módulo
    - CTA → checkout
  - SEO desde `modules_marketing.jsonc`.

---

## 5. Siguientes pasos (documentación)
Cada avance debe registrar:

- Archivos nuevos:
  - `data/modules_marketing.jsonc`
  - Componentes: `ModuleHero`, `ModuleLayout`, `ModuleClasses`, etc.

- Archivos modificados:
  - `app/webinars/[slug]/page.tsx`

- Tablas utilizadas:
  - `products`
  - `bundles`
  - `bundle_items`

- Dependencias que **no** se modifican:
  - `getWebinar`
  - Hub `/webinars`
  - Checkout
  - Webhooks

````md
## 6. Checkout & Stripe — Dependencias y límites de cambio

Esta sección documenta cómo funciona hoy el flujo de checkout y qué partes **no** se tocarán en el proyecto de página de módulos.

---

### 6.1. Página `/checkout/[slug]`

**Archivo:** `app/checkout/[slug]/page.tsx`

#### 6.1.1. Origen de datos

- Usa `loadWebinars()` desde `lib/webinars/loadWebinars`.
- `loadWebinars()` carga **TODOS** los webinars desde `data/webinars.jsonc`.
- Convierte el resultado a arreglo (`toArray`).
- Busca el webinar donde `w.shared.slug === slug` (el slug de la URL).

Si no encuentra coincidencia → `notFound()`.

**Implicación:**

> Para que cualquier checkout funcione (webinar o módulo), el `slug` debe existir en `webinars.jsonc` y tener `shared.slug` definido.

Esto aplica a:
- Slugs de clases individuales (`w-...`).
- Slugs de módulos (`ms-...`) que ya se venden hoy.

#### 6.1.2. Construcción de UI y payload

A partir del `webinar` encontrado:

- Normaliza `searchParams` (query string) a un objeto `Norm`:
  - `mode`: `"payment"` o `"subscription"`.
  - `price_id`: opcional.
  - `coupon`: opcional.
  - `utm_*`: opcionales.

- Construye:
  - `ui = buildCheckoutUI(webinar, checkoutDefaults)`.
  - `sessionPayload = buildSessionPayload(webinar, overrides)`.

Pasa todo a:

```tsx
<CheckoutClient
  slug={slug}
  webinar={webinar}
  ui={ui}
  sessionPayload={sessionPayload}
  query={qp.raw}
/>
````

**Conclusión:**

* La página de checkout depende **solo** de `webinars.jsonc` y sus tipos (`Webinar`).
* No consulta Supabase ni tablas de `bundles` / `bundle_items`.
* `buildCheckoutUI` y `buildSessionPayload` esperan un objeto `webinar` válido según `WebinarSchema`.

**Decisión del proyecto módulos:**

* No se modificará:

  * `app/checkout/[slug]/page.tsx`.
  * `buildCheckoutUI`.
  * `buildSessionPayload`.
* La nueva landing de módulos deberá seguir usando el **mismo slug** y mantener su entrada correspondiente en `webinars.jsonc`.

---

### 6.2. Endpoint `/api/stripe/create-checkout-session`

**Archivo:** `app/api/stripe/create-checkout-session/route.ts`

#### 6.2.1. Entrada esperada

El endpoint espera un JSON con la forma:

* `sku?: string`
* `price_id?: string` / `priceId?: string`
* `currency?: string`
* `mode?: 'payment' | 'subscription'`
* `metadata?: Record<string, string>`
* `coupon?: string`
* `utm?: Record<string, string | undefined>`

Dos caminos:

1. **Camino con `price_id` directo**

   * Si viene `price_id`:

     * Se hace `stripe.prices.retrieve(price_id, { expand: ['product'] })`.
     * Se infiere `mode` según el tipo de Price:

       * `recurring` → `subscription`.
       * `one_time` → `payment`.

2. **Camino con catálogo (`sku + currency`)**

   * Si **no** viene `price_id`:

     * `f_parseInput(raw)` valida y extrae al menos `sku` y `currency`.
     * Se llama a `f_callCatalogPrice({ sku, currency })` (catálogo en Supabase).
     * De la fila resultante se obtiene:

       * `stripe_price_id`
       * `row.metadata` (ej. `price_list`, `interval`, etc.).
     * Se vuelve a consultar el Price en Stripe para alinear datos finales.

**Conclusión:**

> El endpoint depende de que el frontend (checkout) le envíe un `sku` y `currency` válidos, o un `price_id` válido.
> No conoce `slug` ni rutas; solo trabaja con catálogo y Stripe.

#### 6.2.2. Metadata enviada a Stripe

El endpoint consolida metadata a partir de:

* `raw.metadata` (payload del cliente).
* `price.metadata` (metadata del Price en Stripe).
* `row.metadata` (metadata de catálogo).

Campos clave en `metadata` final:

* `sku`
* `fulfillment_type`
* `success_slug`
* `price_list`
* `interval`
* `price_id`
* `product_id`
* Campos UTM (`utm_source`, `utm_medium`, etc.).
* `coupon_hint` (si viene `coupon` en el request).

Esta metadata es la que los **webhooks de Stripe** usarán para:

* Crear órdenes (`orders`).
* Crear entitlements (`entitlements`).
* Saber si el producto es un `bundle`, `live_class`, `one_to_one`, etc.

#### 6.2.3. Relación con módulos

Para módulos que ya se venden hoy:

* `buildSessionPayload` ya está enviando:

  * `sku` del bundle.
  * `currency`.
  * `metadata` adecuada (o se complementa con `price.metadata`).
* Los webhooks ya interpretan ese `sku` como bundle según:

  * `metadata.fulfillment_type = 'bundle'` (o similar).

**Decisión del proyecto módulos:**

* No se modificará:

  * `app/api/stripe/create-checkout-session/route.ts`.
  * `f_parseInput`.
  * `f_callCatalogPrice`.
  * `f_createStripeEmbeddedSession`.
  * `f_buildReturnUrl`.

* La nueva landing de módulos:

  * Seguirá llamando al checkout mediante `getCheckoutUrl(slug, { mode })`.
  * Seguirá usando slugs y SKUs ya conocidos por:

    * `webinars.jsonc`.
    * `buildSessionPayload`.
    * Catálogo en Supabase.
    * Webhooks.

---

### 6.3. Riesgos controlados

Mientras se cumplan estas condiciones:

* El módulo conserva el mismo `slug` (`ms-…`).
* Ese `slug` sigue existiendo en `webinars.jsonc` con `shared.slug` y `shared.pricing` válidos.
* `sku` del bundle no cambia o, si cambia, se actualiza en:

  * Catálogo (Supabase).
  * `webinars.jsonc` / configuración que use `buildSessionPayload`.

Entonces:

> La nueva landing de módulo **no rompe** el flujo de pago ni los webhooks.
> El proyecto se limita a cambiar la capa de presentación de `/webinars/[slug]` para slugs de tipo módulo, manteniendo intacta la lógica de checkout y backend.

```
```
