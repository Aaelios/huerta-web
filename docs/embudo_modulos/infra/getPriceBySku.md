
---

## 🧩 `lib/data/getPriceBySku.ts`

**Ruta:** `/lib/data/getPriceBySku.ts`
**Versión:** v1.0.0
**Tipo:** `fetcher`
**Autor:** Solution Owner — Huerta Consulting

### 1) Propósito

Obtener el **precio vigente** de un SKU en una moneda dada usando la RPC `f_catalog_price_by_sku`. Devuelve montos en **centavos** para consumo consistente en mapeadores y UI.

### 2) Cuándo utilizarlo

* Antes de renderizar precios en Home, Hub o Sales.
* Para enriquecer DTOs a partir de datos del catálogo.
* Server-only. No UI. No endpoints.

### 3) Entradas y salidas

| Tipo        | Nombre                             | Descripción                                                                                                  |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Entrada** | `sku: string`                      | Identificador del producto                                                                                   |
| **Entrada** | `currency: 'MXN' \| 'USD' = 'MXN'` | Moneda objetivo                                                                                              |
| **Salida**  | `PriceResult`                      | `{ price_cents: number \| null, currency: 'MXN' \| 'USD' \| null, compare_at_total_cents?: number \| null }` |

### 4) Ejemplo de uso

```ts
import { getPriceBySku } from '@/lib/data/getPriceBySku';

const price = await getPriceBySku('bundle-pro', 'MXN');
// price.price_cents -> 14900, price.currency -> 'MXN'
```

### 5) Dependencias

| Módulo / Fuente                      | Tipo    | Propósito                                    |
| ------------------------------------ | ------- | -------------------------------------------- |
| `f_catalog_price_by_sku`             | RPC     | Precio vigente por SKU y moneda              |
| `/lib/dto/catalog.ts`                | DTO     | Convención de centavos y monedas             |
| `/lib/data/getProductPublicBySku.ts` | Fetcher | Opcional: suele llamarse junto a este módulo |

### 6) Consideraciones técnicas

* Server-only con import dinámico del cliente Supabase.
* ESLint estricto: sin `any`; usa `unknown` + *narrowing*.
* Retorna `null` en campos cuando la RPC no responde o no hay precio.
* `compare_at_total_cents` es opcional y solo aplica en bundles.

### 7) Estructura interna

* Bloque A: resolución segura del cliente `.rpc`.
* Bloque B: coerciones (`toNumberOrNull`, `toCurrencyOrNull`).
* Bloque C: wrapper de la RPC con shape estable.

### 8) Relaciones

* Consumido por: `/lib/data/getFeatured.ts`.
* Complementa: `/lib/data/getInstancesSummaryBySku.ts` y `getProductPublicBySku.ts`.
* Sus salidas alimentan `mapSupabaseToFeaturedDTO`.

### 9) Errores y validaciones

* Si el cliente o la RPC falla, devuelve `{ price_cents: null, currency: null }`.
* Nunca lanza excepción hacia arriba. Idóneo para RSC.

### 10) Historial de cambios

| Versión | Fecha      | Cambio           | Responsable    |
| ------- | ---------- | ---------------- | -------------- |
| 1.0.0   | 2025-10-22 | Creación inicial | Solution Owner |

