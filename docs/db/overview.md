# Base de Datos — Huerta Consulting (visión general)

> Nivel medio. Foco en propósito, llaves, relaciones e índices.  
> Secciones: Técnicas/Sistema, Órdenes, Productos, Accesos (Entitlements).

---

## 0) Convenciones y reglas clave

- **SKUs**: clave natural `products.sku`. Regex: `^[a-z0-9-]+-v\d{3}$` (≤60). Nunca reutilizar; versionar con `-vXXX`.
- **Moneda**: precios en **centavos** (`amount_cents` entero).
- **UUID**: PK de entidades transaccionales (órdenes, eventos, documentos, entitlements).
- **Timestamps**: `created_at` default `now()`. `updated_at` por trigger `f_audit_set_updated_at` (BEFORE UPDATE).
- **Idempotencia**: índices `UNIQUE ... WHERE NOT NULL` para llaves externas de Stripe y grants de acceso.
- **Semillas**: orden recomendado → Products → Product Prices → Bundles → Bundle Items → Exclusivity Sets → Exclusivity Members → Incompatibilities.
- **Checks de integridad**:  
  - `products.status ∈ {active, sunsetting}`  
  - `products.visibility ∈ {public, private}`  
  - `product_prices.currency ∈ {MXN, USD}`  
  - `product_prices.amount_cents > 0`

---

## 1) Tablas técnicas / de sistema

### 1.1 `webhook_events`
- **Propósito**: bitácora cruda de eventos entrantes (Stripe).
- **Campos clave**: `id (uuid)`, `stripe_event_id (text UNIQUE)`, `type (text)`, `payload (jsonb)`, `received_at`.
- **Uso**: auditoría, reintentos idempotentes.
- **Nota**: no usa trigger `updated_at` (solo inserciones).

### 1.2 `entitlement_events`
- **Propósito**: auditoría de cambios de acceso.
- **Campos**: `id (uuid)`, `entitlement_id (uuid FK)`, `type (text check: grant|renew|revoke|expire|restore)`, `actor`, `payload`, `created_at`.
- **Índices**: `(entitlement_id)`, `(created_at desc)`.

### 1.3 Funciones y triggers
- **`f_audit_set_updated_at`**: setea `updated_at` en UPDATE.  
  Triggers activos en: `products`, `product_prices`, `bundles`, `bundle_items`,  
  `order_headers`, `order_items`, `order_documents`, `order_events`,  
  `exclusivity_sets`, `exclusivity_members`, `entitlements`, `entitlement_events`.
- **`f_seed_price`**: utilitaria de seed. Eliminada tras semillas.

---

## 2) Órdenes

### 2.1 `order_headers`
- **PK**: `id (uuid)`.
- **Clave legible**: `order_number (text UNIQUE)`, formato `ORD-000001` (secuencia `order_number_seq`).
- **Stripe refs**: `stripe_session_id`, `stripe_payment_intent_id`, `stripe_invoice_id`, `stripe_subscription_id`  
  → índices **UNIQUE WHERE NOT NULL** para evitar duplicados.
- **Estado**: `status (text)`, `fulfillment_status (text)`, `invoice_status (text)`.
- **Índices operativos**: `(user_id, created_at desc)`.

### 2.2 `order_items`
- **PK**: `id (uuid)`, FK `order_id → order_headers.id`.
- **Producto**: `sku (FK products)`, `product_type`, `amount_cents`, `quantity`, `metadata`.
- **Legible**: `line_number int` con `UNIQUE (order_id, line_number)`; numeración 10,20,30…
- **Índice**: `(order_id)`.

### 2.3 `order_documents`
- **Propósito**: ligas a comprobantes externos (facturas, recibos, etc.).
- **PK**: `id (uuid)`, FK `order_id`, opcional `order_item_id`.
- **Campos**: `doc_type`, `provider`, `external_id`, `url`, `metadata`.

### 2.4 `order_events`
- **Propósito**: historial por cambio de estado.
- **PK**: `id (uuid)`, FK `order_id`.
- **Campos**: `type (text check: created|paid|fulfilled|scheduled|refunded|canceled)`, `actor`, `payload`, `created_at`.

---

## 3) Productos y reglas comerciales

### 3.1 `products`
- **PK natural**: `sku (text)`.
- **Atributos**: `name`, `description`, `status`, `visibility`, `product_type (digital|physical|subscription_grant)`,  
  `fulfillment_type (course|template|bundle|subscription_grant|...)`, `is_subscription (bool)`, `allow_discounts`, `commissionable`, `metadata`.
- **Integraciones futuras**: `stripe_product_id`, `tax_code`, `inventory_qty`, `weight_grams`, `available_from/until`.

