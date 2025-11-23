# Bloque 01 — Metadata & Canonicals  
_Ecosistema LOBRÁ — lobra.net_  
Versión: v1.0 (infraestructura inicial)

---

## 0) Objetivo de este documento

Definir cómo se implementa **la capa de metadata y canonicals** en LOBRÁ (`lobra.net`) de forma:

- centralizada  
- coherente con `arquitectura_seo_tecnico.md`  
- compatible con Next.js App Router (15.5)  
- fácil de extender a nuevos tipos de páginas  

Este documento regula exclusivamente:

- `title` y `description`
- `canonical` y `metadataBase`
- robots por página (`index` / `noindex`, `follow` / `nofollow`)
- uso de `buildMetadata` y `seoConfig` como única fuente de verdad

No cubre:

- JSON-LD / schemas (Bloque 02)
- sitemap y robots global (Bloque 03)
- redirecciones (Bloque 05)
- QA/auditoría (Bloque 06)

---

## 1) Infraestructura centralizada

La arquitectura SEO técnica define que **todas las páginas** deben generar metadata a través de:

- `lib/seo/seoConfig.ts`
- `lib/seo/buildMetadata.ts`

y que **no se permite** metadata ad-hoc en componentes.

### 1.1. `metadataBase`

A nivel de `app/layout.tsx` se establece:

- `metadataBase = new URL("https://lobra.net")`

Todo canonical se deriva de:

```txt
canonical = metadataBase + pathname_limpio
```

sin query params (`utm_*`, `mode`, `coupon`, etc.).

---

## 2) API de `seoConfig`

Archivo: `lib/seo/seoConfig.ts`

Propósito: ser la **tabla de verdad** sobre:

* tipos de página
* indexabilidad
* patrones de título y descripción
* reglas de canonical
* configuración de robots

### 2.1. Tipo de configuración

Conceptualmente, cada tipo de página se define con una estructura similar a:

```ts
type SeoPageTypeId =
  | "home"
  | "webinars_hub"
  | "webinar_sales"
  | "module_sales"
  | "service_1a1_rhd"
  | "legal_privacidad"
  | "legal_terminos"
  | "legal_reembolsos"
  | "checkout_webinar"
  | "thankyou"
  | "cancelado"
  | "mi_cuenta"
  | "mis_compras"
  | "landing_lp"
  | "dev_module_detail"
  | "dev_api_route";

type SeoPageConfig = {
  /** Identificador estable del tipo de página */
  id: SeoPageTypeId;
  /** Path base o patrón semántico, solo documentativo */
  pathExample: string;
  /** ¿Debe ser indexada por motores? */
  indexable: boolean;
  /** ¿Debe seguir enlaces? Normalmente true salvo casos extremos. */
  follow: boolean;
  /**
   * Patrón de título:
   * - Si es string: se usa tal cual o con template global "%s | LOBRÁ"
   * - Si es función: recibe datos dinámicos (ej: título de webinar)
   */
  buildTitle: (ctx: BuildTitleContext) => string;
  /**
   * Patrón de description:
   * - Semilla clara y alineada al propósito educativo o legal.
   */
  buildDescription: (ctx: BuildDescriptionContext) => string;
  /**
   * Opcional: override de canonical cuando no es simplemente
   * metadataBase + pathname (poco frecuente).
   */
  buildCanonical?: (ctx: BuildCanonicalContext) => string;
};
```

> Nota: Los tipos `BuildTitleContext`, `BuildDescriptionContext`, `BuildCanonicalContext` son internos a la implementación. Su objetivo es permitir pasar datos dinámicos (por ejemplo, título del webinar, slug, etc.) sin duplicar lógica.

### 2.2. Acceso a la configuración

Se expone un helper único:

```ts
function getSeoConfig(typeId: SeoPageTypeId): SeoPageConfig
```

* Se usa **exclusivamente** desde `buildMetadata`.
* Ninguna página debe consumir `seoConfig` directamente para evitar lógica duplicada.

