# schemas_modulo.md · Schemas para Módulos/Cursos (Bloque 02E)

_Ecosistema LOBRÁ — lobra.net_  
Versión: v1.0

---

## 0) Objetivo

Definir la arquitectura de **schemas JSON-LD** para páginas de **Módulos / Cursos compuestos**:

- Ruta: `/webinars/m-[slug]`
- Fuente de datos: `ModuleDetail` (Supabase + SalesPage)
- Salida: `Course`, `Product` y opcionalmente `FAQPage`

Este documento describe **exclusivamente la capa técnica de schemas**, no el copy ni el contenido visual.

---

## 1) Contexto y dependencias

### 1.1. Bloques previos

El Bloque 02E se apoya en:

- **02A** · Infraestructura JSON-LD  
  - `mergeSchemas`  
  - `buildAbsoluteUrl` (`lib/seo/schemas/schemaUrlUtils.ts`)
- **02B** · Schemas globales  
  - `Organization` (`@id: "https://lobra.net/#organization"`)  
  - `Person` principal (`@id: "https://lobra.net/#person-roberto"`)
- **02C** · Event (webinars individuales)
- **02D** · Product (webinars)

Reglas heredadas:

- No duplicar `Organization` ni `WebSite`.
- `Person` solo se referencia por `@id`, no se redefine.
- `@context` se agrega a nivel global, nunca en 02E.

### 1.2. Archivos relevantes

- `lib/modules/loadModuleDetail.ts`  
  - Define `ModuleDetail` (bundle/módulo).
- `lib/seo/schemas/jsonLdTypes.ts`  
  - Define `JsonLdObject`.  
  - Define `SchemaModuleInput` como alias de `ModuleDetail`.
- `lib/seo/schemas/buildSchemasForModule.ts`  
  - Builder central de schemas para módulos (este bloque).

---

## 2) DTO de entrada: SchemaModuleInput (ModuleDetail)

`SchemaModuleInput` es un alias directo de `ModuleDetail`:

- `sku` (course SKU, ej. `course-lobra-rhd-fin-finanzas-v001`)
- `pageSlug` (slug de página, ej. `webinars/ms-tranquilidad-financiera`)
- `title` (título de producto en Supabase, más emocional)
- `fulfillmentType` = `"bundle"`
- `pricing`  
  - `amountCents` (ej. `319900`)  
  - `currency` (`"MXN"` | `"USD"`)  
  - `stripePriceId`
- `nextStartAt` (siguiente fecha del bundle, o `null`)
- `children[]` (hijos del módulo)  
  - `sku`  
  - `fulfillmentType` (`"live_class"`, `template`, etc.)  
  - `nextStartAt`  
  - `pageSlug`  
  - `title`  
  - `cover`  
  - `level` (`Fundamentos` | `Profundización` | `Impacto` | `null`)  
  - `topics[]` (ej. `["Finanzas"]`)
- `sales` (SalesPage)  
  - `hero` (imagen, título, subtítulo, etc.)  
  - `beneficios[]`  
  - `incluye[]`  
  - `paraQuien[]`  
  - `aprendizaje[]`  
  - `seo`  
    - `title`  
    - `description`  
    - `canonical`

**Decisión clave:**  
Para todos los schemas de módulo, la fuente primaria de SEO es `sales.seo.*`.  
`ModuleDetail.title` queda como respaldo de último recurso.

---

## 3) Builder central: buildSchemasForModule

### 3.1. Firma

Ubicación: `lib/seo/schemas/buildSchemasForModule.ts`

Firma:

- Entrada:

  - `data: SchemaModuleInput` (es decir, `ModuleDetail`)
  - `canonical: string` (URL canónica de la página actual)
  - `instructorIds: string[]`
    - Lista de `@id` de instructores disponibles.
    - En v1 solo se usa el primero.
  - `faqItems?: SchemaFaqItem[]`
    - FAQ ya normalizadas desde la vista (si existen).
  - `instructors?: SchemaPerson[]`
    - Reservado para futuras extensiones (no usado en v1).

- Salida:

  - `JsonLdObject[]`  
    Array de objetos JSON-LD sin `@context`, listo para `mergeSchemas`.

### 3.2. Comportamiento

1. Construye un `Course` JSON-LD.
2. Construye un `Product` JSON-LD.
3. Si `faqItems` trae datos válidos:
   - Construye un `FAQPage`.
