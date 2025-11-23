### `docs/seo/noindex_headers.md`

````md
# 03D · Endurecimiento anti-indexación (meta + headers)

Este documento define las reglas para evitar la indexación de páginas privadas y sensibles
en el sitio **lobra.net**, combinando:

- `metadata.robots` (HTML `<meta name="robots">`)
- Header HTTP `X-Robots-Tag`

La implementación vive en:

- `lib/seo/buildMetadata.ts`
- `middleware.ts`

---

## 0. Objetivo

Asegurar que las siguientes páginas **no sean indexables** por motores de búsqueda:

- `/checkout/*`
- `/gracias`
- `/webinars/[slug]/prelobby`
- Futuras: `/mi-cuenta`, `/mis-compras`

La protección se aplica en **dos capas**:

1. Meta robots dentro del HTML (`<head>`)
2. Header HTTP `X-Robots-Tag`

---

## 1. Capa 1 · Meta robots (`buildMetadata`)

Archivo: `lib/seo/buildMetadata.ts`

Se definió un arreglo de tipos endurecidos:

```ts
const HARD_NOINDEX_TYPES: SeoPageTypeId[] = [
  "checkout",
  "thankyou",
  "prelobby",
  "private",
];
````

La función `resolveRobots` aplica las reglas en este orden:

1. **Tipos endurecidos (`HARD_NOINDEX_TYPES`)**

   * Para `typeId` en `["checkout", "thankyou", "prelobby", "private"]` se fuerza:

     ```ts
     { index: false, follow: false }
     ```
   * Esto genera en el HTML:

     ```html
     <meta name="robots" content="noindex,nofollow" />
     ```

2. **Entornos no productivos (`SEO_GLOBAL_CONFIG.globalNoIndex`)**

   * Si `globalNoIndex` es `true`, se aplica `index: false` al resto de tipos.

3. **Tipos de noindex rígido de `seoConfig` (`isHardNoIndexType`)**

   * Se mantiene la lógica original.

4. **Overrides manuales**

   * `forceNoIndex` tiene prioridad sobre todo lo anterior (excepto `HARD_NOINDEX_TYPES`).
   * `forceIndex` solo se respeta si el tipo no es hard noindex ni está en `HARD_NOINDEX_TYPES`
     y no hay `globalNoIndex` activo.

### 1.1. Tipos usados en rutas sensibles

* `/checkout/[slug]`

  * `typeId: "checkout"`
  * Siempre `<meta name="robots" content="noindex,nofollow">`

* `/gracias`

  * `typeId: "thankyou"`
  * Siempre `<meta name="robots" content="noindex,nofollow">`

* `/webinars/[slug]/prelobby`

  * `typeId: "prelobby"`
  * Siempre `<meta name="robots" content="noindex,nofollow">`

* Futuras `/mi-cuenta`, `/mis-compras`

  * Se recomienda cablear con `typeId: "private"` para heredar el mismo comportamiento.

---

## 2. Capa 2 · Header `X-Robots-Tag` (`middleware.ts`)

Archivo: `middleware.ts`

La lógica se divide en **entorno / dominio** y **rutas sensibles**.

### 2.1. Entorno y dominio

Variables utilizadas:

* `VERCEL_ENV` (entorno de Vercel)
* Header `Host`

Reglas:

1. **No producción o host no oficial**

   * Si `VERCEL_ENV !== "production"` **o** el host NO es `lobra.net` / `www.lobra.net`:

     ```http
     X-Robots-Tag: noindex,nofollow
     ```
   * Se aplica a **todas** las páginas como medida de seguridad
     para entornos de dev / preview / dominios alternos.

2. **Producción real (`lobra.net` / `www.lobra.net`)**

   * El sitio es indexable por defecto.
   * Solo se añade `X-Robots-Tag` en rutas sensibles (ver 2.2).

### 2.2. Rutas sensibles siempre noindex por header

Función: `isSensitiveNoIndexPath(p: string): boolean`

Patrones cubiertos:

* Checkout (dinámico):

  * `/checkout`
  * `/checkout/*`

* Página de gracias:

  * `/gracias`

* Prelobby de webinars:

  * `/webinars/[slug]/prelobby`
  * Regex: `^/webinars/[^/]+/prelobby(/|$)`

* Futuras áreas privadas:

  * `/mi-cuenta`
  * `/mis-compras`

Para cualquier path donde `isSensitiveNoIndexPath(p) === true`,
el middleware en producción añade:

```http
X-Robots-Tag: noindex,nofollow
```

Esto hace que, incluso si la meta se configurara mal en algún punto,
el header siga bloqueando la indexación.

---

## 3. Comportamiento combinado por entorno

### 3.1. Local / Preview / Staging

* `VERCEL_ENV !== "production"` → `isIndexable = false`
* `X-Robots-Tag: noindex,nofollow` en todas las páginas.
* Las metas de cada tipo siguen generándose, pero en la práctica los buscadores
  deben respetar primero el header.

### 3.2. Producción (`lobra.net` / `www.lobra.net`)

* Páginas públicas (ej. `/`, `/webinars`, `/que-es-lobra`, etc.):

  * Sin `X-Robots-Tag` añadido por middleware.
  * Meta robots según configuración de `seoConfig` + `buildMetadata`.

* Páginas sensibles:

  * Meta robots:

    ```html
    <meta name="robots" content="noindex,nofollow" />
    ```
  * Header HTTP:

    ```http
    X-Robots-Tag: noindex,nofollow
    ```

---

## 4. Guía para nuevas rutas privadas

Para cualquier nueva página que **no deba indexarse** (ej. dashboards,
áreas privadas, páginas internas de confirmación), seguir estos pasos:

1. **Elegir `typeId` adecuado**

   * Usar preferentemente `typeId: "private"` para áreas internas genéricas.
   * Si es un flujo especial (ej. otro tipo de checkout), considerar un nuevo
     `SeoPageTypeId` y añadirlo a `HARD_NOINDEX_TYPES`.

2. **Path**

   * Asegurar que el path sea cubierto por:

     * El listado de `isSensitiveNoIndexPath`, o
     * Añadir una nueva rama al `isSensitiveNoIndexPath`.

3. **Cableo de metadata**

   * En la página, usar siempre `buildMetadata` con el `typeId` correcto:

     ```ts
     export const metadata: Metadata = buildMetadata({
       typeId: "private",
       pathname: "/mi-cuenta",
       title: "Mi cuenta",
       description: "Área privada del usuario.",
     });
     ```

Con estos pasos, la nueva ruta quedará protegida por **ambas capas**
(meta + header).

---

## 5. QA / Checklist de validación

### 5.1. Local / Preview

* Cualquier URL (`/`, `/checkout/...`, `/gracias`, etc.):

  * Header:

    ```http
    X-Robots-Tag: noindex,nofollow
    ```

* En páginas privadas:

  * Meta:

    ```html
    <meta name="robots" content="noindex,nofollow" />
    ```

### 5.2. Producción

* Página pública (`/`, `/webinars`, etc.):

  * Sin header `X-Robots-Tag: noindex,nofollow`.
  * Meta robots acorde a `seoConfig` (típicamente `index,follow`).

* Página `/checkout/[slug]`:

  * Meta robots: `noindex,nofollow`.
  * Header: `X-Robots-Tag: noindex,nofollow`.

* Página `/gracias`:

  * Meta robots: `noindex,nofollow`.
  * Header: `X-Robots-Tag: noindex,nofollow`.

* Página `/webinars/[slug]/prelobby`:

  * Meta robots: `noindex,nofollow`.
  * Header: `X-Robots-Tag: noindex,nofollow`.

* Futuras `/mi-cuenta` y `/mis-compras`:

  * Mismo patrón una vez creadas.

Con este endurecimiento, las páginas de checkout, gracias,
prelobby y áreas privadas no deberían aparecer en índices públicos
aunque se enlacen desde fuera o se generen URLs de forma automatizada.