---

## 3) API de `buildMetadata`

Archivo: `lib/seo/buildMetadata.ts`

Propósito: encapsular toda la lógica de creación de `Metadata` de Next, usando la configuración de `seoConfig`.

### 3.1. Firma conceptual

```ts
import type { Metadata } from "next";

type BuildMetadataBase = {
  /** Tipo de página según SeoPageTypeId */
  typeId: SeoPageTypeId;
  /**
   * Pathname limpio (sin dominio ni query), siempre comenzando por "/".
   * Ej: "/", "/webinars", "/webinars/w-ms-tranquilidad-financiera".
   */
  pathname: string;
};

type BuildMetadataOverrides = {
  /** Forzar título específico (ej: textos cargados desde JSON) */
  overrideTitle?: string;
  /** Forzar description específica */
  overrideDescription?: string;
  /** Forzar canonical completo (casos especiales) */
  overrideCanonical?: string;
};

export type BuildMetadataInput = BuildMetadataBase & BuildMetadataOverrides;

export function buildMetadata(input: BuildMetadataInput): Metadata;
```

### 3.2. Responsabilidades internas

`buildMetadata` debe:

1. Resolver la configuración del tipo de página:

   ```ts
   const cfg = getSeoConfig(input.typeId);
   ```

2. Determinar:

   * `title`: usando `overrideTitle` o `cfg.buildTitle(ctx)` y aplicando el template global de layout (`"%s | LOBRÁ"`), salvo para Home donde el título es “LOBRÁ — descriptor corto” según `arquitectura_seo_tecnico.md`.

   * `description`: usando `overrideDescription` o `cfg.buildDescription(ctx)`.

   * `canonical`:

     ```txt
     canonical = overrideCanonical
       || cfg.buildCanonical?.(ctx)
       || (metadataBase + pathname_limpio)
     ```

     Siempre sin query params.

   * `robots`:

     ```ts
     const robots: Metadata["robots"] = {
       index: cfg.indexable,
       follow: cfg.follow,
     };
     ```

3. Construir `Metadata` de Next:

   * `title`
   * `description`
   * `alternates.canonical`
   * `robots`
   * `openGraph` básico coherente:

     * `openGraph.title` = `title`
     * `openGraph.description` = `description`
     * `openGraph.url` = canonical
     * `openGraph.type`:

       * `"website"` para Home, Hub, Legales.
       * `"article"` para páginas de venta educativas (w-[slug], m-[slug], servicios).
   * (Twitter se podrá añadir más adelante si se define en la arquitectura general.)

### 3.3. Uso en layout y páginas

Ejemplos conceptuales:

* `app/layout.tsx`:

  ```ts
  export const metadata: Metadata = buildMetadata({
    typeId: "home",
    pathname: "/",
  });
  ```

* Página de Hub `/webinars`:

  ```ts
  export const metadata: Metadata = buildMetadata({
    typeId: "webinars_hub",
    pathname: "/webinars",
  });
  ```

* Página de venta `/webinars/w-[slug]` con SEO cargado desde JSON/DB:

  ```ts
  export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const seo = await loadSeoForWebinar(slug); // título, descripción, canonical ideal

    return buildMetadata({
      typeId: "webinar_sales",
      pathname: `/webinars/w-${slug}`,
      overrideTitle: seo?.title,
      overrideDescription: seo?.description,
      overrideCanonical: seo?.canonical, // si ya viene limpia
    });
  }
  ```

> Importante: incluso cuando `overrideCanonical` está presente, la función sigue aplicando las reglas de robots (index/noindex) según `typeId`.

---

## 4) Matriz de tipos de página → Metadata & Canonicals

Basado en `arquitectura_seo_tecnico.md`.

### 4.1. Páginas públicas indexables

