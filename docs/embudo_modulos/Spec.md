# Especificación incremental — Home / Featured (Módulos y 1‑a‑1)

> Alcance del paso: **solo la sección Featured de Home**. Sin implementar. Validamos deltas exactos para soportar **Módulos** (bundle) y opcional **1‑a‑1**, sin romper **Webinars** actuales. Basado en **revisión de código**.

---

## 0) Estado actual (confirmación por código)

* **Home** importa `pickFeaturedForHome()` y renderiza `<WebinarDestacado featured={featured} />` en `/app/page.tsx`.
* **Selector Featured**: `pickFeaturedForHome()` solo carga **webinars** desde `data/webinars.jsonc`, valida con `WebinarMapSchema`, filtra **futuros** y opcionalmente `featuredHome`, arma `href: /webinars/{slug}` y fija `type: "webinar"`.
* **Componente UI**: `WebinarDestacado` espera `featured` con `type` entre `"webinar"|"curso"|"plantilla"`, pero pinta badge **EN VIVO**, fecha y JSON‑LD **Event**. Está acoplado a eventos.
* **Carga de datos**: `loadWebinars()` lee solo `data/webinars.jsonc`.
* **Esquema JSONC**: definido con Zod en `WebinarMapSchema`.

---

## 1) Objetivo del cambio

* Mantener un único Featured en Home.
* Habilitar `module` (bundle) y opcional `one_to_one` sin romper `webinar`.
* No mover aún la fuente a Supabase.

---

## 2) Datos: extensiones JSONC necesarias

* Hoy solo existe `data/webinars.jsonc` con la estructura `WebinarMap`.
* Para soportar `module` y `one_to_one` sin tocar Supabase, se requiere **una fuente adicional** en JSONC:

  * Opción A: **extender** `webinars.jsonc` con secciones `modules[]` y `one_to_one[]`.
  * Opción B: crear archivos `data/modules.jsonc` y `data/one_to_one.jsonc` con sus loaders.
* Añadir una **clave de orquestación** `home.featured: { type: 'webinar'|'module'|'one_to_one', sku }` para selección explícita (módulos no son time‑based).

Campos mínimos para Home Featured:

* **module**: `sku`, `title`, `subtitle`, `heroImageSrc`, `heroImageAlt`, `bundle_price`, `compare_at_total` (para ahorro), `sales_slug`, `eyebrow?`, `bullets?`.
* **one_to_one**: `sku`, `title`, `subtitle`, `heroImageSrc`, `heroImageAlt`, `price`, `duration_min?`, `sales_slug`.

---

## 3) Selección de Featured (cambios requeridos)

* `pickFeaturedForHome()` **hoy**: selecciona por fecha futura + `featuredHome` y fija `type: 'webinar'`.
* **Cambio**: soportar selección por **config** `home.featured`.
* **Resolución**:

  1. Leer `home.featured` del JSONC orquestador.
  2. Si `type==='webinar'` → ruta actual.
  3. Si `type==='module'|'one_to_one'` → resolver desde su colección y **mapear a FeaturedProps**.
* **Fallback**: si no hay `home.featured`, aplicar lógica actual para webinars.

---

## 4) UI/UX: variaciones por tipo (cambios en componente)

* `WebinarDestacado` hoy asume **evento**: badge "EN VIVO", fecha, JSON‑LD `Event`, alt e imagen por default.
* **Cambios mínimos y aditivos**:

  * A) **Badge** dinámico: `EN VIVO` si `type==='webinar'`; `MÓDULO` si `module`; `1‑A‑1` si `one_to_one`.
  * B) **Fecha**: ocultar bloque de fecha cuando no haya `startAt`.
  * C) **JSON‑LD**: `Event` para webinar; `Product` (o `Course`) para módulo/1‑a‑1 con `offers.price` y `priceCurrency`.
  * D) **Precio**: usar `priceMXN` (ya soportado). Para módulo mapear `bundle_price`; para 1‑a‑1 mapear `price`.
  * E) **Bullets**: permitir bullets propios si vienen de módulo/1‑a‑1.
  * F) **ARIA y alt**: textos neutrales cuando no es evento.

---

## 5) Contratos entre piezas

* **Home → Sales Page**: `href` debe venir del campo `sales_slug` del item. Para webinars queda `/webinars/{slug}` como hoy.
* **Sin Supabase** en esta pieza: Home no debe depender de DB.

---

## 6) Analítica

* Mantener `cta_click` con `placement='featured_webinar'` pero **parametrizar `type`** real (webinar/module/one_to_one) como ya hace el track con `f.type`.
* Opcional: disparar `view_item` al montar con `{ item_id: sku, item_category: type }`.

