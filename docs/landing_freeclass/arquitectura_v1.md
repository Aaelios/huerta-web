````md
docs/landing_freeclass/arquitectura_v1.md

# Arquitectura LOBRÁ · Landings de Clases Gratuitas
Versión: v1.0  
Responsable: Arquitectura de solución  
Ámbito: lobra.net (Next.js + Supabase + Brevo + GTM/GA4 + Meta Pixel)

---

## 0. Contexto y objetivo del documento

Este documento define la **arquitectura de alto nivel** para habilitar **landings de clases gratuitas** en LOBRÁ, cubriendo:

- Nuevo tipo de página: **/clases-gratuitas/[slug]**
- Nuevo flujo de registro → **lead**, **contacto**, **entitlement free**, **Brevo**, **analytics**
- Reuso de:
  - **Supabase** (`products`, `live_class_instances`, `contacts`, `entitlements`)
  - **infra de forms** (Turnstile + RPC `f_orch_contact_write_v1`)
  - **SEO/metadata** (`SeoPageTypeId = "landing"`)
  - **Analytics** (evento `lead` vía GTM → GA4 + Meta)

Este documento es el **contrato maestro** entre negocio, arquitectura y el equipo de implementación.  
Cambios a las decisiones marcadas como **NO negociables** requieren volver a este nivel.

---

## 1. Alcance funcional cubierto vs requerimientos de negocio

### 1.1 Propósito de la landing (Req. 1)

La landing debe:

- Explicar **rápido** de qué trata la clase, para quién es, qué problema resuelve, qué obtienen y cuándo sucede.
- Motivar el registro vía formulario.
- Comunicar claridad, autoridad y confianza.

**Cómo se cubre:**

- El contenido vive en `data/views/freeclass_pages.jsonc` (nuevo).
- Tipo conceptual `FreeClassPage` define:
  - `hero` (eyebrow, title, subtitle, image, ctaText, note)
  - `paraQuien`
  - `queAprenderas`
  - `queSeLlevan`
  - `autor`
  - `comoFunciona`
  - `testimonios`
  - `mensajeConfianza`
- La UI de `/clases-gratuitas/[slug]` se alimenta 100% de este nodo + datos técnicos de producto.

---

### 1.2 Contenido mínimo obligatorio (Req. 2)

**Requerido** (de negocio) → **dónde vive:**

- 2.1 Título con beneficio → `FreeClassPage.hero.title`
- 2.2 Subtítulo problema → `FreeClassPage.hero.subtitle`
- 2.3 Fecha/hora/duración visibles → combinación:
  - `live_class_instances.start_at` / `end_at` / `timezone` / `metadata.duration_min`
  - La landing renderiza estos campos encima o cerca del hero.
- 2.4 “Qué vas a aprender” (bullets) → `FreeClassPage.queAprenderas[]`
- 2.5 “Para quién es” → `FreeClassPage.paraQuien[]`
- 2.6 “Quién imparte” → `FreeClassPage.autor` (name, role, bio, imageSrc)
- 2.7 “Cómo funciona”
  - `FreeClassPage.comoFunciona.resumen`
  - `comoFunciona.bullets[]` (plataforma, grabación, requisitos)
- 2.8 Formulario (nombre + correo mín.) → componente React en `/clases-gratuitas/[slug]`, POST a `/api/freeclass/register` (nuevo endpoint)
- 2.9 Mensaje de confianza → `FreeClassPage.mensajeConfianza`
- 2.10 Botones de CTA → usan `FreeClassPage.hero.ctaText` y disparan el submit del formulario.
- 2.11 Espacio para testimonios → `FreeClassPage.testimonios[]`
- 2.12 Mensaje alternativo cuando registro cerrado → `FreeClassPage.mensajesEstado.closed` + `mensajesEstado.proximamente`

---

### 1.3 Reglas y comportamiento funcional (Req. 3)

**Reglas de negocio** → **dónde viven:**

- 3.1 Nombre y correo obligatorios → validados en frontend y en `/api/freeclass/register`.
- 3.2 Aviso de registro exitoso → estado `ui_state="show_success"` + `mensajePostRegistro` en la **misma landing** (NO `/gracias`).
- 3.3 Mensaje post-registro (recibirá correo, lugar reservado, pasos siguientes)
  - `FreeClassPage.mensajePostRegistro`
  - Correo real gestionado por **Brevo**, no por Resend.