### 3.2 `product_prices`
- **FK**: `sku → products.sku`.
- **Atributos**: `amount_cents`, `currency`, `price_list` (ej. `mx_standard`, `us_standard`), `interval` (`one_time|month|year`), validez opcional.
- **Único**: `UNIQUE (sku, currency, price_list, interval)`.

### 3.3 Bundles
- **`bundles`**: PK `bundle_sku` (mismo SKU en `products`), sirve como guard-rail.
- **`bundle_items`**: hijos del bundle (`bundle_sku`, `child_sku`, `qty`),  
  **UNIQUE (bundle_sku, child_sku)`.

### 3.4 Exclusividad e incompatibilidades
- **`exclusivity_sets`**: PK natural `set_key` (ej. `membership_tiers`), `name`, `rule` (`single_selection|mutually_exclusive`).
- **`exclusivity_members`**: PK compuesta `(set_key, sku)`, FK a `exclusivity_sets.set_key` y `products.sku`.
- **`incompatibilities`**: pares prohibidos `sku_a < sku_b`; PK compuesta `(sku_a, sku_b)`.

---

## 4) Accesos (Entitlements)

### 4.1 `entitlements`
- **PK**: `id (uuid)`.  
- **Relaciones**: `user_id (uuid)`, `sku (FK products)`.
- **Fuente**: `source_type (text check: order|subscription|manual|promo|migration)`, `source_id (text)` → traza el origen (p.ej. `order_id` o `stripe_subscription_id`).
- **Vigencia**: `valid_until`, `revoked_at`. Campo `active (bool)` opcional; la **verdad** se define en la vista.
- **Idempotencia**: `UNIQUE (user_id, sku, source_type, source_id)`.  
  Único activo por SKU: `UNIQUE (user_id, sku) WHERE active`.
- **Índices**: `(user_id, active)`, `(sku, active)`, `(valid_until)`.

### 4.2 Vistas de acceso
- **`v_entitlements_active`**: accesos vigentes por regla  
  `revoked_at IS NULL AND (valid_until IS NULL OR valid_until > now())`.
- **`v_prices_active`**: precios vigentes por SKU y moneda.
- **`v_products_public`**: catálogo público con join a precios activos MXN/USD.
- **`v_prices_vigente`**: auxiliar de validación (diagnóstico de integridad).

### 4.3 `entitlement_events`
- Ver 1.2. Auditoría de lifecycle de accesos.

---

## 5) Flujos clave

### 5.1 Checkout Stripe → Webhook
1. `checkout.session.completed` / `invoice.payment_succeeded`.  
2. Upsert `order_headers` + `order_items` desde metadata/precios.  
3. Conceder accesos:
   - Si SKU es **bundle** → grants por cada `bundle_item`.
   - Si `fulfillment_type = subscription_grant` → grants ampliados según membresía.  
4. Registrar `entitlement_events` (`grant|renew`).  
5. Enviar email (Resend) y CTA `/gracias`.

### 5.2 Revocación
- `customer.subscription.deleted` → `entitlements` afectados: set `revoked_at`, `active=false`.  
- `entitlement_events` → `revoke`.

---

## 6) Seguridad (RLS)

- **Lectura**: el usuario solo puede ver sus `order_headers`, `order_items`, `entitlements`, `entitlement_events`.
- **Escritura**: solo backend con `service_role`. Webhooks = único punto de mutación.
- **Catálogo**: lectura pública de `products`, `product_prices`, `bundles`, `bundle_items`.

---

## 7) Índices recomendados (resumen)

- `order_headers`:  
  `UNIQUE(order_number)`, `UNIQUE(stripe_*_id) WHERE NOT NULL`, `(user_id, created_at desc)`.
- `order_items`: `UNIQUE(order_id, line_number)`, `(order_id)`.
- `product_prices`: `UNIQUE(sku, currency, price_list, interval)`.
- `bundle_items`: `UNIQUE(bundle_sku, child_sku)`.
- `entitlements`: `UNIQUE(user_id, sku, source_type, source_id)`, `UNIQUE(user_id, sku) WHERE active`, `(user_id, active)`, `(sku, active)`.
- `webhook_events`: `UNIQUE(stripe_event_id)`, `(received_at)`.

---

## 8) Referencia visual (Mermaid)

```mermaid
erDiagram
  products ||--o{ product_prices : has
  products ||--o{ bundle_items : contains
  bundles ||--o{ bundle_items : lists
  exclusivity_sets ||--o{ exclusivity_members : groups
  products ||--o{ exclusivity_members : includes
  products ||--o{ incompatibilities : conflicts
  order_headers ||--o{ order_items : has
  order_headers ||--o{ order_documents : has
  order_headers ||--o{ order_events : has
  products ||--o{ entitlements : grants
  entitlements ||--o{ entitlement_events : logs
  webhook_events {
    id uuid
    stripe_event_id text
    type text
    payload jsonb
    received_at timestamptz
  }
