
````md
# Schemas para Webinars · LOBRÁ  
Bloques 02C (Event) y 02D (Product)

Documento de referencia para la construcción de los nodos **Event** y **Product**  
en las páginas de webinars:

- `/webinars/w-[slug]`

Usando:

- `Webinar` (`lib/types/webinars.ts`)
- Builders dedicados:
  - `buildEventSchemaFromWebinar.ts`
  - `buildProductSchemaFromWebinar.ts`
- Infraestructura global:
  - `docs/seo/arquitectura_seo_tecnico.md`
  - `docs/seo/schemas_infraestructura.md`
  - `docs/seo/schemas_globales.md`

Este documento cubre **Event** y **Product**.  
Otros nodos (FAQ, Person, etc.) se documentan en sus propios bloques.

---

# 0) Objetivo

Definir cómo construir los nodos:

- **Event** (si el webinar tiene fecha vigente)
- **Product** (si el webinar está en catálogo)

Ambos nodos se agregan al `@graph` de la página mediante la infraestructura global.

---

# 1) Fuente de datos

Ambos builders reciben el contrato completo:

- `Webinar`  
- Proveniente hoy de `data/webinars.jsonc` (futuro: Supabase)

---

# 2) Tipo mínimo común: `SchemaWebinarInput`

Ambos builders usan el mismo enfoque:

```ts
interface SchemaWebinarInput {
  slug: string;
  seoTitle: string;
  seoDescription: string;
  seoCanonical: string;
  startAt: string;
  durationMin?: number;
}
````

Reglas de origen:

* `seoTitle` ← `sales.seo.title` → fallback: `shared.title`
* `seoDescription` ← `sales.seo.description` → fallback vacío
* `seoCanonical` ← `sales.seo.canonical`
* `startAt` ← `shared.startAt`
* `durationMin` ← `shared.durationMin`

---

# 3) Descripción compartida (`resolveDescription`)

Ambos schemas (Event y Product) usan la misma prioridad:

1. `sales.seo.description`
2. `shared.subtitle`
3. `sales.hero.subtitle`
4. `seoTitle` (último recurso)

Motivo:
Evitar depender de textos emocionales y mantener estabilidad SEO.

---

# 4) Schema **Event** · Bloque 02C

Solo existe si el webinar es **temporalmente relevante**.

## 4.1) Cuándo existe

`Event` se genera **solo si**:

* El webinar tiene una fecha futura o está en progreso.
* Evaluado por `isEventStillRelevant(startAt, endDate, now)`:

  * Con endDate: `now <= endDate`
  * Sin endDate: `now <= startAt`

Si no cumple → `Event = null`.

## 4.2) Forma final

```json
{
  "@type": "Event",
  "name": "...",
  "description": "...",
  "startDate": "...",
  "endDate": "...?",
  "eventStatus": "EventScheduled | EventInProgress",
  "eventAttendanceMode": "OnlineEventAttendanceMode",
  "location": {
    "@type": "VirtualLocation",
    "url": "https://lobra.net/webinars/w-[slug]"
  },
  "organizer": {
    "@id": "https://lobra.net/#organization"
  }
}
```

## 4.3) Reglas clave

* `startDate` = `shared.startAt`
* `endDate` = `startAt + durationMin` (UTC)
* `eventStatus`:

  * Antes del inicio → `EventScheduled`
  * En progreso → `EventInProgress`

No representamos:

* `canceled`
* `rescheduled`
* `postponed`

Si el evento terminó → simplemente no se genera.

---

# 5) Schema **Product** · Bloque 02D

El Product **siempre se genera mientras el webinar esté en catálogo**,
incluso si el Event ya no existe.

## 5.1) Cuándo existe el Product

Se considera “en catálogo” si:

* Existe `sales.seo.canonical`
* Existe `shared.pricing` con:

  * `amountCents > 0`
  * `currency` no vacío

Si falla algo → `Product = null`.

## 5.2) Forma final

```json
{
  "@type": "Product",
  "name": "...",
  "description": "...",
  "sku": "...",
  "offers": {
    "@type": "Offer",
    "price": "690",
    "priceCurrency": "MXN",
    "availability": "https://schema.org/InStock | PreOrder",
    "url": "https://lobra.net/webinars/w-[slug]"
  }
}
```

## 5.3) Reglas de `name` y `description`

Usan exactamente la misma lógica que Event.

* `name` = `seoTitle`
* `description` = `resolveDescription(...)`

## 5.4) Regla de `sku`

Prioridad:

1. `shared.pricing.sku`
2. `shared.sku`

## 5.5) Regla de precio

* `price = amountCents / 100`
  Ejemplo: `69000 → "690"`
* `priceCurrency = shared.pricing.currency`
  Fallback: `"MXN"`

## 5.6) Regla de disponibilidad

Basado en fecha:

* Si el webinar tiene fecha futura → `"https://schema.org/InStock"`
* Si ya pasó / sin fecha → `"https://schema.org/PreOrder"`

No usamos:

* SoldOut
* LimitedAvailability

## 5.7) Regla de `offers.url`

Siempre:

`offers.url = sales.seo.canonical`

Nunca:

* prelobby
* zoom
* checkout

## 5.8) `priceValidUntil`

**No se incluye.**
Solo aplicará cuando haya promociones reales o pricing dinámico.

---

# 6) Cómo interactúan Event y Product

Casos:

1. Webinar con próxima fecha

* **Event = sí**
* **Product = sí (InStock)**

2. Webinar ya pasado pero se vende on-demand

* **Event = no**
* **Product = sí (PreOrder)**

3. Webinar sin pricing o sin canonical

* **Event = depende de fecha**
* **Product = no**

---

# 7) Integración con la infraestructura global

Ambos builders devuelven:

* Objeto válido → se agrega al `@graph`
* `null` → no se agrega nada

El `@context` y wrapper `<script>` viven en Bloque 02A/02B.

---

# 8) Consideraciones futuras (Supabase)

Cuando el origen sea Supabase:

* Product se genera si `products.status ∈ ['active', 'sunsetting']`
* No se genera si `status ∈ ['planned', 'discontinued']`
* Precio puede estar condicionado por `product_prices.valid_until`

Estos puntos ya están considerados pero **no implementados** en 02D.

---

# 9) Checklist de calidad SEO

* Canonical válido
* name / description consistentes
* Precio numérico sin formateo de moneda
* Availability coherente
* Sin duplicar `Organization` ni `Website`
* JSON-LD siempre dentro del `@graph`
* Sin inventar fechas o estados

---

