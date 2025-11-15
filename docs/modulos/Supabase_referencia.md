Respuesta corta: ya tengo todo lo necesario para definir los tipos fuertes y pasar después al loader de módulo sin `any`.

A continuación va el documento consolidado.

---

## 1. RPCs

### 1.1 `public.f_bundles_expand_items`

**Firma SQL resumida**

```sql
f_bundles_expand_items(p_bundle_sku text)
RETURNS TABLE (
  sku text,
  fulfillment_type text
)
LANGUAGE plpgsql
STRICT
SECURITY DEFINER
```

**Lógica clave**

* Valida que `p_bundle_sku` no sea vacío.
* Verifica que exista en `products.sku` y que `products.fulfillment_type = 'bundle'` (en minúsculas).
* Verifica que existan hijos en `bundle_items` (`bundle_sku = p_bundle_sku`).
* Devuelve hijos de `bundle_items` + `products` filtrando:

  * `lower(p.status) IN ('active','sunsetting')`
  * `lower(p.fulfillment_type) IN ('course','template','live_class','one_to_one','subscription_grant')`
* No soporta bundles anidados.

**Input TS**

* Parámetros:

  * `p_bundle_sku text` obligatorio.

```ts
type FBundlesExpandItemsInput = {
  bundleSku: string; // mapea a p_bundle_sku
};
```

**Output TS**

* `RETURNS TABLE(sku text, fulfillment_type text)`.
* Por constraints de `products_fulfillment_type_check`, `fulfillment_type` puede ser:

  * `'course' | 'template' | 'live_class' | 'one_to_one' | 'subscription_grant'`.

```ts
type FBundlesExpandItemsRow = {
  sku: string;
  fulfillmentType:
    | 'course'
    | 'template'
    | 'live_class'
    | 'one_to_one'
    | 'subscription_grant';
};

type FBundlesExpandItemsOutput = FBundlesExpandItemsRow[];
```

---

### 1.2 `public.f_bundle_schedule`

**Firma SQL resumida**

```sql
f_bundle_schedule(bundle_sku text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
```

**Lógica clave**

* CTE `children`: hijos del bundle desde `bundle_items` por `bundle_sku`.
* CTE `nexts`: para cada hijo, calcula `min(lci.start_at)` filtrando:

  * `lci.status IN ('scheduled','open')`
  * `lci.start_at > now()`
  * JOIN a `live_class_instances` por `lci.sku = c.child_sku`.
* CTE `agg`: `min(n.next_start_at)` (la fecha de inicio más cercana del bundle).
* CTE `children_json`: `jsonb_agg` de objetos `{ child_sku, next_start_at }`, ordenados por `child_sku`.
* Resultado final:

```json
{
  "bundle_sku": "<bundle_sku>",
  "next_start_at": "<timestamp or null>",
  "children": [
    { "child_sku": "<sku>", "next_start_at": "<timestamp or null>" },
    ...
  ]
}
```

* `next_start_at` puede ser `null` tanto a nivel bundle como en cada hijo.

**Input TS**

```ts
type FBundleScheduleInput = {
  bundleSku: string; // mapea a bundle_sku
};
```

**Output TS**

```ts
type BundleScheduleChild = {
  childSku: string; // JSON: child_sku
  nextStartAt: string | null; // ISO timestamptz o null (jsonb puede ser null)
};

type BundleSchedule = {
  bundleSku: string; // JSON: bundle_sku
  nextStartAt: string | null; // ISO timestamptz o null
  children: BundleScheduleChild[];
};

type FBundleScheduleOutput = BundleSchedule;
```

---

### 1.3 `public.f_bundle_children_next_start`

**Firma SQL resumida**

```sql
f_bundle_children_next_start(bundle_sku text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
```

**Lógica clave**

```sql
select coalesce(
  f_bundle_schedule(f_bundle_children_next_start.bundle_sku)->'children',
  '[]'::jsonb
);
```

* Devuelve exclusivamente el campo `children` del JSON de `f_bundle_schedule`, o `[]` si no hubiera.

**Input TS**

```ts
type FBundleChildrenNextStartInput = {
  bundleSku: string;
};
```

**Output TS**

* Semánticamente es un arreglo de `BundleScheduleChild`.

```ts
type FBundleChildrenNextStartOutput = BundleScheduleChild[]; // ver tipo compartido arriba
```

---

### 1.4 `public.f_bundle_next_start_at`

