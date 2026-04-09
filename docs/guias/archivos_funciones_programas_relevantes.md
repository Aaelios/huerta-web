# Lobra — Archivos, funciones y programas relevantes

## Referencia rápida para volver a Arquitectura / Control

## 1. Core transaccional

### Stripe checkout

* `app/api/stripe/create-checkout-session/route.ts`

  * Punto real de creación de sesión
  * Importancia: crítica
  * Motivo: aquí se valida catálogo/precio contra Supabase y Stripe

### Stripe webhook

* `app/api/stripe/webhooks/route.ts`

  * Entrada principal de eventos de Stripe
  * Importancia: crítica
  * Motivo: firma, idempotencia, refetch, orquestación, Resend

### Orquestador de webhook

* `lib/orch/h_stripe_webhook_process.ts`

  * Lógica real de negocio del webhook
  * Importancia: crítica
  * Motivo: aquí se materializan order/payment/entitlement

---

## 2. Supabase / acceso / órdenes

### Ordenes

* `public.order_headers`
* `public.order_items`
* `public.order_events`
* `public.payments`
* Importancia: crítica
* Motivo: base de compra, conciliación y pago

### Accesos

* `public.entitlements`
* `public.entitlement_events`
* `public.v_entitlements_active`
* Importancia: crítica
* Motivo: fuente de verdad de acceso

### Webhooks

* `public.webhook_events`
* `f_webhooks_log_event`
* `f_webhooks_mark_processed`
* Importancia: crítica
* Motivo: idempotencia y trazabilidad

### Orquestación de órdenes

* `f_orch_orders_upsert`
* `f_order_headers_upsert`
* `f_payments_upsert`
* `f_orders_parse_metadata`
* `f_orders_parse_payment`
* `f_orders_resolve_user`
* Importancia: crítica
* Motivo: flujo real desde Stripe hasta DB

### Accesos / grants

* `f_entitlements_apply`
* `f_entitlements_grant`
* `f_entitlements_renew_subscription`
* Importancia: crítica
* Motivo: concesión y renovación de acceso

---

## 3. Catálogo / webinars / fuente de verdad

### Hub correcto (Supabase)

* `app/webinars/page.tsx`

  * Importancia: alta
  * Motivo: ya usa API/Supabase, referencia del modelo correcto

* `app/api/webinars/search/route.ts`

  * Importancia: crítica
  * Motivo: catálogo de hub basado en Supabase

* `src/server/modules/webinars/m_catalogo`

  * Importancia: alta
  * Motivo: lógica catálogo real del hub

### Dependencia legacy (JSON)

* `data/webinars.jsonc`

  * Importancia: alta
  * Motivo: fuente legacy todavía usada en detalle/checkout/prelobby/helpers

* `lib/webinars/loadWebinars.ts`

  * Importancia: crítica
  * Motivo: raíz de dependencia al JSON

* `lib/webinars/load.ts`

  * Función clave: `getWebinar`
  * Importancia: crítica
  * Motivo: lookup por slug

* `lib/webinars/getWebinarBySku.ts`

  * Importancia: crítica
  * Motivo: lookup por SKU usado en postcompra y UI

* `lib/webinars/getWebinarByPriceId.ts`

  * Importancia: media
  * Motivo: lookup auxiliar por Stripe Price ID

---

## 4. Páginas que hoy dependen del JSON de webinars

### Detalle

* `app/webinars/[slug]/page.tsx`

  * Importancia: crítica
  * Motivo: detalle público, metadata, pricing, CTA

### Checkout

* `app/checkout/[slug]/page.tsx`

  * Importancia: crítica
  * Motivo: arma UI y payload usando webinar legacy

* `app/checkout/[slug]/CheckoutClient.tsx`

  * Importancia: crítica
  * Motivo: begin_checkout, create session, Embedded Checkout
  * Nota: no tocar salvo necesidad real

### Prelobby

* `app/webinars/[slug]/prelobby/page.tsx`

  * Importancia: alta
  * Motivo: acceso previo por email/entitlement

* `app/api/prelobby/verify/route.ts`

  * Importancia: alta
  * Motivo: validación backend de acceso

### Gracias

