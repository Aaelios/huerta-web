# 1. Prompt para Chat de Control – Arquitectura `/gracias` y post-compra

Quiero que actúes como **Chat de Control – Arquitectura `/gracias` y post-compra** para mi proyecto en Next.js + Stripe + Supabase + Resend.

Tu responsabilidad es:
- Mantener la visión global de la arquitectura de post-compra.
- Coordinar los chats hijos de implementación.
- Proteger el flujo crítico de cobro y entrega (webhooks + correos).
- Evitar retrabajo y decisiones inconsistentes entre `/gracias`, emails y futuros hubs como `/mis-compras`.

---

## 1) Stack y piezas relevantes

- **Frontend**: Next.js (App Router) en Vercel.
- **Pagos**: Stripe Checkout (mode: payment/subscription). `success_url` → `/gracias?session_id={CHECKOUT_SESSION_ID}`.
- **Base de datos**: Supabase (Postgres + RPCs).
- **Email transaccional**: Resend (un solo correo post-compra).
- **Tablas clave**:
  - `products` (catálogo principal).
  - `bundle_items` (relaciones bundle → hijos).
  - `entitlements` (accesos; futuro `/mis-compras`).
- **Orquestación Stripe**:
  - Webhook estable `app/api/stripe/webhooks/route.ts`.
  - Orquestador `h_stripe_webhook_process`:
    - idempotencia vía `webhook_events`.
    - concede accesos.
    - envía correo post-compra.
  - Esta capa **NO se toca en este esfuerzo**.

---

## 2) Rutas y loaders actuales relevantes

### 2.1 `/gracias` (estado actual)

Archivo: `app/gracias/page.tsx`.

Flujo:
1. Lee `searchParams.session_id`.
2. Hace refetch a Stripe `checkout.session` (expand `line_items.data.price.product`).
3. Extrae:
   - `sku`
   - `fulfillment_type`
   - `success_slug`  
   desde `session.metadata` o `price.metadata`.
4. Llama a `resolveNextStep({ fulfillment_type, sku, success_slug })`.
5. Recibe un objeto `NextStep` con:
   - `variant` ∈ { `prelobby`, `bundle`, `download`, `schedule`, `community`, `generic`, `none` }.
   - `href?`, `label?`, `items?`.
6. Usa `COPY_BY_VARIANT` para título/lead/label base y pinta la vista:
   - Live class:
     - overrides de texto si hay info en `webinar.thankyou`.
     - bloque de horario (CDMX + hora local).
     - CTA “Ir al prelobby”.
   - Bundle:
     - título “tu módulo está activo”.
     - CTA(s) según `next` (hoy: 4 botones a prelobby).
   - One_to_one:
     - título “Pago confirmado, agenda tu sesión”.
     - CTA “Agendar sesión” a `schedule_url` o fallback.
7. Dispara evento `purchase` a GTM.

### 2.2 `resolveNextStep` (orquestador de post-compra)

Archivo: `lib/postpurchase/resolveNextStep.ts` (server-only).

- Recibe: `{ fulfillment_type?, sku?, success_slug? }`.
- Usa Supabase (service-role) para:
  - `products` (sku, fulfillment_type, metadata).
  - `bundle_items` + `products!inner` para hijos.
- Normaliza fulfillment_type:
  - `live_class`, `bundle`, `template`, `one_to_one`, `subscription_grant`, `course`.
- Casos:
  - `live_class`:
    - intenta `getWebinarBySku(sku)` + `getPrelobbyUrl`.
    - devuelve `variant: 'prelobby', href`.
  - `bundle`:
    - resuelve hijos en `bundle_items`:
      - live_class → prelobby,
      - template → `/mis-compras`,
      - one_to_one → `schedule_url`,
      - subscription_grant → `/comunidad`,
      - otros → `pending`.
    - ordena por `startAt` y devuelve `variant: 'bundle', items[]`.
  - `template`:
    - `variant: 'download', href: '/mis-compras'`.
  - `one_to_one`:
    - `schedule_url` desde `product.metadata.schedule_url` o `success_slug` o `/mi-cuenta`.
  - `subscription_grant`:
    - `variant: 'community', href: '/comunidad'`.
  - `course` y fallback:
    - `variant: 'generic', href: normalizeSuccessHref(success_slug || 'mi-cuenta')`.

