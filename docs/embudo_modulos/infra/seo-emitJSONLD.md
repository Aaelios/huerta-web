Archivo: `docs/embudo_modulos/infra/seo-emitJSONLD.md`

## 🧩 `lib/seo/emitJSONLD.ts`

**Ruta:** `/lib/seo/emitJSONLD.ts`
**Versión:** v1.0.0
**Tipo:** `utility`
**Autor:** Solution Owner — Huerta Consulting

### 1) Propósito

Generar JSON-LD válido para `Event` (live_class), `Product` (bundle) y `Service` (one_to_one) desde `FeaturedDTO`.

### 2) Cuándo utilizarlo

* Para SEO estructurado en páginas Server Components.
* Devuelve string JSON; la inyección `<script>` se hace fuera.

### 3) Entradas y salidas

| Tipo        | Nombre             | Descripción                   |
| ----------- | ------------------ | ----------------------------- |
| **Entrada** | `dto: FeaturedDTO` | Origen de datos               |
| **Salida**  | `string`           | JSON-LD serializado y saneado |

### 4) Ejemplo de uso

```ts
import { emitJSONLDFromFeatured } from '@/lib/seo/emitJSONLD';

const jsonld = emitJSONLDFromFeatured(featuredDto);
// <script type="application/ld+json">{jsonld}</script>
```

### 5) Dependencias

| Módulo                | Tipo | Propósito            |
| --------------------- | ---- | -------------------- |
| `/lib/dto/catalog.ts` | DTO  | Tipos y convenciones |

### 6) Consideraciones técnicas

* Server-only. No usa libs externas.
* Sanea `<` y `>` para evitar inyección.

### 7) Estructura interna

* Helpers (`isoOrUndefined`, `centsToAmount`, `safeJSONStringify`).
* Emisores por tipo.
* Fachada `emitJSONLDFromFeatured`.

### 8) Relaciones

* Consumido por páginas que requieren SEO.
* Independiente de GTM.

### 9) Errores y validaciones

* No lanza. Si faltan campos, omite propiedades opcionales.

### 10) Historial

| Versión | Fecha      | Cambio   | Responsable    |
| ------- | ---------- | -------- | -------------- |
| 1.0.0   | 2025-10-22 | Creación | Solution Owner |

---