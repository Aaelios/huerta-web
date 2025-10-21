# Documento Maestro — Implementación Webinars / Bundles / 1-a-1 (v2.1)

---

# **Bloque 1. Home / Featured**

## 1. Objetivo y alcance

Habilitar la sección Featured en Home para mostrar dinámicamente **webinars**, **módulos (bundles)** y **sesiones 1-a-1**, manteniendo compatibilidad total con la lógica actual.

## 2. Estado actual (confirmado por código)

* `pickFeaturedForHome()` carga webinars desde `data/webinars.jsonc` y renderiza `<WebinarDestacado>`.
* Fuente principal: JSONC. Supabase en fase de adopción progresiva.

## 3. Cambios necesarios (Diseño funcional)

**Datos**

* Supabase será fuente principal futura; mientras tanto, mantener JSONC como fallback.
* **Dónde vive `home.featured` hoy:** en el **JSONC maestro** como nodo `{type, sku}`. En v2 mover a Supabase.
* Resolver `home.featured` con `{type, sku}` y orquestar Supabase→JSONC.
* Soporte explícito a `one_to_one`.
* Calcular `savingsMXN` y `compare_at_total` para módulos.

**Selector / lógica**

* Tipos soportados: `webinar | bundle | one_to_one`.
* Fallback de fecha “Próximamente” si no hay `next_start_at`.

**UI/UX**

* Mostrar hero, título, CTA a `page_slug`.
* JSON-LD: `Event` (webinar), `Product` (bundle), `Service` (1-a-1).

**Analítica**

* `featured_view` al montar.
* `cta_click {placement:'home_featured', sku, type}`.

**Errores / fallback**

* Mostrar placeholder y CTA deshabilitado si datos incompletos.

## 4. Contratos y dependencias

* RPC `f_bundle_children_next_start`.
* DTO `{sku, type, title, next_start_at, price_mxn, compare_at_total}`.
* JSONC como fallback de copys.

## 5. Archivos afectados

| Tipo       | Ruta                               | Acción                                           |
| ---------- | ---------------------------------- | ------------------------------------------------ |
| Modificado | `/lib/home/featured.ts`            | Resolver tipo dinámico y fallback Supabase→JSONC |
| Modificado | `/components/WebinarDestacado.tsx` | Adaptar props                                    |
| Modificado | `/data/webinars.jsonc`             | Mantener copys                                   |

## 6. Analítica

| Evento          | Trigger   | Payload                                |
| --------------- | --------- | -------------------------------------- |
| `featured_view` | al montar | `{sku,type,placement:'home_featured'}` |
| `cta_click`     | click CTA | `{placement:'home_featured',sku,type}` |

## 7. QA

Render correcto según tipo; fallback JSONC funcional; analítica correcta.

## 8. Riesgos

Dependencia doble (Supabase + JSONC). Mitigar con logs y validación por tipo.

## 9. Notas

Cuando Supabase cubra 100%, JSONC quedará solo para copys.

## 10. Historial

v2.1 – 2025-10-21 – Reincorporado fallback JSONC

# **Bloque 2. Webinars Hub**

## 1. Objetivo

Mostrar webinars y bundles dinámicamente.

## 2. Estado actual

* Fuente: `v_products_public`, `v_prices_vigente`, `live_class_instances`.

## 3. Cambios necesarios

* Incluir bundles con `f_bundle_next_start_at` y `f_bundle_children_next_start`.
* Exponer `/api/webinars/search` en Preview/Prod.
* Cache ISR 120–300 s.

## 4. Contratos

* RPCs mencionadas arriba.

## 5. Archivos afectados

`/app/webinars/page.tsx`, `/lib/m_catalogo.ts`, `/api/webinars/search`.

## 6. Analítica

`hub_view`, `hub_click` con payload `{sku,type,placement}`.

## 7. QA

Render y TTFB correctos.

## 8. Riesgos

Desfase ISR.

## 9. Notas

Reutiliza RPC del Home.

## 10. Historial

v2.1 – 2025-10-21 – Añadido f_bundle_next_start_at y API search

---

# **Bloque 3. Sales Page — Webinars, Bundles y Asesorías**

## 1. Objetivo y alcance

Unificar páginas de venta para webinars, bundles y 1-a-1 bajo `/webinars/w-{slug}`, `/webinars/m-{slug}` y `/asesorias`.

## 2. Estado actual

Solo existen páginas `/webinars/YYYY-MM-DD-HHHH`.

## 3. Cambios necesarios

* Eliminar rutas por fecha.
* **301** desde rutas con fecha → `/webinars/w-{slug}` o `/webinars/m-{slug}`. **Canonical** siempre a la versión sin fecha.
* Usar `fulfillment_type` como discriminador.
* Mostrar selector de instancias en webinars, lista de clases en bundles, duraciones en asesorías.
* Pasar `instance_id|instance_slug` a metadata checkout.

