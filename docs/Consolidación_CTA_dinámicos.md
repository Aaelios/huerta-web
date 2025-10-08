````markdown
# 📄 Documento Técnico — Flujo Post-Compra Dinámico (CTA, Webhook y Email)

**Proyecto:** Huerta Consulting · Plataforma LOBRÁ  
**Versión:** 1.1 (2025-10)  
**Owner:** Huerta Consulting  
**Estado:** Completado — Funcional y Técnico  

---

## 🎯 Propósito

Unificar toda la lógica post-compra (correo y `/gracias`) bajo un único resolver dinámico.  
El sistema determina automáticamente **qué hacer después de un pago** según el tipo de producto (`fulfillment_type`).

---

## 🧩 Función general del sistema

| Elemento | Función | Archivo principal |
|-----------|----------|-------------------|
| **Webhook Stripe** | Procesa eventos y envía correo transaccional | `/app/api/stripe/webhooks/route.ts` |
| **Resolver unificado** | Define siguiente paso (`variant`, `href`, `label`) | `/lib/postpurchase/resolveNextStep.ts` |
| **Página `/gracias`** | Muestra CTA dinámico según `variant` | `/app/gracias/page.tsx` |
| **Renderers de email** | Generan HTML y asunto según tipo | `/lib/emails/renderers/*.ts` |
| **JSONC** | Fuente de contenido dinámico para webinars | `/data/webinars.jsonc` |
| **Supabase** | Fuente de verdad para productos, bundles y órdenes | `products`, `bundle_items`, `orders` |

---

## ⚙️ Flujo general

1. **Checkout completado** → Stripe dispara `checkout.session.completed`.
2. **Webhook** recibe evento → obtiene metadata (`sku`, `fulfillment_type`, `success_slug`).
3. **Resolver (`resolveNextStep`)** consulta Supabase + JSONC → devuelve `variant`, `href`, `label`.
4. **Webhook** usa `renderEmail(...)` → envía correo dinámico vía Resend.
5. **Cliente redirigido a `/gracias`** → se renderiza CTA coherente al tipo de producto.

---

## 🔩 Arquitectura funcional

### Entrada esperada
```ts
{
  fulfillment_type?: string;
  sku?: string;
  success_slug?: string;
}
````

### Salida estándar

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

### Fuente de datos (prioridad)

1. **Supabase**

   * `products`: `sku text PK`, `fulfillment_type text`, `metadata jsonb`.
   * `bundle_items`: `bundle_sku text`, `child_sku text`, `qty int`.
2. **JSONC (`/data/webinars.jsonc`)**

   * `shared.sku`, `shared.slug`, `shared.supportEmail`, `prelobby`, `thankyou` (opcional).
3. **Stripe metadata**

   * `sku`, `success_slug`, `fulfillment_type` (fallback).

---

## 🔧 Componentes principales

### 1. **Helpers base**

#### `lib/webinars/getWebinarBySku.ts`

* Carga `data/webinars.jsonc` con cache (`CACHE_WEBINARS_TTL` = 120s).
* Indexa por `shared.sku`.
* Devuelve `Webinar | null`.

#### `lib/webinars/getPrelobbyUrl.ts`

```ts
export function getPrelobbyUrl(webinar: Webinar, base?: string): string
```

* Construye `/webinars/{slug}/prelobby`.
* Si `base` está presente, genera URL absoluta (`https://lobra.net/...`).

---

### 2. **Resolver de CTA**

#### `lib/postpurchase/resolveNextStep.ts`

Responsable de determinar el siguiente paso según `fulfillment_type`:

| Tipo                 | Variant     | Acción                                                    |
| -------------------- | ----------- | --------------------------------------------------------- |
| `live_class`         | `prelobby`  | Busca webinar y devuelve URL `/webinars/{slug}/prelobby`. |
| `bundle`             | `bundle`    | Expande `bundle_items` → CTAs múltiples.                  |
| `template`           | `download`  | CTA a `/mis-compras`.                                     |
| `one_to_one`         | `schedule`  | CTA a `metadata.schedule_url`.                            |
| `subscription_grant` | `community` | CTA a `/comunidad`.                                       |
| `course`             | `course`    | Placeholder a `/cursos/{id}`.                             |
| default              | `generic`   | Fallback a `success_slug` o `/mi-cuenta`.                 |

