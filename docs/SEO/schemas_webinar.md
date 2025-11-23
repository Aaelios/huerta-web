# **02C — Webinars Schema · LOBRÁ**
Implementación real de **Event**, **Product**, **Person** y **FAQPage**  
para páginas individuales de webinar:

``/webinars/[slug]``

Basado en:
- `SchemaWebinarInput` (DTO único 02G)
- Builders:
  - `buildEventSchemaFromWebinar.ts`
  - `buildProductSchemaFromWebinar.ts`
  - `buildSchemasForWebinar.ts`
- Infraestructura:
  - `schemaUrlUtils.ts`
  - `mergeSchemas.ts`
  - Schema global en `layout.tsx`

---

# **0) Objetivo del bloque**

Convertir un webinar (DTO normalizado) en nodos JSON-LD válidos:

- **Event**  
- **Product**  
- **Person**  
- **FAQPage**

Todo se inserta en el `@graph` único de la página.  
No se repite `@context`.  
No se repite `Organization` ni `WebSite`.

---

# **1) Entrada única — DTO 02G**

El builder recibe:

```ts
interface SchemaWebinarInput {
  id: string;
  slug: string;
  title: string;
  description: string;
  startDateIso: string;
  endDateIso?: string;
  imageUrl?: string;
  sku?: string;
  priceCents?: number;
  priceCurrency?: string;
  isLive: boolean;
  hasReplay: boolean;
}
```

Más:

```ts
canonical: string;
instructorIds: string[];
instructors?: SchemaPerson[];
faqItems?: SchemaFaqItem[];
```

---

# **2) Event Schema**

### Cuándo existe
Solo si el webinar es **temporalmente relevante**:

- Con endDate: `now <= endDate`
- Sin endDate: `now <= startDateIso`

### Reglas principales

- `@id = canonical + "#event-" + slug`
- `eventStatus`:
  - Antes del inicio → `EventScheduled`
  - En progreso → `EventInProgress`
- Se omite si ya terminó.
- Usa `description` del DTO (prioridad definida en 02G).

### Forma final

```json
{
  "@type": "Event",
  "@id": "https://lobra.net/webinars/w-ingresos#event-w-ingresos",
  "name": "Mis ingresos, mi claridad",
  "description": "...",
  "startDate": "...",
  "endDate": "...",
  "eventStatus": "https://schema.org/EventScheduled",
  "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
  "location": {
    "@type": "VirtualLocation",
    "url": "https://lobra.net/webinars/w-ingresos"
  },
  "organizer": {
    "@id": "https://lobra.net/#organization"
  },
  "performer": [
    { "@id": "https://lobra.net/#person-rhd" }
  ]
}
```

---

# **3) Product Schema**

### Cuándo existe
Siempre que el webinar esté “en catálogo”:

- `priceCents > 0`
- `priceCurrency` válido
- `sku` válido
- `canonical` válido

### Reglas

- `@id = canonical + "#product-" + slug"`
- `name = title`
- `description = description`
- `price = priceCents / 100`
- `availability`:
  - Fecha futura → `InStock`
  - Fecha pasada / inválida → `PreOrder`
- `offers.url = canonical`

### Forma final

```json
{
  "@type": "Product",
  "@id": "https://lobra.net/webinars/w-ingresos#product-w-ingresos",
  "name": "Mis ingresos, mi claridad",
  "description": "...",
  "sku": "liveclass-lobra-rhd-fin-ingresos-v001",
  "offers": {
    "@type": "Offer",
    "price": "690",
    "priceCurrency": "MXN",
    "availability": "https://schema.org/InStock",
    "url": "https://lobra.net/webinars/w-ingresos"
  }
}
```

---

# **4) Person Schema**

### Reglas

- Solo si el ID existe en `instructorIds`.
- `@id = origin + "#person-" + person.id`
- No se inventan datos.

Forma:

```json
{
  "@type": "Person",
  "@id": "https://lobra.net/#person-rhd",
  "name": "Roberto Huerta",
  "url": "https://lobra.net/webinars/w-ingresos"
}
```

---

# **5) FAQPage Schema**

### Cuándo existe
Solo si llega al menos 1 pregunta válida.

### Reglas

- `@id = canonical + "#faq"`
- Preguntas individuales:
  - `@id = canonical + "#faq-q{n}"`

Ejemplo:

```json
{
  "@type": "FAQPage",
  "@id": "https://lobra.net/webinars/w-ingresos#faq",
  "mainEntity": [
    {
      "@type": "Question",
      "@id": "https://lobra.net/webinars/w-ingresos#faq-q1",
      "name": "¿Dura 90 minutos?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Sí."
      }
    }
  ]
}
```

---

# **6) Implementación (builder compuesto)**

`buildSchemasForWebinar`:

- Llama Event → opcional  
- Llama Product → opcional  
- Crea Persons  
- Crea FAQPage  
- Vincula Event → Person vía `performer`

Devuelve un `JsonLdObject[]` listo para 02G.

---

# **7) Interacción con el Bloque 02G (cableado)**

- La página `/webinars/[slug]` arma el DTO `SchemaWebinarInput`.
- Llama `buildSchemasForWebinar`.
- Dedup con `mergeSchemas`.
- Renderiza un **solo** `<script type="application/ld+json">`.

El layout imprime solo:  
`Organization + WebSite`

---

# **8) Checklist SEO**

- Canonical válido  
- IDs estables  
- Descripciones coherentes  
- Event solo cuando aplica  
- Product sin precios formateados  
- FAQ con preguntas reales  
- Sin duplicar contextos  
- Sin inventar información  

