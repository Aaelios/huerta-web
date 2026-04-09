# CT-02.02 — Diseño Final de Capa de Composición de Producto (MVP)

## 1. Objetivo

Construir una capa única de composición que permita generar el `Webinar` actual sin romper la app, separando:

ProductOperationalData (Supabase)

* ProductEditorialData (JSON temporal)
  → ProductComposite
  → Webinar

---

## 2. Decisiones cerradas

* Supabase = fuente operativa
* JSON = fuente editorial temporal
* Existe un único punto de composición
* `Webinar` no cambia
* No se introduce abstracción adicional fuera de MVP

---

## 3. loadWebinars (decisión explícita)

```text
loadWebinars NO evoluciona
loadWebinars queda como reader legacy
```

### Estado:

* Se mantiene sin cambios
* Sigue leyendo JSON
* NO participa en composición nueva

### Uso:

* Solo para rollback o compatibilidad legacy
* No debe ser usado en nuevos helpers

---

## 4. Nuevo punto único de composición

### Nombre definido:

```text
f_composeWebinar
```

### Responsabilidad única:

```text
ProductOperationalData + ProductEditorialData → Webinar
```

### Reglas:

* Es el único lugar donde ocurre composición
* Ningún helper puede transformar datos
* Ningún helper puede mezclar fuentes

---

## 5. Modelo de datos

### 5.1 ProductOperationalData (Supabase)

Incluye:

* page_slug
* sku
* title
* product_type
* fulfillment_type
* estado
* pricing:

  * stripe_price_id
  * amount_cents
  * currency
  * valid_from
  * valid_until

### Importante:

```text
NO incluye:
- startAt
- durationMin
- zoomJoinUrl
```

Estos quedan fuera del contrato operativo base.

---

### 5.2 ProductEditorialData (JSON)

Incluye:

* sales
* prelobby
* checkout
* assets y copy

Y temporalmente:

* startAt
* durationMin
* zoomJoinUrl
* flags
* template
* calendar
* supportEmail

---

### 5.3 Regla explícita

```text
Campos de instancia NO son operativos
Se inyectan desde editorial de forma temporal
```

---

## 6. Mapping final a Webinar

### shared (composición)

Operativo (prioridad absoluta):

* slug ← Supabase.page_slug
* sku ← Supabase.sku
* title ← Supabase.title
* pricing ← Supabase.pricing

Editorial (temporal):

* startAt
* durationMin
* zoomJoinUrl
* flags
* template
* calendar
* supportEmail

---

### sales / prelobby / checkout

```text
100% JSON
```

---

## 7. Helpers (definición final)

### 7.1 getWebinar

```text
slug
→ fetch ProductOperationalData (Supabase)
→ fetch ProductEditorialData (JSON)
→ f_composeWebinar
→ Webinar
```

---

### 7.2 getWebinarBySku

```text
sku
→ fetch ProductOperationalData (Supabase)
→ resolver page_slug
→ fetch JSON por slug
→ f_composeWebinar
→ Webinar
```

---

### Comportamiento obligatorio

Caso 1 — SKU existe pero no hay slug válido:

```text
ERROR explícito
No fallback
```

Caso 2 — slug existe pero no hay JSON editorial:

```text
ERROR explícito
No se construye Webinar incompleto
```

No hay silent fallback.

---

## 8. FREE (definición explícita)

FREE cumple:

```text
amount_cents = 0
stripe_price_id = null
```

Composición:

* pasa por f_composeWebinar igual que cualquier producto
* no cambia flujo de helpers
* no requiere lógica especial en composición

Checkout:

* se resuelve fuera de esta capa

---

## 9. Flujo final

```text
slug / sku
→ Supabase (operativo)
→ JSON (editorial)
→ f_composeWebinar
→ Webinar
→ UI
```

---

## 10. Riesgos y control

### R1 — Supabase incompleto

Acción:

* error explícito
* no fallback a JSON para campos operativos

---

### R2 — JSON incompleto

Acción:

* error explícito
* no render parcial

---

### R3 — mezcla indebida en helpers

Acción:

* prohibido por diseño
* solo composer puede unir fuentes

---

## 11. Rollback real

Rollback definido:

1. Revertir uso de:

   * getWebinar nuevo
   * getWebinarBySku nuevo

2. Volver a:

```text
loadWebinars + JSON-only
```

3. Restaurar imports previos en UI

No se introduce feature flag nuevo.

---

## 12. Definición final

```text
f_composeWebinar es la única capa de composición
Webinar es el único output en MVP
```

Base preparada para crecimiento sin rehacer helpers.

---

## 13. Estado

## CT-02.02 listo para implementación.

Anexo CT-02.02 — Estructura de archivos para implementación (versión final)

Ubicación aprobada:
- /lib/webinars

Archivo nuevo:
- /lib/webinars/f_composeWebinar.ts

Responsabilidad:
- único punto de composición del sistema
- recibe:
  ProductOperationalData (Supabase)
  ProductEditorialData (JSON)
- retorna:
  Webinar (view model actual)

Restricciones:
- no hace fetch
- no hace lookup
- no cachea
- no resuelve rutas
- no contiene lógica de fallback operativo
- no depende de otros helpers de composición

Función exportada:
- f_composeWebinar

---

Responsabilidad de archivos existentes:

1. /lib/webinars/loadWebinars.ts
- se conserva como reader legacy JSON-only
- NO participa en la nueva composición
- sirve como fallback manual en rollback

---

2. /lib/webinars/load.ts
- deja de ser loader de datos completo
- se convierte en wrapper consumidor por slug

Flujo:
slug
→ fetch Supabase (ProductOperationalData)
→ fetch JSON (ProductEditorialData)
→ f_composeWebinar
→ retorna Webinar

Restricción:
- no puede componer
- no puede mezclar fuentes

---

3. /lib/webinars/getWebinarBySku.ts
- se mantiene como wrapper consumidor por sku

Flujo:
sku
→ fetch Supabase (ProductOperationalData)
→ resolver page_slug
→ fetch JSON (ProductEditorialData)
→ f_composeWebinar
→ retorna Webinar

Comportamientos obligatorios:

- si no hay page_slug válido:
  → error explícito

- si no hay JSON editorial:
  → error explícito

- no hay fallback silencioso

---

Reglas globales de implementación:

- solo f_composeWebinar puede unir fuentes
- ningún helper puede reconstruir Webinar
- Supabase siempre tiene prioridad sobre JSON en campos operativos
- JSON no puede definir pricing ni identidad

---

Impacto esperado:

- se agrega 1 archivo nuevo
- se modifican:
  - load.ts
  - getWebinarBySku.ts
- loadWebinars.ts permanece intacto

---

Rollback real:

1. revertir cambios en:
   - load.ts
   - getWebinarBySku.ts

2. volver a flujo:
   loadWebinars → JSON-only

3. restaurar imports previos en consumidores

No se introduce feature flag nuevo.

---

Estado:

CT-02.02 listo para implementación con convención alineada.