**Firma:**

```ts
export async function resolveNextStep(
  input: { fulfillment_type?: string; sku?: string; success_slug?: string }
): Promise<NextStepResult>
```

**Consultas Supabase:**

```sql
SELECT fulfillment_type, metadata FROM products WHERE sku = $1;
SELECT child_sku, qty FROM bundle_items WHERE bundle_sku = $1;
```

**Logs:**
`[resolveNextStep] { sku, variant, resolution_path }`

---

### 3. **Renderers de correo**

Ubicación: `/lib/emails/renderers/`

| Archivo                       | Variant                                        | Descripción                                                 |
| ----------------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| `_base.ts`                    | Todos                                          | Layout base, tipografía, pie de soporte, función `absUrl()` |
| `renderEmailWebinarAccess.ts` | `prelobby`                                     | Correo con título, fecha y CTA al prelobby                  |
| `renderEmailBundleAccess.ts`  | `bundle`                                       | Lista de CTAs por clase del módulo                          |
| `renderEmailGeneric.ts`       | `generic`, `download`, `schedule`, `community` | Mensaje genérico con CTA simple                             |
| `index.ts`                    | Todos                                          | Dispatcher `renderEmail(next, ctx)` → `{ subject, html }`   |

**Contexto recibido:**

```ts
{
  appUrl: string;       // BASE_URL absoluto
  supportEmail: string; // p.ej. soporte@lobra.net
  subjectPrefix?: string;
}
```

---

### 4. **Webhook**

#### `app/api/stripe/webhooks/route.ts`

**Versión actual:** `route.v7+renderers`

**Flujo simplificado:**

```ts
const next = await resolveNextStep({
  fulfillment_type: md.fulfillment_type,
  sku: md.sku,
  success_slug: md.success_slug,
});

const { subject, html } = await renderEmail(next, {
  appUrl: APP_URL,
  supportEmail: md.support_email || "soporte@lobra.net",
});

await resend.emails.send({ from: RESEND_FROM, to: email, subject, html });
```

* **Idempotencia:** control por `receipt_sent_at` y `receipt_provider_id` en `order_headers`.
* **Flag:** `SEND_RECEIPTS=1` en producción.
* **Logs:** `[receipt] { variant, href, fulfillment_type }`.

---

### 5. **Página `/gracias`**

#### `app/gracias/page.tsx`

* Reutiliza `resolveNextStep`.
* Usa **copys genéricos por `variant`** con override opcional desde JSONC.
* Renderiza:

  * Botón único (`variant !== 'bundle' && !== 'none'`).
  * Lista de botones (`variant === 'bundle'`).
* Incluye bloque de soporte:
  `¿No llegó tu correo? Escríbenos a soporte@lobra.net`.
* Tracking `purchase` activo vía `NEXT_PUBLIC_GTM_ID`.

---

## 🧱 JSONC — `data/webinars.jsonc`

Ejemplo de nodo completo:

```jsonc
"2025-10-14-2030": {
  "shared": {
    "slug": "2025-10-14-2030",
    "title": "Taller de Tranquilidad Financiera",
    "sku": "liveclass-huerta-mkt-webinar-oct2025-v001",
    "supportEmail": "soporte@lobra.net"
  },
  "prelobby": { "labels": { "open": "Ya puedes entrar al prelobby." } },
  "thankyou": {
    "title": "¡Pago confirmado, ya eres parte del webinar!",
    "body_md": "En minutos recibirás tu correo de acceso y checklist previo."
  }
}
```

---

## 🧰 Configuraciones requeridas (Vercel / .env)

