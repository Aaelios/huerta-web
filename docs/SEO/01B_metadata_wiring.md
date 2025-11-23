# 01B — Metadata Wiring por Página  
_Ecosistema LOBRÁ — lobra.net_  
Versión: v1.0  
Última actualización: 2025-11-22

---

## 0) Objetivo

Conectar **todas las páginas reales** del proyecto LOBRÁ a la infraestructura SEO del Bloque **01A**:

- `lib/seo/seoConfig.ts`
- `lib/seo/buildMetadata.ts`

Sin modificar infraestructura, solo aplicarla.

---

## 1) Reglas aplicadas

- Todas las páginas deben usar **exclusivamente**:
  - `export const metadata = buildMetadata({...})`  
  - o `export async function generateMetadata()`
- Indexación según tipo de página:
  - Públicas: **index**
  - Checkout, Gracias, Cancelado: **noindex**
  - Áreas privadas: **noindex**
  - Landings `/lp/[slug]`: **noindex**
  - Prelobby: **noindex**
- Canonical siempre limpio: sin query params.
- No añadir manualmente:
  - OG
  - Twitter
  - Canonical
  - JSON-LD  
  (Bloque 02 manejará schemas)
- Respeto estricto de ESLint, Next.js 15.5 y tipados.

---

## 2) Páginas cableadas

### 2.1 Públicas indexables

| Ruta | Archivo | typeId | Estado |
|------|---------|--------|--------|
| `/` | `app/page.tsx` | `home` | Cableado |
| `/webinars` | `app/webinars/page.tsx` | `webinars_hub` | Cableado |
| `/que-es-lobra` | `app/que-es-lobra/page.tsx` | `static` | Cableado |
| `/servicios/1a1-rhd` | `app/servicios/1a1-rhd/page.tsx` | `static` | Cableado |
| `/sobre-mi` | `app/sobre-mi/page.tsx` | `sobre_mi` | Cableado (**Schema legacy eliminado**) |
| `/privacidad` | `app/(legal)/privacidad/page.tsx` | `legal` | Cableado |
| `/terminos` | `app/(legal)/terminos/page.tsx` | `legal` | Cableado |
| `/reembolsos` | `app/(legal)/reembolsos/page.tsx` | `legal` | Cableado |
| `/contacto` | `app/contacto/page.tsx` | `contacto` | Cableado |

---

### 2.2 No index

| Ruta | Archivo | typeId | Index | Estado |
|------|---------|--------|-------|--------|
| `/gracias` | `app/gracias/page.tsx` | `thankyou` | noindex | Cableado |
| `/checkout/[slug]` | `app/checkout/[slug]/page.tsx` | `checkout` | noindex | Cableado |
| `/webinars/[slug]/prelobby` | `app/webinars/[slug]/prelobby/page.tsx` | `prelobby` | noindex | Cableado |

---

## 3) Decisiones importantes

### 3.1 `/sobre-mi`
- Eliminado `<Schema />` para mantener la limpieza del Bloque 01B.  
- El JSON-LD anterior (schema tipo “Person”) se moverá en el Bloque 02 cuando definamos los builders.

### 3.2 Dominio corregido
- Rutas antiguas con “Huerta Consulting” ajustadas a LOBRÁ.

### 3.3 Tipos unificados
- Se utilizaron únicamente los `typeId` válidos según el Bloque 01A.
- `checkout_webinar` fue descartado porque no existe en la infraestructura central.

---

## 4) Riesgos y seguimiento

| Riesgo | Acción recomendada |
|--------|--------------------|
| Schemas legacy eliminados | Migrarlos a builders del Bloque 02 |
| Landings `/lp/[slug]` no implementadas | Revisar en Bloque 03 si se crearán |
| Páginas privadas inexistentes | Verificar si `/mi-cuenta` y `/mis-compras` se implementarán |

---

## 5) Elementos a heredar para siguientes bloques

### → Bloque 02 — Schemas
- Agregar esquema tipo “Person” para la página `/sobre-mi`.
- Confirmar si “Organization” aplica para `/que-es-lobra`.

### → Bloque 03 — Sitemap & Robots
- Confirmar si legales vivirán en `/legales/*` o raíz.
- Excluir rutas no index (`checkout`, `gracias`, `prelobby`).

### → Bloque 04 — Indexación & Render
- Revisar “follow/no-follow” de áreas privadas (si se agregan en futuro).

### → Bloque 05 — Redirecciones
- Revisar si se migrarán rutas antiguas de Huerta Consulting.

### → Bloque 06 — QA SEO
- Auditoría Lighthouse / Indexing API / pruebas de canonical.

---

## 6) Estado final del Bloque 01B

✔ Todas las páginas reales cableadas  
✔ Canonicals limpios  
✔ Indexación correcta por tipo  
✔ Infraestructura respetada  
✔ Schemas removidos a propósito para Bloque 02  
✔ Código 100% compatible con Next.js 15.5 + ESLint estricto  

**Bloque 01B completado.**

