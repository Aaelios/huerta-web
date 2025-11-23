# docs/seo/indexacion_render.md
SEO Técnico LOBRÁ — Bloque 04  
Indexación & Render (SSR / SSG / ISR)

Versión: v1.0  
Última actualización: 2025-11-22

---

# 0) Objetivo

Definir y documentar la estrategia técnica de **renderizado e indexación** para todas las rutas públicas del ecosistema **lobra.net**, garantizando coherencia con:

- Bloque 01 — Metadata & Canonicals  
- Bloque 02 — Schemas (JSON-LD)  
- Bloque 03 — Sitemap & Robots  
- Documento maestro: `arquitectura_seo_tecnico.md`

Este documento NO cubre copywriting, diseño visual ni estructura de ventas.  
Solo trata render, revalidate, indexación y estabilidad de rutas.

---

# 1) Principios del sistema

1. Todas las páginas públicas **se pre-generan** (SSG).  
2. La actualización del contenido ocurre vía **ISR**.  
3. Las páginas privadas o transaccionales (checkout, thank-you, dashboards) **no están en ISR**.  
4. No se usa SSR a menos que exista una dependencia real a datos por-request o headers (no aplica en este proyecto).  
5. Los tiempos de `revalidate` se minimizan y documentan explícitamente.  
6. La estructura de slugs no cambia en este Bloque.  
7. Schemas, metadata y canonical ya vienen correctos desde los Bloques 01–02.

---

# 2) Matriz de rutas → render → revalidate → indexable

| Ruta | Render | ISR (`revalidate`) | Indexable | Notas |
|------|--------|----------------------|------------|--------|
| `/` | SSG + ISR | **3600** | Sí | Sólo depende de bloque destacado → tolera 1h. |
| `/webinars` | SSG + ISR | **900** | Sí | Excepción deliberada. Cambios deben reflejarse rápido. |
| `/webinars/[slug]` | SSG + ISR | **3600** | Sí | Unifica detalle de webinar + módulo. |
| `/contacto`, `/sobre-mi`, estáticas | SSG | 3600 o sin ISR | Sí | No dependen de datos dinámicos. |
| `/checkout`, `/gracias`, `/cancelado` | SSR / dynamic | — | **No indexable** | Marcadas con X-Robots-Tag y robots. |

---

# 3) Decisiones clave del Bloque 04

### 3.1 `/` (Home)
- SSG + ISR.  
- `revalidate = 3600`.  
- Solo el bloque destacado cambia, por lo que el retraso máximo es aceptable.  
- Cuando se necesite forzar actualización: `/api/revalidate?path=/`.

### 3.2 `/webinars` (Hub)
- SSG + ISR.
- **`revalidate = 900`** como excepción justificada: cambios en catálogo deben verse rápido.  
- `fetch(... { next: { revalidate: 900 } })` ya lo cumple.  
- No se indexan páginas de paginación concretas (Next maneja parámetros sin afectar SEO).

### 3.3 `/webinars/[slug]` (Unified Detail Page)
- **Una sola ruta para webinars y módulos**.  
- `generateStaticParams()` precalienta TODOS los slugs:  
  - Webinars desde `loadWebinars()`  
  - Módulos desde `loadModulesIndex()` con pageSlug que empieza con `"webinars/"`.
- `revalidate = 3600`.  
- Indexable.  
- Canonical viene de `generateMetadata`.

### 3.4 Rutas estáticas menores
- SSG puro o ISR estándar.  
- Sin dependencias dinámicas.

### 3.5 Rutas privadas/transaccionales
- `/checkout`, `/gracias`, `/cancelado`, `/mi-cuenta`, etc.:  
  - Se sirven **sin pre-render**.  
  - Marcadas como **no indexables** en Bloques 01 y 03.  
  - No participan en sitemap.

---

# 4) Cómo interactúa ISR con metadata y schemas

- ISR nunca modifica la metadata estática generada por `buildMetadata()`.  
- Los schemas JSON-LD también se regeneran bajo ISR cuando cambia contenido.  
- Canonicals, alternates y robots se mantienen estables.

Esto asegura que los motores no reciban cambios inconsistentes entre HTML y metadata.

---

# 5) Interacción con Sitemap (Bloque 03)

- El sitemap se genera con slugs frescos de Supabase + JSONC.  
- Bloque 04 garantiza que las rutas del sitemap también existen en SSG.  
- Excepción documentada: rutas privadas quedan excluidas.  
- Para módulos, se respeta `pageSlug` tal cual (normalizado a `[slug]` solo en `generateStaticParams`).

---

# 6) Interacción con Robots y X-Robots-Tag (Bloque 03)

- `/checkout`, `/gracias`, `/cancelado`, `/mi-cuenta`, `/comunidad`, `/api/*` → **no indexables**.
- Todas las rutas del Bloque 04 respetan la lógica de:
  - Entorno de staging → siempre noindex.
  - Producción real → indexación normal.

---

# 7) Servicio de revalidación manual (recomendado)

Para evitar esperar 15–60 min cuando se cambian precios, imágenes o textos críticos:

- Implementar `/api/revalidate?path=/webinars/...`  
- Internamente usar `revalidatePath()` o `res.revalidate()` (según Next 15.5).  
- Esto te permite refrescar:
  - home  
  - hub  
  - páginas de webinar  
  - módulos

Sin disminuir tiempos de ISR.

---

# 8) Limitaciones del sistema

- Revalidate depende de que alguien visite la ruta si no se implementa revalidate manual.  
- Páginas con contenido crítico (checkout) nunca deben ser SSG.  
- Bundles que no tienen `page_slug` quedan fuera de generación estática.  
- Si un bundle cambia su `page_slug`, se debe limpiar cache o revalidar manualmente.

---

# 9) Elementos que heredan a Bloque 05 (Redirecciones)

- Prefijos de módulos: `pageSlug` siempre en formato `"webinars/..."`
- No hay rutas duplicadas (`m-[slug]`, `w-[slug]` quedan unificadas).  
- Redirecciones futuras deben preservar indexación correcta.

---

# 10) Elementos que heredan a Bloque 06 (QA Técnico)

Checklist QA basado en este Bloque:

## HTML
- `<link rel="canonical">` presente y correcto.  
- Schemas cargados y validables por Google.  
- `<meta name="robots">` correcto en páginas públicas.

## Render
- Verificar que `/webinars/[slug]` carga con ISR (ver respuesta `x-nextjs-cache`).  
- Verificar que `generateStaticParams()` produce todos los slugs de JSONC + Supabase.

## Sitemap
- Todos los slugs listados existen y responden 200.  
- Ningún slug privado aparece.

## Robots
- Staging → siempre noindex.  
- Producción → index normal.

---

# 11) Estado del Bloque 04

**Completado.**  
Rutas configuradas, ISR definido, static params implementados, coherencia con Bloques 01–03 verificada.