- 3.4 Registro simultáneo sin errores → manejo normal de concurrencia vía Supabase + validaciones idempotentes (detalle en implementación).
- 3.5 Registro duplicado → endpoint trata como caso válido (upsert de contacto y entitlement, nunca 500).
- 3.6 Clase pasada → backend calcula `registration_state = ended` o `no_instance` y UI usa mensajes `closed` / `proximamente`.
- 3.7 Cupo lleno → `registration_state = full` y, si `waitlistEnabled`, formulario cambia a modo lista de espera; se usa `mensajesEstado.full`/`waitlist`.
- 3.8 Todos los CTAs apuntan al formulario → CTA principal del hero hace scroll/focus al formulario o dispara submit.
- 3.9 “La landing debe poder mostrar diferentes clases gratuitas sin rediseñarse”:
  - Un solo template React en `/clases-gratuitas/[slug]`.
  - Diferentes SKUs → diferentes nodos `FreeClassPage` y diferentes instancias en `live_class_instances`.

---

### 1.4 Comunicación y venta (Req. 4)

- 4.1 Dolor/beneficio/cambio/razón para registrarse hoy → texto en:
  - `hero.subtitle`, `paraQuien`, `queSeLlevan`, `statement` opcional.
- 4.2 Un solo objetivo (dejar datos) → no se incluyen CTAs secundarios conflictivos (link a sales page solo como secundario, si se decide).
- 4.3 Consistencia título/bullets/subtítulo/CTA → garantizada a nivel de contenido (responsabilidad de copy), arquitectura solo define slots.
- 4.4 Mensaje de autoridad/credibilidad → `autor` + posible `seccionesExtras` (ej. “Por qué confiar en mí”).
- 4.5 “Qué se llevan” → `queSeLlevan[]`.

---

### 1.5 Marketing y medición (Req. 5)

- 5.1 Medir visitas / registros:
  - Visitas: existentes (`page_view` / `view_content`) vía GTM.
  - Registros: evento `lead` enviado a `dataLayer` con `context="free_class"`.
- 5.2 UTMs: la landing acepta parámetros UTM en URL. `/api/freeclass/register` recibe y persiste UTM en:
  - `contacts.utm`
  - `entitlements.metadata` (si aplica).
- 5.3 Contar lead en analítica:
  - Backend devuelve información para push `dataLayer` (`event: "lead"`, `context: "free_class"`, `class_sku`, `instance_slug`, `utm`).
  - GTM mapea a GA4 (`generate_lead`) y Meta (`Lead`), reusando la infraestructura existente.
- 5.4 Registro → proceso de comunicación:
  - Helper Brevo agrega/actualiza contacto en lista adecuada.
  - Flujos de Brevo se encargan del correo de confirmación y recordatorios.
- 5.5 Compatible con campañas Meta/Google:
  - UTM + eventos `view_content` y `lead` reusando setup actual.

---

### 1.6 Requerimientos operativos (Req. 6)

- 6.1 Cambiar textos sin tocar diseño:
  - `views/freeclass_pages.jsonc` concentra todo el copy.
- 6.2 Lanzar múltiples clases gratuitas con misma estructura:
  - Un template UI + N nodos `FreeClassPage` + N productos + N instancias.
- 6.3 Funcionamiento con tráfico alto:
  - Página estática/ISR en Next + calls a Supabase para estado de instancia/registro (diseño normalizable y escalable).
- 6.4 Editar fecha/hora/título/CTA/bullets/host sin soporte técnico:
  - Fecha/hora/cupo → editable en Supabase (`live_class_instances`).
  - Texto/CTA/bullets/autor → editable en JSONC.
- 6.5 Performance y mobile:
  - Template optimizado (sin librerías pesadas adicionales).
  - Layout responsive (política estándar de UI de LOBRÁ).
- 6.6 Modern browsers:
  - Next.js + React + CSS moderno cubren la compatibilidad actual.

---

### 1.7 Ejemplo clase 9 de diciembre (Req. 7)

El ejemplo se materializa como:

- Producto en `products` con:
  - `sku = liveclass-lobra-rhd-fin-XXXX-v001` (según convención).
  - `product_type = 'digital'`
  - `fulfillment_type = 'free_class'`
  - `page_slug = 'clases-gratuitas/claridad-financiera-9dic'` (ejemplo)
  - `metadata` con:
    - `cover`
    - `duration_min`
    - `module_sku` (ej: `course-lobra-rhd-fin-finanzas-v001`)
