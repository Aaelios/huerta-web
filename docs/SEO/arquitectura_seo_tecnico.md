# arquitectura_seo_tecnico.md  
_Ecosistema LOBRÁ — lobra.net_  
Versión: v1.0  

---

## 0) Objetivo y alcance

Definir la arquitectura completa de SEO técnico para LOBRÁ de forma:

- consistente  
- escalable  
- centralizada  
- fácil de mantener mientras crece el sitio  

Este documento cubre exclusivamente la capa técnica:

- Titles y meta descriptions  
- Canonicals  
- Open Graph y Twitter  
- JSON-LD (schemas)  
- Sitemap y robots  
- Redirecciones  
- Indexación (páginas públicas/privadas)  
- Configuración SEO con Next.js App Router (SSR, SSG, ISR)  
- QA y validaciones  

No abarca textos comerciales (copywriting).

---

## 1) Inventario de problemas SEO actuales

A definir posteriormente por Chat de Control.  
Aquí solo se establece la estructura del inventario:

### 1.1. Rastreo
- URLs 404/500  
- Recursos bloqueados (JS/CSS)  
- Diferencias entre producción y preview  

### 1.2. Indexación
- Páginas indexadas por error:
  - /checkout  
  - /gracias  
  - /cancelado  
  - /mi-cuenta  
  - /mis-compras  
- Ausencia de titles/descriptions  
- Duplicados sin canonical  

### 1.3. Dominio
- Variantes http vs https  
- www vs no-www  
- Algún dominio heredado si existe  

### 1.4. Metadatos
- Titles genéricos  
- OG incompletos  
- Falta de lang=es-MX  

### 1.5. Rich Results
- Schemas inexistentes  
- Webinars y módulos sin JSON-LD
- Datos estructurados inconsistentes  

### 1.6. Mapa de tipos de páginas
- Home  
- /webinars  
- /webinars/w-[slug]  
- /webinars/m-[slug]  
- /lp/[slug] (si aplica)  
- Legales  
- Área privada  
- Checkout / gracias  

---

## 2) Metadata global

### 2.1. Base técnica
- Next.js App Router  
- Dominio: https://lobra.net  
- Idioma: es-MX  
- Centralización total:
  - lib/seo/seoConfig.ts  
  - lib/seo/buildMetadata.ts  

### 2.2. Patrones de títulos
- Contenido: “Título | LOBRÁ”
- Home: “LOBRÁ — descriptor corto”

### 2.3. Capas

**1) Global (`app/layout.tsx`)**
- metadataBase  
- title y description generales  
- OG y Twitter globales  
- robots global index/follow  

