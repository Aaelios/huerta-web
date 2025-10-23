Archivo: `docs/embudo_modulos/infra/format.md`

## 🧩 `lib/format.ts`

**Ruta:** `/lib/format.ts`
**Versión:** v1.0.0
**Tipo:** `utility`
**Autor:** Solution Owner — Huerta Consulting

### 1) Propósito

Funciones puras de formato: `formatPriceMXN` y `resolveNextStartAt`.

### 2) Cuándo utilizarlo

* Presentación de precios MXN.
* Determinar label de fecha próxima con fallback “Próximamente”.

### 3) Entradas y salidas

| Función              | Entradas                                           | Salida                                           |
| -------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `formatPriceMXN`     | `cents: number \| null \| undefined`               | `string`                                         |
| `resolveNextStartAt` | `iso?: IsoUtcString`, `{ fallbackLabel?: string }` | `{ value: IsoUtcString \| null, label: string }` |

### 4) Ejemplo de uso

```ts
import { formatPriceMXN, resolveNextStartAt } from '@/lib/format';
const price = formatPriceMXN(12900);
const { value, label } = resolveNextStartAt(dto.next_start_at);
```

### 5) Dependencias

| Módulo                | Tipo | Propósito      |
| --------------------- | ---- | -------------- |
| `/lib/dto/catalog.ts` | DTO  | `IsoUtcString` |

### 6) Consideraciones técnicas

* Sin `Intl` se hace fallback simple.
* `resolveNextStartAt` separa dato (`value`) de presentación (`label`).

### 7) Estructura interna

* Bloque A: `formatPriceMXN`.
* Bloque B: `resolveNextStartAt`.

### 8) Relaciones

* Usado por componentes y fetchers.
* No hace I/O.

### 9) Errores y validaciones

* Entradas inválidas → `''` o `{ value:null, label:'Próximamente' }`.

### 10) Historial

| Versión | Fecha      | Cambio   | Responsable    |
| ------- | ---------- | -------- | -------------- |
| 1.0.0   | 2025-10-22 | Creación | Solution Owner |
