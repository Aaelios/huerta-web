````md
# sitemap_robots.md  
_Ecosistema LOBRÁ — lobra.net_  
Versión: v1.0  

---

## 0) Objetivo del Bloque 03

Definir y documentar la implementación de:

- `app/sitemap.ts`
- `app/robots.ts`
- `middleware.ts` (solo la parte relacionada con `X-Robots-Tag`)

Cumpliendo:

- Reglas de indexación definidas en `arquitectura_seo_tecnico.md`
- Coherencia con metadata (Bloque 01) y schemas (Bloque 02)
- Regla principal: **ningún entorno distinto a producción real (`lobra.net`) puede ser indexado**

---

## 1) Sitemap (`app/sitemap.ts`)

### 1.1. Implementación

Archivo:

- `app/sitemap.ts`

Responsabilidades:

- Generar un único sitemap XML para `https://lobra.net`
- Incluir solo **rutas públicas indexables**
- Consumir datos reales de:
  - Webinars: `loadWebinars()`
  - Módulos (bundles): `loadModulesIndex()`

Características técnicas:

- Función `async` que retorna `Promise<MetadataRoute.Sitemap>`
- `baseUrl` fijo: `https://lobra.net`
- Cada entrada incluye:
  - `url` absoluta
  - `lastModified` (`Date`)

No se usan `priority` ni `changeFrequency` (no aportan valor en SEO moderno).

---

### 1.2. Rutas incluidas en el sitemap

#### 1.2.1. Rutas estáticas

Incluidas explícitamente:

- `/`
- `/webinars`
- `/que-es-lobra`
- `/servicios/1a1-rhd`
- `/sobre-mi`
- `/contacto`
- `/privacidad`
- `/terminos`
- `/reembolsos`

Todas como URLs absolutas:

- `https://lobra.net/`
- `https://lobra.net/webinars`
- `https://lobra.net/que-es-lobra`
- `https://lobra.net/servicios/1a1-rhd`
- `https://lobra.net/sobre-mi`
- `https://lobra.net/contacto`
- `https://lobra.net/privacidad`
- `https://lobra.net/terminos`
- `https://lobra.net/reembolsos`

`lastModified` se fija a `new Date()` (momento de generación del sitemap).

---

#### 1.2.2. Webinars (`/webinars/w-[slug]`)

Fuente:

- `lib/webinars/loadWebinars.ts`
- Tipo: `WebinarMap` (objeto `slug -> webinar`)

Lógica:

- Se toma `Object.keys(webinars)` como lista de slugs
- Cada slug `x` genera:
  - URL: `https://lobra.net/webinars/w-${slug}`
  - `lastModified`: `new Date()` (por ahora)

Ejemplo:

- Slug: `ms-tranquilidad-financiera-ws1`
- URL en sitemap: `https://lobra.net/webinars/w-ms-tranquilidad-financiera-ws1`

---

#### 1.2.3. Módulos / bundles (`/webinars/<page_slug>`)

Fuente:

- `lib/modules/loadModulesIndex.ts`

`loadModulesIndex()`:

- Consulta tabla `products` en Supabase
- Filtro:
  - `status IN ('active','sunsetting')`
  - `fulfillment_type = 'bundle'`
  - `page_slug IS NOT NULL`
- Devuelve DTO:

```ts
type ModuleIndexItem = {
  sku: string;
  pageSlug: string;       // ej. "webinars/ms-tranquilidad-financiera"
  updatedAt: string | null;
};
````

Lógica en sitemap:

* Si `pageSlug` **no** empieza con `/`, se normaliza a `"/" + pageSlug`
* URL final: `https://lobra.net/${pathNormalizado}`
* `lastModified`:

  * Si `updatedAt` no es `null` → `new Date(updatedAt)`
  * Si `updatedAt` es `null` → `new Date()` (fallback)

Ejemplo actual real:

* `page_slug = "webinars/ms-tranquilidad-financiera"`
* URL en sitemap: `https://lobra.net/webinars/ms-tranquilidad-financiera`

> Nota:
> Hoy los módulos usan prefijo `ms-` en el slug. Si en el futuro se migra a `m-`, el sitemap reflejará automáticamente los nuevos `page_slug`. Los 301 entre slugs viejos y nuevos se manejarán en Bloque 05 (Redirecciones).

---

### 1.3. Rutas explícitamente excluidas del sitemap

Por diseño, el sitemap **no incluye**:

* Checkout / transaccionales:

  * `/checkout/[slug]`
  * `/gracias`
  * `/cancelado`
* Área privada:

  * `/mi-cuenta`
  * `/mis-compras`
* Landings LP:

  * `/lp/[slug]`
* Prelobby:

  * `/webinars/w-[slug]/prelobby` (ruta interna previa a sesión)
* Dev / internas:

  * `/dev/modules/module-detail/[slug]`
  * Cualquier ruta bajo `/dev/`

Motivos:

* Todas tienen `Index = no` en la tabla de tipos
* Algunas son áreas privadas
* Otras son páginas internas de flujo o experimentación

---

### 1.4. Reglas globales del sitemap

1. Solo se expone **un** sitemap: `https://lobra.net/sitemap.xml`
2. Todas las URLs son absolutas (`https://lobra.net/...`)
3. No incluye:

   * Parámetros de query
   * Rutas dinámicas sin contenido real
   * Páginas marcadas `noindex`
4. Coherente con:

   * Tabla de tipos (Index/Follow)
   * Canonicals definidos en Bloque 01
   * JSON-LD configurados en Bloque 02

---

## 2) Robots (`app/robots.ts`)

### 2.1. Implementación

Archivo:

* `app/robots.ts`

Constante global:

* `BASE_URL = "https://lobra.net"`

Detección de entorno:

* `const isProd = process.env.VERCEL_ENV === "production";`

Comportamiento:

* Si **no** es producción:

  * Bloqueo completo (`Disallow: /`)
  * Sin `sitemap`
* Si es producción:

  * Sitio indexable con `allow: "/"`, pero con `disallow` en rutas sensibles
  * `sitemap: "https://lobra.net/sitemap.xml"`

---

### 2.2. Robots en entornos no productivos

Condición:

* `VERCEL_ENV !== "production"`

Respuesta:

```txt
User-agent: *
Disallow: /
```

Sin línea de `Sitemap`.

Efecto:

* Motores no deben indexar nada en entornos de preview/staging/dev.
* Compatible con la cabecera `X-Robots-Tag` que refuerza `noindex` (ver sección 3).

---

### 2.3. Robots en producción (lobra.net)

Condición:

* `VERCEL_ENV === "production"`

Reglas:

* `allow: "/"` (sitio indexable)
* `disallow` para rutas sensibles / no indexables:

  * `/checkout`
  * `/gracias`
  * `/cancelado`
  * `/mi-cuenta`
  * `/mis-compras`
  * `/lp/`
  * `/dev/`
  * `/webinars/*/prelobby`

Sitemap:

* `Sitemap: https://lobra.net/sitemap.xml`

Comentarios relevantes:

* Landing pages `/lp/[slug]` se controlan también con metadata `noindex` (Bloque 01), pero se refuerza con `Disallow: /lp/`.
* Prelobby se marca como no indexable aquí y en metadata; es página solo para alumnos.

---

## 3) Cabecera `X-Robots-Tag` (`middleware.ts`)

### 3.1. Implementación

Archivo:

* `middleware.ts`

Responsabilidades:

1. Bloquear probes comunes (WordPress, Joomla, Drupal, archivos sensibles, backups, CGI/status) con 404.
2. Controlar indexación por entorno y host mediante `X-Robots-Tag`.

Detección:

* `const host = req.headers.get("host")?.toLowerCase() || "";`
* `const isProdEnv = process.env.VERCEL_ENV === "production";`
* `const isProdHost = host === "lobra.net" || host === "www.lobra.net";`
* `const isIndexable = isProdEnv && isProdHost;`

Lógica:

* Si `!isIndexable`:

  * Se añade cabecera: `X-Robots-Tag: noindex,nofollow`
* Si `isIndexable`:

  * No se modifican cabeceras (robots index/follow se controlan por metadata + `app/robots.ts`)

---

### 3.2. Alcance del middleware

`config.matcher`:

```ts
export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
```

Significa:

* Se ejecuta solo en:

  * Rutas de páginas
* Se excluyen:

  * `_next`
  * APIs
  * Archivos estáticos (`.*\..*`)

Esto evita:

* Añadir `X-Robots-Tag` sobre assets
* Afectar el comportamiento de recursos internos

---

## 4) Coherencia global

Este bloque garantiza consistencia entre:

1. **Metadata (Bloque 01)**

   * Cada ruta tiene:

     * `index` / `noindex`
     * Canonical limpio
   * TypeIds:

     * `home`, `webinars_hub`, `webinar_sales`, `module_sales`, `service_1a1_rhd`, `legal_*`, etc.

2. **Schemas (Bloque 02)**

   * Webinars: Event + Product
   * Módulos: Course + Product
   * Instructor: Person
   * FAQ (opcional)
   * Solo se generan schemas para páginas indexables (w-[slug], m-[slug], etc.)

3. **Sitemap (Bloque 03)**

   * Incluye solo rutas con `Index = sí`
   * No toca rutas internas ni privadas
   * Usa solo datos reales (webinars JSONC + módulos desde `products`)

4. **Robots + X-Robots-Tag (Bloque 03)**

   * Entornos no productivos:

     * `Disallow: /`
     * `X-Robots-Tag: noindex,nofollow`
   * Producción:

     * `allow: "/"` con `disallow` parciales
     * `Sitemap: https://lobra.net/sitemap.xml`

Resultado:

