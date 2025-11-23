Aquí tienes el **archivo completo**, listo para pegar en:

```
docs/seo/qa_master_checklist.md
```

Incluye estructura, checklists, metodología, excepciones y herramientas.
Formato completamente compatible con GitHub.

---

# **`docs/seo/qa_master_checklist.md`**

*Ecosistema LOBRÁ — Auditoría SEO Técnica*
Versión: **v1.0 — Bloque 06 (QA Final)**
Fecha: **2025-11-22**

---

# **0) Objetivo del documento**

Este checklist establece el **estándar oficial de QA SEO técnico** para todo el ecosistema de LOBRÁ (lobra.net).
Su función es:

* Verificar **coherencia técnica** entre todos los bloques SEO (01–05).
* Asegurar que producción sea **segura, consistente y libre de fugas**.
* Mantener un marco estable ante cambios futuros en contenido, rutas o infraestructura.
* Detectar desalineaciones y documentarlas como excepciones.

**Este documento no crea reglas nuevas.**
Solo audita y certifica la arquitectura existente.

---

# **1) Checklist de Pre-Producción (antes de liberar un release)**

## **1.1 Metadata**

* [ ] Todas las páginas usan **únicamente**:

  * `export const metadata = buildMetadata({...})`, o
  * `export async function generateMetadata()`.
* [ ] No existe metadata hardcoded fuera de `buildMetadata`.
* [ ] Los typeId usados existen en `seoConfig.ts`.
* [ ] `title`, `description` y `canonical` coinciden con el tipo correcto.
* [ ] Las rutas dinámicas proveen `pathname` limpio (sin query).
* [ ] No hay overrides innecesarios (`forceIndex`, `forceNoIndex`).
* [ ] Las páginas noindex no usan OG/Twitter personalizados.

## **1.2 Canonical**

* [ ] Todos los canonicals tienen formato:

  ```
  https://lobra.net/<ruta>
  ```
* [ ] Ningún canonical contiene parámetros `?`, `#` o slugs inconsistentes.
* [ ] Las rutas dinámicas generan canonical limpio.
* [ ] No existe colisión con redirecciones activas.

## **1.3 Robots**

* [ ] `robots.ts` en producción permite solo rutas públicas.
* [ ] `robots.ts` en preview/dev bloquea todo (`Disallow: /`).
* [ ] Middleware aplica correctamente:

  ```
  X-Robots-Tag: noindex,nofollow
  ```

  en entornos no productivos.
* [ ] `HARD_NOINDEX_TYPES` coincide con las rutas privadas reales.
* [ ] No existen páginas públicas marcadas como `hard noindex`.

## **1.4 Sitemap**

* [ ] Solo incluye rutas públicas indexables.
* [ ] No incluye checkout, gracias, cancelado, privadas, prelobby, lp, ni dev.
* [ ] Webinars se generan desde `loadWebinars()`.
* [ ] Módulos se generan desde `loadModulesIndex()`.
* [ ] `lastModified` se genera correctamente según modelo de datos.
* [ ] No contiene URLs inexistentes.

## **1.5 Schemas JSON-LD**

* [ ] `layout.tsx` contiene **solo**:

  * `Organization`
  * `WebSite`
* [ ] Los schemas de:

  * Webinars → vienen de `buildSchemasForWebinar`.
  * Módulos → vienen de `buildSchemasForModule`.
* [ ] No existen schemas independientes o legacy fuera de:

  ```
  lib/seo/schemas/*
  ```
* [ ] Si un schema no aplica, no se inventa contenido.
* [ ] No hay duplicados de `@context`, `Organization`, `Person` o `WebSite`.

## **1.6 Redirecciones**

* [ ] El archivo `redirects.business.jsonc` valida sin errores.
* [ ] No existen:

  * IDs duplicados
  * `source` duplicados
  * cadenas A → B → C
* [ ] Todos los destinos son rutas públicas e indexables.
* [ ] Ningún destino apunta a:

  * `/checkout`
  * `/gracias`
  * `/mi-cuenta`
  * `/mis-compras`
  * `/dev`
  * `/api`
* [ ] Las reglas están tipadas con `kind` válido.

## **1.7 Renderizado (SSR / SSG / ISR)**

* [ ] Rutas públicas usan ISR (`export const revalidate`).
* [ ] APIs usan `dynamic = "force-dynamic"`.
* [ ] Checkout usa `dynamic = "force-static"` + noindex.
* [ ] No existe ISR en rutas privadas.
* [ ] No hay páginas públicas marcadas como `force-dynamic` sin motivo.

## **1.8 Enlaces internos**

* [ ] No hay enlaces internos que apunten a páginas noindex.
* [ ] Enlaces a webinars y módulos usan slugs reales.
* [ ] Navegación principal no contiene links rotos.

---

# **2) Checklist de Auditoría Mensual (Producción)**

Realizar en producción:

## **2.1 Canonical / Indexación**

* [ ] Revisar `/robots.txt`.
* [ ] Confirmar sitemap accesible en `/sitemap.xml`.
* [ ] Verificar canonical por URL mediante:

  * View Source
  * Fetch & Render
* [ ] Confirmar ausencia de:

  * URLs canónicas con slash duplicado
  * Query params en canonical

## **2.2 Schemas**

* [ ] Validar todas las páginas de ventas (webinars y módulos) en:

  * Rich Results Test
  * Schema.org Validator