## 4. Contratos y dependencias

* Supabase: `v_products_public`, `bundles`, `bundle_items`, RPCs fechas.
* Checkout: depende de metadata nueva.

## 5. Archivos afectados

| Tipo  | Ruta                              | Acción                  |
| ----- | --------------------------------- | ----------------------- |
| Nuevo | `/app/webinars/w-[slug]/page.tsx` | Página de venta webinar |
| Nuevo | `/app/webinars/m-[slug]/page.tsx` | Página de venta bundle  |
| Nuevo | `/app/asesorias/page.tsx`         | Página asesorías        |
| Nuevo | `/components/sales/...`           | Componentes UI          |

## 6. Analítica y observabilidad

`view_item`, `select_item`, `begin_checkout`.

## 7. QA

Render y CTA correctos, rutas viejas 301 y canonical correcta.

## 8. Riesgos

Cambio de rutas afecta SEO → mantener redirects 12+ meses.

## 9. Notas

Evaluar consolidar copy en CMS futuro.

## 10. Historial

v2.1 – 2025-10-21 – Añadidos 301 y canónica

# **Bloque 4. Checkout / Stripe Embedded**

## 1. Objetivo

Procesar pagos y crear sesiones Stripe.

## 2. Estado actual

Operativo para webinars.

## 3. Cambios necesarios

* Validar `SKU_MISMATCH`.
* Metadata `instance_id|instance_slug`.
* `allowPromotionCodes:true`.
* Passthrough `utm_*`.
* GA4 `begin_checkout` y `checkout.create`.
* Meta Pixel espejo.
* Mejorar rendimiento con `force-static` y `generateStaticParams()`.
* **Validar moneda** devuelta por Stripe contra Supabase.

## 4. Contratos

* **Entrada** `{sku, currency, fulfillment_type, utm_*}`.
* **Salida (Embedded)** `{client_secret, session_id, unit_amount}`.

## 5. Archivos afectados

`/app/api/stripe/create-checkout-session/route.ts`, `/lib/buildSessionPayload.ts`.

## 6. Analítica

`begin_checkout`, `checkout.create` (GA4 + Meta mirror).

## 7. QA

Checkout sandbox completo, con promoción y UTM.

## 8. Riesgos

Error SKU → rollback.

## 9. Notas

Preparar `subscription_mode` futuro.

## 10. Historial

v2.1 – 2025-10-21 – Añadida telemetría, moneda y rendimiento

# **Bloque 5. /gracias (Post-compra)**

## 1. Objetivo

Confirmar compra y mostrar pasos siguientes.

## 2. Estado actual

Usa `resolveNextStep`.

## 3. Cambios necesarios

* Mostrar texto + fechas (no enlaces).
* Priorizar `instance_id|instance_slug`.
* **Copys por variant**:

  * `live_class`: “Tu clase está confirmada. Recibirás el enlace del prelobby por correo.”
  * `bundle`: “Tu módulo incluye estas clases. Recibirás cada prelobby por correo.”
  * `one_to_one`: **CTA usuario → WhatsApp** con mensaje prellenado; no prometer contacto saliente.
* Evento `purchase {variant,sku,items_count}`.

## 4. Contratos

RPC `f_bundle_children_next_start`.

## 5. Archivos afectados

`/app/gracias/page.tsx`, `/lib/resolveNextStep.ts`.

## 6. Analítica

`purchase` con payload `{variant,sku,items_count}`.

## 7. QA

Mensajes correctos por tipo; fechas correctas.

## 8. Riesgos

Bundles sin fechas → fallback.

## 9. Notas

Mantiene compatibilidad con webhook.

## 10. Historial

v2.1 – 2025-10-21 – Ajuste copy 1-a-1 (usuario inicia WhatsApp)

# **Bloque 6. Mail (Resend)**

## 1. Objetivo

Correo post-compra con CTA dinámico.

## 2. Estado actual

Plantillas genéricas.

## 3. Cambios necesarios

* `variant` diferenciado.
* Incluir fechas y CTA WhatsApp.
* Copia admin `confirmados@lobra.net`.
* Logs `receipt_sent_at`, `admin_notified_at`.
* URLs absolutas `APP_URL`.
* Prioridad `instance_id|instance_slug`.
* **Variables requeridas**: `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`.

## 4. Contratos

Input `{email,sku,variant,metadata}`.

## 5. Archivos afectados

`/app/api/stripe/webhooks/route.ts`, `/lib/renderEmail*.ts`.

## 6. Analítica