| Tipo                   | Path ejemplo                          | typeId              | Index | Follow | Canonical                             | Comentarios                            |
| ---------------------- | ------------------------------------- | ------------------- | :---: | :----: | ------------------------------------- | -------------------------------------- |
| Home                   | `/`                                   | `home`              |   sí  |   sí   | `https://lobra.net/`                  | Título: “LOBRÁ — descriptor corto”     |
| Hub Webinars           | `/webinars`                           | `webinars_hub`      |   sí  |   sí   | `https://lobra.net/webinars`          | Listado / hub educativo                |
| Ventas Webinar/Bundles | `/webinars/w-[slug]`                  | `webinar_sales`     |   sí  |   sí   | `https://lobra.net/webinars/...`      | Página clave educativa y transaccional |
| Ventas Módulo (m-slug) | `/webinars/m-[slug]`                  | `module_sales`      |   sí  |   sí   | `https://lobra.net/webinars/...`      | Módulos/cursos, curso principal        |
| Servicio 1 a 1 RHD     | `/servicios/1a1-rhd`                  | `service_1a1_rhd`   |   sí  |   sí   | `https://lobra.net/servicios/1a1-rhd` | Página de servicio, transaccional      |
| Que es LOBRÁ           | `/que-es-lobra`                       | `page_que_es_lobra` |   sí  |   sí   | `https://lobra.net/que-es-lobra`      | Página informativa sobre la marca      |
| Legales — Privacidad   | `/privacidad` o `/legales/privacidad` | `legal_privacidad`  |   sí  |   sí   | `https://lobra.net/privacidad`        | Ruta final a coordinar en Bloque 03    |
| Legales — Términos     | `/terminos` o `/legales/terminos`     | `legal_terminos`    |   sí  |   sí   | `https://lobra.net/terminos`          | Idem                                   |
| Legales — Reembolsos   | `/reembolsos` o `/legales/reembolsos` | `legal_reembolsos`  |   sí  |   sí   | `https://lobra.net/reembolsos`        | Idem                                   |

> Nota: El detalle exacto de si Legales viven bajo `/` o `/legales/*` se coordina con el Bloque 03 (Sitemap & Robots) y Bloque 05 (Redirecciones). Este documento define solo la regla: **son indexables** y tienen canonical limpio.

### 4.2. Páginas no indexables, pero accesibles

| Tipo              | Path ejemplo                        | typeId              | Index | Follow | Canonical                                            | Comentarios                                     |
| ----------------- | ----------------------------------- | ------------------- | :---: | :----: | ---------------------------------------------------- | ----------------------------------------------- |
| Checkout          | `/checkout/[slug]`                  | `checkout`          |   no  |   sí   | `https://lobra.net/checkout/[slug]`                  | No debe aparecer en SERPs                       |
| Gracias           | `/gracias`                          | `thankyou`          |   no  |   sí   | `https://lobra.net/gracias`                          | Página post-compra                              |
| Cancelado         | `/cancelado`                        | `cancelado`         |   no  |   sí   | `https://lobra.net/cancelado`                        | Para resultados de checkout cancelado           |
| Mi cuenta         | `/mi-cuenta`                        | `mi_cuenta`         |   no  |   no*  | `https://lobra.net/mi-cuenta`                        | Área privada; noindex; follow opcional          |
| Mis compras       | `/mis-compras`                      | `mis_compras`       |   no  |   no*  | `https://lobra.net/mis-compras`                      | Área privada; noindex                           |
| Landings LP       | `/lp/[slug]`                        | `landing_lp`        |   no  |   sí   | `https://lobra.net/lp/[slug]` (si aplica)            | Landings controladas; normalmente noindex       |
| Rutas de dev (UI) | `/dev/modules/module-detail/[slug]` | `dev_module_detail` |   no  |   no   | `https://lobra.net/dev/modules/module-detail/[slug]` | Solo uso interno; debe quedar fuera del sitemap |
| Prelobby Webinar  | `/webinars/[slug]/prelobby`         | `prelobby`          |  no   |  sí    | `https://lobra.net/webinars/[slug]/prelobby`         | Página previa al webinar, sólo para alumnos     |