* [ ] Validar que solo exista un `<script type="application/ld+json">` en HTML final.
* [ ] Validar que los arrays de schemas cumplan:

  * Tiene `Event`, `Product`, `Course`, `FAQPage` según corresponda.
  * No hay objetos vacíos o campos null.

## **2.3 Sitemap vs. Indexed URLs**

En Search Console:

* [ ] Revisar cobertura.
* [ ] Detectar URLs indexadas indebidamente:

  * checkout
  * gracias
  * prelobby
  * privadas
  * dev
  * lp

Si alguna aparece → marcar como incidente crítico.

## **2.4 Redirecciones**

* [ ] Revisar HTTP 301/308 con Screaming Frog.
* [ ] Confirmar ausencia de cadenas o loops.
* [ ] Confirmar que el destino final coincide con canonical esperado.

## **2.5 Renderizado**

* [ ] Revisar headers:

  * `X-Vercel-Cache` → asegurar HIT en rutas públicas.
* [ ] Verificar freshness en rutas ISR:

  * `/`
  * `/webinars`
  * `/webinars/w-[slug]`

## **2.6 Entornos alternos**

* [ ] Revisar deploy de preview:

  * `robots.txt` = `Disallow: /`
  * `X-Robots-Tag` = `noindex,nofollow`
  * Sin sitemap

---

# **3) Reglas de Consistencia entre Bloques**

## **Block 01 — Metadata**

* [ ] Todos los typeId usados deben existir en `seoConfig.ts`.
* [ ] Ninguna página puede definir metadata fuera de buildMetadata.

## **Block 02 — Schemas**

* [ ] `layout.tsx` contiene solo globales.
* [ ] Páginas dinámicas consumen builders específicos.
* [ ] Prohibido duplicar Organization, Person o WebSite.

## **Block 03 — Indexación**

* [ ] Páginas públicas deben estar en sitemap.
* [ ] Páginas privadas deben estar excluidas por robots y no tener canonical alternativo.

## **Block 04 — Sitemap & Robots**

* [ ] Sitemap solo con URLs indexables.
* [ ] Robots debe coincidir con las reglas base de typeId.

## **Block 05 — Redirecciones**

* [ ] Ninguna redirección puede apuntar a una página noindex.
* [ ] URLs del sitemap deben coincidir con URLs finales después del 301.

---

# **4) Metodología de QA Externa en Producción**

## **4.1 Validar canonical final**

Usar Fetch & Render (Chrome DevTools → Network → Doc → Response Headers):

* Verificar:

  ```
  <link rel="canonical" href="https://lobra.net/...">
  ```
* Confirmar que coincide con la URL real sin query params.

## **4.2 Detectar URLs indexadas indebidamente**

En Search Console → Cobertura:

* Filtrar:

  * checkout
  * gracias
  * cancelado
  * prelobby
  * lp
  * dev
* Cualquier aparición → incidente crítico.

## **4.3 Validar schemas**

* Abrir página pública en navegador.
* Encontrar script:

  ```
  <script type="application/ld+json">
  ```
* Confirmar:

  * Solo uno.
  * Contiene lista de objetos.
  * Sin duplicar Organization o WebSite.

## **4.4 Validar redirecciones**

* Ejecutar Screaming Frog:

  * Modo Lists
  * Probar todos los `source` del catálogo
* Confirmar:

  * 301 único
  * No hay cadenas
  * El destino final es público y coincide con canonical.

## **4.5 Validar entornos preview**

* Revisar robots:

  ```
  Disallow: /
  ```
* Revisar cabecera:

  ```
  X-Robots-Tag: noindex,nofollow
  ```
* Confirmar ausencia de sitemap.

## **4.6 Validar ISR en producción**

* Revisar:

  ```
  x-vercel-cache: HIT
  ```

  en rutas públicas.
* Confirmar que actualiza según sus tiempos:

  * Home → 3600 s
  * Webinars → 900 s
  * Detalle Webinar → 3600 s

## **4.7 Validar resultados enriquecidos**

* Probar URLs de webinars y módulos en Rich Results Test.
* Validar aparición del schema `Event` o `Course` según corresponda.

---

# **5) Excepciones documentadas (2025-11-22)**

1. **`/cancelado`**

   * Bloqueado en robots pero no existe como página.
   * Decidir si se implementa o se elimina.

2. **`/mi-cuenta` y `/mis-compras`**

   * Bloqueadas correctamente en robots y middleware.
   * No usan `buildMetadata` ni `typeId: "private"`.

3. **Schemas legacy en componentes (9 archivos)**

   * No afectan indexación pero violan la regla de un solo LD+JSON global.
   * Pendiente de consolidación en Bloque 07.

4. **`lp/[slug]`**

   * Tipo definido en SEO pero sin páginas creadas.
   * Queda documentado como “tipo preparado”.

---

# **6) Herramientas oficiales**

* **Google Search Console**

  * Cobertura
  * Inspección de URL
  * Sitemap
  * Resultados enriquecidos

* **Rich Results Test**
  [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results)

* **Schema.org Validator**
  [https://validator.schema.org/](https://validator.schema.org/)

* **Screaming Frog SEO Spider**

  * Auditoría de canonical
  * Redirecciones
  * Detección de noindex/no-follow

* **Chrome DevTools**

  * Fetch & Render
  * Verificación de canonical y robots
  * Vercel Cache HIT

* **Indexing API (si aplica)**

  * Para URLs nuevas o sensibles

---

# **7) Estado final**

> Arquitectura SEO técnica auditada, consistente y lista para producción.
> Con un número pequeño de excepciones documentadas y sin riesgos SEO activos.

---
