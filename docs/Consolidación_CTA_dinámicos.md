````markdown
# 📄 Documento Técnico — Consolidación de CTA dinámicos (Email y /gracias)

**Proyecto:** Huerta Consulting · Plataforma LOBRÁ  
**Fase:** Unificación de lógicas post-compra  
**Fecha:** 2025-10  
**Owner:** Huerta Consulting  
**Estado:** Listo para desarrollo  

---

## 🎯 Objetivo

Centralizar la lógica que define **qué hacer después de una compra**, tanto para:
- **Correos de confirmación** enviados por el webhook de Stripe (`/api/stripe/webhooks`), y  
- **Página `/gracias`** (thank-you page) tras un pago exitoso.

La meta es que ambos usen un **único resolver de “siguiente paso” (CTA)** que determine:
- Qué tipo de acceso o entrega corresponde (`live_class`, `bundle`, `template`, etc.),
- Qué URL y texto de botón mostrar,
- Cuándo ocultar el botón o mostrar varios (en bundles).

El diseño prioriza reuso, claridad y escalabilidad.

---

## 🧭 Contexto actual

1. Los **webinars** y su contenido visual (slug, título, prelobby, etc.) viven en `data/webinars.jsonc`.  
2. Los **productos**, **bundles** y **entitlements** ya existen en Supabase, con flujo transaccional completo.  
3. La tabla `thankyou_copy` en Supabase está vacía y **no se usará por ahora**.  
4. El webhook envía un correo con botón fijo basado en `success_slug`.  
5. `/gracias` también usa un CTA fijo a un `lobby_slug` de metadata.  
6. No hay diferenciación aún por tipo de producto ni soporte de bundles en UI.

---

## 🧩 Estrategia general

- Consolidar la decisión del **CTA (next step)** en un módulo único:  
  `lib/postpurchase/resolveNextStep.ts`.
- Desacoplar los textos (copy) del CTA y mantenerlos en el JSONC por ahora.
- Reutilizar lo existente:
  - DB: `products.fulfillment_type`, `bundle_items`, `entitlements`.
  - JSONC: `shared.sku`, `shared.slug`, `prelobby`.
- Dejar preparado el camino para migrar a Supabase todos los contenidos en el futuro.

---

## ⚙️ Arquitectura de resolución

### Entrada
```ts
{
  fulfillment_type?: string;
  sku?: string;
  success_slug?: string;
}
````

### Salida

```ts
{
  variant: "prelobby"|"bundle"|"download"|"course"|"schedule"|"community"|"generic"|"none";
  href?: string;
  label?: string;
  items?: Array<{
    title: string;
    when?: string|null;
    href?: string|null;
    label: string;
    type: "prelobby"|"replay"|"pending";
  }>;
}
```

### Fuente de datos por prioridad

1. **Supabase**

   * `products` (columna `fulfillment_type`)
   * `bundle_items` (si aplica)
2. **JSONC (`webinars.jsonc`)**

   * Mapea `sku → slug`
   * Extrae `thankyou.title/body_md` (solo textos)
3. **Stripe metadata** (`session.metadata`)

   * Fallbacks: `sku`, `success_slug`, `fulfillment_type`.

---

## 🔨 Cambios requeridos

### 1. JSONC — `data/webinars.jsonc`

Agregar campo opcional por webinar:

```jsonc
"thankyou": {
  "title": "¡Pago confirmado!",
  "body_md": "Gracias por tu compra. En el prelobby encontrarás tu acceso y checklist."
}
```

Debe contener:

* `shared.sku` (único)
* `shared.slug`
* `prelobby` (ya existente)
* `thankyou` (opcional)

---

### 2. Schema — `lib/webinars/schema.ts`

Agregar bloque opcional en el `WebinarSchema`:

```ts
thankyou: z.object({
  title: z.string().optional(),
  body_md: z.string().optional(),
}).optional(),
```

---

### 3. Helper: `lib/webinars/getWebinarBySku.ts`

Busca un webinar en `webinars.jsonc` por `shared.sku`.
Retorna `Webinar | null`.
Utiliza cache local (TTL 60–300 s).

---

### 4. Helper: `lib/webinars/getPrelobbyUrl.ts`

Dado un `Webinar`, construye:

```ts
`/webinars/${webinar.shared.slug}/prelobby`
```

---

### 5. Resolver central — `lib/postpurchase/resolveNextStep.ts`

Responsable de unificar la decisión del CTA para correos y `/gracias`.

#### Reglas:

| fulfillment_type     | Acción      | Descripción                                                           |
| -------------------- | ----------- | --------------------------------------------------------------------- |
| `live_class`         | `prelobby`  | Busca webinar por `sku` → URL `/webinars/{slug}/prelobby`.            |
| `bundle`             | `bundle`    | Busca `bundle_items` en Supabase y construye lista de CTAs por clase. |
| `template`           | `download`  | CTA a `/mis-compras` o descarga presignada.                           |
| `one_to_one`         | `schedule`  | CTA a `metadata.schedule_url`.                                        |
| `course`             | `course`    | CTA a `/cursos/{id}` (futuro).                                        |
| `subscription_grant` | `community` | CTA a `/comunidad`.                                                   |
| *ninguno*            | `generic`   | Fallback a `success_slug` o `/mi-cuenta`.                             |

#### Manejo de bundles:

* Lee `bundle_items` → `child_sku`.
* Para cada `child_sku` con `fulfillment_type='live_class'` → `prelobby` individual.
* Ordena por fecha (`startAt`) cuando esté disponible.
* Si no tiene fecha → `pending`.

---

### 6. Email renderers

#### a) `lib/emails/renderers/renderEmailWebinarAccess.ts`

Genera correo para `live_class`:

* Asunto: `Tu acceso al webinar: {title}`
* Cuerpo: título, fecha, CTA, instrucciones básicas.

#### b) `lib/emails/renderers/renderEmailGeneric.ts`

Fallback genérico para otros tipos:

* Asunto: `Tu compra está confirmada`
* Cuerpo: texto genérico + botón “Continuar”.

---

### 7. Webhook — `/app/api/stripe/webhooks/route.ts`

Actualizar bloque de correo:

Antes:

```ts
const href = `${BASE_URL}/${success_slug}`;
```

Después:

```ts
const next = await resolveNextStep({
  fulfillment_type: md.fulfillment_type,
  sku: md.sku,
  success_slug: md.success_slug
});
```

Usar `next.href` y `next.label` para el CTA del correo.
Elegir renderer según `next.variant`.

---

### 8. Página `/gracias`

Cambiar el bloque que muestra el botón:

Antes:

```tsx
<Link href={lobbyHref} className="c-btn c-btn--solid">
  {cta_label}