4. Devuelve un array con los schemas generados:
   - `[Course, Product, FAQPage?]`

No genera `Organization` ni `Person`.  
Solo referencia `@id` globales ya definidos en 02B.

---

## 4) Course Schema (Módulo / Curso compuesto)

### 4.1. Estructura base

- `@type: "Course"`
- `name`
- `description`
- `provider`
- `instructor`
- `learningResourceType`
- `educationalLevel` (opcional)
- `timeRequired` (opcional)
- `teaches` (opcional)
- `image` (opcional)

### 4.2. Poblado de campos

**name**

- `sales.seo.title`  
- Fallback: `data.title`

**description**

- `sales.seo.description`  
- Fallback 1: `sales.seo.title`  
- Fallback 2: `data.title`

**provider**

- `provider: { "@id": "https://lobra.net/#organization" }`  
- No se repite el objeto `Organization` aquí.

**instructor**

- Se resuelve a partir de `instructorIds`:
  - Si `instructorIds.length > 0`: se usa el primer `@id`.
  - Si no: fallback interno `https://lobra.net/#person-roberto`.

**learningResourceType**

- Valor fijo: `"OnlineCourse"` para todos los módulos.

### 4.3. educationalLevel

Objetivo: reflejar el “arco completo” del módulo (Fundamentos → Profundización → Impacto) usando etiquetas estándar para buscadores.

- Se leen los niveles de `children[].level`.
- Mapeo interno:
  - `"Fundamentos"` → `"Beginner"`
  - `"Profundización"` → `"Intermediate"`
  - `"Impacto"` → `"Advanced"`
- Se agrupan niveles sin duplicados.
- Se ordenan según prioridad:
  - `["Beginner", "Intermediate", "Advanced"]`
- Si al menos uno está presente:
  - `educationalLevel: string[]` con los niveles encontrados.
- Si no hay niveles válidos:
  - `educationalLevel` se omite.

Ejemplo típico para un módulo completo:

- `educationalLevel: ["Beginner", "Intermediate", "Advanced"]`

### 4.4. timeRequired

Regla v1: estimación basada en cantidad de clases en vivo.

- Se filtran hijos: `children` con `fulfillmentType === "live_class"`.
- Cada `live_class` se considera de `90` minutos.
- `totalMinutes = count(live_class) * 90`.
- Si `totalMinutes > 0`:
  - `timeRequired: "PT<totalMinutes>M"` (formato ISO 8601).
- Si no hay `live_class`:
  - `timeRequired` se omite.

Ejemplo:

- 4 workshops × 90 min → `PT360M`.

### 4.5. teaches

Objetivo: exponer temas de aprendizaje sin inventar contenido.

Fuente:

- `sales.aprendizaje[]` (array de strings)

Normalización:

- Se eliminan marcadores `[[` y `]]`.
- Cada ítem se recorta a máx. ~120 caracteres.
- Se eliminan duplicados.
- Se ignoran entradas vacías tras limpieza.
- Límite: máx. 8 ítems.

Regla:

- Si tras normalizar quedan ítems:
  - `teaches: string[]`.
- Si no:
  - `teaches` se omite.

### 4.6. image

Fuente:

- `sales.hero.image.src` (ruta relativa).

Regla:

- Se convierte a URL absoluta con `buildAbsoluteUrl(canonical, src)`.
- Si existe:
  - `image: "<URL absoluta>"`.
- Si no:
  - Se omite.

La misma imagen se reutiliza en `Course` y `Product`.

---

## 5) Product Schema (Módulo)

### 5.1. Estructura base

- `@type: "Product"`
- `name`
- `description`
- `sku`
- `image` (opcional)
- `offers`

### 5.2. Poblado de campos

**name**

- `sales.seo.title`
- Fallback: `data.title`.

**description**

- `sales.seo.description`
- Fallback 1: `sales.seo.title`
- Fallback 2: `data.title`.

**sku**

- `data.sku` (ej. `course-lobra-rhd-fin-finanzas-v001`).

**image**

- Misma lógica que en Course:
  - `sales.hero.image.src` → `buildAbsoluteUrl(canonical, src)`.
  - Se incluye solo si existe.

**offers**

- `price`:
  - `pricing.amountCents / 100` (número, no string).