* La decisión exacta de `follow` para área privada se puede ajustar, pero la arquitectura base recomienda `noindex` por completo y resolver el resto vía robots.txt y ausencia en sitemap.

### 4.3. Rutas de desarrollo y APIs técnicas

Rutas en `/app/dev` que son **route handlers** (`route.ts`) y dev-tools:

* `/dev/email-preview`
* `/dev/test-featured`
* `/dev/test-webinars`

No usan `Metadata` porque son handlers `GET` sin UI. Se consideran:

* Fuera del sitemap (Bloque 03)
* Restringidas a nivel de entorno:

  * `ALLOW_DEV_TESTS=1`
  * `VERCEL_ENV !== 'production'`

Este documento solo deja constancia de que **no deben ser indexables** y estas rutas se documentan como *“rutas técnicas / dev”* para coordinación con robots global.

---

## 5) Reglas de robots por metadata

De acuerdo con `arquitectura_seo_tecnico.md`:

* Indexables:

  * `/`
  * `/webinars`
  * `/webinars/w-[slug]`
  * `/webinars/m-[slug]`
  * Páginas legales
  * Páginas informativas públicas (`/que-es-lobra`, `servicios/1a1-rhd`)

* No index:

  * `/checkout`
  * `/gracias`
  * `/cancelado`
  * `/mi-cuenta`
  * `/mis-compras`
  * `/lp/[slug]` (por defecto noindex)
  * Rutas dev (`/dev/*`)

Implementación en `buildMetadata`:

```ts
robots: {
  index: cfg.indexable,
  follow: cfg.follow,
}
```

La capa global `robots.txt` (Bloque 03) complementa, pero no sustituye, estas reglas de página.

---

## 6) Uso recomendado en las páginas actuales

### 6.1. Páginas que hoy tienen `metadata` local

* `app/(legal)/privacidad/page.tsx`
* `app/(legal)/reembolsos/page.tsx`
* `app/(legal)/terminos/page.tsx`
* `app/que-es-lobra/page.tsx`
* `app/contacto/page.tsx` (ojo: actualmente usa dominio `huerta.consulting`)
* `app/sobre-mi/page.tsx` (Huerta Consulting)
* `app/(web)/webinars/w-[slug]/page.tsx` (tiene `generateMetadata` propio)
* `app/dev/modules/module-detail/[slug]/page.tsx` (Dev)

Para alinearse al Bloque 01, deben migrarse a:

* `export const metadata = buildMetadata({ ... })`
  para páginas estáticas.

* `export async function generateMetadata(...) { return buildMetadata({ ... }) }`
  para páginas dinámicas (webinars, módulos).

Las páginas relacionadas con **Huerta Consulting** (`/contacto`, `/sobre-mi`) quedan marcadas como:

* **Fuera del alcance** de este documento, centrado en `lobra.net`.
* Requieren un documento equivalente de SEO técnico para `huerta.consulting` o una extensión multi-sitio de `seoConfig`/`buildMetadata`.

---

## 7) Notas para AI-First SEO 2026

Aunque la lógica de AI-First se implementa principalmente en schemas (Bloque 02), la metadata debe:

1. No contradecir el tipo de contenido:

   * Páginas de venta deben describir claramente:

     * Qué es (webinar, módulo, asesoría 1 a 1).
     * Para quién es.
     * Qué problema resuelve a nivel básico.
2. Mantener títulos claros y descriptivos, no genéricos.
3. Mantener una descripción consistente con el resumen semántico visible en la página (primer párrafo educativo).

`buildMetadata` no genera el resumen visible, pero sus `buildDescription` deben **resumir la misma intención** que ese bloque AI Snippet que se pondrá en el contenido.

---

## 8) Elementos a heredar a otros bloques