**2) Segmentos estáticos**
- /  
- /webinars  
- /legales/*  
- /lp (si existe)  
Usan `export const metadata = {...}` o helpers centralizados.

**3) Páginas dinámicas**
- /webinars/w-[slug]  
- /webinars/m-[slug]  
- Futuro blog  
Usan `generateMetadata()` → llama a buildMetadata().

### 2.4. Tipos de página del proyecto
- Home  
- Hub /webinars  
- Webinars individuales w-[slug]  
- Módulos m-[slug]  
- Landings /lp/[slug] (normalmente noindex)  
- Legales  
- Checkout / gracias / cancelado  
- Área privada  
- Futuro blog  

---

## 3) Canonicals y dominio

### 3.1. Dominio
- Siempre https://lobra.net  
- Redirecciones 301:
  - http → https  
  - www → non-www  
  - dominios antiguos → actual  

### 3.2. Lógica
canonical = metadataBase + pathname  
Nunca con query params.

### 3.3. Por tipo
- / → indexable  
- /webinars → indexable  
- /webinars/w-[slug] → indexable  
- /webinars/m-[slug] → indexable  
- /lp/[slug] → canonical propio + noindex  
- checkout, gracias, cancelado, mi-cuenta, mis-compras → canonical propio + noindex, nofollow  

---

## 4) JSON-LD (Schemas)

### 4.1. Sistema
Carpeta: lib/seo/schema/  
Helpers:

- buildOrganizationSchema  
- buildWebsiteSchema  
- buildEventSchemaFromWebinar  
- buildProductSchemaFromWebinar  
- buildCourseSchemaFromModule  
- buildProductSchemaFromModule  
- Futuro: buildArticleSchema, buildFaqSchema  

Render usando `<script type="application/ld+json">`.

### 4.2. Schemas globales
**Organization**  
**Website**  
Inyectados una vez en el layout raíz.

### 4.3. Por tipo de contenido

#### 4.3.1. Webinars individuales `/webinars/w-[slug]`
Arquitectura **Mixta** aprobada:

Schemas:
- **Event**  
  - name  
  - description  
  - startDate / endDate  
  - virtualLocation  
  - eventStatus  
  - organizer = LOBRÁ  
- **Product**  
  - name  
  - description  
  - offers: precio, moneda, availability, url  

Si no hay fechas:
- Página sigue indexable  
- “Próximamente”  
- Product con availability=PreOrder  
- Event opcional o marcado como “postponed”

#### 4.3.2. Módulos `/webinars/m-[slug]`
Schemas:
- **Course**
  - name  
  - description  
  - provider = LOBRÁ  
  - hasCourseInstance (opcional)
- **Product**
  - name  
  - description  
  - offers  

No se usa Event aquí (evita duplicidad).

#### 4.3.3. Landings `/lp/[slug]`
- WebPage simple  
- noindex  

#### 4.3.4. Legales
- WebPage simple  

#### 4.3.5. Blog futuro
- Article o BlogPosting  

### 4.4. Principios
- No repetir Organization/Website  
- No marcar contenido inexistente  
- 1–3 schemas por página  
- Todo centralizado en helpers  

## 4.5. AI-First SEO 2026 (Compatibilidad LLM: Gemini, Copilot, Perplexity)

Desde 2025 los motores de búsqueda priorizan sistemas híbridos que combinan:
- Crawling clásico,
- Indexación semántica,
- Modelos LLM para generar respuestas,
- Evaluación de autoridad basada en entidades (EEAT 2.0).

Esta sección define los requisitos obligatorios para que LOBRÁ sea elegible como fuente en:
- Google AI Overview (Gemini),
- Microsoft Copilot Answers,
- Bing Deep Retrieval,
- Perplexity Source Ranking,
- Motores LLM de terceros.

### Objetivos del sistema AI-First SEO
1. Maximizar probabilidad de ser citado como *“fuente confiable”* en respuestas IA.
2. Garantizar estructura semántica consistente para todos los tipos de contenido educativo.
3. Alinear schemas con estándares de Schema.org v25.x o posteriores.
4. Mantener compatibilidad total con el SEO técnico existente.


### 4.5.1. Schema “Person” (Instructor)
Google, Bing y Perplexity requieren autoría clara para educación y finanzas.

Cada webinar (w-slug) y módulo (m-slug) debe vincular al instructor principal mediante:
- name
- jobTitle
- image
- worksFor (Organization = LOBRÁ)
- sameAs (IG, YouTube u otros perfiles verificados)

Se genera en:
`lib/seo/schema/buildPersonSchema.ts`

Y se inyecta en:
- Webinars individuales
- Módulos
- (Opcional) Home

---

### 4.5.2. FAQ Schema (FAQPage)
Se permiten rich results de FAQ exclusivamente para contenidos:
- Educativos,
- Financieros,
- Profesionales.

Requisito:
- 4–6 preguntas máximo.
- Respuestas breves y directas.
- Deben reflejar información real de la página.

Se genera con:
`buildFaqSchema()`.

Se añade a:
- Webinars (1 sección FAQ opcional),
- Módulos (altamente recomendado).

---

### 4.5.3. Resumen Semántico Inicial (AI Snippet Block)
El primer párrafo visible de cada página educativa debe:
- Incluir 1–3 oraciones,
- Explicar qué es,
- Para quién es,
- Qué resuelve.

Los LLM lo usan como:
- Snippet extractivo,
- Summary seed,
- Primer bloque de contexto.

Este contenido debe estar en la página, no solo en metadata.

---

### 4.5.4. Atributos del Course Schema (versión extendida 2026)
Para módulos (m-slug), el Course Schema debe incluir:

- `teaches`: lista de conceptos clave.
- `learningResourceType`: “Curso en vivo”, “Módulo educativo”.
- `educationalLevel`: “Principiante”, “Intermedio”, etc.
- `competencyRequired`: opcional.
- `timeRequired`: ISO 8601 (ejemplo: "PT90M").
- `instructor`: objeto Person ya definido.

Estos atributos incrementan la probabilidad de aparecer en:
- Google Learn Graph,
- Gemini Course Insights,
- Copilot Educational Answers.

---

### 4.5.5. Consistencia semántica obligatoria
Los LLM penalizan contradicciones entre:
- Página del webinar,
- Página del módulo,
- Metadata,
- Schema,
- Calendario de fechas.

El sistema de metadata centralizada + schema helpers garantiza esta coherencia.

---

### 4.5.6. Compatibilidad garantizada
Toda esta sección:
- No reemplaza nada de la arquitectura previa.
- Es 100% compatible con los bloques anteriores de SEO técnico.
- Extiende la capa semántica para motores IA.

## 4.6. Mapa de archivos para Schemas (compatible con AI-First SEO 2026)

Todos los schemas deben residir en la carpeta:

`/lib/seo/schema/`

### Archivos obligatorios

### 1) Organización y Sitio
- `buildOrganizationSchema.ts`
- `buildWebsiteSchema.ts`

Render global en `app/layout.tsx`.

---

### 2) Schemas para Webinars (Event + Product)
- `buildEventSchemaFromWebinar.ts`
- `buildProductSchemaFromWebinar.ts`

Incluyen:
- name, description
- startDate/endDate
- eventStatus
- virtualLocation
- offers (precio, currency, availability)

---

### 3) Schemas para Módulos (Course + Product)
- `buildCourseSchemaFromModule.ts`
- `buildProductSchemaFromModule.ts`

Versión extendida 2026:
- teaches[]
- educationalLevel
- learningResourceType
- timeRequired
- instructor (vía Person)
- provider (LOBRA)

---

### 4) Schema del Instructor (Person)
- `buildPersonSchema.ts`

Usado en:
- Webinars w-[slug]
- Módulos m-[slug]

Incluye campos:
- name
- jobTitle
- image
- sameAs[]
- worksFor
- affiliation

---

### 5) FAQ Schema (opcional pero recomendado)
- `buildFaqSchema.ts`

Se integra en:
- Webinars (si aplica)
- Módulos (recomendado)

Requiere:
- questions[]: { question, answer }

---

### 6) Utilidades
- `schemaTypes.ts` (tipos TypeScript)
- `mergeSchemas.ts` (combinar múltiples JSON-LD en un solo output limpio)

---

### 4.6.7. Builders centrales por tipo de contenido

Para garantizar consistencia y evitar duplicación de lógica, cada tipo de página debe contar con un “builder” central que combine todos los schemas necesarios.

Builders recomendados:

- buildSchemasForWebinar
  - Llama a: Event, Product, Person, FAQ (opcional)
  - Devuelve: JSON-LD[] completo para w-[slug]

- buildSchemasForModule
  - Llama a: Course (extendido 2026), Product, Person, FAQ
  - Devuelve: JSON-LD[] completo para m-[slug]

Estos builders existen en:
`/lib/seo/schema/buildSchemasForWebinar.ts`
`/lib/seo/schema/buildSchemasForModule.ts`


### 4.6.8. Ubicación y estructura de salida (render final)

Cada página que requiera schema debe incluir un único bloque de salida JSON-LD.

Reglas:
- Solo se inyecta un `<script type="application/ld+json">`.
- Dentro del script se coloca un array JSON de todos los schemas combinados.
- Ningún otro componente debe inyectar schema adicional.

Ubicación:
- Directamente en el nivel de página (route segment).
- Nunca en un layout o en un componente compartido.


### 4.6.9. Validación y QA para schemas

Antes de subir a producción, se debe validar:

1. Estructura JSON-LD válida (sin errores de sintaxis).
2. Uso correcto de entidades clave:
   - Event para webinars.
   - Course para módulos.
   - Product en ambos casos.
   - Person para instructor.
   - FAQ cuando esté presente.

3. Campos obligatorios por tipo:
   - Webinars: name, description, startDate, offers.
   - Módulos: name, description, teaches, learningResourceType, instructor.
   - Person: name, image, sameAs, worksFor.
   - FAQ: questions[].

4. Validación externa con herramientas:
   - Google Rich Results Test.
   - Schema Markup Validator.
   - Perplexity Source Validator (beta 2025).



## 5) Sitemap y Robots

### 5.1. Sitemap
Implementación: `app/sitemap.ts`

Incluye:
- /  
- /webinars  
- /legales/*  
- /webinars/w-[slug]  
- /webinars/m-[slug]  
- Futuro /blog/[slug]  

No incluye:
- checkout / gracias / cancelado  
- mi-cuenta / mis-compras  
- /lp/[slug]  

## 5.2. robots.txt

Implementación recomendada: `app/robots.ts`

### Producción (`lobra.net`)

```

User-agent: *
Disallow: /checkout
Disallow: /gracias
Disallow: /cancelado
Disallow: /mi-cuenta
Disallow: /mis-compras
Sitemap: [https://lobra.net/sitemap.xml](https://lobra.net/sitemap.xml)

```

### Staging / Preview
- Siempre `noindex`
- Cabecera: `X-Robots-Tag: noindex`
- `robots` global también configurado como `noindex`
`

## 5.3. Entornos de preview / staging

Regla principal:
- Ningún entorno distinto a `lobra.net` puede ser indexado.

Staging y Preview deben devolver SIEMPRE:
- `noindex`
- `nofollow` si aplica
- Cabecera `X-Robots-Tag: noindex`

Notas:
- Herramientas externas como Screaming Frog podrán rastrear staging incluso con `noindex`.
- `noindex` bloquea indexación, no rastreo.
``
## 6) Redirecciones

### 6.1. Sistema centralizado

Todas las redirecciones se gestionan desde:

`data/redirects.business.json`

Ejemplo:

```jsonc
[
  {
    "from": "/webinars/tranquilidad-financiera",
    "to": "/webinars/w-ms-tranquilidad-financiera",
    "permanent": true,
    "reason": "Cambio de slug v1 → v2"
  }
]
```

El Chat Hijo — Redirecciones convierte este archivo en reglas reales dentro de:

`next.config.mjs → async redirects()`

### 6.2. Principios

* Siempre 301 para cambios permanentes
* Evitar cadenas (A → B → C)
* Evitar wildcards agresivos
* Documentar cada redirect

### 6.3. Slugs y disponibilidad

* Los slugs **no deben cambiar**
* Si un webinar deja de tener fechas:

  * La página permanece
  * Se muestra “Próximamente”
  * No se redirige a otro lugar
``

## 7) Configuración avanzada en Next.js

### 7.1. ISR recomendado

Para estas rutas:

- `/`
- `/webinars`
- `/webinars/w-[slug]`
- `/webinars/m-[slug]`

Usar:
- SSG + ISR de **60 minutos**

Beneficios:
- Actualiza fechas/precios sin redeploy
- Google ve contenido fresco
- Escala bien con catálogo cambiante

### 7.2. robots por metadata

Indexables:
- `/`
- `/webinars`
- `/webinars/w-[slug]`
- `/webinars/m-[slug]`

No index:
- `/checkout`
- `/gracias`
- `/cancelado`
- `/mi-cuenta`
- `/mis-compras`
- `/lp/[slug]` (por defecto noindex)

### 7.3. Centralización estricta

Todas las páginas deben generar metadata a través de:

- `lib/seo/seoConfig.ts`
- `lib/seo/buildMetadata.ts`

No se permite metadata ad-hoc en componentes.
``

## 8) QA y Auditoría

### 8.1. Checklist de preproducción

Validar:

1) `sitemap.xml`
   - Incluye rutas correctas
   - No incluye páginas privadas/checkout

2) `robots.txt`
   - Producción: correcto
   - Staging: noindex

3) Revisar manualmente:
   - Home
   - `/webinars`
   - Un webinar (w-slug)
   - Un módulo (m-slug)
   - Una página legal

En cada una:
- title
- description
- canonical
- OG
- Twitter
- JSON-LD correcto

### 8.2. Validación externa

- Google Search Console (inspección, cobertura, rich results)
- Rich Results Test (schemas)
- Screaming Frog (titles, canonicals, 404s, noindex, etc.)

### 8.3. Roles entre chats

- Chat de Definición (este documento)
- Chat de Control — SEO Técnico
- Chats Hijo:
  - Metadata & Canonicals
  - JSON-LD / Schemas
  - Sitemap & Robots
  - Redirecciones
  - QA / Auditoría
``
## **Bloque 6 — Prompt del Chat de Control**

```markdown
# PROMPT PARA CHAT DE CONTROL — SEO TÉCNICO (LOBRÁ)

Quiero que actúes como **Chat de Control — SEO Técnico para LOBRÁ (lobra.net)**.

Tu función es coordinar la implementación técnica de SEO siguiendo **al 100%** el documento de arquitectura.

Debes:

1. Crear Chats Hijo para:
   - Metadata & Canonicals
   - JSON-LD / Schemas
   - Sitemap & Robots
   - Redirecciones
   - QA / Auditoría

2. Para cada hijo:
   - Definir objetivo
   - Archivos a modificar
   - Restricciones del sistema
   - Entregables concretos

3. Validar que ningún Chat Hijo contradiga la arquitectura.

4. Mantener:
   - Canonical consistente
   - OG y Twitter unificados
   - JSON-LD correcto
   - robots adecuado
   - redirecciones sin cadenas
   - sitemap limpio y completo

5. Evitar metadata ad-hoc fuera de `buildMetadata`.

Al iniciar, pregunta:

**“¿Qué bloque quieres implementar primero: Metadata/Canonicals, JSON-LD, Sitemap/Robots, Redirecciones o QA/Auditoría?”**
```
