
---

## 🧩 `lib/dto/catalog.ts`

**Ruta:** `/lib/dto/catalog.ts`
**Versión:** v1.0.0
**Tipo:** `dto`
**Autor:** Solution Owner — Huerta Consulting

### 1) Propósito

Contratos canónicos para catálogo: estructuras mínimas y estables que consumen Home Featured, Webinars Hub y Sales Pages. No UI. No I/O.

### 2) Cuándo utilizarlo

* Tipar entradas y salidas de fetchers y mapeadores.
* Estandarizar datos antes de llegar a componentes o páginas.
* Validar que módulos nuevos respeten contratos.

### 3) Entradas y salidas

No expone funciones. Exporta tipos:

| Tipo                                  | Descripción                                                                             |          |               |         |             |
| ------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ------------- | ------- | ----------- |
| `FulfillmentType`                     | `'live_class'                                                                           | 'bundle' | 'one_to_one'` |         |             |
| `InstanceStatus`                      | `'scheduled'                                                                            | 'open'   | 'sold_out'    | 'ended' | 'canceled'` |
| `IsoUtcString`                        | ISO-8601 UTC como `string`                                                              |          |               |         |             |
| `FeaturedDTO`                         | `{ sku, type, title, subtitle, page_slug, price_mxn, compare_at_total, next_start_at }` |          |               |         |             |
| `ProductCardDTO`                      | `{ sku, type, title, badge, next_start_at, price_mxn, page_slug }`                      |          |               |         |             |
| `BundleScheduleDTO`                   | `{ bundle_sku, next_start_at, children[] }`                                             |          |               |         |             |
| `InstanceDTO`                         | `{ instance_id, instance_slug, start_at, status }`                                      |          |               |         |             |
| `CatalogListDTO<T>`                   | Colección tipada para listados                                                          |          |               |         |             |
| `isFulfillmentType`, `isIsoUtcString` | Type guards ligeros                                                                     |          |               |         |             |

### 4) Ejemplo de uso

```ts
import type { FeaturedDTO, FulfillmentType } from '@/lib/dto/catalog';

function renderTitle(item: FeaturedDTO) {
  return `${item.title}`;
}

const t: FulfillmentType = 'live_class';
```

### 5) Dependencias

| Módulo / Fuente | Tipo | Propósito                                      |
| --------------- | ---- | ---------------------------------------------- |
| —               | —    | Archivo autónomo. Sin dependencias de runtime. |

### 6) Consideraciones técnicas

* Solo tipos y funciones puras de tipo. Seguras para RSC.
* Fechas siempre como `IsoUtcString` para evitar serialización `Date`.
* Montos en **centavos MXN** (`number`) o `null`.
* No mezclar con tipos editoriales del JSONC.

### 7) Estructura interna

* Bloque A: tipos base (`FulfillmentType`, `IsoUtcString`, estados).
* Bloque B: DTOs (`FeaturedDTO`, `ProductCardDTO`, `BundleScheduleDTO`, `InstanceDTO`).
* Bloque C: colecciones (`CatalogListDTO`).
* Bloque D: type guards.

### 8) Relaciones

* Consumido por: `/lib/mappers/catalog.ts`, `/lib/data/*`, `/lib/seo/emitJSONLD.ts`, `/lib/analytics/track.ts` (tipado de `type`).
* Indirecto en: Home, Hub, Sales Pages.

### 9) Errores y validaciones

* Sin runtime errors. Guards para validación ligera en mapeadores.
* Si un campo falta, usar `null` en vez de inventar valores.

### 10) Historial de cambios

| Versión | Fecha      | Cambio                         | Responsable    |
| ------- | ---------- | ------------------------------ | -------------- |
| 1.0.0   | 2025-10-22 | Creación inicial (Infra común) | Solution Owner |

---