</Link>
```

Después:

```tsx
const next = await resolveNextStep({
  fulfillment_type: md.fulfillment_type,
  sku,
  success_slug: md.success_slug,
});

{next.variant !== "none" && (
  <Link href={next.href} className="c-btn c-btn--solid">
    {next.label}
  </Link>
)}
```

Y usar `webinar.thankyou?.title/body_md` si existe, en lugar de `thankyou_copy`.

---

## 🧱 Pendientes (fase futura)

| Tema                                      | Estado | Comentario                                                      |
| ----------------------------------------- | ------ | --------------------------------------------------------------- |
| Migrar `webinars.jsonc` a Supabase        | 🔜     | Crear tabla `webinars` y `webinar_pages`.                       |
| Tabla `thankyou_copy`                     | 🔜     | Redefinir estructura una vez que el contenido viva en Supabase. |
| RPC `f_entitlements_by_order(session_id)` | 🔜     | Permitirá listar entitlements concedidos exactos por compra.    |
| Email marketing dinámico (Brevo)          | 🔜     | No se modifica en esta fase.                                    |
| Replays y `showReplay`                    | 🔜     | Manejar en resolvers cuando se active el feature.               |
| Multi-idioma (`locale`)                   | 🔜     | Mantener `es-MX` fijo hasta tener internacionalización.         |

---

## 🧩 Feature flags sugeridos

| Variable             | Descripción                                       | Valor por defecto   |
| -------------------- | ------------------------------------------------- | ------------------- |
| `USE_TY_COPY_DB`     | Habilita lectura de `thankyou_copy` (desactivado) | `0`                 |
| `SEND_RECEIPTS`      | Envía correos reales vía Resend                   | `1`                 |
| `APP_URL`            | Dominio base para CTAs                            | `https://lobra.net` |
| `CACHE_WEBINARS_TTL` | Segundos de cache en `getWebinarBySku`            | `120`               |

---

## 🧪 Pruebas positivas mínimas

| Caso         | Esperado                                         |
| ------------ | ------------------------------------------------ |
| `live_class` | Email y `/gracias` apuntan al prelobby correcto. |
| `bundle`     | Listado de CTAs (uno por clase).                 |
| `one_to_one` | CTA “Agendar sesión”.                            |
| `template`   | CTA “Descargar” o “Ver mis compras”.             |
| Sin `sku`    | Fallback `success_slug` sin error.               |

---

## 🧰 Archivos involucrados

**Nuevos:**

* `lib/webinars/getWebinarBySku.ts`
* `lib/webinars/getPrelobbyUrl.ts`
* `lib/postpurchase/resolveNextStep.ts`
* `lib/emails/renderers/renderEmailWebinarAccess.ts`
* `lib/emails/renderers/renderEmailGeneric.ts`

**Modificados:**

* `lib/webinars/schema.ts`
* `app/api/stripe/webhooks/route.ts`
* `app/gracias/page.tsx`
* `data/webinars.jsonc`

---

## ✅ Entregable final

Después de esta implementación:

* `/gracias` y los correos compartirán una única lógica de CTA.
* `thankyou_copy` se desactiva sin eliminarse.
* Todos los webinars seguirán gestionados por JSONC (sin duplicar DB).
* El sistema quedará preparado para migrar contenido a Supabase cuando se defina la estrategia CMS.

---

## 🔒 Control de calidad

Antes de liberar:

* Verificar que ningún `href` contenga valores sin sanitizar.
* Validar con `stripe trigger checkout.session.completed` en sandbox.
* Confirmar recepción de correo correcto (Resend logs).
* Revisar que `/gracias` muestre título y cuerpo esperados desde JSONC.
* Medir CLS/LCP del nuevo bloque de CTA.

---

**Versión:** 1.0 · Preparado para ejecución
**Implementa:** Resolver de CTA dinámico, email coherente, prelobby correcto
**Pendientes:** migración de contenidos a Supabase y RPC de entitlements

```
```
