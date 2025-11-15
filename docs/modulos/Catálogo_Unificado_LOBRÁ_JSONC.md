Aquí va la versión actualizada del documento, integrada con lo que ya decidimos para `views/sales_pages` y el loader `loadSalesPageBySku`.

````md
# Catálogo Unificado LOBRÁ · Arquitectura v1.1  
**Diseño oficial para JSONC actual y migración futura a Supabase**

Este documento define la arquitectura recomendada para organizar todos los datos de productos y páginas de venta de LOBRÁ.  
Está optimizada para:

- Uso inmediato en **m-detalle (bundles)**.  
- Migración futura sin refactor costoso.  
- Separación clara entre **verdad del producto** (catalog) y **presentación por canal** (views).  
- Eliminación de duplicidades y dependencias ocultas.

---

# 1. Principios base

1. **Catalog describe lo que vendes.**  
   No contiene textos de UI, solo identidad del producto.

2. **Views describe cómo lo presentas.**  
   Texto, imágenes, estructura para home, sales pages, checkout, thank-you y emails.

3. **M-detalle usa solo dos capas:**  
   - `catalog.bundles`  
   - `views.sales_pages`

4. **Migración fácil:**  
   - `catalog/*` migra directo a Supabase.  
   - `views/*` puede quedarse como JSON o migrarse en fase posterior.  

---

# 2. Estructura de carpetas (JSONC hoy / Supabase mañana)

/data
│
├─ catalog/            ← verdad del producto (estable y migrable)
│   ├─ webinars.jsonc
│   ├─ bundles.jsonc
│   └─ one_to_one.jsonc
│
└─ views/              ← contenido de UI para todos los canales
    ├─ home.jsonc
    ├─ sales_pages.jsonc
    ├─ checkout.jsonc
    ├─ thankyou.jsonc
    └─ emails.jsonc

---

# 3. Contenido detallado de cada capa

## 3.1. Capa: **Catalog**  
Define entidades reales del negocio.  
Conceptualmente igual a lo que irá a Supabase.

### 3.1.1. catalog/webinars.jsonc

Describe cada clase individual.

