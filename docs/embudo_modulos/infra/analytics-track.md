Archivo: `docs/embudo_modulos/infra/analytics-track.md`

## 🧩 `lib/analytics/track.ts`

**Ruta:** `/lib/analytics/track.ts`
**Versión:** v1.0.0
**Tipo:** `utility`
**Autor:** Solution Owner — Huerta Consulting

### 1) Propósito

Capa única de tracking con antirrebote. No-op por defecto (`ENABLED=false`).

### 2) Cuándo utilizarlo

* Disparar eventos estándar desde UI o server actions.
* Cuando GTM esté configurado.

### 3) Entradas y salidas

| Tipo        | Nombre                           | Descripción      |             |                |        |
| ----------- | -------------------------------- | ---------------- | ----------- | -------------- | ------ |
| **Entrada** | `name: 'featured_view'           | 'hub_view'       | 'cta_click' | 'select_item'` | Evento |
| **Entrada** | `payload: EventPayload`          | Datos del evento |             |                |        |
| **Entrada** | `opts?: { debounceMs?: number }` | Antirrebote      |             |                |        |
| **Salida**  | `void`                           | Sin retorno      |             |                |        |

### 4) Ejemplo de uso

```ts
import { track } from '@/lib/analytics/track';
track('featured_view', { placement: 'home_featured', sku: 'abc' });
```

### 5) Dependencias

| Módulo | Tipo | Propósito                                       |
| ------ | ---- | ----------------------------------------------- |
| —      | —    | Autocontenida. Usa `window.dataLayer` si existe |

### 6) Consideraciones técnicas

* No rompe SSR. Chequea `typeof window`.
* Clave de antirrebote por nombre y subset de payload.

### 7) Estructura interna

* Estado `lastEventAt`.
* Emisor `emitToDataLayer`.
* API pública `track`.

### 8) Relaciones

* Usable en Home, Hub, Sales.
* No requiere DTOs.

### 9) Errores y validaciones

* No lanza. Si `dataLayer` no existe, no hace nada.

### 10) Historial

| Versión | Fecha      | Cambio   | Responsable    |
| ------- | ---------- | -------- | -------------- |
| 1.0.0   | 2025-10-22 | Creación | Solution Owner |

---