### Para Bloque 02 (Schemas / JSON-LD)

* Los `typeId` de `seoConfig` deberán alinearse con los builders de schema:

  * `webinar_sales` ↔ `buildSchemasForWebinar`
  * `module_sales` ↔ `buildSchemasForModule`
  * `service_1a1_rhd` ↔ Schema tipo `Service` o `Product + Offer` (a definir).

* La decisión de indexabilidad (`indexable`) debe sincronizarse con:

  * Presencia de schemas (no tiene sentido enriquecer páginas `noindex` salvo casos muy específicos).

* Páginas de venta (`webinar_sales`, `module_sales`, `service_1a1_rhd`) deben incluir:

  * `Event`, `Product`, `Course`, `Person` y `FAQ` según corresponda (ver `arquitectura_seo_tecnico.md`).

### Para Bloque 03 (Sitemap & Robots)

* Solo tipos con `indexable: true` deben aparecer en `sitemap.xml`:

  * `home`
  * `webinars_hub`
  * `webinar_sales`
  * `module_sales`
  * `service_1a1_rhd`
  * Páginas legales
  * `page_que_es_lobra`

* Deben **excluirse** explícitamente del sitemap:

  * `checkout_webinar`
  * `thankyou`
  * `cancelado`
  * `mi_cuenta`
  * `mis_compras`
  * `landing_lp`
  * `dev_*`

* `robots.txt` de producción debe reflejar exactamente la lista de rutas no indexables documentadas aquí.

### Para Bloque 04 (Indexación & Render)

* ISR recomendado (ver arquitectura general):

  * `/`, `/webinars`, `/webinars/w-[slug]`, `/webinars/m-[slug]`
    → SSG + ISR (60 minutos sugeridos).

* Rutas críticas de checkout y gracias pueden ser:

  * `dynamic = 'force-dynamic'` o `dynamic = 'force-static'` según la lógica de negocio, pero respetando su naturaleza `noindex`.

* Entornos `preview` / `staging`:

  * Deben usar `robots` global `noindex` + cabecera `X-Robots-Tag: noindex`.
  * A pesar de eso, la metadata por página debe seguir usando `buildMetadata` para mantener coherencia y pruebas.

### Para Bloque 05 (Redirecciones)

* Cualquier cambio de slug en:

  * `/webinars/w-[slug]`
  * `/webinars/m-[slug]`
  * `/que-es-lobra`
  * `/servicios/1a1-rhd`

  deberá:

  * Actualizar canonical correspondiente en `seoConfig`.
  * Añadir un redirect 301 en `data/redirects.business.json`.

### Para Bloque 06 (QA / Auditoría)

* Las verificaciones de:

  * `title`
  * `description`
  * `canonical`
  * `robots`

  deben realizarse **comparando el resultado real** en producción contra esta matriz.

* Screaming Frog y Search Console deben usarse para:

  * Confirmar que ninguna página `noindex` esté apareciendo en sitemap.
  * Confirmar que no hay páginas con canonical hacia URL con query.

---

## 9) Resumen

* `seoConfig` define la matriz de tipos de página → indexabilidad, patrones de título, descripción y canonical.
* `buildMetadata` es el **único** helper autorizado para producir `Metadata` en el proyecto LOBRÁ (`lobra.net`).
* Todas las páginas deben migrarse a usar `buildMetadata`.
* Rutas privadas, checkout, gracias, landings `/lp` y `/dev` son siempre `noindex`.
* Esta implementación es compatible y alineada con `docs/seo/arquitectura_seo_tecnico.md` y prepara el terreno para AI-First SEO 2026 mediante una metadata consistente y centralizada.

```

Cuando quieras pasar de la documentación a la implementación, dime con qué archivo prefieres empezar:

- `lib/seo/seoConfig.ts`  
- `lib/seo/buildMetadata.ts`  

y si lo quieres **archivo completo** o **solo la sección que cambia**.
```