**Firma SQL resumida**

```sql
f_bundle_next_start_at(bundle_sku text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
```

**Lógica clave**

```sql
select jsonb_build_object(
  'bundle_sku', f_bundle_next_start_at.bundle_sku,
  'next_start_at', f_bundle_schedule(f_bundle_next_start_at.bundle_sku)->'next_start_at'
);
```

* Devuelve un JSON plano con:

  * `bundle_sku`
  * `next_start_at` del JSON de `f_bundle_schedule`.

**Input TS**

```ts
type FBundleNextStartAtInput = {
  bundleSku: string;
};
```

**Output TS**

```ts
type BundleNextStartAt = {
  bundleSku: string; // JSON: bundle_sku
  nextStartAt: string | null; // JSON: next_start_at
};

type FBundleNextStartAtOutput = BundleNextStartAt;
```

---

### 1.5 `public.f_catalog_price_by_sku`

**Firma SQL resumida**

```sql
f_catalog_price_by_sku(
  p_sku text,
  p_currency text DEFAULT NULL
)
RETURNS TABLE(
  stripe_price_id text,
  amount_cents integer,
  currency text,
  metadata jsonb
)
LANGUAGE plpgsql
STABLE
PARALLEL SAFE
SECURITY DEFINER
```

**Lógica clave**

* Usa `public.v_prices_vigente` (vista, no tenemos DDL, pero no es necesario para tipos de salida).
* Validaciones:

  * Si no hay precios vigentes para `p_sku` → `NOT_FOUND` (`P0002`).
  * Si se especifica `p_currency` y no hay precios vigentes en esa moneda → `INVALID_CURRENCY` (`22023`).
* Determina nivel de lista ganador:

  * `price_list IN ('launch','default')`.
  * Prioridad: `'launch'` primero, luego `'default'`.
* Dentro del nivel ganador:

  * Ordena por `valid_from DESC NULLS LAST`, luego `created_at DESC`.
  * Toma top 2 para detectar empate en recencia:

    * Si top 1 y top 2 tienen misma combinación `valid_from` (o `to_timestamp(0)` si null) y `created_at`, lanza `AMBIGUOUS_PRICE` (`P0001`).
* Emite 1 fila ganadora:

```sql
stripe_price_id := r1.stripe_price_id;
amount_cents    := r1.amount_cents;
currency        := r1.currency;
metadata        := r1.metadata;
RETURN NEXT;
```

**Input TS**

* `p_currency` puede ser `NULL` o no enviarse.
* Por constraint en `product_prices` y vista, `currency` es `'MXN'` o `'USD'`.

```ts
type FCatalogPriceBySkuInput = {
  sku: string; // p_sku
  currency?: 'MXN' | 'USD'; // opcional; si no se envía se asume NULL
};
```

**Output TS**

* Aunque la función es `RETURNS TABLE(...)`, por diseño siempre hay **0 o 1** fila:

  * 0 filas en caso de error (porque se lanza excepción, no retorna).
  * 1 fila en caso de éxito.

```ts
type FCatalogPriceBySkuRow = {
  stripePriceId: string;
  amountCents: number;
  currency: 'MXN' | 'USD';
  metadata: Record<string, unknown>; // jsonb genérico
};

type FCatalogPriceBySkuOutput = FCatalogPriceBySkuRow[]; // típicamente longitud 1
```

---

## 2. Tablas

Solo incluyo columnas relevantes para pricing/bundles/módulos y relaciones.

### 2.1 `public.products`

**Clave primaria**

* `sku text` (PK, `products_pkey`).

**Columnas relevantes**

* `sku text`

  * PK.
  * Constraint `ck_products_sku_format`: `'^[a-z0-9-]+-v[0-9]{3}$'`.
* `name text` (NOT NULL)
* `description text` (NULL)
* `status text` (NOT NULL)

  * `products_status_check`:

    * `'planned' | 'active' | 'sunsetting' | 'discontinued'`.
* `visibility text` (NOT NULL, default `'public'`)

  * `products_visibility_check`:

    * `'public' | 'private' | 'hidden'`.
* `product_type text` (NOT NULL)

  * `products_product_type_check`:

    * `'digital' | 'physical' | 'service' | 'subscription_grant'`.
* `fulfillment_type text` (NOT NULL)

  * `products_fulfillment_type_check`:

    * `'course' | 'template' | 'live_class' | 'one_to_one' | 'subscription_grant' | 'bundle'`.
