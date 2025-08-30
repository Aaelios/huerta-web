**Título:** Decisiones de catálogo, precios y reglas — Semana 2

**Contenido:**

* **Objetivo:** Catálogo escalable con multi‑precio, multi‑moneda y reglas mínimas de compatibilidad. Stripe se usa para cobro; la DB es la verdad de productos y reglas.
* **Convenciones:** `snake_case`, tablas en plural, `metadata jsonb` para extensiones, cambios aditivos.
* **Modelo base decidido:**

  * `products (sku pk)`: `name`, `description`, `status{planned|active|sunsetting|discontinued}`, `visibility{public|hidden}`, `product_type{digital|physical|service|subscription_grant}`, `fulfillment_type{course|template|live_class|one_to_one|subscription_grant}`, `is_subscription bool`, `metadata`, `created_at/updated_at`.
  * `product_prices`: múltiples precios por SKU. Campos clave: `sku fk`, `amount_cents`, `currency`, `price_list text` (ej. `mx_standard`, `us_premium`), `valid_from`, `valid_until`, `active`, `stripe_price_id`, `metadata`, `created_at/updated_at`.
  * `bundles` y `bundle_items`: un SKU que agrupa SKUs hijos con `qty`.
  * Reglas de exclusión:

    * `exclusivity_sets` + `exclusivity_members`: familias de SKUs con regla `mutually_exclusive|single_selection`.
    * `incompatibilities (sku_a, sku_b)` con `sku_a < sku_b` para unicidad.
* **Integración con órdenes y accesos:**

  * `order_headers` + `order_items` ya creadas. Cada `order_item` referencia un `sku`.
  * `entitlements` se generan por `order_item`; si es bundle, por cada `child_sku`.
* **Multi‑moneda / listas de precio:**

  * Se usa `product_prices.price_list` para segmentar por país/mercado/segmento y `currency` para moneda.
  * Fechas `valid_from/valid_until` permiten early‑bird, promos y ventanas regionales.
* **Qué va en `metadata` por ahora:**

  * Mercados específicos por producto o precio (`markets: ["MX","US"]`), restricciones avanzadas, reglas condicionales finas, impuestos avanzados, comisiones por canal.
* **Postergado a futuro (crear solo cuando haya casos reales):**

  * `subscription_plans` + `subscription_plan_entitlements` (cuando existan ≥2 planes con reglas claras).
  * `market_rules` y `discount_rules` como motores dedicados.
  * `commission_rules` por canal/afiliados.
* **Criterio de cambios:** solo aditivos; sin ENUM nativo; migrar de `metadata` a columnas/tablas cuando el patrón sea estable.
* **Impacto operativo:**

  * El servidor valida carrito contra catálogo y reglas antes de crear sesión de Stripe.
  * Stripe solo recibe `stripe_price_id` derivados de `product_prices`.