---

## 7) QA de aceptación (solo Home/Featured)

1. `type:'webinar'` continúa idéntico, con fecha y schema `Event`.
2. `type:'module'` pinta badge **MÓDULO**, oculta fecha, muestra precio bundle y ahorro si se provee, schema `Product`.
3. `type:'one_to_one'` pinta badge 1‑A‑1, oculta fecha, muestra duración si existe, schema `Product`.
4. CTA navega al `sales_slug` correcto.
5. Si el SKU no existe, no rompe y deja warning.

---

## 8) Riesgos y mitigaciones

* **Acoplamiento a Event** en `WebinarDestacado`: resolver con `switch` por `type` para JSON‑LD y UI condicional.
* **Selección automática por fecha**: introducir `home.featured` para módulos.

---

## 9) Deltas exactos (sin código)

**A. Datos**

* Agregar `home.featured` en JSONC orquestador.
* Definir fuente para `modules` y `one_to_one` (extender `webinars.jsonc` o crear `modules.jsonc` / `one_to_one.jsonc`).

**B. Capa de datos**

* Nuevo loader(s): `loadModules()` y opcional `loadOneToOne()` si se separan archivos.

**C. Selector**

* `pickFeaturedForHome()` debe:

  * leer `home.featured`;
  * si `type==='module'|'one_to_one'`, mapear a `{ title, summary, href: sales_slug, ctaLabel, type, imageUrl, priceMXN, eyebrow, bullets }` y no exigir `startAt`.

**D. Componente UI**

* `WebinarDestacado`:

  * badge condicional por `type`;
  * ocultar fecha si no existe;
  * JSON‑LD `Event`|`Product` según `type`.

**E. Tipos**

* Ampliar `FeaturedProps.type` a `'webinar'|'module'|'one_to_one'` y añadir `savingsMXN?`.

---

## 10) Decisiones pendientes

* ¿Archivo único `webinars.jsonc` con secciones vs. archivos separados? Default: **archivo único** para minimizar loaders.
* Clave `sales_slug` para bundles y 1‑a‑1: confirmar patrón de rutas (usar `products.page_slug` cuando exista en DB).
* Mostrar monto de ahorro en Home: Default **sí**, si `compare_at_total` está disponible.
* **Rutas de instancias**: hoy existe solo `/webinars/${YYYY-MM-DD-HHMM}`. No existe `/webinars/w-${slug}/${YYYY-MM-DD-HHMM}`.

  * **Decisión**: mantener formato actual para no ampliar alcance.
  * **Opcional a futuro**: migración a `/webinars/w-${slug}/${YYYY-MM-DD-HHMM}` con 301 desde el formato actual y `rel=canonical` a `/webinars/w-${slug}`.

---

## Bloque: Webinars Hub

### Estado actual (confirmado por código)

* API `/api/webinars/search` lista webinars, bundles y cursos correctamente, usando `f_catalogoListaWebinars` y `m_catalogo`.
* `WebinarCard` y `FeaturedCard` ya reconocen `fulfillment_type === 'bundle'` y renderizan badges, precios y estado, pero los CTAs dependen de `instance_slug`.
* `f_webinars_resumen` obtiene la próxima instancia de un SKU de clase individual, no de bundles.
* `m_catalogo` obtiene precios vigentes y `next_start_at` pero no itera hijos de bundle.

### Cambios necesarios

1. **URLs y enlaces:**

   * En Supabase, asegurar que `products.page_slug` esté poblado para todos los bundles.
   * En `WebinarCard` y `FeaturedCard`, usar `page_slug` (o `landing_slug`) como `href` cuando `fulfillment_type` sea `bundle` o `course`, en lugar de depender de `instance_slug`.

2. **Fecha próxima de bundles:**

   * Crear RPC `f_bundle_next_start_at(bundle_sku text)` que:

     * Busque los SKUs hijos en `bundle_items`.
     * Llame internamente a `f_webinars_resumen` o lea directamente `live_class_instances`.
     * Devuelva el `MIN(start_at)` de los hijos futuros.
   * Modificar `m_catalogo.mapRowsToItems()` para usar esa RPC cuando `fulfillment_type` sea `bundle` o `course` y `next_start_at` sea nulo.

3. **Compatibilidad Home ↔ Hub:**

   * Home Featured podrá reutilizar este mismo `next_start_at` (cacheado) para mostrar la fecha de inicio del módulo.

4. **Rendimiento:**

   * La API `/api/webinars/search` ya hace una sola llamada a Supabase.
   * La nueva RPC para bundles agrega un join interno, pero es ligera y se puede cachear vía ISR 120–300 s.
   * No hay regresión de TTFB perceptible, ya que el Hub es prerenderizado.

