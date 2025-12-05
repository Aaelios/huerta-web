````md
docs/freeclass/datos_fuente_verdad.md

# LOBRÁ · Clases gratuitas · Fuente de verdad de datos  
Versión: v1.0  
Responsable: Datos / Fuente de Verdad  
Ámbito: Free class “fin-freeintro” (TOF módulo Tranquilidad Financiera)

---

## 0) Objetivo del documento

Definir la **fuente de verdad** de datos para la clase gratuita:

- Producto en `public.products`
- Instancia en `public.live_class_instances`
- Nodo de contenido en `data/views/freeclass_pages.jsonc`
- Loaders de lectura (`lib/freeclass/schema.ts` + `lib/freeclass/load.ts`)
- Protocolo de QA y rollback

Este documento es referencia operativa para:

- Revisar configuración
- Depurar problemas de registro/landing
- Replicar el patrón para nuevas free classes

---

## 1) Producto · `public.products`

### 1.1. Identidad

- `sku`: `liveclass-lobra-rhd-fin-freeintro-v001`
- `product_type`: `digital`
- `fulfillment_type`: `free_class`
- `status`: `active`
- `visibility`: `public`
- `is_subscription`: `false`
- `page_slug`: `clases-gratuitas/fin-freeintro`

Cumple:

- `ck_products_sku_format`
- `products_product_type_check`
- `products_fulfillment_type_check`
- `products_status_check`
- `products_page_slug_format_chk`

### 1.2. Row de referencia (INSERT usado)

Campos relevantes (forma conceptual):

```sql
INSERT INTO public.products (
  sku,
  name,
  description,
  status,
  visibility,
  product_type,
  fulfillment_type,
  is_subscription,
  stripe_product_id,
  tax_code,
  allow_discounts,
  commissionable,
  commission_rate_pct,
  inventory_qty,
  weight_grams,
  available_from,
  available_until,
  metadata,
  page_slug
) VALUES (
  'liveclass-lobra-rhd-fin-freeintro-v001',
  'Clase gratuita · Mapa de claridad financiera para emprendedores',
  'Clase gratuita en vivo de 45 minutos donde ves el mapa completo de tranquilidad financiera: ingresos, egresos, reportes y planeación conectados en un sistema simple.',
  'active',
  'public',
  'digital',
  'free_class',
  false,
  NULL,
  NULL,
  true,
  false,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  '{
    "sku": "liveclass-lobra-rhd-fin-freeintro-v001",
    "cover": "/images/webinars/fin/freeintro-v001/hub.jpg",
    "level": "Fundamentos",
    "topics": ["Finanzas"],
    "module_sku": "course-lobra-rhd-fin-finanzas-v001",
    "instructors": ["Roberto-Huerta"],
    "is_featured": false,
    "purchasable": false,
    "duration_min": 45,
    "fulfillment_type": "free_class"
  }'::jsonb,
  'clases-gratuitas/fin-freeintro'
);
````

### 1.3. Verificación rápida en Supabase

```sql
SELECT sku,
       status,
       product_type,
       fulfillment_type,
       visibility,
       page_slug,
       (metadata->>'duration_min')::int AS duration_min,
       metadata->>'cover'              AS cover
FROM public.products
WHERE sku = 'liveclass-lobra-rhd-fin-freeintro-v001';
```

Resultado esperado:

* Fila única
* `status = 'active'`
* `product_type = 'digital'`
* `fulfillment_type = 'free_class'`
* `page_slug = 'clases-gratuitas/fin-freeintro'`
* `duration_min = 45`
* `cover` no nulo

---

## 2) Instancia · `public.live_class_instances`

### 2.1. Identidad

* `sku`: `liveclass-lobra-rhd-fin-freeintro-v001`
* `instance_slug`: `2025-12-09-1900` (cumple `^\d{4}-\d{2}-\d{2}-\d{4}$`)
* `status`: `open`
* `timezone`: `America/Mexico_City`
* `start_at`: `2025-12-10 01:00:00+00` (equivalente a 2025-12-09 19:00 CDMX)
* `end_at`: `2025-12-10 01:45:00+00`
* `capacity`: `50`
* `seats_sold`: `0`
* `metadata`: `{}`

Cumple:

* `ck_live_class_instances_slug_pattern`
* `ck_live_class_instances_status`
* `ck_live_class_instances_capacity_nonneg`
* `ck_live_class_instances_seats_nonneg`
* `ck_live_class_instances_seats_vs_capacity`

### 2.2. Row de referencia (INSERT usado)

```sql
INSERT INTO public.live_class_instances (
  sku,
  instance_slug,
  status,
  title,
  start_at,
  end_at,
  timezone,
  capacity,
  seats_sold,
  zoom_join_url,
  replay_url,
  metadata
) VALUES (
  'liveclass-lobra-rhd-fin-freeintro-v001',
  '2025-12-09-1900',
  'open',
  NULL,
  '2025-12-10 01:00:00+00',
  '2025-12-10 01:45:00+00',
  'America/Mexico_City',
  50,
  0,
  NULL,
  NULL,
  '{}'::jsonb
);
```

### 2.3. Verificación rápida en Supabase

```sql
SELECT sku,
       instance_slug,
       status,
       start_at,
       end_at,
       timezone,
       capacity,
       seats_sold