* `is_subscription boolean` (NOT NULL, default `false`)
* `stripe_product_id text` (NULL)
* `allow_discounts boolean` (NOT NULL, default `true`)
* `commissionable boolean` (NOT NULL, default `false`)
* `commission_rate_pct numeric` (NULL)
* `inventory_qty integer` (NULL)
* `weight_grams integer` (NULL)
* `available_from timestamptz` (NULL)
* `available_until timestamptz` (NULL)
* `metadata jsonb` (NOT NULL, default `'{}'::jsonb`)
* `created_at timestamptz` (NOT NULL, default `now()`)
* `updated_at timestamptz` (NULL)
* `page_slug text` (NULL)

  * `products_page_slug_format_chk` valida slug jerárquico tipo `segment/segment-2`.

**Relaciones con RPCs**

* `f_bundles_expand_items`:

  * Verifica `products.fulfillment_type = 'bundle'` para el SKU del bundle.
  * Filtra hijos por `fulfillment_type` permitido y `status IN ('active','sunsetting')`.
* Bundles y precios referencian `products.sku` como FK.

---

### 2.2 `public.product_prices`

**Clave primaria**

* `id uuid` (PK, `product_prices_pkey`, default `gen_random_uuid()`).

**Columnas relevantes**

* `id uuid` (NOT NULL)
* `sku text` (NOT NULL)

  * FK `product_prices_sku_fkey` → `products.sku`.
* `amount_cents integer` (NOT NULL)

  * `ck_product_prices_amount_positive`: `amount_cents > 0`.
* `currency text` (NOT NULL)

  * `ck_product_prices_currency`: `'MXN' | 'USD'`.
* `price_list text` (NOT NULL, default `'default'`)

  * `ck_product_prices_list`: `'default' | 'launch'`.
* `interval text` (NOT NULL, default `'one_time'`)

  * `product_prices_interval_check`: `'one_time' | 'month' | 'year'`.
* `valid_from timestamptz` (NULL)
* `valid_until timestamptz` (NULL)

  * `ck_product_prices_valid_window`:

    * `valid_until` > `valid_from` si ambos no son NULL.
* `active boolean` (NOT NULL, default `true`)
* `stripe_price_id text` (NULL)
* `metadata jsonb` (NOT NULL, default `'{}'::jsonb`)
* `created_at timestamptz` (NOT NULL, default `now()`)
* `updated_at timestamptz` (NULL)

**Relaciones con RPCs**

* `f_catalog_price_by_sku` opera sobre `v_prices_vigente`, que claramente se basa en `product_prices` + `products`:

  * Usa `sku`, `amount_cents`, `currency`, `price_list`, `valid_from`, `created_at`, `stripe_price_id`, `metadata`.

---

### 2.3 `public.bundles`

**Clave primaria**

* `bundle_sku text` (PK, `bundles_pkey`).

**Columnas relevantes**

* `bundle_sku text` (NOT NULL)

  * FK `bundles_bundle_sku_fkey` → `products.sku`.
* `created_at timestamptz` (NOT NULL, default `now()`)
* `updated_at timestamptz` (NOT NULL, default `now()`)

**Relaciones con RPCs**

* Proporciona la lista de bundles válida; los RPCs de bundle usan el SKU directamente contra `products` y `bundle_items`, pero la tabla `bundles` garantiza integridad (bundle_sku debe existir en `products`).

---

### 2.4 `public.bundle_items`

**Clave primaria**

* `id uuid` (PK, `bundle_items_pkey`, default `gen_random_uuid()`).

**Columnas relevantes**

* `id uuid` (NOT NULL)
* `bundle_sku text` (NOT NULL)

  * FK `bundle_items_bundle_sku_fkey` → `bundles.bundle_sku`.
* `child_sku text` (NOT NULL)

  * FK `bundle_items_child_sku_fkey` → `products.sku`.
* `qty integer` (NOT NULL, default `1`)

  * `bundle_items_qty_check`: `qty > 0`.
* `created_at timestamptz` (NOT NULL, default `now()`)
* `updated_at timestamptz` (NULL)

**Constraints adicionales**

* `ck_bundle_items_no_self`: `child_sku <> bundle_sku`.

**Relaciones con RPCs**

* `f_bundles_expand_items`:

  * Usa `bundle_items` para encontrar hijos del bundle (`join products p on p.sku = bi.child_sku`).
