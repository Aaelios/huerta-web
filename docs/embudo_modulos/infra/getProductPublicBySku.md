
---

## 🧩 `lib/data/getProductPublicBySku.ts`

**Ruta:** `/lib/data/getProductPublicBySku.ts`
**Versión:** v1.0.0
**Tipo:** `fetcher`
**Autor:** Solution Owner — Huerta Consulting

### 1) Propósito

Leer un producto público por `sku` desde `v_products_public` y resolver `page_slug` (vía `products.page_slug` o metadata). Entrega un shape mínimo para mapeadores.

### 2) Cuándo utilizarlo

* Necesitas datos base de un producto antes de precios/instancias.
* Server-only (RSC, actions, otros fetchers). No UI, no endpoints.

### 3) Entradas y salidas

| Tipo        | Nombre                  | Descripción                                                                         |
| ----------- | ----------------------- | ----------------------------------------------------------------------------------- |
| **Entrada** | `sku: string`           | Identificador único del producto                                                    |
| **Salida**  | `ProductPublic \| null` | `{ sku, name, description, metadata, product_type, status, visibility, page_slug }` |

### 4) Ejemplo de uso

```ts
import { getProductPublicBySku } from '@/lib/data/getProductPublicBySku';

const row = await getProductPublicBySku('liveclass-demo');
if (row) {
  // pasar a mapper o a otros fetchers
}
```

### 5) Dependencias

| Módulo / Fuente       | Tipo  | Propósito                                       |
| --------------------- | ----- | ----------------------------------------------- |
| `v_products_public`   | Vista | Datos públicos del producto                     |
| `products.page_slug`  | Tabla | Resolver slug canónico si la vista no lo expone |
| `/lib/dto/catalog.ts` | DTO   | Tipos auxiliares (FulfillmentType, etc.)        |

### 6) Consideraciones técnicas

* Server-only con import dinámico del cliente Supabase.
* No usa `any` (ESLint estricto). Usa `unknown` + narrowing.
* Fallback de `page_slug`: `metadata.product_slug` → ruta por `fulfillment_type`.
* No lanza; devuelve `null` en error.

### 7) Estructura interna

* Bloque B: cliente Supabase tolerante.
* Bloque C: helpers (`toStringOrNull`, `fallbackSlugByMeta`).
* Bloque D: query principal vista + lookup opcional en `products`.

### 8) Relaciones

* Usado por: `getFeatured`, `searchPublicProducts` (futuro).
* Complementa: `getPriceBySku`, `getInstancesSummaryBySku`.
* Consumido luego por `mapSupabaseToFeaturedDTO`.

### 9) Errores y validaciones

* Si el `sku` no existe o hay error: retorna `null`.
* `page_slug` siempre definido o `null`; nunca se inventa URL externa.

### 10) Historial de cambios

| Versión | Fecha      | Cambio           | Responsable    |
| ------- | ---------- | ---------------- | -------------- |
| 1.0.0   | 2025-10-22 | Creación inicial | Solution Owner |