* Ningún entorno distinto al dominio de producción real puede ser indexado.
* No hay contradicciones evidentes entre metadata, sitemap, robots y schemas.

---

## 5) Riesgos y pendientes

### 5.1. Riesgos

1. **Dependencia de `page_slug` en módulos**

   * El sitemap confía en que `page_slug` siempre representa la ruta pública real del módulo (ej. `"webinars/ms-tranquilidad-financiera"`).
   * Si se cambia el patrón (ej. `/webinars/m-...`), hay que:

     * Actualizar `page_slug` en `products`
     * Configurar 301 en Bloque 05
     * Verificar sitemap y cobertura en Search Console

2. **Campos `updated_at` nulos**

   * En esos casos se usa `now` como `lastModified`.
   * No es crítico, pero es menos preciso.

3. **Hosts adicionales**

   * Si en el futuro se usan otros dominios o subdominios públicos (ej. `staging.lobra.net` o dominios alternos), hay que actualizarlos en la lógica de `isProdHost`.

---

### 5.2. Pendientes explícitos

1. **Migración de slugs `ms-` a `m-`** (módulos)

   * Bloque 05 (Redirecciones) deberá:

     * Crear 301 de `/webinars/ms-...` → `/webinars/m-...`
     * Documentar cambios de slug en `data/redirects.business.json`
   * Bloque 03 solo consumirá `page_slug` actualizados.

2. **Futuro blog**

   * Cuando exista:

     * Extender `app/sitemap.ts` para incluir `/blog` y `/blog/[slug]` indexables.
     * Revisar `robots` si hay secciones de blog no indexables (ej. borradores).

3. **Rutas legales /legales/* si se usan**

   * Hoy se asume canonical en raíz:

     * `/privacidad`
     * `/terminos`
     * `/reembolsos`
   * Cualquier `/legales/...` se debe manejar vía 301 (Bloque 05).

---

## 6) Elementos a heredar a Bloque 04 y Bloque 06

### 6.1. Herencias a Bloque 04 (Redirecciones)

* Regla: el sitemap **siempre** refleja el estado actual de las rutas canónicas.
* Si cambian slugs de:

  * Webinars (`/webinars/w-[slug]`)
  * Módulos (`/webinars/ms-[slug]` → `/webinars/m-[slug]`)
  * Legales (`/legales/...` → raíz)
* Bloque 04/05 debe:

  * Gestionar 301 permanentes
  * Mantener `data/redirects.business.json` como fuente de verdad
  * Garantizar que no se generan cadenas largas de redirecciones

Implicación:

* Bloque 03 **no** hace redirects; solo refleja el estado final.

---

### 6.2. Herencias a Bloque 06 (QA & Auditoría SEO)

Checklist mínimo para QA:

1. `sitemap.xml`

   * Solo URLs esperadas
   * Sin rutas privadas
   * Sin `/lp/[slug]`
   * Sin `/checkout`, `/gracias`, `/cancelado`, `/mi-cuenta`, `/mis-compras`

2. `robots.txt`

   * En producción:

     * `Disallow` para rutas sensibles
     * `Sitemap: https://lobra.net/sitemap.xml`
   * En staging/preview/dev:

     * `Disallow: /`
     * Sin `Sitemap`

3. HTTP headers (`X-Robots-Tag`)

   * Producción (`lobra.net` / `www.lobra.net`):

     * No debe aparecer `X-Robots-Tag: noindex`
   * Cualquier otro host / entorno:

     * Debe tener `X-Robots-Tag: noindex,nofollow`

4. Search Console

   * Cobertura acorde a lo esperado:

     * Solo indexadas:

       * `/`
       * `/webinars`
       * `/webinars/w-[slug]`
       * `/webinars/<page_slug módulo>`
       * `/servicios/1a1-rhd`
       * `/que-es-lobra`
       * `/privacidad`, `/terminos`, `/reembolsos`
       * `/sobre-mi`, `/contacto`
     * No indexadas:

       * Checkout, gracias, cancelado
       * Área privada
       * LPs
       * Prelobby
       * Dev

---

## 7) Resumen operativo para desarrolladores

1. Si se crea una **nueva página pública indexable**:

   * Asegurarse de:

     * Definir metadata vía `seoConfig + buildMetadata`
     * Integrar schema si aplica (Bloque 02)
     * Añadirla al sitemap si es tipo de página estable (no landing temporal)

2. Si se crea una **nueva ruta interna / privada**:

   * Asegurarse de:

     * `index = false` en metadata
     * Nunca incluirla en sitemap
     * Evaluar si requiere `Disallow` en `app/robots.ts`

3. Si se añade un nuevo entorno / dominio:

   * Actualizar:

     * Lógica de `isProdHost` en `middleware.ts`
     * Configuración de VERCEL_ENV si aplica

Con esto, el Bloque 03 — Sitemap & Robots queda documentado y alineado con los bloques previos y futuros.

```
```