* `f_bundle_schedule`:

  * CTE `children` se basa en `bundle_items` (lista de hijos para calcular agenda).

---

### 2.5 `public.live_class_instances`

**Clave primaria**

* `id uuid` (PK, `live_class_instances_pkey`, default `gen_random_uuid()`).

**Columnas relevantes**

* `id uuid` (NOT NULL)
* `sku text` (NOT NULL)

  * No hay FK explícita en el extracto, pero es claramente SKU de `products` (fulfillment_type = 'live_class').
* `instance_slug text` (NOT NULL)

  * `ck_live_class_instances_slug_pattern`:

    * Formato `'^\d{4}-\d{2}-\d{2}-\d{4}$'` (ej. `2025-11-13-1900`).
* `status text` (NOT NULL)

  * `ck_live_class_instances_status`:

    * `'scheduled' | 'open' | 'sold_out' | 'ended' | 'canceled'`.
* `title text` (NULL)
* `start_at timestamptz` (NULL)
* `end_at timestamptz` (NULL)
* `timezone text` (NOT NULL, default `'America/Mexico_City'`)
* `capacity integer` (NULL, default `10`)

  * `ck_live_class_instances_capacity_nonneg`: `capacity >= 0` o NULL.
* `seats_sold integer` (NOT NULL, default `0`)

  * `ck_live_class_instances_seats_nonneg`: `seats_sold >= 0`.
  * `ck_live_class_instances_seats_vs_capacity`: `seats_sold <= capacity` si `capacity` no es NULL.
* `zoom_join_url text` (NULL)
* `replay_url text` (NULL)
* `metadata jsonb` (NOT NULL, default `'{}'::jsonb`)
* `created_at timestamptz` (NOT NULL, default `now()`)
* `updated_at timestamptz` (NULL)

**Relaciones con RPCs**

* `f_bundle_schedule`:

  * Usa `live_class_instances.sku` y `live_class_instances.start_at`, `live_class_instances.status` para calcular `next_start_at` por hijo del bundle.

---

## 3. Resumen de relaciones RPC ↔ tablas

* `f_bundles_expand_items`

  * Lee de `products` (validación `fulfillment_type = 'bundle'`, filtros por `status` y `fulfillment_type`).
  * Lee de `bundle_items` para los hijos del bundle.
* `f_bundle_schedule`

  * Lee de `bundle_items` (lista de `child_sku`).
  * Lee de `live_class_instances` (por `sku`) para `start_at` y `status`.
* `f_bundle_children_next_start`

  * Es un wrapper sobre `f_bundle_schedule`, devolviendo solo `children`.
* `f_bundle_next_start_at`

  * Es un wrapper sobre `f_bundle_schedule`, devolviendo solo `{ bundle_sku, next_start_at }`.
* `f_catalog_price_by_sku`

  * Se apoya en la vista `v_prices_vigente`, que a su vez se sustenta en `product_prices` + `products` (por `sku`, `currency`, `price_list`, fechas, etc.).

---

## 4. Dudas o inconsistencias detectadas

1. **`live_class_instances.sku` sin FK explícito**

   * No aparece un `FOREIGN KEY` en el extracto, pero funcionalmente se usa como SKU de `products`.
   * No afecta tipos TS, solo es un tema de integridad referencial física.
   * No es bloqueante para el loader.

2. **`jsonb` de `metadata` en precios y otros**

   * El tipo de `metadata` se desconoce a nivel de columnas, así que TS usa `Record<string, unknown>`.
   * Si más adelante defines un esquema fijo para `metadata`, se puede refinar a un tipo más estricto.
   * Tampoco es bloqueante para m-detalle.

3. **Vista `v_prices_vigente` sin DDL**

   * No es necesaria para tipar `f_catalog_price_by_sku`, porque la firma ya define columnas de salida.
   * Solo sería relevante si quisieras tipar la vista en sí en TS.

En resumen: no hay inconsistencias que impidan tipado fuerte; solo notas de integridad física opcional.

---

## 5. Estado para el siguiente paso

* Inputs y outputs de todas las RPCs relevantes (`f_bundles_expand_items`, `f_bundle_schedule`, `f_bundle_children_next_start`, `f_bundle_next_start_at`, `f_catalog_price_by_sku`) están perfectamente tipables sin `any`.
* Tablas clave (`products`, `product_prices`, `bundles`, `bundle_items`, `live_class_instances`) están mapeadas con tipos y relaciones claras.