- Instancia en `live_class_instances`:
  - `sku` del free class
  - `instance_slug = 'claridad-financiera-2024-12-09'` (ejemplo)
  - `start_at`, `end_at`, `capacity`, `status`
- Nodo en `views/freeclass_pages.jsonc`:
  - `sku` del producto
  - hero/subtitle/bullets/paraQuien/etc. según contenido real.
- Landing en `/clases-gratuitas/[slugLanding]` conectada a ese SKU.

---

## 2. Topología de datos y componentes

### 2.1 Supabase · products (existente, se reutiliza)

Tabla `public.products` (ya en producción).  
Se usa como **catálogo unificado**, no se crea `catalog/*` nuevo.

Para clases gratuitas:

- `sku`: siguiendo convención `liveclass-...-v001`
- `name`, `description`: copy corto de catálogo, no igual a toda la landing.
- `product_type`: `"digital"`
- `fulfillment_type`: `"free_class"` (nuevo valor recomendado)  
  > NO negociable: `fulfillment_type` debe permitir distinguir free class de otras entidades.
- `is_subscription`: `false`
- `status`: `active`
- `visibility`: `public`
- `page_slug`: ej. `clases-gratuitas/claridad-financiera`
- `metadata` (JSONB) para datos técnicos:
  - `sku`
  - `cover`
  - `duration_min`
  - `topics`
  - `module_sku` (módulo al que pertenece)
  - `instructors`: array de IDs/personas
  - `purchasable: false` (no se paga esta clase)
  - `fulfillment_type: "free_class"`

**Estado:**  
- Reutilizado.  
- No se elimina nada.  
- Se agregan filas nuevas para cada free class.

---

### 2.2 Supabase · live_class_instances (existente, se reutiliza)

Tabla `public.live_class_instances` (ya existe).

Se usa como **fuente dinámica** para:

- Fecha/hora.
- Capacidad y ocupación.
- Estado operacional.

Campos relevantes:

- `sku`: SKU del producto asociado (free class o webinar pagado).
- `instance_slug`: slug de la instancia (para analytics y trazabilidad).
- `status`: uno de
  - `scheduled`
  - `open`
  - `sold_out`
  - `ended`
  - `canceled`
  - (posible `draft` a futuro, opcional)
- `start_at`, `end_at`, `timezone`
- `capacity`, `seats_sold`
- `zoom_join_url`, `replay_url` (si se usan)
- `metadata`: JSONB libre

**Regla NO negociable:**  
- `live_class_instances` es la **única fuente de verdad técnica** sobre el estado operacional de la clase (fecha, cupo, cancelación).


## Fuente de verdad de acceso · Free Class

El registro de una free class se guarda exclusivamente en:

contacts.metadata.free_class_registrations = [
  {
    class_sku: string,
    instance_slug: string,
    status: "registered" | "waitlist" | "closed",
    ts: string // ISO8601
  }
]

Reglas fijas:

1. Es la **única fuente de verdad** para acceso a free class.
2. Es lo que el **prelobby** consulta para decidir si una persona tiene acceso válido a una instancia.
3. Es lo que permite:
   - evitar usar `entitlements` o `auth` en free class v1,
   - manejar múltiples asistencias de la misma persona a distintas fechas,
   - tener métricas y migraciones futuras limpias.
4. Sin este bloque, **no hay acceso** a la free class para ese contacto.
5. `entitlements.user_id` sigue apuntando únicamente a `auth.users.id` y **no** se usa para free class v1.


---

### 2.3 Supabase · contacts (existente, se reutiliza)

Tabla `public.contacts` (ya existe).

Flujo:

- `/api/freeclass/register` llama a la RPC **existente** `f_orch_contact_write_v1`.
- Esta RPC:
  - crea/actualiza contacto en `contacts`
  - gestiona `status`, `consent_status`, `segment`, `utm`, `metadata`, etc.
- Free class añade contexto:
  - `segment` o `metadata` para marcar que es `free_class`, `class_sku`, `instance_slug`.

**Decisión:**  
- **NO se crea una tabla de leads nueva**. 
- `contacts` es la base para:
  - newsletter
  - formularios actuales
  - clases gratuitas
  - futuros funnels.