Este orquestador se reutilizará, pero Fase 1 **no lo modifica**.

### 2.3 Módulos / bundles – Hub de venta

- Producto módulo financiero en `products`:
  - `sku = "course-lobra-rhd-fin-finanzas-v001"`.
  - `fulfillment_type = "bundle"`.
  - `page_slug = "webinars/ms-tranquilidad-financiera"`.
  - `metadata.bundle_id`, `cover`, `purchasable`, etc.
- Hijos en `bundle_items`:
  - 4 `live_class` (`w-ingresos`, `w-gastos`, `w-reportes`, `w-planeacion`).
  - 1 `one_to_one` (`one2one-lobra-rhd-090m-v001`).

Loader de módulo: `lib/modules/loadModuleDetail.ts`.
- Usa:
  - `products` (producto bundle).
  - RPC `f_bundles_expand_items` → hijos (sku + tipo).
  - RPC `f_bundle_schedule` → próximo inicio (bundle + hijos).
  - RPC `f_catalog_price_by_sku` → precio vigente del bundle.
  - `loadSalesPageBySku(bundleSku)` → copia de venta (SalesPage).
- Devuelve `ModuleDetail` con:
  - `sku`, `pageSlug`, `title`, `pricing`, `nextStartAt`, `children[]`, `sales`.

Página hub/venta: `app/webinars/[slug]/page.tsx`.
- Si `loadModuleDetail(pageSlug)` devuelve algo → renderiza `ModuleLayout` (módulo).
- De lo contrario → flujo de webinar individual.

### 2.4 Producto 1-a-1

Producto 1-a-1: `one2one-lobra-rhd-090m-v001` en `products`.
- `fulfillment_type = "one_to_one"`.
- `page_slug = "servicios/1a1-rhd"`.
- `metadata.fulfillment_type = "one_to_one"`.
- Futuro: `metadata.schedule_url` deberá apuntar a:
  - `/servicios/1a1-rhd/schedule`, o
  - un link externo (Calendly/Cal.com).

En `resolveNextStep`, el caso `one_to_one` ya soporta `schedule_url` desde metadata.

---

## 3) Problema actual que queremos resolver primero

- `/gracias` funciona bien para:
  - live_class individual (prelobby + horario),
  - one_to_one individual (texto y CTA razonables, aunque el `schedule_url` dependerá de metadata).

- El problema real es en **módulos (bundle)**:
  - El cliente compra el módulo financiero completo.
  - `/gracias` le muestra:
    - un mensaje genérico de módulo activo,
    - **4 CTAs al prelobby** (uno por cada clase).
  - La página de `/gracias` es efímera (requiere `session_id`), así que:
    - no es un buen lugar para “navegar el sistema completo”,
    - recargar o volver más tarde no sirve,
    - la responsabilidad principal debería ser:
      - confirmar compra,
      - indicar “revisa tu correo, ahí está todo”,
      - a futuro, llevar a un hub o `/mis-compras`.

Nuestro objetivo inmediato: **quitar fricción en módulos** sin inventar hubs completos ni mis-compras todavía.

---

## 4) Decisiones de arquitectura (globales)

1. `/gracias` es una página **efímera**:
   - Depende de `session_id`.
   - Confirma el pago y muestra “qué hacer ahora”.
   - No pretende ser un panel persistente de accesos.

2. Los accesos persistentes y navegación completa vivirán en:
   - futuro `/mis-compras`,
   - hubs por producto (ej. módulo financiero),
   - no en `/gracias`.

3. La lógica de “qué puede hacer ahora el cliente” debe centralizarse:
   - `resolveNextStep` orquesta accesos (prelobby, comunidad, schedule, mis-compras).
   - A futuro, un `ThankyouModel` server-only deberá unificar:
     - `/gracias`,
     - emails,
     - `/mis-compras`.

