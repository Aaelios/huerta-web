
---

# **schemas_servicios.md · Bloque 02H — Schemas para Servicios**

## **0) Objetivo**

Definir y estandarizar la construcción de **schemas JSON-LD** para páginas de servicios en LOBRÁ:

* `/servicios/[slug]`
* Primera implementación: **1a1-rhd** (Asesoría 1 a 1)

Los servicios deben integrarse a la infraestructura global de schemas (02A), seguir las reglas de IDs deterministas, y mantener compatibilidad con Google Rich Results y Schema.org.

---

## **1) Tipos soportados**

Cada servicio puede exponer hasta 3 nodos JSON-LD:

1. **Service**
   Descripción del servicio ofrecido.

2. **Product**
   Información de catálogo y oferta (precio, disponibilidad).

3. **FAQPage** *(opcional)*
   Se agrega solo si la página provee un set explícito de FAQs.

**No se agrega `Organization` ni `WebSite`**
(ya están definidos en la Infra Global 02A).

**No se agrega `Person` por defecto.**
Solo se genera si la página recibe `instructorIds` y catálogo de `instructors`.

---

## **2) DTO base: `SchemaServiceInput`**

Cada servicio se normaliza a través de este tipo:

```ts
export interface SchemaServiceInput {
  id: string;
  slug: string;
  name: string;
  description: string;

  imageUrl?: string;

  serviceType?: string;
  areaServed?: string;
  durationMinutes?: number;

  sku: string;
  priceCents: number;
  priceCurrency: string;

  isActive: boolean;
}
```

Este DTO mantiene el esquema de **Webinars** y **Módulos**, adaptado a servicios.

---

## **3) Convención de IDs**

Para mantener compatibilidad con 02C–02E y con la infraestructura global:

* **Service**
  `https://lobra.net/servicios/[slug]#service-[slug]`

* **Product**
  `https://lobra.net/servicios/[slug]#product-[slug]`

* **FAQPage**
  `https://lobra.net/servicios/[slug]#faq`

* **Person** *(si aplica)*
  `https://lobra.net/#person-[id]`

Todos los IDs son **deterministas**, no dependientes del build.

---

## **4) Builder principal: `buildSchemasForService`**

Ubicación:

```
lib/seo/schemas/buildSchemasForService.ts
```

Responsabilidades:

* Construir `Service`
* Construir `Product` si está en catálogo
* Construir `Person` si se proveen instructores
* Construir `FAQPage` si existe contenido
* No agrega `@context` ni `WebSite` ni `Organization`
* Devuelve siempre un `JsonLdObject[]`

Firmado exacto:

```ts
export function buildSchemasForService(params: {
  data: SchemaServiceInput;
  canonical: string;
  instructorIds?: string[];
  faqItems?: SchemaFaqItem[];
  instructors?: SchemaPerson[];
}): JsonLdObject[];
```

---

## **5) Reglas técnicas**

### **5.1 Limpieza de contenido**

Todo texto con `[[énfasis]]` se limpia antes de exponer en schema.

### **5.2 Product**

Se genera solo si:

* `isActive === true`
* `priceCents > 0`
* `priceCurrency` definido

Esto evita exponer servicios no vendidos o con precio nulo.

### **5.3 Imagen**

Si `imageUrl` es relativa, se convierte a absoluta usando:

```ts
buildAbsoluteUrl(canonical, imageUrl)
```

### **5.4 Availability**

* `InStock` si el servicio está activo
* `PreOrder` si no

### **5.5 Person (opcional)**

Nunca se inventan personas.
Solo se genera si:

* `instructorIds.length > 0`
* `instructors` contiene un match por `id`

---

## **6) Cableado en la página**

En `/servicios/1a1-rhd/page.tsx`:

```tsx
const schemas = buildSchemasForService({
  data: serviceInput,
  canonical: "https://lobra.net/servicios/1a1-rhd",
});

<script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify(mergeSchemas(schemas)),
  }}
/>
```

`mergeSchemas` sigue la misma función usada en webinars/módulos.

---

## **7) Ejemplo de salida JSON-LD**

Para la página 1a1-rhd:

```json
[
  {
    "@type": "Service",
    "@id": "https://lobra.net/servicios/1a1-rhd#service-1a1-rhd",
    "name": "Asesoría 1 a 1 RHD de 90 minutos",
    "description": "Sesión 1 a 1 para revisar tus números y salir con un plan claro y accionable.",
    "provider": { "@id": "https://lobra.net/#organization" },
    "serviceType": "OneToOneConsulting",
    "areaServed": "Latinoamerica",
    "hoursAvailable": "PT90M",
    "image": "https://lobra.net/images/asesorias/hero.jpg"
  },
  {
    "@type": "Product",
    "@id": "https://lobra.net/servicios/1a1-rhd#product-1a1-rhd",
    "name": "Asesoría 1 a 1 RHD de 90 minutos",
    "description": "Sesión 1 a 1 para revisar tus números y salir con un plan claro y accionable.",
    "sku": "one2one-lobra-rhd-090m-v001",
    "offers": {
      "@type": "Offer",
      "price": "1490",
      "priceCurrency": "MXN",
      "availability": "https://schema.org/InStock",
      "url": "https://lobra.net/servicios/1a1-rhd"
    },
    "image": "https://lobra.net/images/asesorias/hero.jpg"
  }
]
```

---

## **8) Pendientes / extensiones futuras**

* Agregar soporte para `/servicios/` como **hub** (similar a webinars).
* Permitir `aggs` de instructores para servicios grupales.
* Evaluar si `hoursAvailable` debe migrarse a `duration` según el tipo de servicio.
* Añadir validación automática en CI (schema validator offline).

---

### **Fin del documento.**