---

### 2.4 Supabase · auth.users (existente, se reutiliza)

- `f_orch_contact_write_v1` actualmente puede crear `auth.users` cuando recibe un email.
- Para V1 de free class, **se acepta** que se creen usuarios en `auth.users` para asistentes de free class.
- Riesgo de “ensuciar” auth con leads no compradores se considera **aceptable** dado:
  - ventaja de tener login y prelobby consistentes
  - posibilidad futura de limpieza por script (ej: usuarios sin entitlements de compra real).

**Esto es decisión de negocio/técnica acordada.**  
Cambiarla requiere revisar la RPC y este documento.

---

### 2.5 Supabase · entitlements (existente, se reutiliza)

Tabla `public.entitlements` (ya existe, usada para accesos pagados).

Uso nuevo:

- Para free class, se pueden conceder entitlements con:
  - `sku`: SKU del free class
  - `fulfillment_type`: `"free_class"` o el que se convenga (coherente con `products`)
  - `source_type`: `'free_class'`
  - `source_id`: `instance_slug` o ID de registro
  - `active`: `true` mientras la clase esté vigente
  - `valid_until`: fecha límite (ej: fecha de la clase + N días)
  - `metadata`: UTM, `lead_source`, etc.

**Beneficio:**  
- Prelobby y flujos de acceso pueden reutilizar la misma lógica que hoy para pagos.

---

### 2.6 views/freeclass_pages.jsonc (nuevo)

Nuevo archivo en `data/views/freeclass_pages.jsonc`.

Formato conceptual (resumen):