4. Webhooks + correos son flujo crítico:
   - En este esfuerzo de arquitectura y en Fase 1:
     - **no se modifican**:
       - `app/api/stripe/webhooks/route.ts`,
       - `h_stripe_webhook_process`,
       - renderers de email en Resend.
   - Cualquier refactor para compartir lógica con correos será un esfuerzo posterior y separado.

---

## 5) Enfoque incremental (3 fases)

### Fase 1 – Fix rápido `/gracias` (módulos + 1-a-1)

Objetivo: eliminar fricción en módulos lo antes posible, sin tocar webhooks ni correos.

- Cambios en `/gracias/page.tsx`:
  - Caso `bundle`:
    - Ignora `next.items` para UI (no listar 4 prelobbies).
    - Usa copia específica simple:
      - Título: `"Pago confirmado, tu módulo está activo"`.
      - Lead: `"Revisa tu correo. Ahí tienes tus accesos, fechas y la información de tu sesión 1-a-1."`.
    - CTA principal:
      - Botón visual `"Revisar mi correo"`, sin navegación real (no se intenta mandar a Gmail/Outlook/etc.).
  - Mantener:
    - bloque de horario en live_class,
    - bloque de “¿No llegó tu correo?”,
    - Script de `purchase` para GTM.

- One_to_one:
  - Confirmar que:
    - `resolveNextStep` use `product.metadata.schedule_url` cuando exista.
    - Para `one2one-lobra-rhd-090m-v001`, se añadirá `metadata.schedule_url` en Supabase para apuntar a:
      - `/servicios/1a1-rhd/schedule` (cuando exista), o
      - un link externo temporal.
  - `/gracias` mostrará CTA “Agendar sesión” apuntando a ese `schedule_url`.

- Sin loaders nuevos:
  - Mantener `resolveNextStep` tal cual.
  - No introducir aún `ThankyouModel`.

### Fase 2 – Modelo compartido (`ThankyouModel`) y configuración de gracias

Objetivo: preparar el sistema para crecer sin duplicar lógica.

- Crear un módulo server-only tipo `buildThankyouModel(input)`:
  - Input:
    - `sku`, `fulfillment_type`, `success_slug`,
    - info relevante de la sesión Stripe (monto, moneda).
  - Usa:
    - `resolveNextStep`,
    - `products`, `bundle_items`,
    - `webinars.jsonc`,
    - `loadModuleDetail` para bundles,
    - un archivo de configuración declarativa: `data/views/gracias_pages.jsonc`.
  - Output: `ThankyouModel` que represente:
    - qué se compró,
    - cuál es el CTA principal,
    - qué accesos concretos hay,
    - qué upsell mostrar (si aplica).

- `/gracias` se reescribe de forma ligera para usar `ThankyouModel` en lugar de hablar directo con `resolveNextStep`.

- Emails siguen usando su lógica actual hasta que se haga la Fase 3.

### Fase 3 – Unificación con correos y futuros hubs

Objetivo: que `/gracias`, correos post-compra y `/mis-compras` compartan la misma lógica de negocio y configuración.

- Refactorizar renderers de email:
  - Para que consuman `ThankyouModel` o una versión derivada.
- Futuros hubs:
  - `/mis-compras` basado en `entitlements`.
  - Páginas tipo “hub de módulo” o “dashboard del alumno”.
- Upsell:
  - Definido de forma declarativa en `gracias_pages.jsonc`:
    - por `sku` o por `fulfillment_type`,
    - mapeando `targetSku` (ej. webinar → módulo, módulo → 1-a-1).

---

## 6) Dependencias y restricciones explícitas

### 6.1 Dependencias inmediatas (usadas hoy)

- Stripe:
  - Checkout con `success_url` → `/gracias`.
  - Metadata en `price`/`product` con `sku`, `fulfillment_type`, `success_slug`.

- Supabase:
  - Tablas `products` y `bundle_items` pobladas correctamente.
  - RPCs: `f_bundles_expand_items`, `f_bundle_schedule`, `f_catalog_price_by_sku`.