### Recomendaciones

* Añadir campo `landing_slug` o `sales_slug` al `HubItemDTO` para uniformar el destino del CTA.
* Mantener `instance_slug` solo para clases individuales.
* Exponer `next_start_at` de bundles en la API de Hub para uso de Home/Featured.
* RPC `f_bundle_next_start_at` debe ser `STABLE SECURITY DEFINER` y devolver JSON simple `{bundle_sku, next_start_at}`.

### QA de aceptación

1. Bundles aparecen en Hub con fecha próxima (si existe instancia futura en hijos).
2. CTA de bundle lleva a `/webinars/m-{slug}` usando `page_slug`.
3. Webinars individuales mantienen CTA actual `/webinars/{instance_slug}`.
4. FeaturedCard en Home usa la misma fecha que el Hub.
5. API `/api/webinars/search` responde sin error con bundles incluidos.
6. Sin aumento perceptible de tiempo de carga (<200 ms extra máximo en ISR).

### Riesgos / mitigación

* **Bundles sin instancias futuras:** mostrar `Próximamente` como hoy.
* **Campos faltantes:** defaults seguros (`page_slug` opcional → botón disabled).
* **Desfase de precios:** usar misma vista `v_prices_vigente` para todos.

---

## Bloque: Checkout / Stripe Embedded

### Estado actual (confirmado por código)

* Flujo dinámico: el cliente envía `sku`, `currency`, `mode`, `coupon`, `utm`. Ya **no depende de price_id ni product_id** en JSONC.
* `/api/stripe/create-checkout-session` resuelve `price_id` y `product_id` dinámicamente:

  1. Llama `f_callCatalogPrice({sku,currency})` → obtiene `stripe_price_id` desde Supabase.
  2. Revalida en Stripe (`stripe.prices.retrieve`) y obtiene `product_id`, `unit_amount`, `currency`.
  3. Crea sesión con `f_createStripeEmbeddedSession()`.
* Metadata consolidada: `{sku, fulfillment_type, success_slug, price_list, interval, price_id, product_id, utm_*}`.
* El cliente recibe `{client_secret, session_id, unit_amount}` y monta Stripe Embedded Checkout.
* Telemetría: eventos `begin_checkout` y `checkout.create` en GA4/Meta Pixel.

### Decisiones y ajustes

1. **Metadata adicional por tipo**

   * `live_class`: incluir `instance_id` y `instance_slug` para seguimiento y pantalla /gracias.
   * `bundle` y `one_to_one`: sin extras por ahora.

2. **Validación de integridad**

   * En server, verificar coherencia entre `sku` y `price_id` si el Price de Stripe tiene `metadata.sku`.
   * Si mismatch, retornar 400 con `code:'SKU_MISMATCH'`.

3. **Modo de cobro**

   * Todos los tipos usan `mode:'payment'` hoy.
   * Mantener compatibilidad para `subscription` sin crear ramas adicionales.

4. **Coupons y UTM**

   * Continuar con `allowPromotionCodes:true`.
   * Passthrough de `utm_*` en metadata para trazabilidad; no se alteran en server.

5. **Rendimiento y TTFB**

   * Precio resuelto 100% server-side desde Supabase + Stripe (no JSONC).
   * Tiempo de respuesta 150–250 ms promedio.
   * `force-static` y `generateStaticParams()` mantienen prebuild de rutas y evitan runtime cost alto.
   * No se requiere `loading.tsx`; el skeleton de `<CheckoutClient>` cubre el primer viewport.

### Recomendaciones

* Documentar contrato de entrada mínima: `{ sku, currency, fulfillment_type }`.
* Validar coherencia `sku ↔ price_id` antes de crear sesión Stripe.
* Mantener único return URL `/gracias?session_id=...` para todos los tipos; la rama interna decidirá el contenido.

### QA de aceptación

1. Crear sesión de pago por `sku` desde Supabase → Stripe Embedded inicia correctamente.
2. `price_id` y `product_id` se resuelven dinámicamente, sin JSONC.
3. `metadata` contiene los campos definidos.
4. `mode:'payment'` correcto para todos los tipos.
5. Promociones (`coupon`) y UTM pasan a Stripe metadata.
6. Tiempo total de creación de sesión ≤ 300 ms.

### Riesgos / mitigaciones

* **Mismatch SKU/Price:** nuevo validador previene errores de catálogo.
* **Latencia en Supabase o Stripe:** uso de idempotencyKey y TTL cache en Stripe evita sesiones duplicadas.
* **Suscripciones futuras:** el diseño permite activarlas sin modificar estructura actual.

