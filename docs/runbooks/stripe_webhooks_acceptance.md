# Checklist de Aceptación — Webhooks Stripe ↔ Next.js ↔ Supabase

## Escenarios obligatorios

### 1. `invoice.payment_succeeded` (OK)
- [ ] Se recibe evento en endpoint `/api/stripe/webhooks`.
- [ ] `f_refetchInvoice` ejecuta expand correcto (`lines.data.price`, `price.product`).
- [ ] `order_headers` crea orden con `status=paid` y `total_cents` correcto.
- [ ] `payments` registra pago vinculado a la orden.
- [ ] `entitlements` aplica acceso activo con `sku` esperado.
- [ ] `webhook_events` marca `processed_at` y `order_id`.

### 2. `checkout.session.completed` (OK)
- [ ] Se recibe evento en endpoint `/api/stripe/webhooks`.
- [ ] `f_refetchSession` retorna `metadata.sku`.
- [ ] `order_headers`, `payments` y `entitlements` creados correctamente.
- [ ] `webhook_events` marca `processed_at` y `order_id`.

### 3. Replay (idempotencia)
- [ ] Reenvío del mismo `event_id` desde Dashboard o CLI.
- [ ] Endpoint responde `200` con `replay: true`.
- [ ] No hay nuevos registros en `order_headers`, `payments`, `entitlements`.
- [ ] `webhook_events` mantiene `processed_at` del primer intento.

### 4. Firma inválida
- [ ] POST sin `Stripe-Signature` o con secreto incorrecto.
- [ ] Endpoint responde `400`.
- [ ] Ninguna escritura en DB.
- [ ] Ningún registro en `webhook_events`.

### 5. Falla en DB (simulada)
- [ ] Se induce error en `f_orch_orders_upsert` (ej. `RAISE EXCEPTION` temporal).
- [ ] Endpoint externo responde `200` (tolerancia a fallos).
- [ ] `webhook_events` marca `failed` con `last_error` y sin `processed_at`.

---

## Dependencias críticas

- **Next.js**
  - `/app/api/stripe/webhooks/route.ts`
  - `f_refetchInvoice`, `f_refetchSession`
  - `h_stripe_webhook_process`
  - `f_webhookEvents_*`
- **Supabase**
  - Tablas: `order_headers`, `payments`, `entitlements`, `webhook_events`
  - Funciones: `f_orders_parse_payment`, `f_orch_orders_upsert`, `f_payments_upsert`
- **Stripe**
  - TEST mode activo
  - Products/Prices con `metadata.sku` consistente con catálogo

---

## Criterios de cierre
- [ ] Todos los escenarios anteriores cumplen.
- [ ] Runbook documentado en `/docs/runbooks/stripe_webhooks_e2e.md`.
- [ ] Este checklist completado y firmado.

