
---

## 🧩 `lib/data/getInstancesSummaryBySku.ts`

**Ruta:** `/lib/data/getInstancesSummaryBySku.ts`
**Versión:** v1.0.0
**Tipo:** `fetcher`
**Autor:** Solution Owner — Huerta Consulting

### 1) Propósito

Obtener resumen de instancias futuras para un SKU de **live_class** vía RPC `f_webinars_resumen`. Entrega próxima fecha, slug de la siguiente instancia y conteo de futuras.

### 2) Cuándo utilizarlo

* Enriquecer DTOs con “siguiente fecha” antes de Home/Hub/Sales.
* Calcular estados “próximamente” sin tocar UI.
* Server-only. No UI. No endpoints.

### 3) Entradas y salidas

| Tipo        | Nombre            | Descripción                                                                                                    |
| ----------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| **Entrada** | `sku: string`     | Identificador del producto                                                                                     |
| **Entrada** | `max = 5`         | Límite superior de instancias a considerar                                                                     |
| **Salida**  | `InstanceSummary` | `{ next_start_at: IsoUtcString \| null, next_instance_slug: string \| null, instance_count_upcoming: number }` |

### 4) Ejemplo de uso

```ts
import { getInstancesSummaryBySku } from '@/lib/data/getInstancesSummaryBySku';

const s = await getInstancesSummaryBySku('liveclass-demo', 5);
// s.next_start_at -> '2025-11-05T18:00:00.000Z'
// s.next_instance_slug -> '2025-11-05-1800'
// s.instance_count_upcoming -> 3
```

### 5) Dependencias

| Módulo / Fuente                             | Tipo    | Propósito                     |
| ------------------------------------------- | ------- | ----------------------------- |
| `f_webinars_resumen(p_sku text, p_max int)` | RPC     | Resumen de instancias por SKU |
| `/lib/dto/catalog.ts`                       | DTO     | Tipo `IsoUtcString`           |
| `/lib/data/getProductPublicBySku.ts`        | Fetcher | Suelen llamarse juntos        |

### 6) Consideraciones técnicas

* Server-only con import dinámico del cliente `.rpc`.
* ESLint estricto: sin `any`; usar `unknown` + *narrowing*.
* Devuelve `null`/`0` en error o ausencia de datos.
* No asume estructura interna de la RPC: hace *narrowing* defensivo (`next_instance`, `future_instances`).

### 7) Estructura interna

* Bloque A: tipos públicos (`InstanceSummary`).
* Bloque B: resolución segura de cliente Supabase.
* Bloque C: coerciones (`toStringOrNull`, `toIsoUtcOrNull`, `toIntOrZero`).
* Bloque D: wrapper de la RPC y normalización del resultado.

### 8) Relaciones

* Consumido por: `/lib/data/getFeatured.ts`.
* Complementa: `getPriceBySku` y `getProductPublicBySku`.
* Indirecto en Home, Hub y Sales.

### 9) Errores y validaciones

* Sin throws. Retorna `{ next_start_at:null, next_instance_slug:null, instance_count_upcoming:0 }` en fallos.
* Normaliza fechas a ISO-UTC para consistencia.

### 10) Historial de cambios

| Versión | Fecha      | Cambio           | Responsable    |
| ------- | ---------- | ---------------- | -------------- |
| 1.0.0   | 2025-10-22 | Creación inicial | Solution Owner |