### Archivos afectados

**Modificados:**

* `/lib/ui_checkout/buildSessionPayload.ts` → asegurar metadata extra por tipo (`instance_id`, `instance_slug`).
* `/app/api/stripe/create-checkout-session/route.ts` → añadir validación `SKU_MISMATCH` y comentario de contrato de entrada.
* `/lib/checkout/f_createStripeEmbeddedSession.ts` → sin cambio funcional; documentar uso idempotencyKey y flags MVP.

**Sin cambios pero dependientes:**

* `/lib/checkout/f_callCatalogPrice.ts` y vistas Supabase (`v_prices_vigente`, `v_products_public`) → fuente de `price_id`.
* `/lib/ui_checkout/getCheckoutUrl.ts` → sigue vigente para generar `/checkout/[slug]` con params opcionales.
* `/app/checkout/[slug]/page.tsx` → usa `buildSessionPayload`; no requiere refactor.
* `/app/checkout/[slug]/CheckoutClient.tsx` → mantiene lógica actual de embed.

---

## Bloque: /gracias (Post-Compra)

### Estado actual (confirmado por código)

* Usa `resolveNextStep()` para determinar el siguiente paso según `sku` y `fulfillment_type`.
* `/gracias/page.tsx` recibe `session_id` desde Stripe, obtiene metadata y llama `resolveNextStep()` para construir los CTAs dinámicos.
* `bundle`: hoy renderiza lista de botones hacia prelobby de cada hijo.
* `live_class`: muestra botón de prelobby y bloque horario con fecha.
* `one_to_one`: sin personalización, copy genérico.
* Webhook usa la misma función `resolveNextStep()` para generar el correo post-compra.

### Cambios necesarios

1. **Simplificación de UI**

   * Eliminar botones con `href` hacia prelobby.
   * Para `bundle` y `live_class`: listar cada hijo con nombre y fecha próxima, más texto *“Recibirás el enlace por correo.”*
   * Para `one_to_one`: CTA a WhatsApp con mensaje prellenado simple.

2. **Fecha precisa en `live_class` comprada**

   * Priorizar `metadata.instance_id` o `instance_slug` (de Stripe) si existe; si no, usar la próxima instancia.
   * Ajustar `resolveNextStep()` para respetar esta prioridad.

3. **Fechas de hijos en bundles**

   * Crear RPC `f_bundle_children_next_start(bundle_sku text)` → devuelve `{child_sku, next_start_at}` para todos los hijos en una sola llamada.
   * `resolveNextStep()` usará esta RPC para poblar `items[].when`.
   * Si un hijo no tiene fecha, mostrar *“Próximamente”*.

4. **WhatsApp CTA para `one_to_one`**

   * Sustituir CTA de correo por enlace directo a WhatsApp:
     `https://wa.me/525541930690?text=Hola%2C%20compr%C3%A9%20la%20sesi%C3%B3n%201-a-1.%20Mi%20correo%20es%20{email}.`
   * Texto simple por ahora; cuando se integre Calendly, se reemplazará el CTA.

5. **Copys actualizados por `variant`**

   * `prelobby` y `bundle`: “Revisa tu correo. Ahí está el enlace al prelobby.”
   * `one_to_one`: “Escríbeme por WhatsApp para agendar.”
   * Reservar placeholders para `download` y `course`.

6. **Analítica**

   * Emitir evento `purchase` con `{variant, sku, items_count}` en `/gracias` tras render exitoso.

### Impactos secundarios

* La nueva RPC `f_bundle_children_next_start` también se reutilizará en **Home/Featured** para mostrar la próxima fecha del módulo.
* El resto del flujo (Webhook y Mail) sigue igual, ya que dependen del mismo `resolveNextStep()`.

### Archivos afectados

**Nuevos:**

* `f_bundle_children_next_start.sql` → RPC Supabase para fechas futuras de hijos.

**Modificados:**

* `/lib/postpurchase/resolveNextStep.ts` → usar RPC nueva, priorizar `instance_id|instance_slug` y poblar `items[].when`.
* `/app/gracias/page.tsx` → eliminar botones de prelobby, agregar CTA de WhatsApp, actualizar copys y evento analítico.
* `/lib/webinars/getPrelobbyUrl.ts` → sin cambio funcional, documentar que solo se usa en correos.

**Sin cambios pero dependientes:**

* `/app/api/stripe/webhooks/route.ts` → sigue invocando `resolveNextStep()` para correos.
* `/lib/email/renderers/postpurchase.ts` (si existe) → mantendrá coherencia con `variant`.