```ts
type CatalogWebinar = {
  sku: string;
  slug: string;            // w-ingresos-v001
  type: "webinar";
  fulfillment_type: "live_class";
  cover: string;
  duration_min?: number;

  // Datos que hoy vienen de webinars.json
  start_at?: string;
  pricing?: {
    amount_cents: number;
    currency: "MXN" | "USD";
    interval: "once" | "recurring";
  };

  // No incluye copy comercial
};
````

---

### 3.1.2. catalog/bundles.jsonc

Describe cualquier módulo.

```ts
type CatalogBundle = {
  sku: string;
  slug: string;            // ms-tranquilidad-financiera
  type: "bundle";
  fulfillment_type: "bundle";
  cover: string;

  // Listado explícito de hijos (igual que bundle_items)
  items: Array<{
    sku: string;
    type: "webinar" | "one_to_one" | "template" | "subscription_grant";
  }>;

  // Pricing real
  pricing: {
    amount_cents: number;
    currency: "MXN" | "USD";
  };
};
```

---

### 3.1.3. catalog/one_to_one.jsonc

```ts
type CatalogOneToOne = {
  sku: string;
  slug: string;
  type: "one_to_one";
  duration_min: number;
  cover: string;

  pricing: {
    amount_cents: number;
    currency: "MXN" | "USD";
  };
};
```

---

# 4. Capa: **Views**

Describe cómo se presenta cada entidad en cada canal.
Sus claves siempre son `sku` alineado con `catalog/*`.

## 4.1. views/home.jsonc

```jsonc
{
  "featured": {
    "type": "bundle",
    "sku": "course-lobra-rhd-fin-finanzas-v001"
  }
}
```

Preparado para:

* Carrusel
* Cards adicionales
* Secciones temáticas

---

## 4.2. views/sales_pages.jsonc

Aquí viven los textos comerciales de todos los productos.
Clave principal: `sku` del producto (bundle, webinar, one_to_one).

### 4.2.1. Tipo `SalesPage` (contrato oficial)

```ts
type SalesPage = {
  sku: string;

  hero: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: {
      src: string;
      alt: string;
    };
    ctaText: string;
    note?: string;
  };

  // Listas de alto nivel para explicar la oferta
  beneficios?: string[];
  incluye?: string[];
  paraQuien?: string[];
  aprendizaje?: string[];

  // Secciones adicionales reutilizables
  seccionesExtras?: Array<{
    id: string;
    titulo: string;
    texto?: string;
    bullets?: string[];
    imagen?: { src: string; alt: string };
  }>;

  testimonios?: Array<{
    nombre: string;
    cita: string;
    rol?: string;
    fotoSrc?: string;
  }>;

  faqs?: Array<{
    pregunta: string;
    respuesta: string;
  }>;

  seo?: {
    title: string;
    description: string;
    canonical: string;
    ogImage?: string;
    keywords?: string[];
  };
};
```

Notas de obligatoriedad para implementación inicial:

* Requerido:

  * `sku`
  * `hero.eyebrow`
  * `hero.title`
  * `hero.subtitle`
  * `hero.image.src`
  * `hero.image.alt`
  * `hero.ctaText`
* Opcional:

  * `hero.note`
  * Todas las listas (`beneficios`, `incluye`, `paraQuien`, `aprendizaje`)
  * `seccionesExtras`, `testimonios`, `faqs`
  * `seo` completo (aunque en producción se recomienda llenarlo siempre)

### 4.2.2. Uso en m-detalle

Para la página de detalle de módulo (`m-detalle`), se consumirá:

* `hero`
* `beneficios`
* `incluye`
* `paraQuien`
* `seo` (si existe)

El resto queda disponible para enriquecer la página o para otros templates de venta.

---

## 4.3. views/checkout.jsonc

Configura textos adicionales del checkout.

```ts
{
  "ui": {
    "loadingText": "Procesando...",
    "successMessage": "Listo. Solo falta confirmar tu pago."
  }
}
```

---

## 4.4. views/thankyou.jsonc

Define textos, CTAs y navegación para la página `/gracias`.

```ts
{
  "default": {
    "title": "Gracias por tu compra",
    "subtitle": "Revisa tu correo para acceder a tu clase o módulo."
  },
  "overrides": {
    "course-lobra-rhd-fin-finanzas-v001": {
      "ctaText": "Ir al prelobby del módulo",
      "ctaHref": "/webinars/ms-tranquilidad-financiera/prelobby"
    }
  }
}
```

---

## 4.5. views/emails.jsonc

Define textos de confirmación de compra.

```ts
{
  "default": {
    "subject": "Tu acceso está listo",
    "body": "Gracias por tu compra en LOBRÁ..."
  },
  "overrides": {
    "course-lobra-rhd-fin-finanzas-v001": {
      "subject": "Bienvenida a Tranquilidad Financiera",
      "body": "Aquí tienes todo para comenzar..."
    }
  }
}
```

---

# 5. Loaders

## 5.1. Loader de Sales Pages

Archivo: `lib/views/loadSalesPageBySku.ts`

Responsabilidad:

* Cargar `data/views/sales_pages.jsonc`.
* Validar la estructura contra el tipo `SalesPage`.
* Exponer un acceso seguro por `sku`.

Contratos:

```ts
type SalesPageMap = Record<string, SalesPage>;

// Carga y valida el mapa completo desde JSONC.
// Errores de configuración (estructura inválida) lanzan Error.
async function loadSalesPagesMap(): Promise<SalesPageMap>;

// Carga una página de venta por SKU.
// Si el SKU no existe, retorna null.
// Si la configuración es inválida, lanza Error.
export async function loadSalesPageBySku(
  sku: string
): Promise<SalesPage | null>;
```

Reglas de errores:

* Si `sales_pages.jsonc` no cumple el esquema (`SalesPageMapSchema`):

  * Lanzar `Error` descriptivo (uso de helper tipo `formatZodError`).
* Si el `sku` no existe en el mapa:

  * `loadSalesPageBySku` retorna `null`.
* Si un nodo de `sku` existe pero está mal formado:

  * También se trata como error de configuración y se lanza `Error`.

---

# 6. Interacción entre capas

### m-detalle (módulo)

Usa solo:

* `catalog/bundles.jsonc` → verdad del módulo
* `catalog/webinars.jsonc` → info de cada clase hija
* `views/sales_pages.jsonc` → copy comercial del bundle (clave por `sku`)

### home

Usará:

* `catalog/*` para identificar productos
* `views/home.jsonc` para decidir cuál mostrar y en qué formato

### checkout (futuro)

Usará:

* `catalog/*` para SKU y precios
* `views/checkout.jsonc` para copy adicional

### thank-you y email

Usarán:

* `catalog/*` para saber qué se compró
* `views/thankyou.jsonc`
* `views/emails.jsonc`

---

# 7. Tabla de usos por fase

| Componente | Fase actual           | Fase futura        |
| ---------- | --------------------- | ------------------ |
| m-detalle  | catalog + sales_pages | igual              |
| home       | NO                    | catalog + home     |
| checkout   | NO                    | catalog + checkout |
| gracias    | NO                    | catalog + thankyou |
| email      | NO                    | catalog + emails   |
| hub        | Supabase              | catalog o Supabase |

---

# 8. Decisiones técnicas finales

1. Se adoptan dos capas: `catalog` + `views`.
2. El catálogo es la verdad del producto.
3. Las vistas son específicas por canal.
4. `m-detalle` usa solo lo necesario (`catalog.bundles` + `views.sales_pages`).
5. Toda esta estructura es 100% migrable a Supabase.
6. `webinars.json` existente no se elimina, pero se vaciará gradualmente.
7. `SalesPage` y `loadSalesPageBySku` son el contrato estable para cualquier UI basada en SKU.

```