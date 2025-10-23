
## 🧩 `lib/data/getFeatured.ts`

**Ruta:** `/lib/data/getFeatured.ts`
**Versión:** v1.0.0
**Tipo:** `fetcher/orchestrator`
**Autor:** Solution Owner — Huerta Consulting

### 1) Propósito

Orquestar el “destacado” de Home a partir de Supabase y, si falla, JSONC. Devuelve `FeaturedDTO`.

### 2) Cuándo utilizarlo

* Para obtener un único ítem destacado reutilizable por Home, Hub y Sales.
* Server-only. No UI, no endpoints.

### 3) Entradas y salidas

| Tipo       | Nombre                | Descripción                |
| ---------- | --------------------- | -------------------------- |
| —          | —                     | Sin parámetros             |
| **Salida** | `FeaturedDTO \| null` | Ítem destacado normalizado |

### 4) Ejemplo de uso

```ts
import { getFeatured } from '@/lib/data/getFeatured';

const featured = await getFeatured();
```

### 5) Dependencias

| Módulo / Fuente                         | Tipo    | Propósito                                           |
| --------------------------------------- | ------- | --------------------------------------------------- |
| `v_products_public`                     | Vista   | Filtrar `metadata.is_featured = true`               |
| `f_catalog_price_by_sku`                | RPC     | Precio vigente en centavos                          |
| `f_webinars_resumen`                    | RPC     | Próxima instancia (live_class)                      |
| `/lib/data/getProductPublicBySku.ts`    | Fetcher | Datos base del producto                             |
| `/lib/data/getPriceBySku.ts`            | Fetcher | Precio                                              |
| `/lib/data/getInstancesSummaryBySku.ts` | Fetcher | Instancia                                           |
| `/lib/mappers/catalog.ts`               | Mapper  | `mapSupabaseToFeaturedDTO`, `mapJSONCToFeaturedDTO` |
| `/lib/webinars/loadWebinars`            | Loader  | Fallback JSONC                                      |

### 6) Consideraciones técnicas

* Server-only. Import dinámico del cliente Supabase.
* Primero intenta Supabase. Si no hay datos, usa JSONC y revalida por SKU.
* ESLint estricto: sin `any`; *narrowing* defensivo.

### 7) Estructura interna

* Cliente Supabase mínimo.
* `findFeaturedSkuFromSupabase()` para detectar SKU con `is_featured`.
* `assembleFeaturedDTOBySku()` para unir product + price + instance.
* Fallback JSONC seguro.

### 8) Relaciones

* Consumido por Home y reutilizable por Hub/Sales.
* No modifica endpoints ni componentes.

### 9) Errores y validaciones

* Retorna `null` en fallos. No lanza.
* Normaliza fecha a ISO-UTC.

### 10) Historial de cambios

| Versión | Fecha      | Cambio           | Responsable    |
| ------- | ---------- | ---------------- | -------------- |
| 1.0.0   | 2025-10-22 | Creación inicial | Solution Owner |

---