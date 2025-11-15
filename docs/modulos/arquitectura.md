Aquí tienes el documento **final**, robusto, consolidado, listo para pegar en tu carpeta `/docs/` sin pérdida de contexto.


# 📘 Documento Final · Arquitectura para M-Detalle

**LOBRÁ — Páginas de Módulos (Bundles)**
Versión: 1.0
Autor: Solution Owner

---

## 0. Objetivo del documento

Definir la arquitectura definitiva para implementar la página de detalle de módulos **m-detalle**, asegurando:

* **No romper** nada de lo existente.
* **Aprovechar Supabase** como verdad de precios y composición de bundles.
* **Usar JSON solo para copy/UI**, sin duplicar datos de negocio.
* **Preparar** la estructura para migraciones futuras sin rediseño.
* Mantener el alcance enfocado y seguro.

---

## 1. Principio global de arquitectura

Toda la plataforma LOBRÁ se dividirá en **dos capas estables**:

### **1.1 Capa catálogo (`catalog/*`)**

Fuente de verdad de productos:

* webinars
* bundles
* one-to-one
* metadata base (sku, cover, slug, type)

**Pero en esta fase NO se usa como fuente principal para bundles**, porque esa verdad ya está en Supabase.

### **1.2 Capa vistas (`views/*`)**

Contiene solo configuración UX/UI-estática:

* textos comerciales
* héroes
* bullets
* copy de beneficios
* elementos visuales
* componentes narrativos

Esta capa **sí** se usa ahora para m-detalle.

---

## 2. Qué **NO duplicamos** en JSON

Regla estricta:

> **Si la información ya existe en Supabase → jamás duplicarla en JSON.**

Por lo tanto:

### **NO van en JSON:**

* items/hijos del bundle
* fechas
* precios
* intervalos
* stripe_price_id
* product_id
* fulfillment_type real
* schedule
* instancias
* inventarios
* disponibilidad

Todo eso viene de:

* tabla `products`
* tabla `product_prices`
* tabla `bundles`
* tabla `bundle_items`
* RPCs:

  * `f_bundles_expand_items`
  * `f_bundle_children_next_start`
  * `f_bundle_next_start_at`
  * `f_bundle_schedule`
  * `f_catalog_price_by_sku` (para consistencia con checkout)

---

## 3. Qué **sí** va en JSON

El JSON sirve únicamente para **la experiencia de venta del módulo**.

Contenido permitido:

### **3.1 Solo copy y UI**

* seo
* hero visual
* hero copy
* bullets aspiracionales
* bullets de dolor
* bullets de entrega
* descripciones largas
* imágenes
* CTA text
* frases de diferenciación

### **3.2 Datos de identificación**

* type: `"bundle"`
* sku: `"course-lobra-..."`
* optional: cover

### **3.3 Nada relacionado con backend**

El JSON jamás debe definir precios, ni niños del bundle, ni schedule.

---

## 4. Flujo real de datos para m-detalle

### **Paso 1 — Identificar si el slug es módulo**

En `app/webinars/[slug]/page.tsx` se agrega una rama:

* Si `fulfillment_type` del SKU asociado = `bundle` → modo módulo.
* Si no → flujo actual de webinar.

El SKU puede obtenerse:

* vía Supabase (`products.page_slug = slug`)
* o de `views/sales_pages` si ya está mapeado ahí.

### **Paso 2 — Cargar copy desde JSON**

`views/sales_pages.jsonc[sku]`

### **Paso 3 — Cargar estructura real del producto desde Supabase**

Usar RPCs:

1. `f_bundles_expand_items(sku)`
   → lista real de hijos (`child_sku`, tipo)

2. Para fechas:

   * `f_bundle_children_next_start(sku)`
   * `f_bundle_next_start_at(sku)`
   * `f_bundle_schedule(sku)`

3. Para precios:

   * precio final bundle → `f_catalog_price_by_sku(sku, currency)`
   * precio regular = suma de los hijos:

     * `f_catalog_price_by_sku(child_sku, currency)` por cada hijo

### **Paso 4 — Render UI**

Con esa info combinada se construye la página:

* Hero del módulo (JSON)
* Lista de clases (Supabase whitelist + JSON bullets)
* Precio regular vs precio bundle (Supabase)
* CTA → ya funciona con `getCheckoutUrl`
* Copy largo (JSON)
* Beneficios (JSON)

---

## 5. Archivos que **sí o sí** se van a modificar

No especulaciones. Lista definitiva:

### **5.1 Modificados**

Solo **uno**:

```
app/webinars/[slug]/page.tsx
```

Cambios:

* Detectar si es módulo.
* Llamar loader de módulo.
* Renderizar layout distinto.
* Mantener ruta y estructura actual para webinars individuales.

### **5.2 Nuevos**

Sin modificar lo que ya existe.

```
lib/modules/loadModuleDetail.ts
data/views/sales_pages.jsonc
components/modules/ModuleHero.tsx
components/modules/ModuleLayout.tsx
components/modules/ModuleClasses.tsx
components/modules/ModulePricing.tsx
```

**Ningún otro archivo existente se toca.**

---

## 6. Dependencias actuales validadas

### **6.1 Checkout**

Checkout ya funciona por SKU.
m-detalle solo pasa el SKU a:

```
getCheckoutUrl(sku)
```

Sin tocar:

* `/checkout/[slug]`
* `buildCheckoutUI`
* `buildSessionPayload`
* `create-checkout-session`

### **6.2 Webhooks**

El webhook seguirá funcionando sin cambios:

* checkout.session.completed
* invoice.payment_succeeded
* subscription.deleted

Porque todo depende del SKU y ese SKU no cambia.

### **6.3 Analytics**

No se toca nada.

### **6.4 SEO**

El SEO del módulo viene del JSON de vistas.

### **6.5 Navegación**

No se toca el hub.
No se toca el home.
No se toca gracias.

---

## 7. Alcance total de esta fase

✔ Página m-detalle funcional
✔ Usando copy dinámico
✔ Usando composición y precios reales desde Supabase
✔ Sin modificar checkout
✔ Sin modificar webhooks
✔ Sin romper webinars
✔ Sin migrar a Supabase todavía
✔ JSON preparado para futuro
✔ Arquitectura escalable a home, checkout, gracias, email

---

## 8. Lista final de decisiones (resumen)

* **Catálogo real = Supabase.**
* **JSON = solo UI/copy.**
* **NO duplicar precios ni hijos.**
* **Modificación única:** `[slug]/page.tsx`.
* **Todo lo demás son archivos nuevos.**
* Arquitectura final: `catalog/*` + `views/*`.
* Implementación m-detalle usa:

  * JSON (vista) + Supabase (datos reales).

---

## 9. Estado: Definición aprobada

Listo para pasar a fase de **plan técnico de implementación**.

---