* `app/gracias/page.tsx`

  * Importancia: crítica
  * Motivo: compra validada, CTA siguiente paso, purchase event

* `app/gracias/PurchaseTracker.tsx`

  * Importancia: media
  * Motivo: purchase tracking con deduplicación

### Infra auxiliar

* `app/api/ics/[slug]/route.ts`

  * Importancia: media
  * Motivo: calendario / evento

* `app/sitemap.ts`

  * Importancia: baja-media
  * Motivo: SEO / URLs

---

## 5. UI / helpers que dependen indirectamente del JSON

* `lib/ui_checkout/buildCheckoutUI.ts`

  * Importancia: alta
  * Motivo: construye UI del checkout

* `lib/ui_checkout/findWebinarBySku.ts`

  * Importancia: media
  * Motivo: helper intermedio de lookup

* `lib/postpurchase/resolveNextStep.ts`

  * Importancia: alta
  * Motivo: define CTA postcompra y depende de lookup por SKU

* `lib/ui_checkout/buildSessionPayload`

  * Importancia: alta
  * Motivo: payload enviado al backend de checkout

---

## 6. Clases gratuitas / leads / marketing

### Página

* `app/clases-gratuitas/[slug]/page.tsx`

  * Importancia: alta
  * Motivo: landing ya más alineada a DB

* `components/clases-gratuitas/FreeClassLandingPageClient.tsx`

  * Importancia: media
  * Motivo: solo UI, no backend

* `components/clases-gratuitas/FreeClassRegisterForm.tsx`

  * Importancia: alta
  * Motivo: probable punto real de submit / contacto / Brevo

### Contactos

* `lib/orch/h_call_orch_contact_write.ts`

  * Importancia: alta
  * Motivo: wrapper estable hacia RPC de contacto

### RPC / tablas contacto

* `f_orch_contact_write`
* `contacts`
* `messages`
* `subscription_events`
* Importancia: alta
* Motivo: base de contactos y eventos de marketing

### Brevo

* Integración real pendiente de localizar en submit o endpoint
* Importancia: media
* Motivo: no es core transaccional, sí importa para nurturing

---

## 7. Email transaccional

* `renderEmail`
* `resolveNextStep`
* Resend desde webhook route
* Importancia: alta
* Motivo: confirmación postcompra, no marketing

---

## 8. Tracking / analytics

* `CheckoutClient.tsx`

  * Evento: `begin_checkout`
  * Importancia: alta

* `PurchaseTracker.tsx`

  * Evento: `purchase`
  * Importancia: alta

* `ViewContentTracker`

  * Evento: `view_content`
  * Importancia: media

* `lib/analytics/dataLayer`

  * Importancia: media
  * Motivo: helper común de GTM/dataLayer

### Gap identificado

* `entrada_funnel` → no localizado
* `cambio_etapa` → no localizado

---

## 9. Programas / servicios externos relevantes

* Supabase

  * DB, auth, catálogo parcial, órdenes, accesos, contactos
  * Importancia: crítica

* Stripe

  * checkout, price, session, invoice, payment, webhook
  * Importancia: crítica

* Resend

  * email transaccional postcompra
  * Importancia: alta

* Brevo

  * cohorts, listas, nurturing
  * Importancia: media

* GTM / GA4 / Meta

  * tracking y analítica
  * Importancia: media-alta

* Vercel / Next.js

  * app runtime, routing, ISR/SSG
  * Importancia: alta

---

## 10. Relación que sí vale la pena recordar

### No tocar salvo necesidad fuerte

* `app/api/stripe/create-checkout-session/route.ts`
* `app/api/stripe/webhooks/route.ts`
* `CheckoutClient.tsx`
* `app/gracias/page.tsx`
* grants de entitlements

### Donde está el cambio correcto

* `loadWebinars`
* `getWebinar`
* `getWebinarBySku`
* detalle `/webinars/[slug]`
* checkout `/checkout/[slug]`
* prelobby

### Donde puede haber sorpresa

* `resolveNextStep`
* `FreeClassRegisterForm`
* `app/api/prelobby/verify/route.ts`
* `app/api/ics/[slug]/route.ts`
