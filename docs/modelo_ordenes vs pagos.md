# Bloque 2 — Suscripciones: modelo de Órdenes vs Pagos (MVP)

## Objetivo
Alinear con Stripe: **orden = checkout inicial**, **pago = cada invoice**. Mantener acceso sin cortes mediante un **entitlement `subscription_grant`** que se **concede** en el alta y se **renueva** con cada cobro.

---

## Alcance de esta etapa (qué haremos ahora)
1) **Orquestadora estable** para `checkout.session.completed` e `invoice.payment_succeeded` con idempotencia.
2) **Concesión y renovación** de `subscription_grant` usando `sku` y `fulfillment_type` desde `price.metadata`.
3) **Separar pagos de órdenes**: registrar cada **invoice** como **pago**; la orden inicial se conserva para el checkout.

---

## Elementos a CREAR
- **Tabla `payments`** (o `order_payments`):
  - `id uuid PK`, `user_id`, `order_id NULL`, `amount_cents int`, `currency text`, `status text`,
  - `stripe_invoice_id text UNIQUE`, `stripe_payment_intent_id text UNIQUE`,
  - `stripe_subscription_id text`, `period_start timestamptz`, `period_end timestamptz`,
  - `metadata jsonb DEFAULT '{}'`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz NULL`.
- **Función `f_payments_upsert(p_obj jsonb)`**:
  - Upsert por `stripe_invoice_id` o `stripe_payment_intent_id`.
  - Guarda montos, moneda, periodo y llaves Stripe.
- **Índices/Únicos**:
  - `ux_payments_invoice_id` (único no nulo).
  - `ux_payments_payment_intent_id` (único no nulo).

---

## Elementos a MODIFICAR (esta etapa)
- **`f_orch_orders_upsert`**:
  - `checkout.session.completed` → **igual**: crea/actualiza `order_headers` + `grant` vía `f_entitlements_apply`.
  - `invoice.payment_succeeded` → **nuevo flujo**: llamar `f_payments_upsert` y luego `f_entitlements_apply` con **`renew`** usando `period_end` (o regla por defecto de ciclo).
- **`f_entitlements_apply`** (solo rama `subscription_grant`):
  - *grant*: crea/activa entitlement y fija `valid_until = period_end` si viene, o `now() + ciclo`.
  - *renew*: si existe activo del mismo `sku`, **extiende `valid_until`**, inserta `entitlement_events(type='renew')` con `{invoice_id, subscription_id}` en `payload`.
- **Restricciones en `order_headers`** (idempotencia defensiva):
  - Únicos parciales (solo cuando no son NULL):  
    `ux_orders_session_id`, `ux_orders_invoice_id`, `ux_orders_payment_intent_id`.

---

## Elementos ya CAMBIADOS (listo)
- `f_auth_get_user` → retorna **NULL** si no existe.  
- `f_orders_resolve_user` → wrapper neutro, retorna UUID o **NULL**.  
- `f_orders_parse_metadata` → precedencia **price → product** (sin `session` para `sku/fulfillment_type`).  
- `f_orch_orders_upsert` → valida usuario con `NOT_FOUND_USER` si NULL.

---

## Elementos SIN CAMBIOS (por ahora)
- Esquema de `order_headers` y `entitlements` (solo usan nuevas rutas).  
- Políticas RLS vigentes; revisión al cierre del bloque.

---

## Pruebas de aceptación (esta etapa)
1) **Alta suscripción** (`invoice.payment_succeeded` inicial):
   - `payments` inserta fila con `invoice_id`.
   - `entitlements` tiene `subscription_grant` activo con `valid_until`.
   - `webhook_events.processed_at` set.
2) **Renovación** (nuevo `invoice_id` misma `subscription_id`):
   - Nueva fila en `payments`.
   - `entitlement_events` registra **`renew`** y `valid_until` se extiende.
3) **Idempotencia**:
   - Reenviar mismo `stripe_event_id` o `invoice_id` → **sin duplicados**.

---

## Fuera de alcance ahora (post-MVP)
- **Tiers**: `subscription_tiers` y `products.min_tier` para gating por nivel.  
- **Bajas**: `customer.subscription.deleted` → `revoke`.  
- **Reembolsos**: `charge.refunded` → ajustar pagos y, si aplica, acortar `valid_until`.  
- **Portal cliente / reportes**: MRR, cohortes, fallidas, dunning.  
- **RLS fina** y vistas públicas de “mis pagos”.

---

## Preparar hoy para no romper mañana
- Añadir columna opcional `products.min_tier text NULL` (sin usar aún).  
- Guardar en `entitlements.metadata` `{subscription_id, tier}`.  
- Índice único parcial en `entitlements` para **una fila activa por `(user_id, sku)`**.  
- `webhook_events.summary_json` con `{invoice_id, subscription_id, sku, decision}`.

---

## Issue pendiente: `updated_at`
- Seguir el issue abierto: **`updated_at` NULLABLE y sin DEFAULT**.  
- Aplicar el trigger `f_audit_set_updated_at` **solo en UPDATE** en tablas nuevas (`payments`) y, luego, normalizar el resto en la migración programada.

---