- `priceCurrency`:
  - `pricing.currency` (`"MXN"` | `"USD"`).
- `availability`:
  - Fijo: `"https://schema.org/InStock"`.
- `url`:
  - `canonical` (URL de la página del módulo).

Validación interna:

- Si `pricing` no existe o está incompleto, el builder lanza error:
  - Caso tratado como problema de configuración (500), no como 404.

---

## 6) FAQ Schema (opcional)

### 6.1. Estructura

Cuando se utiliza:

- `@type: "FAQPage"`
- `mainEntity`: array de objetos `Question` con `acceptedAnswer`.

Cada entrada:

- `@type: "Question"`
- `name`: texto de la pregunta.
- `acceptedAnswer`:
  - `@type: "Answer"`
  - `text`: texto de la respuesta.

### 6.2. Fuente de datos

Entrada del builder:

- `faqItems?: SchemaFaqItem[]`
  - `SchemaFaqItem`:
    - `question: string`
    - `answer: string`

Regla:

- 02E **no inventa FAQs**.
- Solo construye FAQPage si:
  - La vista le pasa `faqItems` ya mapeadas desde una estructura real (ej. `sales.faq[]`).
- Si en el DTO no existe bloque de FAQ:
  - No se pasan `faqItems` → no hay FAQPage.

### 6.3. Normalización

- Se recortan a máx. 6 FAQs.
- Se eliminan marcadores `[[` y `]]` en preguntas y respuestas.
- Preguntas se recortan a ~160 caracteres.
- Entradas donde `question` o `answer` queden vacías se descartan.
- Si tras limpieza no queda ninguna FAQ válida:
  - No se genera `FAQPage`.

---

## 7) Reglas generales y limitaciones

1. **Sin `@context` dentro de 02E**  
   - Lo añade la infraestructura global 02A.

2. **Sin redefinir Organization o Person**  
   - Solo se usan `@id` globales:
     - `https://lobra.net/#organization`
     - `https://lobra.net/#person-roberto` (o los que se pasen en `instructorIds`).

3. **Sin campos inventados**  
   - No se generan `aggregateRating`, `review`, `brand`, `award`, `coursePrerequisites`, etc.
   - Solo se usan campos que existan o sean derivados claros (ej. duración por sesión).

4. **Errores de configuración**  
   - Falta de precio (`pricing`) lanza error en Product.
   - Falta de SalesPage (`sales`) debe tratarse como error de configuración en la capa de loader, no en 02E.

5. **Compatibilidad de validación**  
   - Schemas deben pasar:
     - Google Rich Results Test
     - Schema.org Validator
     - Perplexity Source Validator (sin `any`, tipos estrictos en TS).

---

## 8) Ejemplo conceptual (Módulo “Tranquilidad Financiera”)

Ejemplo simplificado de salida (conceptual, no copia literal del código):

- `Course`:
  - `@type: "Course"`
  - `name`: `"Tranquilidad Financiera · Módulo Completo"`
  - `description`: `"Organiza tus ingresos, controla tus egresos..."`  
  - `provider.@id`: `"https://lobra.net/#organization"`
  - `instructor.@id`: `"https://lobra.net/#person-roberto"`
  - `learningResourceType`: `"OnlineCourse"`
  - `educationalLevel`: `["Beginner", "Intermediate", "Advanced"]`
  - `timeRequired`: `"PT360M"`
  - `teaches`: array normalizada desde `sales.aprendizaje[]`
  - `image`: URL absoluta del hero de módulo

- `Product`:
  - `@type: "Product"`
  - `name`: mismo que Course
  - `description`: misma que Course
  - `sku`: `"course-lobra-rhd-fin-finanzas-v001"`
  - `image`: misma URL que Course
  - `offers`:
    - `@type: "Offer"`
    - `price`: `3199`
    - `priceCurrency`: `"MXN"`
    - `availability`: `"https://schema.org/InStock"`
    - `url`: `https://lobra.net/webinars/ms-tranquilidad-financiera`

- `FAQPage`:
  - Solo si en el futuro el módulo define una lista de FAQs reales y se mapea a `faqItems`.

---

## 9) Impacto en el sistema

- Permite a Google y a otros motores entender un **módulo como curso completo**, no solo como 4 webinars aislados.
- Expone:
  - Nivel educativo (Beginner/Intermediate/Advanced).
  - Duración total del programa.
  - Temas de aprendizaje (`teaches`).
  - Información de compra (Product + Offer).