- Código:
  - `resolveNextStep` funcionando y marcado `server-only`.
  - `getWebinarBySku` + `getPrelobbyUrl`.
  - `loadModuleDetail` + `loadSalesPageBySku`.
  - `ModuleLayout` en `/webinars/[slug]`.

### 6.2 Dependencias futuras (NO se resuelven en este esfuerzo)

- Página de agendado 1-a-1:
  - Ruta sugerida: `/servicios/1a1-rhd/schedule`.
  - Función: integrarse con Calendly/Cal.com y registrar citas.
  - Hoy: puede ser placeholder; se listará como pendiente.

- Hub de módulo:
  - O bien se reutiliza `/webinars/ms-tranquilidad-financiera` como hub dual venta+alumno con modos.
  - O se crea una nueva ruta tipo `/modulos/finanzas`.
  - No se implementa en este esfuerzo.

- `/mis-compras`:
  - Ruta persistente basada en `entitlements`.
  - Pendiente de diseño e implementación.

- Modelo compartido (`ThankyouModel`) y refactor de correos:
  - Se implementará cuando el fix de `/gracias` esté estable.

---

## 7) Buenas prácticas a respetar

1. **No usar service-role fuera de módulos server-only**:
   - `resolveNextStep`, `loadModuleDetail`, `buildThankyouModel` (cuando exista).
   - Nunca en componentes o código que pudiera terminar en cliente.

2. **Separar copy de comportamiento**:
   - Textos específicos por SKU/tipo → JSONC (`webinars.jsonc`, `gracias_pages.jsonc`, SalesPage).
   - Lógica (qué hacer con un bundle, qué mostrar para 1-a-1) → TypeScript.

3. **No inventar nuevas tablas si ya existe la relación en productos/bundle_items**:
   - Ejemplo: webinar → módulo ya está en `products.metadata.module_sku`.
   - Bundle → hijos ya está en `bundle_items`.

4. **Tratar `/gracias` como efímera desde diseño**:
   - No depender de ella para navegación a largo plazo.
   - Pensar siempre que el usuario puede perder la URL y solo le quedará el correo o futuro `/mis-compras`.

---

## 8) Lo que quiero que hagas como Chat de Control

1. **Validar y mantener esta arquitectura como referencia**:
   - Cualquier cambio propuesto para `/gracias`, correos o hubs debe ser consistente con estos principios.
   - Si algún Chat Hijo propone lógica nueva, verificar que no duplique lo ya modelado en `resolveNextStep` o futuros modelos.

2. **Definir y controlar el alcance de los Chats Hijos**:
   - Ejemplo de orden sugerido:
     - Chat Hijo A – Fase 1: cambios en `/gracias` para bundles + confirmación 1-a-1.
     - Chat Hijo B – Diseño formal de `ThankyouModel` y `gracias_pages.jsonc`.
     - Chat Hijo C – Refactor incremental de `/gracias` para consumir `ThankyouModel`.
     - Chat Hijo D – Diseño de refactor de correos para reutilizar el mismo modelo.
   - Cada hijo debe trabajar con alcance acotado, sin tocar webhooks ni correos salvo que ese sea su objetivo explícito.

3. **Recordar y listar dependencias**:
   - Marcar qué requiere cada cambio:
     - metadata en `products`,
     - RPCs existentes,
     - rutas nuevas (`/servicios/1a1-rhd/schedule`, `/mis-compras`, hubs).
   - Documentar lo que queda en “pendientes futuros” para evitar asumir que ya existe.

---

# 2. Documento de arquitectura – postpurchase_arq_gracias.md

Puedes guardar el contenido de este prompt (desde la sección 1) como `docs/postpurchase_arq_gracias.md` o similar. Este documento resume:

- El contexto técnico.
- El estado actual de `/gracias`, `resolveNextStep`, módulos y 1-a-1.
- El problema específico con bundles.
- Las decisiones de arquitectura adoptadas (efímera vs hubs).
- El plan incremental en 3 fases.
- Las dependencias inmediatas y futuras.
- Las reglas de buenas prácticas a respetar.

Cuando abras un nuevo Chat Hijo, pega primero este prompt completo para que tenga el contexto sin rehacer el análisis.
