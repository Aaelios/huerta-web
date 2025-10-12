```markdown
# 🧩 Checkout Dinámico — LOBRÁ / Huerta Consulting

## 📘 Descripción General

El módulo **Checkout Dinámico** permite procesar pagos con **Stripe Embedded Checkout**, utilizando información dinámica proveniente de los archivos JSONC de webinars (y en el futuro, otros productos).  
Fue diseñado para escalar y mantener consistencia entre precios, UI y metadatos del backend (Supabase, Stripe, etc.).

El flujo reemplaza al checkout estático previo (`/checkout/page.tsx`) y actualmente vive en:
```

app/checkout/[slug]/

````

---

## ⚙️ Flujo de Ejecución

### 1. Desde el punto de venta
- CTA en `/webinars/[slug]/page.tsx` genera enlace con:
  ```ts
  getCheckoutUrl(shared.slug, { mode })
````

* Redirige a `/checkout/[slug]`.

### 2. Construcción de la página

* `app/checkout/[slug]/page.tsx`

  * Carga todos los webinars vía `loadWebinars()`.
  * Busca el webinar por `slug`.
  * Construye el UI con `buildCheckoutUI()`.
  * Crea `sessionPayload` con `buildSessionPayload()`.
  * Renderiza `<CheckoutClient />`.

### 3. Cliente

* `CheckoutClient.tsx`:

  * Muestra layout paritario con el checkout antiguo.
  * Llama a `/api/stripe/create-checkout-session`.
  * Monta `Stripe.initEmbeddedCheckout(clientSecret)`.
  * Reporta `begin_checkout` a GTM/GA4.

### 4. API Server

* `app/api/stripe/create-checkout-session/route.ts`

  * Valida `price_id` o resuelve desde catálogo (`sku + currency`).
  * Recupera `stripe.price` real (fuente de verdad).
  * Crea sesión Embedded con `f_createStripeEmbeddedSession()`.
  * Retorna `{ client_secret, session_id, unit_amount }`.

### 5. Post-compra

* Stripe redirige a `/gracias?session_id=...`
* `app/gracias/page.tsx`:

  * Recupera `session`.
  * Extrae `{ sku, fulfillment_type, success_slug }` de `metadata`.
  * Determina el siguiente paso (`resolveNextStep()`).

---

## 🧱 Principales Archivos

| Archivo                                            | Rol                                                  |
| -------------------------------------------------- | ---------------------------------------------------- |
| `/app/webinars/[slug]/page.tsx`                    | Genera CTA al checkout                               |
| `/app/checkout/[slug]/page.tsx`                    | Punto de entrada dinámico del checkout               |
| `/app/checkout/[slug]/CheckoutClient.tsx`          | Lógica del cliente y render del embed                |
| `/lib/ui_checkout/buildCheckoutUI.ts`              | Construye los textos e interfaz a partir del webinar |
| `/lib/ui_checkout/buildSessionPayload.ts`          | Arma el payload de sesión Stripe                     |
| `/lib/ui_checkout/findWebinarBy.ts`                | Busca webinar por `sku` o `price_id`                 |
| `/lib/ui_checkout/getCheckoutUrl.ts`               | Helper para URLs de checkout                         |
| `/lib/webinars/getWebinarBySku.ts`                 | Búsqueda cacheada por SKU                            |
| `/lib/webinars/getWebinarByPriceId.ts`             | Búsqueda cacheada por Price ID                       |
| `/data/checkout.defaults.json`                     | Textos y bullets por defecto                         |
| `/app/api/stripe/create-checkout-session/route.ts` | Crea la sesión Stripe Embedded                       |

---

## 🧩 Integraciones

* **Stripe Embedded Checkout**

  * `stripe.prices.retrieve` garantiza sincronización del monto.
  * Metadatos enviados: `sku`, `fulfillment_type`, `product_id`, `price_id`, `success_slug`.

* **Supabase**

  * Backend gestiona tablas `orders` y `entitlements` vía webhook Stripe.

* **GA4 / GTM**

  * `begin_checkout` → al iniciar sesión Stripe.
  * `purchase` → en `/gracias`.

---

## ✅ Estado Actual (Oct 2025)

**Completado**

* Checkout 100 % dinámico por slug.
* UI y estructura paritaria con la versión anterior.
* `renderAccent()` aplicado en títulos y descripciones.
* Validación `mode`, `coupon`, `utm_*` en query.
* `getWebinarByPriceId` con caché TTL 120 s.
* `/gracias` opera correctamente con `session_id`.

**Pendiente / Futuro**

1. **Diseño**

   * Ajustes menores de márgenes y colores (por hacer en `globals.css`).
2. **Seguridad**

   * Validar que `price_id` pertenezca al `product_id` esperado.
3. **Marketing**

   * Habilitar uso real de `coupon` y `utm_*` en Stripe.
4. **Analítica**

   * Incluir `unit_amount` y `currency` en `begin_checkout`.
5. **Multi-producto**

   * Extender a `templates`, `1a1` y `subscriptions`.
6. **Errores controlados**

   * Página de fallback `/checkout/error` para códigos de error comunes.

---

## 🔐 Variables de Entorno

| Variable                             | Descripción                               |
| ------------------------------------ | ----------------------------------------- |
| `STRIPE_SECRET_KEY`                  | Clave privada de Stripe                   |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clave pública para cliente                |
| `APP_URL`                            | URL base para construir `success_url`     |
| `CACHE_WEBINARS_TTL`                 | Tiempo de caché en segundos (default 120) |
| `NEXT_PUBLIC_DEBUG`                  | Activa logs de diagnóstico en cliente     |

---

## 🧭 Flujo Completo

```
Cliente → /webinars/[slug]
   ↓
getCheckoutUrl(slug)
   ↓
/checkout/[slug]
   ↓
API /create-checkout-session
   ↓
Stripe Embedded
   ↓
Pago completado
   ↓
/gracias?session_id=...
   ↓
Supabase Webhook → concede acceso
```

---

## 📂 Convenciones de Código

* Tipado estricto (`no-explicit-any`).
* `camelCase` con prefijos (`f_`, `m_`, `cfg_`) según convención Kairos.
* Lógica desacoplada en `lib/ui_checkout`.
* Sin hardcode visual (texto configurable en JSONC o defaults).
* No se sobreescriben estilos en componentes; todo se ajusta vía `globals.css`.

---

## 🧠 Roles Clave

| Rol                       | Responsabilidad                                                   |
| ------------------------- | ----------------------------------------------------------------- |
| **Solution Architect**    | Supervisar integridad del flujo y nuevas integraciones            |
| **Implementation Leader** | Crear nuevos tipos de producto y mantener la paridad visual       |
| **Row Leader / Dev**      | Ajustar UI o agregar compatibilidad con nuevos `fulfillment_type` |

---

## 🧾 Historial

| Fecha   | Versión | Cambio                                                      |
| ------- | ------- | ----------------------------------------------------------- |
| 2025-10 | v1.0    | Migración completa a `/checkout/[slug]`                     |
| 2025-10 | v1.1    | Paridad visual y tipado completo                            |
| —       | —       | Pendiente: cupones, validaciones y expansión multi-producto |

```
```