| Variable                    | Descripción                                     | Valor recomendado   |
| --------------------------- | ----------------------------------------------- | ------------------- |
| `APP_URL`                   | Dominio principal                               | `https://lobra.net` |
| `SUPABASE_URL`              | Instancia Supabase                              | —                   |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave service role                              | —                   |
| `STRIPE_SECRET_KEY`         | Clave privada Stripe                            | —                   |
| `STRIPE_WEBHOOK_SECRET`     | Secreto del webhook Stripe                      | —                   |
| `RESEND_API_KEY`            | API key de Resend                               | —                   |
| `RESEND_FROM`               | Remitente (`"LOBRÁ <no-reply@mail.lobra.net>"`) | —                   |
| `SEND_RECEIPTS`             | Enviar correos reales (`1/0`)                   | `1`                 |
| `CACHE_WEBINARS_TTL`        | Cache de JSONC (segundos)                       | `120`               |
| `NEXT_PUBLIC_GTM_ID`        | ID de GA4/Tag Manager                           | —                   |
| `NEXT_PUBLIC_DEBUG`         | Mostrar logs UI (`1/0`)                         | `0`                 |
| `EMAIL_SUBJECT_PREFIX`      | Prefijo opcional (`[Staging]`)                  | (solo staging)      |
| `ALLOW_DEV_TESTS`           | Habilita rutas `/app/dev/...`                   | `0`                 |

---

## 🧪 Pruebas funcionales mínimas

| Caso | Acción          | Resultado esperado                                 |
| ---- | --------------- | -------------------------------------------------- |
| A    | `live_class`    | Correo con CTA prelobby + `/gracias` coherente     |
| B    | `bundle`        | Email con lista de CTAs; `/gracias` lista vertical |
| C    | `template`      | CTA “Descargar”                                    |
| D    | `one_to_one`    | CTA “Agendar sesión”                               |
| E    | `community`     | CTA “Entrar a la comunidad”                        |
| F    | SKU inexistente | Fallback genérico `/mi-cuenta`                     |

---

## 📋 Criterios de aceptación

1. **Webhook:** envía correo una sola vez por `checkout.session.completed`.
2. **Correo:** asunto y CTA correctos según `variant`.
3. **Página `/gracias`:** CTA coherente y copy genérico con override opcional.
4. **Logs:** muestran `variant`, `href`, `sku`, `resolution_path`.
5. **Reprocesar evento Stripe:** no reenvía correo (idempotente).

---

## 🔒 Seguridad y control de calidad

* `resolveNextStep` sanitiza `slug` y `href`.
* Evitar open redirects (`APP_URL` fijo).
* Validar `SEND_RECEIPTS=1` solo en prod.
* Probar `stripe trigger checkout.session.completed` en sandbox.
* Verificar correo real vía Resend logs.
* Revisar `/gracias` con `NEXT_PUBLIC_DEBUG=1` para confirmar CTA y variant.

---

## 🚧 Pendientes y mejoras futuras

| Tema                                        | Estado | Comentario                                     |
| ------------------------------------------- | ------ | ---------------------------------------------- |
| Migrar JSONC → tabla `webinars` en Supabase | 🔜     | Mantener compatibilidad con `getWebinarBySku`. |
| Tabla `thankyou_copy`                       | 🔜     | Reactivar tras migrar contenido.               |
| RPC `f_entitlements_by_order(session_id)`   | 🔜     | Mostrar accesos exactos en `/mis-compras`.     |
| Email marketing (Brevo)                     | 🔜     | No incluido en este flujo.                     |
| Replays y `showReplay`                      | 🔜     | Pendiente de flag `flags.showReplay`.          |
| Multi-idioma (`locale`)                     | 🔜     | Fase posterior.                                |

---

## ✅ Resultado final

* Flujo post-compra **completo, unificado y escalable**.
* Correos y `/gracias` comparten lógica de CTA mediante un solo resolver.
* Webhook y UI totalmente desacoplados.
* Arquitectura lista para migrar contenido a Supabase o extender a nuevos tipos de producto.

---

**Versión:** 1.1 · 2025-10
**Implementa:** CTA dinámico, correos modulares, prelobby coherente
**Owner técnico:** Huerta Consulting · Arquitectura Web Next.js + Supabase + Stripe + Resend

```
```