FROM public.live_class_instances
WHERE sku = 'liveclass-lobra-rhd-fin-freeintro-v001';
```

Resultado esperado:

* Fila única
* `instance_slug = '2025-12-09-1900'`
* `status = 'open'`
* `capacity = 50`
* `seats_sold = 0`

---

## 3) Contenido · `data/views/freeclass_pages.jsonc`

### 3.1. Clave del mapa y nodo principal

* Archivo: `data/views/freeclass_pages.jsonc`
* Clave del mapa (key):
  `"liveclass-lobra-rhd-fin-freeintro-v001"`
* Campo interno `sku` del nodo:
  `"sku": "liveclass-lobra-rhd-fin-freeintro-v001"`
* `slugLanding`: `"fin-freeintro"`
* `prelobbyRoute`: `null`

Invariante validada en loader:

* **key del mapa = `page.sku`**
* `slugLanding` **único** en todo el archivo.

### 3.2. Campos clave de negocio y contenido

* `hero`

  * `eyebrow`: “Clase gratuita para emprendedores”
  * `title`: `"El [[mapa de claridad financiera]] que nadie te enseñó"`
  * `subtitle`: versión TOF con [[ ]] para énfasis
  * `image.src`: `/images/webinars/fin/freeintro-v001/hub.jpg`
  * `ctaText`: `"Quiero mi mapa de claridad financiera"`
  * `note`: `"Clase online en vivo · 45 minutos · Sin costo"`

* `paraQuien`: 4 bullets coherentes con TOF finanzas

* `queAprenderas`: 4 bullets alineados al mapa 4 piezas (ingresos, egresos, reportes, planeación)

* `queSeLlevan`: 4 bullets de resultado/beneficio

* `autor`

  * `name`: `Roberto Huerta`
  * `role`: “Consultor en claridad financiera para emprendedores”
  * `business`: `LOBRÁ`
  * `imageSrc`: `/images/instructores/rhd/roberto_huerta_horizontal.jpg`
  * `personId`: `"Roberto-Huerta"`

* `comoFunciona`

  * `resumen`: descripción breve de la dinámica
  * `bullets`: registro → correo → clase → cierre

* `testimonios` (2 entradas):

  * Natalia Rodríguez · Dueña · Nat Rodriguez Photo
  * Sofía García · Socia y Directora · Xenda Hybrid Training

* `mensajesEstado`

  * `open`, `full`, `waitlist`, `closed`, `proximamente` → textos listos para mapear `registration_state`/`ui_state`.

* `mensajeConfianza`

* `mensajePostRegistro`

* `mensajeErrorGenerico`

* `integraciones`

  * `brevoListId`: `"PENDIENTE_CONFIGURAR"`
  * `leadContext`: `"free_class"` (validado con Zod `z.literal`)
  * `tagsBrevo`: `["lead_free_class","free_class_fin_freeintro"]`

* `seo`

  * `title`: `"Clase gratuita · Mapa de claridad financiera para emprendedores"`
  * `description`: alineado a promesa de la clase
  * `canonical`: `"https://lobra.net/clases-gratuitas/fin-freeintro"`
  * `ogImage`: `/images/webinars/fin/freeintro-v001/hub.jpg`

---

## 4) Loaders · `lib/freeclass/schema.ts` y `lib/freeclass/load.ts`

### 4.1. Schema Zod · `lib/freeclass/schema.ts`

Responsabilidad:

* Definir el contrato `FreeClassPage` y `FreeClassPageMap`.
* Validar estructura del JSONC en runtime.

Puntos clave:

* `slugLanding` restringido a patrón slug (`^[a-z0-9]+(?:-[a-z0-9]+)*$`).
* `integraciones.leadContext` es exactamente `"free_class"`.
* `seo.canonical` debe ser una URL válida.

Tipos exportados:

* `FreeClassPage`
* `FreeClassPageMap`

### 4.2. Loader de mapa y acceso · `lib/freeclass/load.ts`

Responsabilidad:

* Leer `data/views/freeclass_pages.jsonc`.
* Parsear JSONC.
* Validar contra `FreeClassPageMapSchema`.
* Exponer loaders públicos:

#### `loadFreeClassPagesMap(): Promise<FreeClassPageMap>`

* Lanza error si:

  * El JSONC no cumple el schema.
  * La key del mapa no coincide con `page.sku`.
  * Hay dos nodos con el mismo `slugLanding`.

#### `loadFreeClassPageBySku(sku: string): Promise<FreeClassPage | null>`

* Retorna:

  * `FreeClassPage` si existe
  * `null` si el SKU no existe en el JSONC

#### `loadFreeClassPageBySlug(slugLanding: string): Promise<FreeClassPage | null>`

* Busca por `slugLanding` único.
* Retorna:

  * `FreeClassPage` si encuentra coincidencia única
  * `null` si no encuentra

---

## 5) QA técnico

### 5.1. Validación de constraints y tipos

Ya ejecutado:

* Revisión de `CHECK` en `products` y `live_class_instances`.
* Ajuste de `products_fulfillment_type_check` para incluir `free_class`.
* Confirmación de no nulos y formatos de slug.

Checklist SQL:

```sql
-- 1) Producto existe y es consistente
SELECT sku, status, product_type, fulfillment_type, page_slug
FROM public.products
WHERE sku = 'liveclass-lobra-rhd-fin-freeintro-v001';