Evento interno `email.receipt.sent` (GA4 + internal log).

## 7. QA

Correo <60s, admin copia, URLs válidas, idempotencia por `receipt_sent_at` y `admin_notified_at`.

## 8. Riesgos

Duplicados → idempotencia por `order_id`.

## 9. Notas

Medir latencia `receipt_sent_at`.

## 10. Historial

v2.1 – 2025-10-21 – Añadidas variables/env y métricas de idempotencia

# **Bloque 7. Prelobby**

## 1. Objetivo

Validar acceso.

## 2. Estado actual

Dominio + sesión básica.

## 3. Cambios necesarios

* RPC `f_entitlement_has_email`.
* `prelobby_overrides`.
* Orden: `PRELOBBY_TEST_DOMAIN` → sessionStorage → RPC → deny.
* Error + CTA WhatsApp soporte.
* Evento `prelobby_enter {sku,ok}`.
* UID `.ics` = `${instance_slug}@lobra.net`.
* Referencia explícita `PrelobbyClient`.
* **`.env`**: documentar `PRELOBBY_TEST_DOMAIN`.

## 4. Contratos

RPC `f_entitlement_has_email(p_email,p_sku)` SECURITY DEFINER STABLE.

## 5. Archivos afectados

`/app/api/prelobby/verify/route.ts`, `/app/api/ics/[slug]/route.ts`, `/components/PrelobbyClient.tsx`.

## 6. Analítica

`prelobby_enter` evento GA4.

## 7. QA

Verificación RPC y overrides funcional.

## 8. Riesgos

Rate-limit IP.

## 9. Notas

Variable `PRELOBBY_TEST_DOMAIN` documentada en `.env`.

## 10. Historial

v2.1 – 2025-10-21 – Reincorporado PRELOBBY_TEST_DOMAIN

# **Bloque 8. RPCs / DB**

## 1. Objetivo

Unificar RPCs.

## 2. Estado actual

Parciales.

## 3. Cambios necesarios

Crear o ajustar con retorno JSON:

* `f_bundle_next_start_at(bundle_sku)` → `{bundle_sku, next_start_at}`
* `f_bundle_children_next_start(bundle_sku)` → `[{child_sku, next_start_at}]`
* `f_entitlement_has_email(email, sku)` → `{has: boolean}`

## 4. Contratos

Reuso entre módulos (Home, Hub, Sales Page, Gracias, Mail).

## 5. Archivos afectados

`/supabase/functions/*.sql`.

## 6. QA

RPCs devuelven JSON válido.

## 7. Historial

v2.1 – 2025-10-21 – Añadido formato retorno JSON

# **Bloque 9. Analítica**

## 1. Objetivo

Unificar GA4 y Meta Pixel.

## 2. Cambios necesarios

Eventos consolidados con payload extendido `{placement,variant,items_count}`.

* `featured_view` incluye `placement:'home_featured'`.
* `hub_view` incluye `placement:'webinars_grid'`.
* `purchase` incluye `{variant, items_count}`.
  Meta Pixel mirror activo.

## 3. Archivos afectados

`/lib/analytics.ts`.

## 4. QA

Eventos en DebugView GA4 y Pixel Helper sin duplicados (throttle 2 s en mounts).

## 5. Historial

v2.1 – 2025-10-21 – Payload ampliado y mirrors

# **Bloque 10. QA Global y Riesgos**

## 1. QA global

* Desktop y Mobile.
* Códigos HTTP 2xx.
* Correo <60 s.
* Entitlements correctos.
* RPCs válidos.
* **GA4 DebugView y Pixel Helper** sin duplicados; throttling **2 s** en mounts.

## 2. Riesgos

* Bundles sin fecha.
* Desfase ISR.
* Mismatch SKU/Price.

## 3. Mitigaciones

Cache ISR, validaciones server, QA previo a merge.

## 4. Historial

v2.1 – 2025-10-21 – QA extendido

# **Bloque 11. Plan por Fases**

## 1. Objetivo

Guía de implementación.

## 2. Fases

| Fase | Entregable                           | Duración |
| ---- | ------------------------------------ | -------- |
| A    | **RPCs / DB base** (`f_*`)           | 2 días   |
| B    | **Sales Page + Hub + Home** (Front)  | 3 días   |
| C    | **Checkout + Webhook** (Stripe)      | 3 días   |
| D    | **Gracias + Mail** (Post-compra)     | 2 días   |
| E    | **Prelobby** (acceso y verificación) | 2 días   |
| F    | **QA Integral + Analítica**          | 2 días   |

## 3. QA por fase

Sandbox, logs y revisión QA.

## 4. Historial

v2.1 – 2025-10-21 – Reordenado para evitar bloqueos