- Mantiene coherencia total con:
  - Schemas de webinars (Bloque 02C y 02D).
  - Infraestructura global de JSON-LD (02A–02B).

## 02G — Cableado global JSON-LD para Módulos/Cursos

### 1) Objetivo

Definir cómo se conectan los schemas de **módulo/curso compuesto** generados por `buildSchemasForModule` con la página real de venta, garantizando:

* Un solo script específico de módulo por página.
* Reutilización de los `@id` globales definidos en 02B (Organization, Person).
* Separación clara entre globales y específicos de contenido.

Alcance en este documento:

* Páginas de módulos/bundles que viven bajo:

  * `/webinars/[slug]` cuando el `slug` corresponde a un módulo.
* Uso del builder:

  * `buildSchemasForModule` (`lib/seo/schemas/buildSchemasForModule.ts`)

### 2) Punto de inyección en la app

Los schemas de módulo se inyectan **solo** en el server component de página:

* Archivo:
  `/app/webinars/[slug]/page.tsx`
* Rama de ejecución:

  * Cuando `loadModuleDetail(resolveModulePageSlug(slug))` devuelve un `ModuleDetail` válido.

Flujo:

1. La página resuelve primero si el slug corresponde a un módulo (bundle).
2. Si hay `moduleDetail`, se llama a:

```ts
const moduleSchemas = buildSchemasForModule({
  data: moduleDetail,
  canonical,
  instructorIds: ["https://lobra.net/#person-roberto"],
});
```

3. Se normaliza y deduplica con `mergeSchemas`:

```ts
const pageSchemas = mergeSchemas(moduleSchemas);
```

4. Solo si `pageSchemas.length > 0` se renderiza el `<script>`:

```tsx
{pageSchemas.length > 0 && (
  <script
    type="application/ld+json"
    suppressHydrationWarning
    dangerouslySetInnerHTML={{
      __html: JSON.stringify(pageSchemas),
    }}
  />
)}
```

El script global (`Organization` + `WebSite`) viene del layout raíz y no se toca en este archivo.

### 3) Contenido del array de schemas para módulos

Según lo definido en este documento (02E), el builder puede devolver:

* Siempre que haya configuración válida:

  * `Course`
  * `Product`
* Opcional:

  * `FAQPage` cuando se proporcionan `faqItems`.

Desde la perspectiva de 02G:

* El array **no se manipula** ni se filtra por tipo.
* Se renderiza tal como lo entrega `buildSchemasForModule`, tras `mergeSchemas`.

Ejemplo de estructura final (simplificada):

```json
[
  {
    "@type": "Course",
    "name": "Tranquilidad Financiera · Módulo Completo",
    "provider": { "@id": "https://lobra.net/#organization" },
    "instructor": { "@id": "https://lobra.net/#person-roberto" },
    "educationalLevel": ["Beginner", "Intermediate", "Advanced"],
    "timeRequired": "PT360M",
    "teaches": ["...", "..."],
    "image": "https://lobra.net/..."
  },
  {
    "@type": "Product",
    "name": "Tranquilidad Financiera · Módulo Completo",
    "sku": "course-lobra-rhd-fin-finanzas-v001",
    "offers": {
      "@type": "Offer",
      "price": 3199,
      "priceCurrency": "MXN",
      "availability": "https://schema.org/InStock",
      "url": "https://lobra.net/webinars/ms-tranquilidad-financiera"
    }
  }
]
```

El `@context` y los schemas globales no se repiten aquí; están en el layout.

### 4) Regla de scripts en páginas de módulo

Para una URL `/webinars/[slug]` que represente un **módulo/curso compuesto**:

1. **Script global único** (layout):

   * `Organization` + `WebSite`.
2. **Script específico de módulo único** (página):

   * Array con `Course`, `Product` y opcionalmente `FAQPage`.

No se permite:

* Renderizar JSON-LD desde:

  * `ModuleLayout`
  * Otros componentes bajo `components/modules/*`
* Duplicar `Organization` / `WebSite` dentro del array de schemas de módulo.

La única fuente de JSON-LD para módulos es la combinación:

* `buildSchemasForModule` → `mergeSchemas` → `<script type="application/ld+json">` en `/app/webinars/[slug]/page.tsx`.

```
```