```ts
type FreeClassPage = {
  sku: string;
  slugLanding: string;
  prelobbyRoute: string;

  hero: { ... };
  paraQuien: string[];
  queAprenderas: string[];
  queSeLlevan?: string[];

  autor: { name; role; bio; imageSrc?; personId? };

  comoFunciona: { resumen?; bullets?: string[] };

  testimonios?: [...];

  mensajesEstado: {
    open: string;
    full: string;
    closed: string;
    proximamente: string;
    waitlist: string;
  };

  mensajeConfianza?: string;
  mensajePostRegistro?: string;
  mensajeErrorGenerico?: string;

  integraciones: {
    brevoListId: string;
    leadContext?: string;  // "free_class"
    tagsBrevo?: string[];
  };

  seo?: {
    title?: string;
    description?: string;
    canonical?: string;
    ogImage?: string;
    keywords?: string[];
  };

  seccionesExtras?: Array<{ id; titulo; texto?; bullets?; imagen? }>;
};
````

**Reglas:**

* Core estable + `seccionesExtras` como zona de extensión.
* El loader y la UI deben **ignorar claves extra** sin romperse.

**Estado:**

* Nuevo.
* No reemplaza `views/sales_pages.jsonc`, lo complementa.

---

## 3. Routing y frontends

### 3.1 Landing de free class

**Nueva ruta:**

* `/clases-gratuitas/[slug]` (App Router)

Características:

* Tipo de página SEO: `SeoPageTypeId = "landing"`.
* Usa infra de metadata ya existente (`buildMetadata`, `seoConfig`).
* Genera `Event` JSON-LD a partir de:

  * `products`
  * `live_class_instances`
  * `FreeClassPage` (para name/description).
* **Indexable** (es entrada del embudo y destino de campañas).

---

### 3.2 Prelobby

Ruta **existente**:

* `/webinars/[slug]/prelobby`

Estado:

* No se modifica su arquitectura en este sprint.
* Free class puede (en fases futuras) usar entitlements para permitir acceso.
* Para V1, la **confirmación** de free class NO redirige automáticamente a prelobby, se queda en la landing (mensaje + correo).

---

### 3.3 Página de confirmación

**Decisión clave:**

* **NO se usa `/gracias`** para free class.
* **NO se crea una nueva `/gracias` específica**.

Patrón:

* El estado de confirmación vive en **la misma landing**:

  * `ui_state = "show_success"` o `"show_waitlist"` o `"show_closed"`.
  * La UI:

    * oculta o desactiva el formulario
    * muestra mensaje de éxito / lista de espera / cerrado
    * opcionalmente, muestra botón a `nextStepUrl` (si se usa).

> Requisito T06 “Crear_pagina_confirmacion_registro” se cumple como **estado de confirmación dentro de la landing**, no mediante nueva ruta.

---

## 4. Backend y orquestación

### 4.1 Nuevo endpoint `/api/freeclass/register` (NUEVO)

Ruta (App Router):

* `app/api/freeclass/register/route.ts` (o similar)

Responsabilidad:

* Es el **orquestador de negocio** del registro a clase gratuita.

Entrada conceptual:

* `sku` (free class)
* `email`
* `full_name`
* `instance_slug` (opcional)
* `utm` (objeto)
* `consent` (boolean)
* Turnstile token

Pasos internos (resumidos):

1. **Verificar Turnstile**

   * Reuso de la lógica actual de `/api/forms/submit` (idealmente extraída a helper compartido).
2. **Cargar contexto de free class**

   * `FreeClassPage` por `sku` desde `views/freeclass_pages.jsonc`
   * `products` por `sku`
   * `live_class_instances` para encontrar instancia aplicable.
3. **Calcular `registration_state`**

   * usa:

     * `instance.status`
     * `start_at` / `end_at`
     * `capacity` / `seats_sold`
     * existencia de futuras instancias
   * estados resultantes (resumen):

     * `open`
     * `full`
     * `ended`
     * `canceled`
     * `upcoming`
     * `no_instance`
4. **Llamar a `f_orch_contact_write_v1`**

   * upsert de `contacts` (y, si aplica, `auth.users` según lógica actual).
5. **Crear entitlement (si aplica)**

   * si `registration_state = open`:

     * crear/actualizar `entitlements` para el SKU de free class.
   * si `full` + `waitlistEnabled`:

     * decidir si se representa como entitlement con `waitlist: true` o solo en `contacts` (detalle de implementación).
6. **Sincronizar con Brevo (helper reutilizable)**

   * usar `FreeClassPage.integraciones.brevoListId` y `tagsBrevo`.
   * atributos: `class_sku`, `instance_slug`, `lead_stage: "free_class"`, UTM.
7. **Construir respuesta para frontend**

   * `registration_state`
   * `result` (`registered`, `waitlist`, `rejected_closed`)
   * `ui_state` (`show_success`, `show_waitlist`, `show_closed`, etc.)
   * `nextStepUrl` (probablemente `null` en V1)
   * `leadTracking` (para `dataLayer`)

Salida conceptual:

```ts
{
  registration_state: "...",
  result: "...",
  ui_state: "...",
  nextStepUrl: string | null,
  leadTracking?: { class_sku; instance_slug; utm }
}
```

---

### 4.2 Reutilización de `/api/forms/submit` y `f_orch_contact_write_v1` (EXISTENTE)

* `/api/forms/submit/route.ts` **no se elimina**.
* Se mantiene como endpoint genérico de formularios (newsletter, contacto, etc.).
* `f_orch_contact_write_v1` sigue siendo la pieza central para escribir contactos.

Cambio arquitectónico:

* `/api/freeclass/register` **no reimplementa** la lógica de contactos.
  La vuelve a usar vía la RPC.

---

### 4.3 Helper Brevo (NUEVO, reutilizable)

Nuevo módulo, ej.:

* `lib/integrations/brevoClient.ts` o similar.

Responsabilidad:

* Dado:

  * `email`
  * `fullName`
  * `listKey` o `listId`
  * `tags?`
  * `attributes?`
* Resolver:

  * ID real de lista (mediante mapa de configuración)
  * llamar a la API de Brevo
* Devolver:

  * `success: boolean`
  * `errorCode?`
  * `errorMessage?`

Uso:

* `/api/freeclass/register`: siempre lo usa para clases gratuitas.
* `/api/forms/submit`:

  * se puede extender con cambios mínimos para usar el mismo helper según el tipo de formulario.

---

## 5. Analytics y tracking

* Evento unificado en `dataLayer`:

  * `event: "lead"`
  * `context: "free_class"`
  * `class_sku`
  * `instance_slug`
  * `utm` (object)
* GTM:

  * reusa configuración ya aprobada:

    * GA4 → `generate_lead`
    * Meta → `Lead`
* No se tocan:

  * Data Layer existente de compras (`purchase`, etc.).
  * Tag base de Meta.
  * Eventos `view_content`/`begin_checkout` para ventas.

---

## 6. SEO y schemas

* Tipo de página para `/clases-gratuitas/[slug]`: `"landing"` (reutilizado).
* Robots:

  * indexable (no pertenece a tipos “hard noindex”).
* Canonical:

  * `seo.canonical` desde `FreeClassPage.seo` si está presente.
  * Si no, se construye con base en `slugLanding`.
* JSON-LD `Event`:

  * generado con la misma infraestructura que webinars:

    * `@type: Event`
    * `name`: título de la clase (desde producto o `FreeClassPage`)
    * `description`: breve (producto/FreeClassPage)
    * `startDate`: de `live_class_instances`
    * `eventStatus`: según `registration_state`
    * `location`: `VirtualLocation` (Teams/Zoom)
* `/gracias` no se afecta.

---

## 7. Estados de registro (resumen arquitectónico)

Backend:

* Calcula `registration_state` a partir de:

  * `live_class_instances.status`
  * `start_at` / `end_at`
  * `capacity` / `seats_sold`
  * instancias futuras.

Estados:

* `open` → registro normal (crea entitlement).
* `full` → waitlist si `waitlistEnabled`; si no, cerrado.
* `ended` → clase pasada, mostrar `closed`.
* `canceled` → clase cancelada, mensaje simple.
* `upcoming` → clase programada pero sin registro abierto (modo “próximamente”).
* `no_instance` → sin instancias; opcionalmente solo capturar email para interés.

Frontend:

* Mapea `registration_state` a:

  * `ui_state` (qué modo mostrar: formulario, waitlist, cerrado, próximamente, error).
  * texto desde:

    * `mensajesEstado.*`
    * `mensajePostRegistro`

Mensajes y copy → `FreeClassPage`.
Lógica de estados → backend.

---

## 8. Cambios vs nuevo vs eliminado

### 8.1 Nuevo

* Ruta `/clases-gratuitas/[slug]`.
* Archivo `data/views/freeclass_pages.jsonc`.
* Loader `loadFreeClassPageBySku` (y map).
* Endpoint `/api/freeclass/register`.
* Helper Brevo reutilizable.
* Configuración de productos para SKUs de free class en `products`.
* Instancias correspondientes en `live_class_instances`.

### 8.2 Reutilizado / extendido

* `products`:

  * se agregan filas nuevas con `fulfillment_type = "free_class"`.
* `live_class_instances`:

  * se agregan instancias para SKUs de free class.
* `contacts` + `auth.users`:

  * vía `f_orch_contact_write_v1` (no se reemplaza).
* Infra Analytics:

  * se reusa evento `lead` en GTM → GA4 + Meta.
* Infra SEO (buildMetadata, seoConfig):

  * se reusa tipo `landing` con ajustes menores si se requiere.
* `/api/forms/submit`:

  * se mantiene, con posible extensión para llamar al helper Brevo.

### 8.3 No se elimina nada

* No se elimina `/gracias`.
* No se eliminan `views/sales_pages.jsonc` ni loaders asociados.
* No se elimina la infra de webinars/módulos actual.

---

## 9. Decisiones NO negociables vs dependientes de implementación

### NO negociables (cambiar requiere volver a arquitectura)

1. **Topología básica**:

   * productos en `products`
   * instancias en `live_class_instances`
   * leads en `contacts`
   * orquestación en `/api/freeclass/register`
   * copy en `views/freeclass_pages.jsonc`.
2. **Tipo de página y ruta**:

   * `/clases-gratuitas/[slug]` como landing.
   * Sin uso de `/gracias` para free class.
3. **Emails**:

   * Confirmación y recordatorios vía Brevo (no Resend).
4. **Analytics**:

   * Uso del evento `lead` con `context="free_class"` como estándar.
5. **Estados**:

   * `registration_state` calculado desde `live_class_instances` y no desde JSONC.
6. **No duplicación** de tablas para leads:

   * se usa `contacts` como base.

### Dependientes de detalle de implementación (ajustables sin volver aquí)

1. Formato exacto de `instance_slug`.
2. Estructura interna precisa de `utm` en `metadata`.
3. Si el entitlement de waitlist se representa o no como registro en `entitlements`.
4. Estructura final TS del tipo `FreeClassPage` (siempre que respete el core).
5. Mensajes de copia específicos (texto en `mensajesEstado`, `mensajePostRegistro`, etc.).
6. Estrategia exacta de validación (cliente/servidor) mientras respete reglas de negocio.

---

## 10. Ubicación esperada de archivos (sugerida)

* `data/views/freeclass_pages.jsonc`
* `lib/views/loadFreeClassPageBySku.ts`
* `lib/integrations/brevoClient.ts` (nombre orientativo)
* `app/clases-gratuitas/[slug]/page.tsx`
* `app/api/freeclass/register/route.ts`

La implementación puede ajustar nombres exactos, pero estos son los conceptos que deben existir.

---

## 11. Notas finales

* Este desarrollo es **uno de los más grandes** desde el lanzamiento de lobra.net porque:

  * agrega un nuevo funnel completo: visitas → lead → contacto → Brevo → prelobby.
  * toca Next.js, Supabase, GTM/GA4, Meta, y añade una integración estructurada con Brevo.
* El objetivo principal es **embudo sólido y reutilizable**, no solo un hack puntual para la clase del 9 y 16 de diciembre.
* Cualquier cambio estructural fuera de lo aquí descrito debe validarse de nuevo a nivel de arquitectura de solución.

```
```
Aquí tienes la entrada lista para llevar a:

* **Documento Maestro de Arquitectura**
* **Checklist del Chat de Control**
* **Bloque de Dependencias del Chat Hijo 3**

---

# ------------------------------------------------------------

# **Documento Maestro · Entrada Oficial**

# ------------------------------------------------------------

## **Bloque: Persistencia SQL — Free Class**

### **Decisión de Arquitectura (cerrada y obligatoria)**

### 1. **Fuente de verdad**

El control de acceso a clases gratuitas **no usa entitlements ni auth.users**.
La fuente de verdad reside en:

```jsonc
contacts.metadata.free_class_registrations[]
```

Estructura oficial:

```jsonc
{
  "class_sku": "text",
  "instance_slug": "text",
  "status": "registered" | "waitlist" | "closed",
  "ts": "timestamptz"
}
```

Este bloque determina:

* Quién puede entrar al prelobby
* A qué instancia tiene acceso
* Estado del registro
* Historial por contacto

---

### 2. **Mecanismo de escritura**

La escritura no se hace con el merge estándar de metadata.
Se implementa una función SQL **dedicada** en el esquema `app`:

```
app.f_contacts_free_class_upsert_v1(
  p_contact_id uuid,
  p_class_sku text,
  p_instance_slug text,
  p_status text,       -- registered | waitlist | closed
  p_ts timestamptz
) returns void
```

### 3. **Comportamiento oficial**

La función:

1. Lee `contacts.metadata.free_class_registrations`.
2. Si encuentra coincidencia por `(class_sku, instance_slug)` → **actualiza**.
3. Si no existe → **inserta**.
4. Respeta todas las demás claves de `metadata`.
5. Tolera metadata vacía o sin clave inicial.

### 4. **Razones de diseño**

* Evita sobrescribir arrays completos con `f_json_merge_shallow_v1`.
* No rompe forms actuales ni su pipeline.
* Permite historial por instancia.
* Preparado para migraciones futuras (asistencia, recordatorios, analytics).
* Aísla todo el comportamiento de free class sin riesgos para flujos pagos.

### 5. **Impacto**

| Área         | Impacto                                 |
| ------------ | --------------------------------------- |
| Supabase SQL | **Nueva función en `app.*`**            |
| forms        | Sin cambios                             |
| entitlements | Sin cambios                             |
| auth.users   | Sin cambios                             |
| APIs         | `/api/freeclass/register` debe llamarla |
| prelobby     | Validará acceso usando este bloque      |

### 6. **Estado**

**Aprobado, congelado y obligatorio.**
No puede modificarse sin volver a Arquitectura.

---

# ------------------------------------------------------------

# **Checklist para Chat de Control**

# ------------------------------------------------------------

**Item híbrido: Persistencia SQL – Free Class**

* [x] Confirmar que Chat Hijo 3 use exclusivamente `app.f_contacts_free_class_upsert_v1`.
* [x] Prohibido modificar `f_contacts_upsert_v1`.
* [x] Validar que el payload del hijo incluya:

  * `contact_id`
  * `class_sku`
  * `instance_slug`
  * `status`
  * `ts`
* [x] Validar que no se lean ni toquen entitlements.
* [x] Validar que no se creen usuarios en Auth.
* [x] Validar que la UI del prelobby consulte este bloque.

---
