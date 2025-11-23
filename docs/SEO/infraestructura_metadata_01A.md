# Infraestructura de Metadata — Chat Hijo 01A  
_Ecosistema LOBRÁ — lobra.net_  
Versión: v1.0  
Última actualización: {{FECHA}}

---

## 0) Objetivo

Definir y unificar la infraestructura central de **metadata SEO técnica** para LOBRÁ, de manera:

- consistente  
- tipada  
- escalable  
- alineada a la arquitectura SEO  
- lista para AI-First SEO 2026  

Este documento describe la implementación del Chat Hijo 01A.

---

## 1) Archivos implementados

### 1.1. `lib/seo/seoConfig.ts`

Propósito:
- Definir tipos estrictos de página (13 tipos).
- Definir configuración SEO global.
- Establecer reglas base de index/noindex.
- Establecer el dominio canónico fijo.
- Proveer helpers core:
  - `getCanonicalFromPathname`
  - `getBaseRobotsForType`
  - `isHardNoIndexType`
  - `toMetadataRobots`

Estado:
- Cumple Next.js 15.5
- Sin `any`
- ESLint estricto
- Preparado para futuras extensiones (JSON-LD, builders de schema)

---

### 1.2. `lib/seo/buildMetadata.ts`

Propósito:
- Generar `Metadata` válido de Next.js.
- Normalizar títulos, descripciones y OG/Twitter.
- Aplicar reglas globales y por tipo.
- Implementar canonicals limpios.
- Controlar todos los robots (incluye globalNoIndex, overrides y hard-noindex).
- Ser la única vía para construir metadata en todo el proyecto.

Salidas principales:
- `title`
- `description`
- `alternates.canonical`
- `robots`
- `openGraph`
- `twitter`

---

## 2) Tipos de página soportados

Los identificadores centralizados son:

```

home
webinars_hub
webinar
module
legal
static
contacto
sobre_mi
private
checkout
thankyou
landing
prelobby

```

Esta lista es fuente de verdad y evita metadata ad-hoc.

---

## 3) Canonical

### 3.1. Regla principal
Siempre:

```

[https://lobra.net{pathname}](https://lobra.net{pathname})

```

Sin parámetros, sin fragmentos, sin variación por entorno.

### 3.2. Helper
`getCanonicalFromPathname(pathname)` realiza:

- Filtro de `?` y `#`
- Garantiza inicio con `/`
- Combina con `canonicalOrigin`

---

## 4) Robots e indexación

### 4.1. Dominio de control
Basado en `VERCEL_ENV`:

- `production`: index permitido  
- `preview`: noindex forzado  
- `development`: noindex forzado  

### 4.2. Hard-noindex (irrevocable)
Los siguientes tipos **nunca pueden ser indexados**:

```

private
checkout
thankyou
landing
prelobby

```

### 4.3. Overrides
- `forceNoIndex` siempre gana.
- `forceIndex` solo aplica:
  - en producción
  - si el tipo NO es hard-noindex
  - si no hay `globalNoIndex`

---

## 5) Títulos y descripciones

### 5.1. Reglas
- Si hay `title` → `"${title} | LOBRÁ"`
- Si no hay → usa el `defaultTitle` del tipo
- La descripción se toma del input o del tipo

### 5.2. Propósito
- Evitar duplicados
- Mantener consistencia
- Preparar el sistema para compatibilidad AI-First SEO (bloques semánticos claros)

---

## 6) Open Graph y Twitter

Definidos por `buildMetadata`:

- `og.title`, `og.description`, `og.url`
- `og.type` según tipo (`website` o `article`)
- Imagen opcional por `ogImageUrl`
- Twitter: `summary_large_image`

---

## 7) Parámetros de `buildMetadata()`

```ts
type BuildMetadataInput = {
  typeId: SeoPageTypeId;
  pathname: string;
  title?: string;
  description?: string;
  ogImageUrl?: string;
  forceIndex?: boolean;
  forceNoIndex?: boolean;
}
````

Recomendación:
Usar exclusivamente desde `generateMetadata()` de cada ruta.

---

## 8) Flujo de decisión de robots

1. `globalNoIndex === true` → `index: false`
2. Si `typeId` ∈ hard-noindex → `index: false`
3. Si `forceNoIndex === true` → `index: false`
4. Si `forceIndex === true` → `index: true` (solo producción)
5. Caso normal → `robots` base del tipo

---

## 9) Cumplimiento estricto de arquitectura

Este módulo cumple:

* Canonical único
* Robots centralizados
* Prohibición de metadata manual en páginas
* Modo staging seguro
* Compatibilidad con schemas 2026 (futura capa)
* Preparación para builders de JSON-LD
* Compatibilidad con `app/layout.tsx` sin cambios
* Cohesión con AI-First SEO (Google Gemini, Copilot Answers, Perplexity)

---

## 10) Estado del Bloque 01A

**Completado al 100%**
Listo para que:

* Otros Chats Hijo llamen a este builder.
* El Chat de Control conecte páginas al sistema.
* Inicie la capa de JSON-LD / Schemas con total consistencia.

---

## 11) Siguiente bloque recomendado

**Chat Hijo 01B — Metadata Wiring por Página**

Objetivo:

* Sustituir `export const metadata` en segmentos estáticos.
* Reemplazar `generateMetadata()` dinámicos.
* Enrutar todo hacia `buildMetadata()`.

(Depende del Chat de Control.)

---

```