-- 2) Instancia existe y respeta patrón de slug y estado
SELECT sku, instance_slug, status, capacity, seats_sold
FROM public.live_class_instances
WHERE sku = 'liveclass-lobra-rhd-fin-freeintro-v001';

-- 3) Cruce producto/instancia
SELECT p.sku AS product_sku,
       i.sku AS instance_sku,
       i.instance_slug,
       i.status
FROM public.products p
LEFT JOIN public.live_class_instances i
  ON p.sku = i.sku
WHERE p.sku = 'liveclass-lobra-rhd-fin-freeintro-v001';
```

### 5.2. Validación de shape JSONC

Cubierta vía:

* `FreeClassPageMapSchema` en `loadFreeClassPagesMap`.
* Errores de estructura lanzan `Error` con detalle de campos rotos.

### 5.3. Validación de loaders con fixtures

Ruta de diagnóstico creada:

* `app/api/dev/freeclass-test/route.ts`

Ejecuta:

* `loadFreeClassPageBySku("liveclass-lobra-rhd-fin-freeintro-v001")`
* `loadFreeClassPageBySlug("fin-freeintro")`

Respuesta obtenida (ya validada):

* `hasBySku = true`
* `hasBySlug = true`
* `skuMatches = true`
* Ambos nodos (`bySku`, `bySlug`) contienen el mismo contenido de `FreeClassPage`.

Esta ruta puede eliminarse o protegerse en producción; su único propósito es QA.

---

## 6) Rollback

### 6.1. Rollback de datos (producto + instancia)

Para eliminar solo la free class `fin-freeintro`:

```sql
-- 1) Eliminar instancia(s) asociadas
DELETE FROM public.live_class_instances
WHERE sku = 'liveclass-lobra-rhd-fin-freeintro-v001';

-- 2) Eliminar producto
DELETE FROM public.products
WHERE sku = 'liveclass-lobra-rhd-fin-freeintro-v001';
```

### 6.2. Rollback de contenido JSONC

Editar `data/views/freeclass_pages.jsonc` y:

* Eliminar la entrada:

  * `"liveclass-lobra-rhd-fin-freeintro-v001": { ... }`
* O revertir el archivo completo desde Git.

Luego:

```bash
npm run lint
npm run build
```

Para confirmar que no hay referencias colgando.

### 6.3. Rollback de constraint `fulfillment_type` (si se requiriera)

Si en algún momento se quisiera **remover** `free_class` de los tipos válidos:

```sql
ALTER TABLE public.products
  DROP CONSTRAINT products_fulfillment_type_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_fulfillment_type_check
  CHECK (
    fulfillment_type = ANY (
      ARRAY[
        'course'::text,
        'template'::text,
        'live_class'::text,
        'one_to_one'::text,
        'subscription_grant'::text,
        'bundle'::text
      ]
    )
  );
```

Nota: esto dejaría cualquier fila existente con `fulfillment_type = 'free_class'` en estado inconsistente. Solo aplicar si ya se borraron los productos correspondientes o si se va a migrar su valor.

### 6.4. Rollback de código (si se requiriera)

* Eliminar archivos:

  * `lib/freeclass/schema.ts`
  * `lib/freeclass/load.ts`
  * `app/api/dev/freeclass-test/route.ts`
* Revertir cambios vía Git para garantizar limpieza.

---

## 7) Resumen de fuente de verdad para “fin-freeintro”

* **Producto**

  * `public.products.sku = 'liveclass-lobra-rhd-fin-freeintro-v001'`
  * Define tipo (`digital`, `free_class`), página (`clases-gratuitas/fin-freeintro`) y metadata técnica.

* **Instancia**

  * `public.live_class_instances.sku = 'liveclass-lobra-rhd-fin-freeintro-v001'`
  * Define fecha/hora, capacidad, estado operativo.

* **Contenido landing**

  * `data/views/freeclass_pages.jsonc["liveclass-lobra-rhd-fin-freeintro-v001"]`
  * Define hero, bullets, autor, testimonios, mensajes de estado, integraciones, SEO.

* **Loaders**

  * `lib/freeclass/schema.ts` + `lib/freeclass/load.ts`
  * Garantizan shape y unicidad de `slugLanding` y `sku`.

Con esto, el sistema tiene una fuente de verdad coherente y validada para la landing `/clases-gratuitas/fin-freeintro`, reutilizable como patrón para futuras clases gratuitas.

```
```
